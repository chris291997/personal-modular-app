import type { VercelRequest, VercelResponse } from '@vercel/node';
// Use default import for firebase-admin in Vercel ESM environment
import admin from 'firebase-admin';
import * as bcrypt from 'bcryptjs';

// Type definitions
type Firestore = admin.firestore.Firestore;
type Auth = admin.auth.Auth;

// Initialize Firebase Admin SDK
let db: Firestore | undefined;
let auth: Auth | undefined;

function initializeFirebaseAdmin() {
  // Check if already initialized (with safe access)
  if (admin.apps && admin.apps.length > 0) {
    // Already initialized
    if (!db || !auth) {
      db = admin.firestore();
      auth = admin.auth();
    }
    return;
  }

  try {
    // For Vercel, we'll use environment variables for the service account
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccount) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set. Please configure it in Vercel dashboard.');
    }

    let serviceAccountJson;
    try {
      serviceAccountJson = JSON.parse(serviceAccount);
    } catch (parseError) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON. Please check the format in Vercel dashboard.');
    }

    // Verify required fields in service account
    if (!serviceAccountJson.project_id || !serviceAccountJson.private_key || !serviceAccountJson.client_email) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT JSON is missing required fields (project_id, private_key, client_email)');
    }

    // Initialize Firebase Admin with service account
    // In Vercel ESM environment, admin.credential should be available
    if (!admin.credential || typeof admin.credential.cert !== 'function') {
      console.error('admin.credential:', admin.credential);
      console.error('admin object keys:', Object.keys(admin));
      throw new Error('Firebase Admin credential.cert is not available. This may be a firebase-admin version or import issue.');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountJson),
    });

    db = admin.firestore();
    auth = admin.auth();
    
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Firebase Admin initialization error:', errorMessage);
    console.error('Error details:', error);
    throw new Error(`Failed to initialize Firebase Admin SDK: ${errorMessage}`);
  }
}

// Don't initialize on module load - initialize lazily when needed
// This prevents errors if environment variables aren't set during module load

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Enable CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Ensure Firebase Admin is initialized
  try {
    if (!db || !auth) {
      initializeFirebaseAdmin();
    }
    // Double-check after initialization
    if (!db || !auth) {
      throw new Error('Firebase Admin services (db or auth) are not initialized');
    }
  } catch (initError) {
    console.error('Firebase Admin initialization failed:', initError);
    const errorMessage = getErrorMessage(initError);
    return response.status(500).json({
      error: 'Server configuration error',
      message: errorMessage,
      hint: errorMessage.includes('credential') 
        ? 'Firebase Admin credential module issue. Please check firebase-admin is properly installed and version is compatible with Vercel.'
        : 'Please check that FIREBASE_SERVICE_ACCOUNT is set in Vercel environment variables.',
    });
  }

  try {
    const { action, userId, userData, newPassword } = request.body;

    if (!action) {
      return response.status(400).json({ error: 'Missing action parameter' });
    }

    switch (action) {
      case 'createUser':
        return await handleCreateUser(request, response, userData);
      case 'deleteUser':
        return await handleDeleteUser(request, response, userId);
      case 'updatePassword':
        return await handleUpdatePassword(request, response, userId, newPassword);
      case 'resetPassword':
        return await handleResetPassword(request, response, userData);
      case 'sendVerificationEmail':
        return await handleSendVerificationEmail(request, response, userData);
      default:
        return response.status(400).json({ error: 'Invalid action', validActions: ['createUser', 'deleteUser', 'updatePassword', 'resetPassword', 'sendVerificationEmail'] });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    const errorMessage = getErrorMessage(error);
    return response.status(500).json({
      error: 'Internal server error',
      message: errorMessage,
      ...(errorMessage.includes('FIREBASE_SERVICE_ACCOUNT') && {
        hint: 'Please configure FIREBASE_SERVICE_ACCOUNT in Vercel dashboard > Settings > Environment Variables',
      }),
    });
  }
}

