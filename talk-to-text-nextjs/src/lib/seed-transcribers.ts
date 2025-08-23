import { db } from './firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { HumanTranscriber } from '@/types/transcription-modes';

/**
 * Seed some test transcribers for development/testing
 */
export async function seedTestTranscribers(): Promise<void> {
  try {
    // Check if transcribers already exist
    const existingTranscribers = await getDocs(
      query(collection(db, 'human_transcribers'), where('status', '==', 'active'))
    );
    
    if (existingTranscribers.size > 0) {
      console.log(`${existingTranscribers.size} transcribers already exist, skipping seeding`);
      return;
    }

    // Create test transcribers
    const testTranscribers: Omit<HumanTranscriber, 'id'>[] = [
      {
        userId: 'transcriber_sarah',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@example.com',
        rating: 4.8,
        completedJobs: 245,
        specializations: ['legal', 'medical'],
        languages: ['en', 'fr'],
        status: 'active',
        averageCompletionTime: 180,
        certifications: ['Legal Transcription Certified'],
        createdAt: new Date() as any,
        lastActiveAt: new Date() as any
      },
      {
        userId: 'transcriber_michael',
        name: 'Michael Chen',
        email: 'michael.chen@example.com',
        rating: 4.9,
        completedJobs: 312,
        specializations: ['business', 'academic'],
        languages: ['en', 'zh'],
        status: 'active',
        averageCompletionTime: 150,
        certifications: ['Business Transcription Expert'],
        createdAt: new Date() as any,
        lastActiveAt: new Date() as any
      },
      {
        userId: 'transcriber_emma',
        name: 'Emma Rodriguez',
        email: 'emma.rodriguez@example.com',
        rating: 4.7,
        completedJobs: 189,
        specializations: ['medical', 'general'],
        languages: ['en', 'es'],
        status: 'active',
        averageCompletionTime: 200,
        certifications: ['Medical Transcription Certified'],
        createdAt: new Date() as any,
        lastActiveAt: new Date() as any
      }
    ];

    // Add transcribers to Firestore
    for (const transcriber of testTranscribers) {
      await addDoc(collection(db, 'human_transcribers'), transcriber);
    }

    console.log(`✅ Successfully seeded ${testTranscribers.length} test transcribers`);
  } catch (error) {
    console.error('Error seeding transcribers:', error);
    throw error;
  }
}

/**
 * Remove all test transcribers (for cleanup)
 */
export async function removeTestTranscribers(): Promise<void> {
  try {
    const { deleteDoc } = await import('firebase/firestore');
    const transcribers = await getDocs(collection(db, 'human_transcribers'));
    
    for (const transcriber of transcribers.docs) {
      await deleteDoc(transcriber.ref);
    }
    
    console.log(`✅ Removed ${transcribers.size} test transcribers`);
  } catch (error) {
    console.error('Error removing transcribers:', error);
    throw error;
  }
}