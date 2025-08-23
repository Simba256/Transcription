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
import { speechmaticsService } from './speechmatics';
import { updateUserUsage } from './firestore';
import { 
  TranscriptionMode, 
  ExtendedTranscriptionJobData, 
  HumanTranscriberAssignment,
  HumanTranscriber,
  TranscriptionModeSelection,
  HybridTranscriptionData
} from '@/types/transcription-modes';

export class TranscriptionModesService {
  
  /**
   * Create a new transcription job with mode-specific handling
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
    
    const jobData: Omit<ExtendedTranscriptionJobData, 'id'> = {
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
      createdAt: serverTimestamp() as any,
      ...(modeSelection.specialRequirements && { tags: ['special_requirements'] })
    };

    const docRef = await addDoc(collection(db, 'transcriptions'), jobData);
    
    // Route to appropriate processing pipeline
    await this.routeToProcessor(docRef.id, modeSelection);
    
    return docRef.id;
  }

  /**
   * Route transcription job to appropriate processor based on mode
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
        await this.assignToHumanTranscriber(jobId, modeSelection);
        break;
      
      case 'hybrid':
        await this.processHybridTranscription(jobId, modeSelection);
        break;
    }
  }

  /**
   * Process AI-only transcription (existing Speechmatics flow)
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
      
      const jobData = jobDoc.docs[0].data() as ExtendedTranscriptionJobData;
      
      // Download file from URL and submit to Speechmatics
      const response = await fetch(jobData.fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const config = {
        type: 'transcription' as const,
        transcription_config: {
          language: jobData.language,
          ...(jobData.diarization && { diarization: 'speaker' as const })
        }
      };
      
      const speechmaticsResponse = await speechmaticsService.submitTranscriptionJob(
        buffer,
        jobData.fileName,
        config
      );

      // Extract job ID from response
      const speechmaticsJobId = typeof speechmaticsResponse === 'string' 
        ? speechmaticsResponse 
        : speechmaticsResponse.job_id;

      console.log('Speechmatics job submitted:', speechmaticsJobId);

      // Update with Speechmatics job ID
      await updateDoc(doc(db, 'transcriptions', jobId), {
        speechmaticsJobId,
        speechmaticsStatus: 'running'
      });

      // Start automatic server-side background polling
      this.startBackgroundPolling(speechmaticsJobId, jobId);

      // Update user usage statistics
      console.log(`🎯 About to update usage stats for user ${jobData.userId}, duration: ${jobData.duration || 0} minutes`);
      try {
        await this.updateUserTranscriptionUsage(jobData.userId, jobData.duration || 0);
      } catch (usageError) {
        console.error('Error updating usage stats:', usageError);
        // Continue processing even if usage update fails
      }

    } catch (error) {
      await updateDoc(doc(db, 'transcriptions', jobId), {
        status: 'error',
        error: error instanceof Error ? error.message : 'AI processing failed',
        errorAt: serverTimestamp()
      });
    }
  }

  /**
   * Assign job to human transcriber
   */
  private async assignToHumanTranscriber(
    jobId: string, 
    modeSelection: TranscriptionModeSelection
  ): Promise<void> {
    console.log(`🎯 Starting human transcriber assignment for job ${jobId}`);
    
    try {
      // Find available transcriber
      const availableTranscriber = await this.findAvailableTranscriber(modeSelection);
      
      if (!availableTranscriber) {
        console.log('⚠️ No transcribers available, queueing job');
        // Add to queue if no transcriber available
        await updateDoc(doc(db, 'transcriptions', jobId), {
          status: 'pending',
          error: 'No human transcribers available - job queued for assignment',
          queuedAt: serverTimestamp(),
          // Mark as properly submitted even though waiting for transcriber
          humanTranscriptionQueued: true
        });
        return;
      }

      console.log(`✅ Assigning to transcriber: ${availableTranscriber.name} (${availableTranscriber.id})`);

      // Create assignment
      const assignmentData: Omit<HumanTranscriberAssignment, 'id'> = {
        transcriptionId: jobId,
        transcriberId: availableTranscriber.id!,
        assignedAt: serverTimestamp() as any,
        status: 'assigned',
        estimatedCompletion: this.calculateEstimatedCompletion(modeSelection.priority)
      };

      const assignmentRef = await addDoc(collection(db, 'transcriber_assignments'), assignmentData);
      console.log(`📝 Created assignment record: ${assignmentRef.id}`);

      // Update job status
      await updateDoc(doc(db, 'transcriptions', jobId), {
        status: 'assigned',
        assignedTranscriber: availableTranscriber.id,
        humanAssignmentId: assignmentRef.id,
        submittedAt: serverTimestamp()
      });

      console.log(`✅ Job ${jobId} successfully assigned to ${availableTranscriber.name}`);

      // Notify transcriber (implement notification service)
      await this.notifyTranscriber(availableTranscriber.id!, jobId);

    } catch (error) {
      console.error(`❌ Error assigning human transcriber for job ${jobId}:`, error);
      await updateDoc(doc(db, 'transcriptions', jobId), {
        status: 'error',
        error: error instanceof Error ? error.message : 'Assignment failed',
        errorAt: serverTimestamp()
      });
      throw error; // Re-throw so the API route can handle it
    }
  }

