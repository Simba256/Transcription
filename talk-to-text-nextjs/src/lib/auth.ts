import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  reload
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { validateEmail, EMAIL_VALIDATION_PRESETS } from './email-validation';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  emailVerified: boolean;
  emailVerificationSentAt?: Date;
  subscription?: {
    plan: 'trial' | 'ai' | 'human' | 'hybrid' | 'legal';
    status: 'active' | 'cancelled' | 'expired';
    startDate: Date;
    endDate?: Date;
  };
  usage: {
    trialUploads: number;
    trialTimeUsed: number; // in minutes
    totalTranscribed: number; // total minutes transcribed
  };
  createdAt: Date;
  updatedAt: Date;
}

// Sign up with email and password
export const signUpWithEmail = async (
  email: string, 
  password: string, 
  firstName: string, 
  lastName: string
): Promise<User> => {
  try {
    // Validate email before attempting to create account - only check format and block temp emails
    const emailValidation = validateEmail(email, EMAIL_VALIDATION_PRESETS.PERMISSIVE);
    
    if (!emailValidation.isValid) {
      throw new Error(emailValidation.errors[0] || 'Invalid email address');
    }

    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update the user's display name
    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`
    });

    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      displayName: `${firstName} ${lastName}`,
      firstName,
      lastName,
      emailVerified: user.emailVerified,
      emailVerificationSentAt: new Date(),
      subscription: {
        plan: 'trial',
        status: 'active',
        startDate: new Date(),
      },
      usage: {
        trialUploads: 0,
        trialTimeUsed: 0,
        totalTranscribed: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);
    
    // Send email verification
    try {
      await sendEmailVerification(user);
      console.log('Email verification sent successfully');
    } catch (verificationError) {
      console.warn('Failed to send email verification:', verificationError);
      // Don't throw here - user creation should still succeed
    }
    
    return user;
  } catch (error) {
    throw error;
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    // Validate email format before attempting to sign in
    const emailValidation = validateEmail(email, EMAIL_VALIDATION_PRESETS.PERMISSIVE);
    
    if (!emailValidation.isValid) {
      throw new Error('Please enter a valid email address');
    }

    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return user;
  } catch (error) {
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const provider = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, provider);
    
    // Check if user profile exists, create if not
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      const [firstName, ...lastNameParts] = user.displayName?.split(' ') || ['', ''];
      const lastName = lastNameParts.join(' ');
      
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName || '',
        photoURL: user.photoURL || undefined,
        firstName,
        lastName,
        emailVerified: user.emailVerified,
        subscription: {
          plan: 'trial',
          status: 'active',
          startDate: new Date(),
        },
        usage: {
          trialUploads: 0,
          trialTimeUsed: 0,
          totalTranscribed: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
    }
    
    return user;
  } catch (error) {
    throw error;
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

// Send password reset email
export const resetPassword = async (email: string): Promise<void> => {
  try {
    // Validate email format before sending reset email
    const emailValidation = validateEmail(email, EMAIL_VALIDATION_PRESETS.PERMISSIVE);
    
    if (!emailValidation.isValid) {
      throw new Error('Please enter a valid email address');
    }

    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw error;
  }
};

// Get user profile
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  try {
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };
    await setDoc(doc(db, 'users', uid), updateData, { merge: true });
  } catch (error) {
    throw error;
  }
};

// Send email verification
export const sendVerificationEmail = async (user?: User): Promise<void> => {
  try {
    const currentUser = user || auth.currentUser;
    if (!currentUser) {
      throw new Error('No user is currently signed in');
    }

    await sendEmailVerification(currentUser);
    
    // Update user profile with verification sent timestamp
    await updateUserProfile(currentUser.uid, {
      emailVerificationSentAt: new Date(),
    });
  } catch (error) {
    throw error;
  }
};

// Check if email is verified and update profile
export const checkEmailVerification = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No user is currently signed in');
    }

    // Reload user to get latest verification status
    await reload(currentUser);
    
    // Update user profile with current verification status
    if (currentUser.emailVerified) {
      await updateUserProfile(currentUser.uid, {
        emailVerified: true,
      });
    }

    return currentUser.emailVerified;
  } catch (error) {
    throw error;
  }
};

// Resend verification email with rate limiting
export const resendVerificationEmail = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No user is currently signed in');
    }

    if (currentUser.emailVerified) {
      throw new Error('Email is already verified');
    }

    // Check if we recently sent a verification email (rate limiting)
    const userProfile = await getUserProfile(currentUser.uid);
    if (userProfile?.emailVerificationSentAt) {
      const timeSinceLastSent = Date.now() - userProfile.emailVerificationSentAt.getTime();
      const oneMinute = 60 * 1000;
      
      if (timeSinceLastSent < oneMinute) {
        throw new Error('Please wait before requesting another verification email');
      }
    }

    await sendVerificationEmail(currentUser);
  } catch (error) {
    throw error;
  }
};

// Check if user must verify email before accessing features
export const requireEmailVerification = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return false;
    }

    // Always check the latest verification status
    await reload(currentUser);
    
    // Update Firestore if verification status has changed
    if (currentUser.emailVerified) {
      await updateUserProfile(currentUser.uid, {
        emailVerified: true,
      });
    }

    return !currentUser.emailVerified;
  } catch (error) {
    console.error('Error checking email verification:', error);
    return false;
  }
};