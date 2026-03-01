/**
 * Script to create the admin user directly
 * Run with: npm run create-admin
 * 
 * This script creates the admin user in Firebase Auth and Firestore
 * without needing the Vercel serverless function.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { getFirestore, doc, setDoc, Timestamp, getDocs, query, where, collection } from 'firebase/firestore';
import * as bcrypt from 'bcryptjs';

// Firebase configuration (same as in src/firebase/config.ts)
const firebaseConfig = {
  apiKey: "AIzaSyCtkAfzoBkErY0HHTxWQ6fVw1ZfKRsko5I",
  authDomain: "personal-modular-app-3ca9e.firebaseapp.com",
  projectId: "personal-modular-app-3ca9e",
  storageBucket: "personal-modular-app-3ca9e.firebasestorage.app",
  messagingSenderId: "294365009691",
  appId: "1:294365009691:web:a69a01c794d3b5a680e5be",
  measurementId: "G-NS5QEBRTLV"
};

// Admin user credentials
const ADMIN_EMAIL = 'christopherbenosa81@gmail.com';
const ADMIN_PASSWORD = 'Admin@123!';
const ADMIN_NAME = 'chris';

type FirebaseLikeError = {
  code?: string;
  message?: string;
};

async function createAdminUser() {
  try {
    console.log('🚀 Starting admin user creation...\n');

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Check if user already exists in Firestore
    console.log('📋 Checking if admin user already exists...');
    const usersQuery = query(collection(db, 'users'), where('email', '==', ADMIN_EMAIL));
    const snapshot = await getDocs(usersQuery);

    if (!snapshot.empty) {
      console.log('✅ Admin user already exists in Firestore!');
      const existingUser = snapshot.docs[0].data();
      console.log(`   User ID: ${snapshot.docs[0].id}`);
      console.log(`   Name: ${existingUser.name}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log('\n⚠️  If you need to recreate the user, delete them first from Firebase Console.');
      return;
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Create Firebase Auth user
    console.log('👤 Creating Firebase Auth user...');
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      console.log(`✅ Firebase Auth user created!`);
      console.log(`   User ID: ${userCredential.user.uid}`);
    } catch (error: unknown) {
      const firebaseError = error as FirebaseLikeError;
      if (firebaseError.code === 'auth/email-already-in-use') {
        console.log('⚠️  User already exists in Firebase Auth');
        console.log('   Trying to find existing user...');
        
        // If user exists in Auth but not in Firestore, we need the UID
        // For now, we'll ask the user to check Firebase Console
        console.log('\n❌ User exists in Firebase Auth but not in Firestore.');
        console.log('   Please check Firebase Console > Authentication > Users');
        console.log('   Then manually create the Firestore document with the UID.');
        return;
      }
      throw error;
    }

    // Create Firestore user document
    console.log('💾 Creating Firestore user document...');
    const now = new Date();
    const userData = {
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: ADMIN_NAME,
      role: 'administrator',
      enabledModules: [],
      isActive: true,
      emailVerified: false,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), userData);
    console.log('✅ Firestore user document created!');

    // Send email verification
    console.log('📧 Sending verification email...');
    try {
      await sendEmailVerification(userCredential.user);
      console.log('✅ Verification email sent!');
    } catch (emailError: unknown) {
      const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
      console.warn('⚠️  Could not send verification email:', errorMessage);
      console.log('   You can resend it from the Profile page after logging in.');
    }

    // Success!
    console.log('\n🎉 Admin user created successfully!\n');
    console.log('📝 Login Credentials:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('\n⚠️  IMPORTANT:');
    console.log('   1. Change the password after first login!');
    console.log('   2. Verify your email address!');
    console.log('   3. Keep these credentials secure!\n');

  } catch (error: unknown) {
    const firebaseError = error as FirebaseLikeError;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error creating admin user:');
    console.error('   ', errorMessage);
    
    if (firebaseError.code) {
      console.error(`   Error code: ${firebaseError.code}`);
    }

    if (firebaseError.code === 'auth/operation-not-allowed') {
      console.error('\n💡 Solution: Enable Email/Password authentication in Firebase Console');
      console.error('   Go to: Firebase Console > Authentication > Sign-in method');
      console.error('   Enable "Email/Password" provider');
    }

    if (firebaseError.code === 'auth/invalid-email') {
      console.error('\n💡 Solution: Check that the email format is correct');
    }

    process.exit(1);
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