  /**
   * Process hybrid transcription (AI first, then human review)
   */
  private async processHybridTranscription(
    jobId: string,
    modeSelection: TranscriptionModeSelection
  ): Promise<void> {
    try {
      // Step 1: Process with AI first
      await this.processAITranscription(jobId);
      
      // Note: The AI completion handler should trigger human assignment
      // This will be handled in the status polling system
      
    } catch (error) {
      await updateDoc(doc(db, 'transcriptions', jobId), {
        status: 'error',
        error: error instanceof Error ? error.message : 'Hybrid processing failed',
        errorAt: serverTimestamp()
      });
    }
  }

  /**
   * Handle AI completion in hybrid mode - assign to human for review
   */
  async handleHybridAICompletion(jobId: string): Promise<void> {
    try {
      const jobDoc = await getDocs(
        query(collection(db, 'transcriptions'), where('__name__', '==', jobId))
      );
      
      if (jobDoc.empty) throw new Error('Job not found');
      
      const jobData = jobDoc.docs[0].data() as ExtendedTranscriptionJobData;
      
      if (jobData.mode !== 'hybrid') return;

      // Store AI results in hybrid data
      const hybridData: HybridTranscriptionData = {
        aiTranscript: jobData.aiTranscript,
        aiProcessingTime: jobData.submittedAt && jobData.completedAt 
          ? (jobData.completedAt.seconds - jobData.submittedAt.seconds) / 60 
          : undefined
      };

      // Update job for human review
      await updateDoc(doc(db, 'transcriptions', jobId), {
        status: 'human_review',
        hybridData,
        completedAt: null // Reset completion time
      });

      // Assign to human transcriber for review
      await this.assignToHumanTranscriber(jobId, {
        mode: 'hybrid',
        priority: jobData.priority,
        qualityLevel: 'standard'
      });

    } catch (error) {
      console.error('Hybrid AI completion handling failed:', error);
    }
  }

