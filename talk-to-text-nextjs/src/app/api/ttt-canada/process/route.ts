import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, validateInput, rateLimit } from '@/lib/auth-middleware';
import { tttCanadaService, TTTCanadaServiceConfig } from '@/lib/ttt-canada-service';
import { calculateTTTCanadaCredits } from '@/lib/stripe';
import { creditService } from '@/lib/credit-service';

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.error;
    }
    const { userId } = authResult;

    // Rate limiting for premium service
    const rateLimitResult = rateLimit(`ttt-canada-${userId}`, 5, 60000); // 5 per minute
    if (!rateLimitResult.success) {
      return rateLimitResult.error;
    }

    const body = await request.json();

    // Input validation - support both fileUrl and fileBuffer
    const validationResult = validateInput(body, {
      fileName: { required: true, type: 'string', minLength: 1, maxLength: 255 },
      fileSize: { required: true, type: 'number' },
      serviceType: { required: true, type: 'string' },
      language: { type: 'string', minLength: 2, maxLength: 10 },
      addOns: { type: 'object' }
    });

    if (!validationResult.success) {
      return validationResult.error;
    }

    const {
      fileName,
      fileUrl,
      fileBuffer,
      fileSize,
      duration,
      serviceType,
      language = 'en-CA',
      addOns = {},
      clientInstructions,
      specialRequirements
    } = body;

    // Must have either fileUrl or fileBuffer
    if (!fileUrl && !fileBuffer) {
      return NextResponse.json(
        { error: 'Either fileUrl or fileBuffer must be provided' },
        { status: 400 }
      );
    }

    // Validate TTT Canada service type
    const validServiceTypes = ['ai_human_review', 'verbatim_multispeaker', 'indigenous_oral', 'legal_dictation', 'copy_typing'];
    if (!validServiceTypes.includes(serviceType)) {
      return NextResponse.json(
        { error: 'Invalid TTT Canada service type' },
        { status: 400 }
      );
    }

    // Validate Canadian language codes
    if (!['en-CA', 'fr-CA', 'indigenous'].includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language for Canadian services' },
        { status: 400 }
      );
    }

    // Calculate credits needed
    const durationMinutes = Math.ceil((duration || 0) / 60);
    const creditsCalculation = calculateTTTCanadaCredits(
      serviceType as any,
      durationMinutes,
      {
        timestamps: addOns.timestamps || false,
        anonymization: addOns.anonymization || false,
        customTemplate: addOns.customTemplate || false,
        rushDelivery: addOns.rushDelivery || false
      }
    );

    // Check credit balance
    const creditBalance = await creditService.getCreditBalance(userId);
    if (creditBalance.balance < creditsCalculation.totalCredits) {
      return NextResponse.json(
        { 
          error: `Insufficient credits. Need ${creditsCalculation.totalCredits} credits but have ${creditBalance.balance}. Please purchase more credits.`,
          required: creditsCalculation.totalCredits,
          available: creditBalance.balance
        },
        { status: 400 }
      );
    }

    // Calculate legacy pricing for compatibility
    const pricing = calculateTTTCanadaPricing(serviceType, duration || 0, addOns);

    const config: TTTCanadaServiceConfig = {
      serviceType: serviceType as any,
      language: language as any,
      addOns: {
        timestamps: addOns.timestamps || false,
        anonymization: addOns.anonymization || false,
        customTemplate: addOns.customTemplate || false,
        rushDelivery: addOns.rushDelivery || false
      },
      clientInstructions,
      specialRequirements
    };

    // Get file buffer - either from URL or direct buffer
    let buffer: Buffer;
    
    if (fileBuffer) {
      // Convert array back to Buffer
      buffer = Buffer.from(fileBuffer);
      console.log(`🍁 Using direct file buffer (${buffer.length} bytes)`);
    } else if (fileUrl) {
      // Download file from URL (legacy support)
      console.log(`🍁 Downloading file from URL: ${fileUrl}`);
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: ${fileResponse.statusText}`);
      }
      
      const arrayBuffer = await fileResponse.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error('No file source provided');
    }

    // Create job entry immediately and start background processing
    const jobId = await createTTTCanadaJob({
      userId,
      fileName,
      fileUrl: fileUrl || `buffer:${fileName}`,
      fileSize,
      duration,
      serviceType,
      config,
      pricing: {
        ...pricing,
        creditsUsed: creditsCalculation.totalCredits,
        creditsBreakdown: creditsCalculation
      },
      status: 'processing',
      buffer: fileBuffer ? Array.from(buffer) : null // Store buffer if provided
    });

    // Deduct credits upfront for the service
    await creditService.deductCredits(
      userId,
      creditsCalculation.totalCredits,
      `TTT Canada ${serviceType} transcription - ${fileName}`,
      jobId,
      {
        serviceType: 'ttt_canada',
        serviceSubtype: serviceType,
        fileName,
        duration: durationMinutes,
        baseCredits: creditsCalculation.baseCredits,
        addOnCredits: creditsCalculation.addOnCredits
      }
    );

    // Start background processing (don't await)
    console.log(`🍁 Starting background TTT Canada processing for job ${jobId}`);
    processJobInBackground(jobId, buffer, fileName, config).catch(error => {
      console.error(`Background processing failed for job ${jobId}:`, error);
      // Update job status to failed
      updateTTTCanadaJobStatus(jobId, 'failed', { error: error.message });
    });

    // Return immediate response - job is processing in background
    return NextResponse.json({
      success: true,
      jobId,
      serviceType,
      status: 'processing',
      pricing: {
        ...pricing,
        creditsUsed: creditsCalculation.totalCredits,
        creditsBreakdown: creditsCalculation
      },
      message: `TTT Canada ${serviceType.replace('_', ' ')} job created successfully. Processing in background... ${creditsCalculation.totalCredits} credits deducted.`,
      estimatedCompletionTime: serviceType === 'ai_human_review' 
        ? 'AI draft: ~2-5 minutes, Human review: ~2 hours' 
        : '5-15 minutes',
      pollUrl: `/api/ttt-canada/status?jobId=${jobId}`
    });

  } catch (error) {
    console.error('TTT Canada processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TTT Canada processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Calculate TTT Canada pricing in CAD
 */
function calculateTTTCanadaPricing(
  serviceType: string,
  durationSeconds: number,
  addOns: any
): {
  basePrice: number;
  addOnPrices: { [key: string]: number };
  totalCAD: number;
  totalUSD: number;
} {
  const durationMinutes = Math.ceil(durationSeconds / 60);
  
  // Base service pricing (CAD per minute)
  const basePrices: { [key: string]: number } = {
    'ai_human_review': 1.75,
    'verbatim_multispeaker': 2.25,
    'indigenous_oral': 2.50,
    'legal_dictation': 1.85,
    'copy_typing': 2.80 // Assuming per-minute for audio, would be per-page for documents
  };

  const basePrice = (basePrices[serviceType] || 1.75) * durationMinutes;

  // Add-on pricing
  const addOnPrices: { [key: string]: number } = {};
  let addOnTotal = 0;

  if (addOns.timestamps) {
    addOnPrices.timestamps = 0.25 * durationMinutes;
    addOnTotal += addOnPrices.timestamps;
  }

  if (addOns.anonymization) {
    addOnPrices.anonymization = 0.35 * durationMinutes;
    addOnTotal += addOnPrices.anonymization;
  }

  if (addOns.customTemplate) {
    addOnPrices.customTemplate = 25.00; // One-time fee
    addOnTotal += addOnPrices.customTemplate;
  }

  if (addOns.rushDelivery) {
    addOnPrices.rushDelivery = 0.50 * durationMinutes;
    addOnTotal += addOnPrices.rushDelivery;
  }

  const totalCAD = basePrice + addOnTotal;
  const totalUSD = totalCAD * 0.74; // Approximate CAD to USD conversion

  return {
    basePrice,
    addOnPrices,
    totalCAD: Math.round(totalCAD * 100) / 100,
    totalUSD: Math.round(totalUSD * 100) / 100
  };
}

/**
 * Store TTT Canada job in database
 */
/**
 * Create TTT Canada job in database (immediate)
 */
async function createTTTCanadaJob(jobData: any): Promise<string> {
  const jobId = `ttt-ca-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Import Firebase functions
    const { db } = await import('@/lib/firebase');
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    
    // Store job in Firestore
    const jobDoc = {
      jobId,
      userId: jobData.userId,
      fileName: jobData.fileName,
      fileUrl: jobData.fileUrl,
      fileSize: jobData.fileSize,
      duration: jobData.duration,
      serviceType: jobData.serviceType,
      status: jobData.status,
      config: jobData.config,
      pricing: jobData.pricing,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Don't store buffer in Firestore - too large
      hasBuffer: !!jobData.buffer
    };
    
    await setDoc(doc(db, 'ttt_canada_jobs', jobId), jobDoc);
    
    console.log(`✅ TTT Canada job ${jobId} stored in Firestore`);
    
    return jobId;
  } catch (error) {
    console.error(`❌ Failed to store TTT Canada job:`, error);
    throw new Error('Failed to create job record');
  }
}

