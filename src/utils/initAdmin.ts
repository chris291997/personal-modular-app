// Script to initialize admin user with secure setup
// Uses Firebase Admin SDK via API endpoint

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp, getDocs, query, where, collection } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import * as bcrypt from 'bcryptjs';

export const initializeAdminUser = async () => {
  try {
    const adminEmail = 'christopherbenosa81@gmail.com';
    const adminPassword = 'Admin@123!'; // Strong default password - change after first login!
    const adminName = 'chris';

    // Check if admin user already exists in Firestore
    const usersQuery = query(collection(db, 'users'), where('email', '==', adminEmail));
    const snapshot = await getDocs(usersQuery);

    if (!snapshot.empty) {
      console.log('Admin user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create Firebase Auth user
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('Admin user already exists in Firebase Auth');
        console.log('Please use the API endpoint to create the Firestore document with hashed password');
        return;
      }
      throw error;
    }

    // Create Firestore user document with hashed password
    const now = new Date();
    const userData = {
      email: adminEmail,
      password: hashedPassword, // Store hashed password
      name: adminName,
      role: 'administrator',
      enabledModules: [], // Empty array means all modules
      isActive: true,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), userData);
    
    // Send email verification
    try {
      const { sendEmailVerification } = await import('firebase/auth');
      await sendEmailVerification(userCredential.user);
      console.log('Verification email sent');
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
    }

    console.log('✅ Admin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('⚠️ Please change the password after first login!');
    console.log('⚠️ Please verify your email address!');
  } catch (error) {
    console.error('Error initializing admin user:', error);
    throw error;
  }
};