  /**
   * Find available transcriber based on workload (least total minutes remaining)
   */
  private async findAvailableTranscriber(
    modeSelection: TranscriptionModeSelection
  ): Promise<HumanTranscriber | null> {
    
    console.log('🔍 Finding available transcriber for mode:', modeSelection);
    
    // Get all active transcribers
    const transcriberQuery = query(
      collection(db, 'human_transcribers'),
      where('status', '==', 'active')
    );

    const transcribersSnapshot = await getDocs(transcriberQuery);
    
    if (transcribersSnapshot.empty) {
      console.log('❌ No active transcribers found');
      return null;
    }

    console.log(`📋 Found ${transcribersSnapshot.size} active transcribers`);

    // Calculate workload for each transcriber
    const transcriberWorkloads: Array<{
      transcriber: HumanTranscriber;
      currentWorkloadMinutes: number;
    }> = [];

    for (const transcriberDoc of transcribersSnapshot.docs) {
      const transcriber = {
        id: transcriberDoc.id,
        ...transcriberDoc.data()
      } as HumanTranscriber;

      // Calculate current workload (total minutes of pending/assigned jobs)
      const workload = await this.calculateTranscriberWorkload(transcriber.id!);
      
      transcriberWorkloads.push({
        transcriber,
        currentWorkloadMinutes: workload
      });

      console.log(`👤 ${transcriber.name}: ${workload} minutes remaining`);
    }

    // Sort by workload (ascending - least busy first)
    transcriberWorkloads.sort((a, b) => a.currentWorkloadMinutes - b.currentWorkloadMinutes);

    const selectedTranscriber = transcriberWorkloads[0].transcriber;
    console.log(`✅ Selected transcriber: ${selectedTranscriber.name} (${transcriberWorkloads[0].currentWorkloadMinutes} min remaining)`);
    
    return selectedTranscriber;
  }

  /**
   * Calculate current workload for a transcriber (total minutes of active jobs)
   */
  private async calculateTranscriberWorkload(transcriberId: string): Promise<number> {
    try {
      // Get all active assignments for this transcriber
      const assignmentsQuery = query(
        collection(db, 'transcriber_assignments'),
        where('transcriberId', '==', transcriberId),
        where('status', 'in', ['assigned', 'in_progress'])
      );

      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      let totalMinutes = 0;

      for (const assignmentDoc of assignmentsSnapshot.docs) {
        const assignment = assignmentDoc.data() as HumanTranscriberAssignment;
        
        // Get the transcription job to find duration
        const jobQuery = query(
          collection(db, 'transcriptions'),
          where('__name__', '==', assignment.transcriptionId)
        );
        
        const jobSnapshot = await getDocs(jobQuery);
        if (!jobSnapshot.empty) {
          const jobData = jobSnapshot.docs[0].data() as ExtendedTranscriptionJobData;
          
          // Estimate transcription time (typically 3-4x the audio duration)
          const audioDurationMinutes = (jobData.duration || 0) / 60;
          const transcriptionTimeEstimate = audioDurationMinutes * 3.5; // 3.5x multiplier
          
          totalMinutes += transcriptionTimeEstimate;
        }
      }

      return Math.round(totalMinutes);
    } catch (error) {
      console.error(`Error calculating workload for transcriber ${transcriberId}:`, error);
      return 0; // If error, assume no workload
    }
  }

  /**
   * Calculate estimated completion time based on priority
   */
  private calculateEstimatedCompletion(priority: string): any {
    const baseMinutes = priority === 'urgent' ? 60 : priority === 'high' ? 240 : 720; // 1h, 4h, 12h
    const completionTime = new Date();
    completionTime.setMinutes(completionTime.getMinutes() + baseMinutes);
    return completionTime;
  }

  /**
   * Notify transcriber of new assignment
   */
  private async notifyTranscriber(transcriberId: string, jobId: string): Promise<void> {
    // Implement notification logic (email, push notification, etc.)
    console.log(`Notifying transcriber ${transcriberId} of job ${jobId}`);
  }

