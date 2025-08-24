import { db } from './firebase';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Simplified role system: only admin and user roles
export const ROLES = {
  ADMIN: 'admin',
  USER: 'user'
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export class RoleManagementService {

  /**
   * Assign admin role (for setup purposes)
   */
  static async assignAdminRole(userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: ROLES.ADMIN,
        roles: [ROLES.USER, ROLES.ADMIN],
        updatedAt: serverTimestamp()
      });

      console.log(`Admin role assigned to user ${userId}`);
      
    } catch (error) {
      console.error('Failed to assign admin role:', error);
      throw error;
    }
  }

  /**
   * Check if user has admin role
   */
  static async hasAdminRole(userId: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return false;
      
      const userData = userDoc.data();
      return userData.role === ROLES.ADMIN || 
             (userData.roles && userData.roles.includes(ROLES.ADMIN));
             
    } catch (error) {
      console.error('Failed to check admin role:', error);
      return false;
    }
  }

  /**
   * Revoke admin role (set back to user)
   */
  static async revokeAdminRole(userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: ROLES.USER,
        roles: [ROLES.USER],
        updatedAt: serverTimestamp()
      });

      console.log(`Admin role revoked for user ${userId}`);
      
    } catch (error) {
      console.error('Failed to revoke admin role:', error);
      throw error;
    }
  }

  /**
   * Get user roles
   */
  static async getUserRoles(userId: string): Promise<Role[]> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return [ROLES.USER];
      
      const userData = userDoc.data();
      return userData.roles || [userData.role || ROLES.USER];
      
    } catch (error) {
      console.error('Failed to get user roles:', error);
      return [ROLES.USER];
    }
  }

  /**
   * Check if user has specific role
   */
  static async hasRole(userId: string, role: Role): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return role === ROLES.USER;
      
      const userData = userDoc.data();
      return userData.role === role || 
             (userData.roles && userData.roles.includes(role));
             
    } catch (error) {
      console.error('Failed to check user role:', error);
      return false;
    }
  }
}

export default RoleManagementService;