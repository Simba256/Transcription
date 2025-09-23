// Server-side transcription functions using Firebase Admin SDK
import { adminDb } from './admin';
import { FieldValue } from 'firebase-admin/firestore';

export type TranscriptionStatus = 'processing' | 'pending-review' | 'pending-transcription' | 'complete' | 'failed';
export type TranscriptionMode = 'ai' | 'hybrid' | 'human';

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
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp;
}

const TRANSCRIPTIONS_COLLECTION = 'transcriptions';

export const getTranscriptionByIdAdmin = async (id: string): Promise<TranscriptionJob | null> => {
  try {
    const docRef = adminDb.collection(TRANSCRIPTIONS_COLLECTION).doc(id);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as TranscriptionJob;
    }

    return null;
  } catch (error) {
    console.error('Error fetching transcription job from admin:', error);
    throw error;
  }
};

export const updateTranscriptionStatusAdmin = async (
  id: string,
  status: TranscriptionStatus,
  additionalData?: Partial<Omit<TranscriptionJob, 'id' | 'updatedAt' | 'createdAt'>>
): Promise<void> => {
  try {
    const docRef = adminDb.collection(TRANSCRIPTIONS_COLLECTION).doc(id);
    const updateData: any = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
      ...additionalData
    };

    if (status === 'complete') {
      updateData.completedAt = FieldValue.serverTimestamp();
    }

    await docRef.update(updateData);
    console.log(`[Admin] Updated transcription ${id} status to ${status}`);
  } catch (error) {
    console.error(`Error updating transcription status for ${id}:`, error);
    throw error;
  }
};

export const getAllTranscriptionJobsAdmin = async (): Promise<TranscriptionJob[]> => {
  try {
    const querySnapshot = await adminDb
      .collection(TRANSCRIPTIONS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TranscriptionJob));
  } catch (error) {
    console.error('Error fetching all transcription jobs:', error);
    throw error;
  }
};

export const getTranscriptionJobsByStatusAdmin = async (status: TranscriptionStatus): Promise<TranscriptionJob[]> => {
  try {
    const querySnapshot = await adminDb
      .collection(TRANSCRIPTIONS_COLLECTION)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TranscriptionJob));
  } catch (error) {
    console.error(`Error fetching transcription jobs by status ${status}:`, error);
    throw error;
  }
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