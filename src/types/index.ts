export interface User {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: any;
  lastLogin: any;
}

export interface AuthContextType {
  user: any | null;
  userData: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}