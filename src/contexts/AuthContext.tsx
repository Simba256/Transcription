'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuthChanges, getUserData, signOut as firebaseSignOut, signIn as firebaseSignIn, signUp as firebaseSignUp, forgotPassword as firebaseForgotPassword } from '@/lib/firebase/auth';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { getCookie } from 'cookies-next';

interface AuthContextType {
  user: User | null;
  userData: any | null;
  loading: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signUpWithGoogle: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserData: (data: Partial<any>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isLoading: false,
  isInitialized: false,
  signIn: async () => {},
  signUp: async () => {},
  signUpWithGoogle: async () => {},
  forgotPassword: async () => {},
  signOut: async () => {},
  updateUserData: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isInitialized = mounted;

  // Prevent hydration mismatch by ensuring client-side only execution
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch additional user data from Firestore
        const data = await getUserData(firebaseUser.uid);
        setUserData(data);

        // Set auth token - this will only run on the client since Firebase auth only works client-side
        try {
          // Always get a fresh token to ensure it's valid
          const idToken = await firebaseUser.getIdToken(true); // Force refresh
          document.cookie = `auth-token=${idToken}; path=/; max-age=${60 * 60}; SameSite=Lax`; // 1 hour expiry
        } catch (error) {
          console.warn('Cookie handling error:', error);
        }

        // Redirect based on role and current path
        if (pathname === '/signin' || pathname === '/signup' || pathname === '/') {
          if (data?.role === 'admin') {
            router.push('/admin');
          } else {
            router.push('/dashboard');
          }
        }
      } else {
        setUserData(null);
        
        // Redirect to signin if on protected route
        if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
          router.push('/signin');
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [mounted, pathname, router]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await firebaseSignIn(email, password);
      if (result.error) {
        throw new Error(result.error);
      }
      // User state will be updated by the auth state listener
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const result = await firebaseSignUp(email, password, name);
      if (result.error) {
        throw new Error(result.error);
      }
      // User state will be updated by the auth state listener
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithGoogle = async () => {
    // TODO: Implement Google sign-up
    throw new Error('Google sign-up not implemented yet');
  };

  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const result = await firebaseForgotPassword(email);
      if (result.error) {
        throw new Error(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);

    // Clear the auth token cookie
    document.cookie = 'auth-token=; path=/; max-age=0';

    await firebaseSignOut();
    setUser(null);
    setUserData(null);
    router.push('/signin');
    setLoading(false);
  };

  const updateUserData = async (data: Partial<any>) => {
    if (!user || !userData) {
      throw new Error('User not authenticated');
    }

    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', user.uid);
      
      // Update Firestore
      await updateDoc(userRef, data);
      
      // Update local state
      setUserData(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Fetch fresh data from Firestore
      const freshUserData = await getUserData(user.uid);
      setUserData(freshUserData);
    } catch (error) {
      console.error('Error refreshing user data:', error);
      throw error;
    }
  };

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <AuthContext.Provider value={{ 
        user: null, 
        userData: null, 
        loading: true, 
        isLoading: false,
        isInitialized: false,
        signIn: async () => {},
        signUp: async () => {},
        signUpWithGoogle: async () => {},
        forgotPassword: async () => {},
        signOut: async () => {},
        updateUserData: async () => {},
        refreshUser: async () => {}
      }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, isLoading, isInitialized, signIn, signUp, signUpWithGoogle, forgotPassword, signOut, updateUserData, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};