async function handleCreateUser(
  request: VercelRequest,
  response: VercelResponse,
  userData: unknown
) {
  try {
    if (!userData) {
      return response.status(400).json({ error: 'Missing userData in request body' });
    }

    // Type guard for userData
    const data = userData as {
      email?: string;
      password?: string;
      name?: string;
      role?: string;
      enabledModules?: string[];
    };
    const { email, password, name, role, enabledModules } = data;

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return response.status(400).json({ error: 'Missing or invalid email' });
    }
    if (!password || typeof password !== 'string') {
      return response.status(400).json({ error: 'Missing or invalid password' });
    }
    if (!name || typeof name !== 'string') {
      return response.status(400).json({ error: 'Missing or invalid name' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return response.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 6) {
      return response.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    console.log(`Creating user: ${email}, role: ${role || 'member'}`);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Ensure auth is initialized
    if (!auth) {
      throw new Error('Firebase Auth is not initialized');
    }

    // Create Firebase Auth user
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email,
        password,
        emailVerified: false, // Will be verified via email
      });
      console.log(`Firebase Auth user created: ${userRecord.uid}`);
    } catch (authError: unknown) {
      console.error('Firebase Auth error:', authError);
      const firebaseError = authError as { code?: string; message?: string };
      if (firebaseError.code === 'auth/email-already-exists') {
        return response.status(400).json({
          error: 'User already exists',
          message: 'A user with this email already exists in Firebase Auth',
        });
      }
      throw authError;
    }

    // Ensure db is initialized
    if (!db) {
      throw new Error('Firestore is not initialized');
    }

    // Create Firestore user document
    const now = admin.firestore.Timestamp.now();
    try {
      await db.collection('users').doc(userRecord.uid).set({
        email,
        password: hashedPassword, // Store hashed password
        name,
        role: role || 'member',
        enabledModules: enabledModules || [],
        isActive: true,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`Firestore user document created: ${userRecord.uid}`);
    } catch (firestoreError: unknown) {
      console.error('Firestore error:', firestoreError);
      // If Firestore fails, try to clean up the Auth user
      if (auth) {
        try {
          await auth.deleteUser(userRecord.uid);
        } catch (deleteError) {
          console.error('Failed to clean up Auth user:', deleteError);
        }
      }
      throw firestoreError;
    }

    // Generate verification email link (don't fail if this doesn't work)
    if (auth) {
      try {
        await auth.generateEmailVerificationLink(email);
        console.log('Verification link generated for:', email);
        // In production, send this link via your email service
        // For now, we'll just log it
      } catch (emailError: unknown) {
        const emailErr = emailError as { message?: string };
        console.warn('Could not generate verification link:', emailErr.message || 'Unknown error');
        // Don't fail the request if email generation fails
      }
    }

    return response.status(200).json({
      success: true,
      userId: userRecord.uid,
      email: email,
      name: name,
      role: role || 'member',
      message: 'User created successfully',
    });
  } catch (error: unknown) {
    console.error('Create user error:', error);
    const errorMessage = getErrorMessage(error);
    const firebaseError = error as { code?: string };
    
    // Provide helpful error messages
    if (firebaseError.code === 'auth/invalid-email') {
      return response.status(400).json({
        error: 'Invalid email format',
        message: errorMessage,
      });
    }
    if (firebaseError.code === 'auth/weak-password') {
      return response.status(400).json({
        error: 'Password is too weak',
        message: errorMessage,
      });
    }
    if (firebaseError.code === 'auth/email-already-exists') {
      return response.status(400).json({
        error: 'User already exists',
        message: errorMessage,
      });
    }

    return response.status(500).json({
      error: 'Failed to create user',
      message: errorMessage,
    });
  }
}

async function handleDeleteUser(
  request: VercelRequest,
  response: VercelResponse,
  userId: string
) {
  try {
    if (!userId) {
      return response.status(400).json({ error: 'User ID required' });
    }

    if (!auth) {
      throw new Error('Firebase Auth is not initialized');
    }
    if (!db) {
      throw new Error('Firestore is not initialized');
    }

    // Delete from Firebase Auth
    await auth.deleteUser(userId);

    // Delete from Firestore
    await db.collection('users').doc(userId).delete();

    return response.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Delete user error:', error);
    return response.status(400).json({
      error: 'Failed to delete user',
      message: getErrorMessage(error),
    });
  }
}

async function handleUpdatePassword(
  request: VercelRequest,
  response: VercelResponse,
  userId: string | undefined,
  newPassword: string | undefined
) {
  try {
    if (!auth) {
      throw new Error('Firebase Auth is not initialized');
    }

    if (!userId) {
      return response.status(400).json({ error: 'User ID required' });
    }

    if (!newPassword || newPassword.trim() === '') {
      return response.status(400).json({ error: 'New password required' });
    }

    if (newPassword.length < 6) {
      return response.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Update password using Firebase Admin SDK
    await auth.updateUser(userId, {
      password: newPassword,
    });

    return response.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error: unknown) {
    console.error('Update password error:', error);
    const firebaseError = error as { code?: string };
    
    if (firebaseError.code === 'auth/user-not-found') {
      return response.status(404).json({
        error: 'User not found',
        message: getErrorMessage(error),
      });
    }
    if (firebaseError.code === 'auth/weak-password') {
      return response.status(400).json({
        error: 'Password is too weak',
        message: getErrorMessage(error),
      });
    }

    return response.status(400).json({
      error: 'Failed to update password',
      message: getErrorMessage(error),
    });
  }
}

async function handleResetPassword(
  request: VercelRequest,
  response: VercelResponse,
  userData: unknown
) {
  try {
    if (!auth) {
      throw new Error('Firebase Auth is not initialized');
    }

    const data = userData as { email?: string };
    const { email } = data;

    if (!email) {
      return response.status(400).json({ error: 'Email required' });
    }

    // Generate password reset link
    const resetLink = await auth.generatePasswordResetLink(email);

    // In production, send this link via your email service
    // For now, we'll return it (remove in production!)
    return response.status(200).json({
      success: true,
      resetLink: resetLink, // Remove this in production!
      message: 'Password reset link generated',
    });
  } catch (error: unknown) {
    console.error('Reset password error:', error);
    return response.status(400).json({
      error: 'Failed to generate reset link',
      message: getErrorMessage(error),
    });
  }
}

async function handleSendVerificationEmail(
  request: VercelRequest,
  response: VercelResponse,
  userData: unknown
) {
  try {
    if (!auth) {
      throw new Error('Firebase Auth is not initialized');
    }

    const data = userData as { email?: string };
    const { email } = data;

    if (!email) {
      return response.status(400).json({ error: 'Email required' });
    }

    // Generate verification link
    const verificationLink = await auth.generateEmailVerificationLink(email);

    // In production, send this link via your email service
    // For now, we'll return it (remove in production!)
    return response.status(200).json({
      success: true,
      verificationLink: verificationLink, // Remove this in production!
      message: 'Verification email link generated',
    });
  } catch (error: unknown) {
    console.error('Send verification email error:', error);
    return response.status(400).json({
      error: 'Failed to generate verification link',
      message: getErrorMessage(error),
    });
  }
}
