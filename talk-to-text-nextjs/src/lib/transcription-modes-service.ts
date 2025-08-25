import { db } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { updateUserUsage } from './firestore';
import { openaiService } from './openai-service';
import { getAudioDurationFromBuffer, getMimeTypeFromFilename } from './audio-utils';
import { creditService } from './credit-service';
import { calculateCreditsNeeded } from './stripe';
import { 
  TranscriptionMode, 
  SimplifiedTranscriptionJobData, 
  AdminTranscriptionData,
  TranscriptionModeSelection
} from '@/types/transcription-modes';

export class SimplifiedTranscriptionModesService {
  
  /**
   * Create a new transcription job with credit-based system
   */
  async createTranscriptionJob(
    userId: string,
    fileData: {
      fileName: string;
      fileUrl: string;
      fileSize: number;
      duration?: number;
    },
    modeSelection: TranscriptionModeSelection,
    language: string = 'en',
    diarization: boolean = false
  ): Promise<string> {
    
    // Calculate credits needed for this transcription
    const estimatedDurationMinutes = Math.ceil((fileData.duration || 0) / 60);
    const creditsNeeded = calculateCreditsNeeded(
      modeSelection.mode,
      modeSelection.qualityLevel,
      estimatedDurationMinutes
    );

    // Check if user has sufficient credits
    const creditCheck = await creditService.checkSufficientCredits(userId, creditsNeeded);
    if (!creditCheck.sufficient) {
      throw new Error(`Insufficient credits. Required: ${creditsNeeded}, Available: ${creditCheck.currentBalance}, Shortfall: ${creditCheck.shortfall}`);
    }

    // Deduct credits upfront
    const deductionResult = await creditService.deductCredits(
      userId,
      creditsNeeded,
      `Transcription: ${fileData.fileName}`,
      undefined, // jobId will be updated after job creation
      {
        transcriptionMode: modeSelection.mode,
        qualityLevel: modeSelection.qualityLevel,
        durationMinutes: estimatedDurationMinutes
      }
    );

    if (!deductionResult.success) {
      throw new Error(`Failed to deduct credits. Available: ${deductionResult.newBalance}`);
    }

    console.log(`💳 Deducted ${creditsNeeded} credits from user ${userId}. New balance: ${deductionResult.newBalance}`);
    
    const jobData: Omit<SimplifiedTranscriptionJobData, 'id'> = {
      userId,
      fileName: fileData.fileName,
      fileUrl: fileData.fileUrl,
      fileSize: fileData.fileSize,
      duration: fileData.duration,
      mode: modeSelection.mode,
      priority: modeSelection.priority,
      status: 'pending',
      language,
      diarization,
      retryCount: 0,
      maxRetries: 3,
      creditsUsed: creditsNeeded, // Track credits used for this job
      createdAt: serverTimestamp() as any,
      ...(modeSelection.specialRequirements && { tags: ['special_requirements'] })
    };

    const docRef = await addDoc(collection(db, 'transcriptions'), jobData);
    
    // Update user usage statistics immediately after job creation
    console.log(`📊 Updating usage stats immediately for user ${userId}: +1 upload, +${estimatedDurationMinutes} minutes`);
    try {
      await this.updateUserTranscriptionUsage(userId, estimatedDurationMinutes);
    } catch (usageError) {
      console.error('Error updating initial usage stats:', usageError);
      // Continue processing even if usage update fails
    }
    
    // Route to appropriate processing pipeline
    await this.routeToProcessor(docRef.id, modeSelection);
    
    return docRef.id;
  }

  /**
   * Route transcription job to appropriate processor based on mode (simplified)
   */
  private async routeToProcessor(
    jobId: string, 
    modeSelection: TranscriptionModeSelection
  ): Promise<void> {
    
    switch (modeSelection.mode) {
      case 'ai':
        await this.processAITranscription(jobId);
        break;
      
      case 'human':
        await this.queueForAdmin(jobId);
        break;
      
      case 'hybrid':
        // For hybrid: AI first, then queue for admin review
        await this.processAITranscription(jobId);
        // Admin review will be triggered after AI completion
        break;
    }
  }

