import { 
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from './auth';

// User management
export const createUser = async (userId: string, userData: Partial<UserProfile>) => {
  if (!db) throw new Error('Firestore not initialized');
  
  const userDoc = doc(db, 'users', userId);
  await setDoc(userDoc, {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getUser = async (userId: string): Promise<UserProfile | null> => {
  if (!db) throw new Error('Firestore not initialized');
  
  const userDoc = doc(db, 'users', userId);
  const userSnap = await getDoc(userDoc);
  
  if (userSnap.exists()) {
    return userSnap.data() as UserProfile;
  }
  return null;
};

export const updateUser = async (userId: string, updates: Partial<UserProfile>) => {
  if (!db) throw new Error('Firestore not initialized');
  
  const userDoc = doc(db, 'users', userId);
  await updateDoc(userDoc, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

// Transcription management
export interface TranscriptionJob {
  id?: string;
  userId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  duration?: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  service: 'ai' | 'human' | 'hybrid' | 'legal';
  uploadedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  transcriptText?: string;
  confidence?: number;
  errorMessage?: string;
  metadata?: {
    speakerCount?: number;
    language?: string;
    customInstructions?: string;
  };
}

export const createTranscription = async (transcriptionData: Omit<TranscriptionJob, 'id'>) => {
  if (!db) throw new Error('Firestore not initialized');
  
  const transcriptionsRef = collection(db, 'transcriptions');
  const docRef = await addDoc(transcriptionsRef, {
    ...transcriptionData,
    uploadedAt: serverTimestamp(),
  });
  
  return docRef.id;
};

export const getTranscription = async (transcriptionId: string): Promise<TranscriptionJob | null> => {
  if (!db) throw new Error('Firestore not initialized');
  
  const transcriptionDoc = doc(db, 'transcriptions', transcriptionId);
  const transcriptionSnap = await getDoc(transcriptionDoc);
  
  if (transcriptionSnap.exists()) {
    return {
      id: transcriptionSnap.id,
      ...transcriptionSnap.data()
    } as TranscriptionJob;
  }
  return null;
};

export const updateTranscription = async (transcriptionId: string, updates: Partial<TranscriptionJob>) => {
  if (!db) throw new Error('Firestore not initialized');
  
  const transcriptionDoc = doc(db, 'transcriptions', transcriptionId);
  await updateDoc(transcriptionDoc, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const getUserTranscriptions = async (userId: string, limitCount = 10): Promise<TranscriptionJob[]> => {
  if (!db) throw new Error('Firestore not initialized');
  
  const transcriptionsRef = collection(db, 'transcriptions');
  const q = query(
    transcriptionsRef,
    where('userId', '==', userId),
    orderBy('uploadedAt', 'desc'),
    limit(limitCount)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as TranscriptionJob));
};

// Usage tracking
export interface UsageRecord {
  userId: string;
  date: string; // YYYY-MM-DD format
  uploads: number;
  minutesTranscribed: number;
  service: 'ai' | 'human' | 'hybrid' | 'legal';
  createdAt: Date;
  updatedAt: Date;
}

export const trackUsage = async (userId: string, service: string, minutes: number) => {
  if (!db) throw new Error('Firestore not initialized');
  
  const today = new Date().toISOString().split('T')[0];
  const usageId = `${userId}_${today}_${service}`;
  const usageDoc = doc(db, 'usage', usageId);
  
  const usageSnap = await getDoc(usageDoc);
  
  if (usageSnap.exists()) {
    // Update existing record
    const currentData = usageSnap.data() as UsageRecord;
    await updateDoc(usageDoc, {
      uploads: currentData.uploads + 1,
      minutesTranscribed: currentData.minutesTranscribed + minutes,
      updatedAt: serverTimestamp(),
    });
  } else {
    // Create new record
    await setDoc(usageDoc, {
      userId,
      date: today,
      uploads: 1,
      minutesTranscribed: minutes,
      service,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
};

export const getUserUsage = async (userId: string, days = 30): Promise<UsageRecord[]> => {
  if (!db) throw new Error('Firestore not initialized');
  
  const usageRef = collection(db, 'usage');
  const q = query(
    usageRef,
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(days)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as UsageRecord);
};

// Update user usage statistics
export const updateUserUsage = async (userId: string, usageUpdate: {
  trialUploads?: number;
  totalTranscribed?: number;
  trialTimeUsed?: number;
}) => {
  if (!db) throw new Error('Firestore not initialized');
  
  const userDoc = doc(db, 'users', userId);
  const userSnap = await getDoc(userDoc);
  
  if (userSnap.exists()) {
    const currentData = userSnap.data();
    const currentUsage = currentData.usage || {};
    
    const updatedUsage = {
      ...currentUsage,
      trialUploads: (currentUsage.trialUploads || 0) + (usageUpdate.trialUploads || 0),
      totalTranscribed: (currentUsage.totalTranscribed || 0) + (usageUpdate.totalTranscribed || 0),
      trialTimeUsed: (currentUsage.trialTimeUsed || 0) + (usageUpdate.trialTimeUsed || 0),
    };
    
    await updateDoc(userDoc, {
      usage: updatedUsage,
      updatedAt: serverTimestamp(),
    });
  } else {
    // Create user document if it doesn't exist
    await setDoc(userDoc, {
      usage: {
        trialUploads: usageUpdate.trialUploads || 0,
        totalTranscribed: usageUpdate.totalTranscribed || 0,
        trialTimeUsed: usageUpdate.trialTimeUsed || 0,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
};

// Legal templates
export interface LegalTemplate {
  id?: string;
  name: string;
  description: string;
  category: 'court_forms' | 'contracts' | 'agreements' | 'other';
  jurisdiction: 'ontario' | 'canada' | 'general';
  templateUrl: string;
  fields: {
    name: string;
    type: 'text' | 'date' | 'number' | 'select';
    required: boolean;
    options?: string[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export const getLegalTemplates = async (category?: string): Promise<LegalTemplate[]> => {
  if (!db) throw new Error('Firestore not initialized');
  
  const templatesRef = collection(db, 'legal_templates');
  let q = query(templatesRef, orderBy('name'));
  
  if (category) {
    q = query(templatesRef, where('category', '==', category), orderBy('name'));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as LegalTemplate));
};

// System settings
export const getSystemSettings = async (): Promise<Record<string, any>> => {
  if (!db) throw new Error('Firestore not initialized');
  
  const settingsDoc = doc(db, 'settings', 'app_config');
  const settingsSnap = await getDoc(settingsDoc);
  
  if (settingsSnap.exists()) {
    return settingsSnap.data();
  }
  
  // Return default settings if none exist
  return {
    trialLimits: {
      uploads: 3,
      minutes: 180, // 3 hours
    },
    supportedFormats: ['mp3', 'wav', 'm4a', 'mp4'],
    maxFileSize: 100 * 1024 * 1024, // 100MB
    processingTimeout: 30 * 60 * 1000, // 30 minutes
  };
};

// Helper function for complex queries
export const queryCollection = async (
  collectionName: string,
  constraints: QueryConstraint[]
): Promise<DocumentData[]> => {
  if (!db) throw new Error('Firestore not initialized');
  
  const collectionRef = collection(db, collectionName);
  const q = query(collectionRef, ...constraints);
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};