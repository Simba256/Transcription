import { collection, doc, addDoc, getDocs, getDoc, updateDoc, query, where, orderBy, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from './config';

export type TranscriptionStatus = 'processing' | 'pending-review' | 'pending-transcription' | 'complete' | 'failed';
export type TranscriptionMode = 'ai' | 'hybrid' | 'human';

export interface TranscriptSegment {
  start: number; // Start time in seconds
  end: number;   // End time in seconds
  text: string;  // Text content
  confidence?: number; // Optional confidence score
}

export interface TranscriptionJob {
  id?: string;
  userId: string;
  filename: string;
  originalFilename: string;
  filePath: string;
  downloadURL: string;
  status: TranscriptionStatus;
  mode: TranscriptionMode;
  duration: number; // in seconds (exact duration)
  creditsUsed: number;
  specialInstructions?: string;
  transcript?: string;
  timestampedTranscript?: TranscriptSegment[]; // New field for timestamped data
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  // Template metadata fields
  clientName?: string;
  projectName?: string;
  providerName?: string;
  patientName?: string;
  location?: string;
  recordingTime?: string;
}

const TRANSCRIPTIONS_COLLECTION = 'transcriptions';

export const createTranscriptionJob = async (job: Omit<TranscriptionJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const jobWithTimestamps = {
    ...job,
    createdAt: now,
    updatedAt: now
  };
  
  const docRef = await addDoc(collection(db, TRANSCRIPTIONS_COLLECTION), jobWithTimestamps);
  return docRef.id;
};

export const getTranscriptionsByUser = async (userId: string): Promise<TranscriptionJob[]> => {
  const q = query(
    collection(db, TRANSCRIPTIONS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as TranscriptionJob));
};

export const getTranscriptionById = async (id: string): Promise<TranscriptionJob | null> => {
  const docRef = doc(db, TRANSCRIPTIONS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as TranscriptionJob;
  }
  
  return null;
};

export const updateTranscriptionStatus = async (
  id: string, 
  status: TranscriptionStatus, 
  additionalData?: Partial<TranscriptionJob>
): Promise<void> => {
  const docRef = doc(db, TRANSCRIPTIONS_COLLECTION, id);
  const updateData: Partial<TranscriptionJob> = {
    status,
    updatedAt: Timestamp.now(),
    ...additionalData
  };
  
  if (status === 'complete') {
    updateData.completedAt = Timestamp.now();
  }
  
  await updateDoc(docRef, updateData);
};

export const updateTranscriptionTranscript = async (id: string, transcript: string): Promise<void> => {
  const docRef = doc(db, TRANSCRIPTIONS_COLLECTION, id);
  await updateDoc(docRef, {
    transcript,
    status: 'complete' as TranscriptionStatus,
    updatedAt: Timestamp.now(),
    completedAt: Timestamp.now()
  });
};

export const deleteTranscriptionJob = async (id: string): Promise<void> => {
  const docRef = doc(db, TRANSCRIPTIONS_COLLECTION, id);
  await deleteDoc(docRef);
};

export const getAllTranscriptionJobs = async (): Promise<TranscriptionJob[]> => {
  const q = query(
    collection(db, TRANSCRIPTIONS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as TranscriptionJob));
};

export const getTranscriptionJobsByStatus = async (status: TranscriptionStatus): Promise<TranscriptionJob[]> => {
  const q = query(
    collection(db, TRANSCRIPTIONS_COLLECTION),
    where('status', '==', status),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as TranscriptionJob));
};

export const approveTranscriptionReview = async (id: string): Promise<void> => {
  await updateTranscriptionStatus(id, 'complete');
};

export const rejectTranscriptionJob = async (id: string, reason?: string): Promise<void> => {
  const additionalData: Partial<TranscriptionJob> = {};
  if (reason) {
    additionalData.specialInstructions = reason;
  }
  await updateTranscriptionStatus(id, 'failed', additionalData);
};

export const submitHumanTranscription = async (id: string, transcript: string): Promise<void> => {
  await updateTranscriptionTranscript(id, transcript);
};

export const getModeDetails = (mode: TranscriptionMode) => {
  const modeMap = {
    ai: {
      name: 'AI Transcription',
      description: 'Fast, automated transcription with good accuracy',
      creditsPerMinute: 100,
      turnaround: '60 minutes'
    },
    hybrid: {
      name: 'Hybrid Review',
      description: 'AI transcription reviewed by human experts',
      creditsPerMinute: 150,
      turnaround: '24-48 hours'
    },
    human: {
      name: 'Human Transcription',
      description: 'Professional human transcription for highest accuracy',
      creditsPerMinute: 200,
      turnaround: '24-72 hours'
    }
  };
  
  return modeMap[mode];
};