  /**
   * Process AI transcription using OpenAI Whisper + GPT-4
   */
  private async processAITranscription(jobId: string): Promise<void> {
    try {
      // Update status to processing
      await updateDoc(doc(db, 'transcriptions', jobId), {
        status: 'processing',
        submittedAt: serverTimestamp()
      });

      // Get job data
      const jobDoc = await getDocs(
        query(collection(db, 'transcriptions'), where('__name__', '==', jobId))
      );
      
      if (jobDoc.empty) throw new Error('Job not found');
      
      const jobData = jobDoc.docs[0].data() as SimplifiedTranscriptionJobData;
      
      // Variables to track actual duration
      let actualDurationMinutes = jobData.duration || 0; // fallback to stored duration
      
      // Process with OpenAI Whisper + GPT-4
      try {
        console.log(`🎤 Starting OpenAI transcription for job ${jobId}, file: ${jobData.fileName}`);
        
        // Download the audio file from Firebase Storage
        const audioBuffer = await this.downloadAudioFile(jobData.fileUrl);
        
        // Get actual audio duration from metadata with smart MIME type detection
        const mimeType = getMimeTypeFromFilename(jobData.fileName);
        console.log(`🎵 Detected MIME type for ${jobData.fileName}: ${mimeType || 'auto-detect'}`);
        
        const actualDurationSeconds = await getAudioDurationFromBuffer(audioBuffer, mimeType);
        actualDurationMinutes = Math.round(actualDurationSeconds / 60 * 100) / 100;
        
        // Process with OpenAI complete transcription workflow
        // Use 'none' for pure Whisper output without word changes
        const result = await openaiService.completeTranscription(audioBuffer, {
          language: jobData.language === 'en' ? 'en' : undefined,
          enhancementType: 'none'  // Pure Whisper output, no GPT-4 modifications
        });
        
        // Check if this is a hybrid job that needs admin review
        if (jobData.mode === 'hybrid') {
          // For hybrid: Update with AI results but queue for admin review
          await updateDoc(doc(db, 'transcriptions', jobId), {
            status: 'queued_for_admin',
            aiTranscript: result.originalTranscript,
            finalTranscript: result.enhancedTranscript, // Will be overwritten by admin
            openaiJobId: `openai-whisper-${Date.now()}`,
            processingTime: result.processingTime,
            wordCount: result.wordCount,
            confidence: result.confidence,
            duration: actualDurationMinutes,
            aiCompletedAt: serverTimestamp(),
            queuedAt: serverTimestamp()
          });
          
          console.log(`✅ AI transcription completed for hybrid job ${jobId} - queued for admin review`);
        } else {
          // Pure AI mode - mark as completed
          await updateDoc(doc(db, 'transcriptions', jobId), {
            status: 'completed',
            aiTranscript: result.originalTranscript,
            finalTranscript: result.enhancedTranscript,
            openaiJobId: `openai-whisper-${Date.now()}`,
            processingTime: result.processingTime,
            wordCount: result.wordCount,
            confidence: result.confidence,
            duration: actualDurationMinutes,
            completedAt: serverTimestamp()
          });
          
          console.log(`✅ AI transcription completed for job ${jobId} - ${result.wordCount} words, ${result.confidence * 100}% confidence`);
        }
        
      } catch (aiError) {
        console.error('AI transcription failed:', aiError);
        
        // Provide more specific error messages
        let errorMessage = 'AI transcription processing failed';
        if (aiError instanceof Error) {
          if (aiError.message.includes('API key')) {
            errorMessage = 'OpenAI API key not configured or invalid';
          } else if (aiError.message.includes('rate limit')) {
            errorMessage = 'OpenAI rate limit exceeded - please try again later';
          } else if (aiError.message.includes('file too large')) {
            errorMessage = 'Audio file too large for processing';
          } else {
            errorMessage = aiError.message;
          }
        }
        
        await updateDoc(doc(db, 'transcriptions', jobId), {
          status: 'error',
          error: errorMessage,
          errorAt: serverTimestamp()
        });
        
        // Refund credits for failed transcription
        await this.refundCreditsForFailedJob(jobId, jobData.userId);
        throw aiError;
      }

      // Note: User usage statistics are already updated when job was created

    } catch (error) {
      await updateDoc(doc(db, 'transcriptions', jobId), {
        status: 'error',
        error: error instanceof Error ? error.message : 'AI processing failed',
        errorAt: serverTimestamp()
      });
      
      // Refund credits for failed transcription
      const jobDoc = await getDocs(
        query(collection(db, 'transcriptions'), where('__name__', '==', jobId))
      );
      
      if (!jobDoc.empty) {
        const jobData = jobDoc.docs[0].data() as SimplifiedTranscriptionJobData;
        await this.refundCreditsForFailedJob(jobId, jobData.userId);
      }
    }
  }

