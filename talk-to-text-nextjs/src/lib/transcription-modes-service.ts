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
      tags: modeSelection.specialRequirements ? ['special_requirements'] : undefined
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
      
      // Submit to Speechmatics
      const speechmaticsJobId = await speechmaticsService.submitTranscriptionJob(
        jobData.fileUrl,
        jobData.language,
        jobData.diarization
      );

      // Update with Speechmatics job ID
      await updateDoc(doc(db, 'transcriptions', jobId), {
        speechmaticsJobId,
        speechmaticsStatus: 'running'
      });

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
    try {
      // Find available transcriber
      const availableTranscriber = await this.findAvailableTranscriber(modeSelection);
      
      if (!availableTranscriber) {
        // Add to queue if no transcriber available
        await updateDoc(doc(db, 'transcriptions', jobId), {
          status: 'pending',
          error: 'No transcribers available - added to queue'
        });
        return;
      }

      // Create assignment
      const assignmentData: Omit<HumanTranscriberAssignment, 'id'> = {
        transcriptionId: jobId,
        transcriberId: availableTranscriber.id!,
        assignedAt: serverTimestamp() as any,
        status: 'assigned',
        estimatedCompletion: this.calculateEstimatedCompletion(modeSelection.priority)
      };

      const assignmentRef = await addDoc(collection(db, 'transcriber_assignments'), assignmentData);

      // Update job status
      await updateDoc(doc(db, 'transcriptions', jobId), {
        status: 'assigned',
        assignedTranscriber: availableTranscriber.id,
        humanAssignmentId: assignmentRef.id,
        submittedAt: serverTimestamp()
      });

      // Notify transcriber (implement notification service)
      await this.notifyTranscriber(availableTranscriber.id!, jobId);

    } catch (error) {
      await updateDoc(doc(db, 'transcriptions', jobId), {
        status: 'error',
        error: error instanceof Error ? error.message : 'Assignment failed',
        errorAt: serverTimestamp()
      });
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
   * Find available transcriber based on requirements
   */
  private async findAvailableTranscriber(
    modeSelection: TranscriptionModeSelection
  ): Promise<HumanTranscriber | null> {
    
    const transcriberQuery = query(
      collection(db, 'human_transcribers'),
      where('status', '==', 'active'),
      orderBy('rating', 'desc')
    );

    const transcribers = await getDocs(transcriberQuery);
    
    // Simple assignment logic - can be enhanced with workload balancing
    return transcribers.empty ? null : {
      id: transcribers.docs[0].id,
      ...transcribers.docs[0].data()
    } as HumanTranscriber;
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
}

export const transcriptionModesService = new TranscriptionModesService();