import { Timestamp } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';

export interface User {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: Timestamp;
  lastLogin: Timestamp;
}

export interface AuthContextType {
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}