  /**
   * Download audio file from Firebase Storage URL
   */
  private async downloadAudioFile(fileUrl: string): Promise<Buffer> {
    try {
      console.log(`📥 Downloading audio file from: ${fileUrl}`);
      
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio file: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log(`✅ Downloaded audio file: ${buffer.length} bytes`);
      return buffer;
      
    } catch (error) {
      console.error('Error downloading audio file:', error);
      throw new Error(`Failed to download audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Queue job for admin manual transcription
   */
  private async queueForAdmin(jobId: string): Promise<void> {
    console.log(`🎯 Queuing job ${jobId} for admin manual transcription`);
    
    try {
      await updateDoc(doc(db, 'transcriptions', jobId), {
        status: 'queued_for_admin',
        submittedAt: serverTimestamp(),
        queuedAt: serverTimestamp()
      });

      console.log(`✅ Job ${jobId} successfully queued for admin review`);

    } catch (error) {
      console.error(`❌ Error queuing job for admin ${jobId}:`, error);
      await updateDoc(doc(db, 'transcriptions', jobId), {
        status: 'error',
        error: error instanceof Error ? error.message : 'Admin queueing failed',
        errorAt: serverTimestamp()
      });
      throw error;
    }
  }

  /**
   * Admin completes manual transcription
   */
  async submitAdminTranscription(
    jobId: string,
    transcription: string,
    adminNotes?: string,
    reviewedBy?: string
  ): Promise<void> {
    
    const adminData: AdminTranscriptionData = {
      adminTranscript: transcription,
      adminNotes,
      reviewedBy,
      reviewedAt: serverTimestamp() as any,
      processingTime: Date.now() // Could calculate actual time
    };

    await updateDoc(doc(db, 'transcriptions', jobId), {
      status: 'completed',
      adminData,
      finalTranscript: transcription,
      completedAt: serverTimestamp()
    });

    console.log(`✅ Admin completed transcription for job ${jobId}`);
  }

  /**
   * Get jobs queued for admin review (includes queued, in progress, and completed)
   */
  async getAdminQueue(): Promise<SimplifiedTranscriptionJobData[]> {
    // Get all jobs that were meant for admin transcription
    const adminStatuses = ['queued_for_admin', 'admin_review', 'completed'];
    const allAdminJobs: SimplifiedTranscriptionJobData[] = [];

    // Fetch jobs for each status separately (to avoid complex composite indexes)
    for (const status of adminStatuses) {
      try {
        const statusQuery = query(
          collection(db, 'transcriptions'),
          where('status', '==', status),
          orderBy('createdAt', 'desc')
        );

        const jobs = await getDocs(statusQuery);
        const mappedJobs = jobs.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SimplifiedTranscriptionJobData[];
        
        const statusJobs = mappedJobs.filter(job => 
          // Only include jobs that were originally intended for admin manual transcription
          job.mode === 'manual' || 
          job.status === 'queued_for_admin' || 
          job.status === 'admin_review' ||
          (job.status === 'completed' && job.adminData)
        );

        allAdminJobs.push(...statusJobs);
      } catch (error) {
        console.warn(`Could not fetch jobs with status ${status}:`, error);
      }
    }

    // Sort by creation date (newest first)
    allAdminJobs.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.parse(a.createdAt as any);
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.parse(b.createdAt as any);
      return bTime - aTime;
    });

    return allAdminJobs;
  }

  /**
   * Mark job as in progress when admin starts working on it
   */
  async markJobInProgress(jobId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'transcriptions', jobId), {
        status: 'admin_review',
        adminStartedAt: serverTimestamp()
      });
      console.log(`✅ Job ${jobId} marked as in progress by admin`);
    } catch (error) {
      console.error(`❌ Error marking job ${jobId} as in progress:`, error);
      throw error;
    }
  }

  /**
   * Get jobs by mode for admin monitoring
   */
  async getJobsByMode(mode: TranscriptionMode): Promise<SimplifiedTranscriptionJobData[]> {
    const jobsQuery = query(
      collection(db, 'transcriptions'),
      where('mode', '==', mode),
      orderBy('createdAt', 'desc')
    );

    const jobs = await getDocs(jobsQuery);
    return jobs.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SimplifiedTranscriptionJobData[];
  }

  /**
   * Generate realistic sample transcript for demo purposes
   * In production, this would be replaced with actual OpenAI Whisper processing
   */
  private generateSampleTranscript(fileName: string, _mode: TranscriptionMode): string {
    const sampleTranscripts = {
      business: "Thank you for joining today's quarterly review meeting. Let me start by discussing our key performance indicators for this quarter. Our revenue has increased by 15% compared to the same period last year, which is encouraging. However, we need to address some challenges in our customer retention metrics. The team has been working on improving our onboarding process, and I'm pleased to report that we've seen a 20% improvement in user engagement during the first 30 days. Moving forward, we'll be focusing on expanding our market reach while maintaining the quality of service that our customers expect. Are there any questions about these results?",
      
      interview: "Good afternoon, thank you for taking the time to speak with me today. Could you please start by telling me a bit about your background and experience in this field? I've been working in this industry for about eight years now, starting as an entry-level analyst and gradually working my way up. I'm particularly passionate about data-driven decision making and how technology can improve business processes. In my current role, I've led several successful projects that resulted in significant cost savings and efficiency improvements. What I find most rewarding is mentoring junior team members and seeing them grow in their careers. I believe collaboration and continuous learning are key to success in any organization.",
      
      lecture: "Welcome to today's lecture on artificial intelligence and machine learning. Before we dive into the technical aspects, let's establish a foundational understanding of what AI really means. Artificial intelligence refers to the simulation of human intelligence in machines that are programmed to think and learn like humans. Machine learning, a subset of AI, involves algorithms that can automatically improve their performance through experience. We'll explore different types of machine learning including supervised learning, unsupervised learning, and reinforcement learning. Each approach has its own applications and benefits. For example, supervised learning is commonly used in image recognition and natural language processing.",
      
      conversation: "Hey, how was your weekend? Oh, it was great! I went hiking with some friends up in the mountains. The weather was perfect, and the views were absolutely stunning. We even saw some deer along the trail. That sounds amazing! I've been wanting to get out more myself. Maybe next time I can join you guys? Absolutely! We usually go every other weekend. It's such a great way to disconnect from work and just enjoy nature. Plus, it's good exercise too. I've been trying to stay more active lately. Same here. I think being outdoors really helps with stress relief. There's something about fresh air and physical activity that just clears your mind."
    };

    // Choose appropriate sample based on filename or default to business
    const fileType = fileName.toLowerCase();
    if (fileType.includes('interview')) return sampleTranscripts.interview;
    if (fileType.includes('lecture') || fileType.includes('class') || fileType.includes('presentation')) return sampleTranscripts.lecture;
    if (fileType.includes('conversation') || fileType.includes('chat') || fileType.includes('call')) return sampleTranscripts.conversation;
    
    return sampleTranscripts.business;
  }

  /**
   * Update user transcription usage statistics
   */
  private async updateUserTranscriptionUsage(userId: string, estimatedDuration: number): Promise<void> {
    try {
      await updateUserUsage(userId, {
        trialUploads: 1,
        totalTranscribed: Math.round(estimatedDuration), // Duration is already in minutes
        trialTimeUsed: Math.round(estimatedDuration)
      });
      console.log(`📊 Updated usage stats for user ${userId}: +1 upload, +${Math.round(estimatedDuration)} minutes`);
    } catch (error) {
      console.error('Failed to update user usage statistics:', error);
      // Don't fail the transcription if usage stats update fails
    }
  }

  /**
   * Refund credits for failed transcription jobs
   */
  private async refundCreditsForFailedJob(jobId: string, userId: string): Promise<void> {
    try {
      const jobDoc = await getDocs(
        query(collection(db, 'transcriptions'), where('__name__', '==', jobId))
      );
      
      if (jobDoc.empty) {
        console.error(`Job ${jobId} not found for refund`);
        return;
      }
      
      const jobData = jobDoc.docs[0].data() as SimplifiedTranscriptionJobData;
      const creditsToRefund = jobData.creditsUsed;
      
      if (!creditsToRefund || creditsToRefund <= 0) {
        console.log(`No credits to refund for job ${jobId}`);
        return;
      }
      
      await creditService.refundCredits(
        userId,
        creditsToRefund,
        `Refund for failed transcription: ${jobData.fileName}`,
        jobId
      );
      
      console.log(`💳 Refunded ${creditsToRefund} credits to user ${userId} for failed job ${jobId}`);
      
    } catch (error) {
      console.error(`Failed to refund credits for job ${jobId}:`, error);
      // Don't throw error as this is a recovery operation
    }
  }
}

export const transcriptionModesService = new SimplifiedTranscriptionModesService();