  /**
   * Submit human transcription
   */
  async submitHumanTranscription(
    assignmentId: string,
    transcription: string,
    notes?: string
  ): Promise<void> {
    
    const assignmentDoc = await getDocs(
      query(collection(db, 'transcriber_assignments'), where('__name__', '==', assignmentId))
    );
    
    if (assignmentDoc.empty) throw new Error('Assignment not found');
    
    const assignment = assignmentDoc.docs[0].data() as HumanTranscriberAssignment;
    
    // Update assignment
    await updateDoc(doc(db, 'transcriber_assignments', assignmentId), {
      status: 'completed',
      completedAt: serverTimestamp()
    });

    // Update transcription job
    const jobDoc = doc(db, 'transcriptions', assignment.transcriptionId);
    const jobData = (await getDocs(
      query(collection(db, 'transcriptions'), where('__name__', '==', assignment.transcriptionId))
    )).docs[0]?.data() as ExtendedTranscriptionJobData;

    if (jobData.mode === 'hybrid') {
      // Update hybrid data
      const hybridData: HybridTranscriptionData = {
        ...jobData.hybridData,
        humanTranscript: transcription,
        humanNotes: notes,
        humanProcessingTime: assignment.assignedAt && Date.now() 
          ? (Date.now() - assignment.assignedAt.seconds * 1000) / 60000 
          : undefined
      };

      await updateDoc(jobDoc, {
        status: 'completed',
        hybridData,
        finalTranscript: transcription, // Human version takes precedence
        humanTranscript: transcription,
        humanNotes: notes,
        completedAt: serverTimestamp()
      });
    } else {
      // Human-only transcription
      await updateDoc(jobDoc, {
        status: 'completed',
        humanTranscript: transcription,
        finalTranscript: transcription,
        humanNotes: notes,
        completedAt: serverTimestamp()
      });
    }
  }

  /**
   * Get transcriber assignments
   */
  async getTranscriberAssignments(transcriberId: string): Promise<ExtendedTranscriptionJobData[]> {
    const assignmentsQuery = query(
      collection(db, 'transcriber_assignments'),
      where('transcriberId', '==', transcriberId),
      where('status', 'in', ['assigned', 'in_progress']),
      orderBy('assignedAt', 'desc')
    );

    const assignments = await getDocs(assignmentsQuery);
    const jobs: ExtendedTranscriptionJobData[] = [];

    for (const assignmentDoc of assignments.docs) {
      const assignment = assignmentDoc.data() as HumanTranscriberAssignment;
      
      const jobDoc = await getDocs(
        query(collection(db, 'transcriptions'), where('__name__', '==', assignment.transcriptionId))
      );
      
      if (!jobDoc.empty) {
        jobs.push({
          id: jobDoc.docs[0].id,
          ...jobDoc.docs[0].data(),
          humanAssignmentId: assignmentDoc.id
        } as ExtendedTranscriptionJobData);
      }
    }

    return jobs;
  }

  /**
   * Get transcriber stats
   */
  async getTranscriberStats(transcriberId: string): Promise<{
    totalJobs: number;
    completedJobs: number;
    averageRating: number;
    averageCompletionTime: number;
    earnings: number;
    activeJobs: number;
  }> {
    // Get all assignments for this transcriber
    const allAssignmentsQuery = query(
      collection(db, 'transcriber_assignments'),
      where('transcriberId', '==', transcriberId)
    );

    const allAssignments = await getDocs(allAssignmentsQuery);
    
    // Get active assignments
    const activeAssignmentsQuery = query(
      collection(db, 'transcriber_assignments'),
      where('transcriberId', '==', transcriberId),
      where('status', 'in', ['assigned', 'in_progress'])
    );

    const activeAssignments = await getDocs(activeAssignmentsQuery);

    // Get completed assignments
    const completedAssignmentsQuery = query(
      collection(db, 'transcriber_assignments'),
      where('transcriberId', '==', transcriberId),
      where('status', '==', 'completed')
    );

    const completedAssignments = await getDocs(completedAssignmentsQuery);

    // Calculate basic stats
    const totalJobs = allAssignments.size;
    const completedJobs = completedAssignments.size;
    const activeJobs = activeAssignments.size;

    // Get transcriber profile for rating and completion time
    const transcriberDoc = await getDocs(
      query(collection(db, 'human_transcribers'), where('__name__', '==', transcriberId))
    );

    let averageRating = 5.0;
    let averageCompletionTime = 45;

    if (!transcriberDoc.empty) {
      const transcriber = transcriberDoc.docs[0].data();
      averageRating = transcriber.rating || 5.0;
      averageCompletionTime = transcriber.averageCompletionTime || 45;
    }

    // Simple earnings calculation (could be more sophisticated)
    const earnings = completedJobs * 15.0; // $15 per completed job as base rate

    return {
      totalJobs,
      completedJobs,
      averageRating,
      averageCompletionTime,
      earnings,
      activeJobs
    };
  }

