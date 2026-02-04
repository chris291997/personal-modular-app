import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import * as bcrypt from 'bcryptjs';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // For Vercel, we'll use environment variables for the service account
    // You need to set these in Vercel dashboard
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
      });
    } else {
      // Fallback: try to use default credentials (for local dev with gcloud)
      admin.initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

const db = admin.firestore();
const auth = admin.auth();

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

  try {
    const { action, userId, userData } = request.body;

    switch (action) {
      case 'createUser':
        return await handleCreateUser(request, response, userData);
      case 'deleteUser':
        return await handleDeleteUser(request, response, userId);
      case 'resetPassword':
        return await handleResetPassword(request, response, userData);
      case 'sendVerificationEmail':
        return await handleSendVerificationEmail(request, response, userData);
      default:
        return response.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: getErrorMessage(error),
    });
  }
}

async function handleCreateUser(
  request: VercelRequest,
  response: VercelResponse,
  userData: any
) {
  try {
    const { email, password, name, role, enabledModules } = userData;

    if (!email || !password || !name) {
      return response.status(400).json({ error: 'Missing required fields' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: false, // Will be verified via email
    });

    // Create Firestore user document
    const now = admin.firestore.Timestamp.now();
    await db.collection('users').doc(userRecord.uid).set({
      email,
      password: hashedPassword, // Store hashed password
      name,
      role: role || 'member',
      enabledModules: enabledModules || [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Send verification email
    try {
      const link = await auth.generateEmailVerificationLink(email);
      // In production, send this link via your email service
      console.log('Verification link:', link);
    } catch (emailError) {
      console.error('Error generating verification link:', emailError);
    }

    return response.status(200).json({
      success: true,
      userId: userRecord.uid,
      message: 'User created successfully. Verification email sent.',
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return response.status(400).json({
      error: 'Failed to create user',
      message: error.message,
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

    // Delete from Firebase Auth
    await auth.deleteUser(userId);

    // Delete from Firestore
    await db.collection('users').doc(userId).delete();

    return response.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return response.status(400).json({
      error: 'Failed to delete user',
      message: error.message,
    });
  }
}

async function handleResetPassword(
  request: VercelRequest,
  response: VercelResponse,
  userData: any
) {
  try {
    const { email } = userData;

    if (!email) {
      return response.status(400).json({ error: 'Email required' });
    }

    // Generate password reset link
    const link = await auth.generatePasswordResetLink(email);

    // In production, send this link via your email service
    // For now, we'll return it (remove in production!)
    return response.status(200).json({
      success: true,
      resetLink: link, // Remove this in production!
      message: 'Password reset link generated',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return response.status(400).json({
      error: 'Failed to generate reset link',
      message: error.message,
    });
  }
}

async function handleSendVerificationEmail(
  request: VercelRequest,
  response: VercelResponse,
  userData: any
) {
  try {
    const { email } = userData;

    if (!email) {
      return response.status(400).json({ error: 'Email required' });
    }

    // Generate verification link
    const link = await auth.generateEmailVerificationLink(email);

    // In production, send this link via your email service
    // For now, we'll return it (remove in production!)
    return response.status(200).json({
      success: true,
      verificationLink: link, // Remove this in production!
      message: 'Verification email link generated',
    });
  } catch (error: any) {
    console.error('Send verification email error:', error);
    return response.status(400).json({
      error: 'Failed to generate verification link',
      message: error.message,
    });
  }
}