/**
 * Update TTT Canada job status
 */
async function updateTTTCanadaJobStatus(jobId: string, status: string, data?: any): Promise<void> {
  try {
    // Import Firebase functions
    const { db } = await import('@/lib/firebase');
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    
    // Update job status in Firestore
    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    };
    
    // Add any additional data
    if (data) {
      Object.assign(updateData, data);
    }
    
    await updateDoc(doc(db, 'ttt_canada_jobs', jobId), updateData);
    
    console.log(`✅ Job ${jobId} status updated to: ${status}`);
  } catch (error) {
    console.error(`❌ Failed to update job ${jobId}:`, error);
    throw new Error('Failed to update job status');
  }
}

/**
 * Background processing function
 */
async function processJobInBackground(
  jobId: string, 
  buffer: Buffer, 
  fileName: string, 
  config: any
): Promise<void> {
  try {
    console.log(`🔄 Background processing started for job ${jobId}`);
    
    // Update status to processing
    await updateTTTCanadaJobStatus(jobId, 'ai_processing', {
      stage: 'transcription',
      message: 'Generating AI transcription...'
    });
    
    // Process through TTT Canada service
    const { tttCanadaService } = await import('@/lib/ttt-canada-service');
    const result = await tttCanadaService.processAudio(buffer, fileName, config);
    
    // Update job with results
    let finalStatus = 'completed';
    let statusData: any = {
      result,
      completedAt: new Date().toISOString()
    };
    
    if (result.status === 'pending_human_review') {
      finalStatus = 'pending_human_review';
      statusData.message = 'AI draft completed. Queued for human review.';
      statusData.humanReviewJobId = result.humanReviewJobId;
      statusData.aiDraftCompletedAt = new Date().toISOString();
    } else {
      statusData.message = 'Transcription completed successfully.';
    }
    
    await updateTTTCanadaJobStatus(jobId, finalStatus, statusData);
    
    console.log(`✅ Background processing completed for job ${jobId} with status: ${finalStatus}`);
    
    // TODO: Send notification to user that processing is complete
    // This could be email, websocket, push notification, etc.
    
  } catch (error) {
    console.error(`❌ Background processing failed for job ${jobId}:`, error);
    await updateTTTCanadaJobStatus(jobId, 'failed', {
      error: error instanceof Error ? error.message : 'Processing failed',
      failedAt: new Date().toISOString()
    });
    throw error;
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'TalkToText Canada API',
    services: [
      'AI Draft + Human Review - $1.75 CAD/min',
      'Verbatim Multi-Speaker - $2.25 CAD/min', 
      'Indigenous Oral History - $2.50 CAD/min',
      'Legal Dictation - $1.85 CAD/min',
      'Copy Typing - $2.80 CAD/page'
    ],
    addOns: [
      'Timestamps - +$0.25 CAD/min',
      'Anonymization - +$0.35 CAD/min',
      'Custom Template - +$25 CAD setup',
      'Rush Delivery - +$0.50 CAD/min'
    ]
  });
}