import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  sendPasswordResetEmail,
  sendEmailVerification,
  applyActionCode,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
  confirmPasswordReset as firebaseConfirmPasswordReset,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User } from '../types/user';

// Auth state management
let currentUser: User | null = null;
let authStateListeners: ((user: User | null) => void)[] = [];

export const subscribeToAuthState = (callback: (user: User | null) => void) => {
  authStateListeners.push(callback);
  return () => {
    authStateListeners = authStateListeners.filter(listener => listener !== callback);
  };
};

const notifyAuthStateListeners = (user: User | null) => {
  currentUser = user;
  authStateListeners.forEach(listener => listener(user));
};

// Initialize auth state listener
onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
  if (firebaseUser) {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const user: User = {
          id: userDoc.id,
          ...userData,
          createdAt: userData.createdAt?.toDate() || new Date(),
          updatedAt: userData.updatedAt?.toDate() || new Date(),
          birthdate: userData.birthdate?.toDate(),
        } as User;
        notifyAuthStateListeners(user);
      } else {
        notifyAuthStateListeners(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      notifyAuthStateListeners(null);
    }
  } else {
    notifyAuthStateListeners(null);
  }
});

// Login
export const login = async (email: string, password: string): Promise<User> => {
  try {
    // Firebase Auth handles password verification - if this succeeds, password is correct
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (!userDoc.exists()) {
      // User exists in Auth but not in Firestore - this shouldn't happen
      await signOut(auth);
      throw new Error('User account exists but user data not found. Please contact administrator.');
    }

    const userData = userDoc.data();
    
    // Note: We don't check Firestore password here because Firebase Auth already verified it
    // The password field in Firestore is for admin viewing only (hashed or plain text)

    const user: User = {
      id: userDoc.id,
      ...userData,
      createdAt: userData.createdAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
      birthdate: userData.birthdate?.toDate(),
    } as User;

    if (!user.isActive) {
      await signOut(auth);
      throw new Error('Account is deactivated. Please contact administrator.');
    }

    return user;
  } catch (error: unknown) {
    console.error('Login error:', error);
    
    // Firebase Auth errors have a code property
    const firebaseError = error as { code?: string; message?: string };
    
    // Provide more helpful error messages
    if (firebaseError.code === 'auth/user-not-found') {
      throw new Error('No account found with this email. Please create an account or contact administrator.');
    } else if (firebaseError.code === 'auth/wrong-password') {
      throw new Error('Incorrect password. Please try again or use "Forgot Password" to reset.');
    } else if (firebaseError.code === 'auth/invalid-email') {
      throw new Error('Invalid email format. Please check your email address.');
    } else if (firebaseError.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later or reset your password.');
    } else if (firebaseError.message) {
      throw new Error(firebaseError.message);
    } else {
      throw new Error('Failed to login. Please check your credentials and try again.');
    }
  }
};

// Logout
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
    notifyAuthStateListeners(null);
  } catch (error) {
    console.error('Logout error:', error);
    throw new Error('Failed to logout');
  }
};

// Password Reset
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: unknown) {
    console.error('Password reset error:', error);
    const firebaseError = error as { message?: string };
    throw new Error(firebaseError.message || 'Failed to send password reset email');
  }
};

// Verify Email
export const sendVerificationEmail = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user logged in');
  }
  
  try {
    await sendEmailVerification(user);
  } catch (error: unknown) {
    console.error('Email verification error:', error);
    const firebaseError = error as { message?: string };
    throw new Error(firebaseError.message || 'Failed to send verification email');
  }
};

// Verify Email Action Code
export const verifyEmail = async (actionCode: string): Promise<void> => {
  try {
    await applyActionCode(auth, actionCode);
  } catch (error: unknown) {
    console.error('Verify email error:', error);
    const firebaseError = error as { message?: string };
    throw new Error(firebaseError.message || 'Failed to verify email');
  }
};

// Verify Password Reset Code
export const verifyPasswordResetCode = async (actionCode: string): Promise<string> => {
  try {
    return await firebaseVerifyPasswordResetCode(auth, actionCode);
  } catch (error: unknown) {
    console.error('Verify password reset code error:', error);
    const firebaseError = error as { message?: string };
    throw new Error(firebaseError.message || 'Invalid or expired reset code');
  }
};

// Confirm Password Reset
export const confirmPasswordReset = async (actionCode: string, newPassword: string): Promise<void> => {
  try {
    await firebaseConfirmPasswordReset(auth, actionCode, newPassword);
  } catch (error: unknown) {
    console.error('Confirm password reset error:', error);
    const firebaseError = error as { message?: string };
    throw new Error(firebaseError.message || 'Failed to reset password');
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  return currentUser;
};

// Check if user is admin
export const isAdmin = (user: User | null): boolean => {
  return user?.role === 'administrator';
};

// Check if user can access module
export const canAccessModule = (user: User | null, moduleId: string): boolean => {
  if (!user) return false;
  if (isAdmin(user)) return true; // Admin can access all modules
  return user.enabledModules.includes(moduleId);
};
