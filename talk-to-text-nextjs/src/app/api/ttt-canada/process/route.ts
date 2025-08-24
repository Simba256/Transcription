import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, validateInput, rateLimit } from '@/lib/auth-middleware';
import { tttCanadaService, TTTCanadaServiceConfig } from '@/lib/ttt-canada-service';

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

    // Input validation
    const validationResult = validateInput(body, {
      fileName: { required: true, type: 'string', minLength: 1, maxLength: 255 },
      fileUrl: { required: true, type: 'string', minLength: 1 },
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
      fileSize,
      duration,
      serviceType,
      language = 'en-CA',
      addOns = {},
      clientInstructions,
      specialRequirements
    } = body;

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

    // Calculate pricing
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

    // Download file from URL
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }
    
    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process through TTT Canada service
    console.log(`🍁 Starting TTT Canada processing for user ${userId}`);
    const result = await tttCanadaService.processAudio(buffer, fileName, config);

    // Store result in database with Canadian-specific metadata
    const jobId = await storeTTTCanadaJob({
      userId,
      fileName,
      fileUrl,
      fileSize,
      duration,
      config,
      result,
      pricing,
      status: 'completed'
    });

    return NextResponse.json({
      success: true,
      jobId,
      serviceType,
      pricing,
      result: {
        transcript: result.enhancedTranscript || result.baseTranscript,
        speakers: result.speakers,
        timestamps: result.timestamps,
        metadata: result.metadata
      },
      message: `TTT Canada ${serviceType.replace('_', ' ')} completed successfully`
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
async function storeTTTCanadaJob(jobData: any): Promise<string> {
  // This would integrate with your existing Firebase/database system
  // For now, return a mock job ID
  
  const jobId = `ttt-ca-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // TODO: Implement actual database storage
  console.log(`Storing TTT Canada job ${jobId}:`, {
    ...jobData,
    result: { ...jobData.result, baseTranscript: '[truncated]' }
  });

  return jobId;
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