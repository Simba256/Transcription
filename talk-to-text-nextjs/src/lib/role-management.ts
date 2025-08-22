import { db } from './firebase';
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { HumanTranscriber } from '@/types/transcription-modes';

export class RoleManagementService {
  
  /**
   * Assign transcriber role to a user after application approval
   */
  static async assignTranscriberRole(
    userId: string,
    applicationData: {
      fullName: string;
      email: string;
      phone: string;
      experience: string;
      languages: string[];
      specializations: string[];
      availableHours: number;
      timezone: string;
    }
  ): Promise<void> {
    
    try {
      // 1. Update user profile with transcriber role
      await updateDoc(doc(db, 'users', userId), {
        role: 'transcriber',
        roles: ['user', 'transcriber'],
        transcriberStatus: 'active',
        transcriberApplication: {
          status: 'approved',
          approvedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });

      // 2. Create transcriber profile
      const transcriberData: Omit<HumanTranscriber, 'id'> = {
        userId,
        email: applicationData.email,
        name: applicationData.fullName,
        status: 'active',
        specializations: applicationData.specializations,
        rating: 5.0, // Start with perfect rating
        completedJobs: 0,
        averageCompletionTime: this.getExpectedCompletionTime(applicationData.experience),
        languages: applicationData.languages,
        createdAt: serverTimestamp() as any,
        lastActiveAt: serverTimestamp() as any
      };

      await setDoc(doc(db, 'human_transcribers', userId), transcriberData);

      console.log(`Transcriber role assigned to user ${userId}`);
      
    } catch (error) {
      console.error('Failed to assign transcriber role:', error);
      throw error;
    }
  }

  /**
   * Revoke transcriber role
   */
  static async revokeTranscriberRole(userId: string): Promise<void> {
    try {
      // Update user profile
      await updateDoc(doc(db, 'users', userId), {
        role: 'user',
        roles: ['user'],
        transcriberStatus: 'inactive',
        updatedAt: serverTimestamp()
      });

      // Update transcriber profile to inactive
      await updateDoc(doc(db, 'human_transcribers', userId), {
        status: 'inactive',
        lastActiveAt: serverTimestamp()
      });

      console.log(`Transcriber role revoked for user ${userId}`);
      
    } catch (error) {
      console.error('Failed to revoke transcriber role:', error);
      throw error;
    }
  }

  /**
   * Check if user has transcriber role
   */
  static async hasTranscriberRole(userId: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return false;
      
      const userData = userDoc.data();
      return userData.role === 'transcriber' || 
             (userData.roles && userData.roles.includes('transcriber'));
             
    } catch (error) {
      console.error('Failed to check transcriber role:', error);
      return false;
    }
  }

  /**
   * Assign admin role (for setup purposes)
   */
  static async assignAdminRole(userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: 'admin',
        roles: ['user', 'admin'],
        updatedAt: serverTimestamp()
      });

      console.log(`Admin role assigned to user ${userId}`);
      
    } catch (error) {
      console.error('Failed to assign admin role:', error);
      throw error;
    }
  }

  /**
   * Get expected completion time based on experience level
   */
  private static getExpectedCompletionTime(experience: string): number {
    switch (experience) {
      case '0-1': return 60; // 60 minutes average for beginners
      case '1-3': return 45; // 45 minutes for intermediate
      case '3-5': return 35; // 35 minutes for experienced
      case '5+': return 25;  // 25 minutes for experts
      default: return 45;
    }
  }

  /**
   * Bulk role assignment utility (for admin use)
   */
  static async bulkAssignRoles(assignments: Array<{userId: string, role: string}>): Promise<void> {
    const promises = assignments.map(async ({ userId, role }) => {
      try {
        await updateDoc(doc(db, 'users', userId), {
          role,
          roles: ['user', role],
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error(`Failed to assign ${role} role to ${userId}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Get user roles
   */
  static async getUserRoles(userId: string): Promise<string[]> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return ['user'];
      
      const userData = userDoc.data();
      return userData.roles || [userData.role || 'user'];
      
    } catch (error) {
      console.error('Failed to get user roles:', error);
      return ['user'];
    }
  }
}

export default RoleManagementService;