  /**
   * Get jobs by mode for admin/monitoring
   */
  async getJobsByMode(mode: TranscriptionMode): Promise<ExtendedTranscriptionJobData[]> {
    const jobsQuery = query(
      collection(db, 'transcriptions'),
      where('mode', '==', mode),
      orderBy('createdAt', 'desc')
    );

    const jobs = await getDocs(jobsQuery);
    return jobs.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ExtendedTranscriptionJobData[];
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
   * Start background polling for automatic completion (server-side)
   */
  private async startBackgroundPolling(speechmaticsJobId: string, firestoreDocId: string) {
    const maxAttempts = 60; // 30 minutes max (30 seconds * 60)
    let attempts = 0;

    const poll = async () => {
      try {
        if (attempts >= maxAttempts) {
          console.log(`Polling timeout for job ${speechmaticsJobId}`);
          await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
            status: 'error',
            error: 'Polling timeout exceeded',
            errorAt: serverTimestamp()
          });
          return;
        }

        const job = await speechmaticsService.getJobStatusDirect(speechmaticsJobId);
        
        if (!job || !job.status) {
          console.warn(`Invalid job status for ${speechmaticsJobId}:`, job);
          attempts++;
          setTimeout(poll, 30000); // Retry in 30 seconds
          return;
        }

        // Update Firestore with current status
        await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
          speechmaticsStatus: job.status,
          lastCheckedAt: serverTimestamp()
        });

        console.log(`🔄 Background polling job ${speechmaticsJobId}: ${job.status} (attempt ${attempts + 1}/${maxAttempts})`);

        if (job.status === 'done') {
          try {
            // Get transcript
            const transcript = await speechmaticsService.getTranscriptDirect(speechmaticsJobId, 'json-v2');
            const transcriptText = speechmaticsService.extractTextFromTranscript(transcript);
            
            // Update Firestore with completed transcript
            await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
              status: 'completed',
              transcript: transcriptText,
              fullTranscript: transcript,
              completedAt: serverTimestamp(),
              duration: job.duration
            });

            console.log(`✅ Background polling completed job ${speechmaticsJobId} successfully`);
          } catch (transcriptError) {
            console.error('Error retrieving transcript in background polling:', transcriptError);
            await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
              status: 'error',
              error: 'Failed to retrieve transcript',
              errorAt: serverTimestamp()
            });
          }
          return; // Stop polling
        } else if (job.status === 'rejected') {
          await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
            status: 'error',
            error: 'Job rejected by Speechmatics',
            errorAt: serverTimestamp()
          });
          console.log(`❌ Background polling: job ${speechmaticsJobId} rejected`);
          return; // Stop polling
        }

        // Continue polling if still running
        attempts++;
        setTimeout(poll, 30000); // Poll every 30 seconds

      } catch (error) {
        console.error(`Background polling error for job ${speechmaticsJobId}:`, error);
        attempts++;
        
        if (attempts >= maxAttempts) {
          await updateDoc(doc(db, 'transcriptions', firestoreDocId), {
            status: 'error',
            error: 'Background polling failed repeatedly',
            errorAt: serverTimestamp()
          });
        } else {
          setTimeout(poll, 30000); // Retry in 30 seconds
        }
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 5000); // Wait 5 seconds before first poll
    console.log(`🚀 Started background polling for job ${speechmaticsJobId} (Firestore ID: ${firestoreDocId})`);
  }
}

export const transcriptionModesService = new TranscriptionModesService();