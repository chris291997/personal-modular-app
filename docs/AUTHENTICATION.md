# Authentication & User Management Setup

This guide covers setting up user authentication, creating the admin user, and configuring secure authentication features.

## Table of Contents

1. [Firebase Authentication Setup](#firebase-authentication-setup)
2. [Creating the Admin User](#creating-the-admin-user)
3. [Secure Setup (Password Hashing, Admin SDK)](#secure-setup)
4. [Troubleshooting](#troubleshooting)

---

## Firebase Authentication Setup

### Enable Email/Password Authentication

If you get the error `auth/operation-not-allowed`, Email/Password authentication is not enabled.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **personal-modular-app-3ca9e**
3. Go to **Authentication** > **Sign-in method** tab
4. Find **Email/Password** and click on it
5. Toggle **Enable** to **ON**
6. Click **Save**

### Configure Email Templates (Optional)

1. Go to **Authentication** > **Templates**
2. Customize:
   - Email address verification
   - Password reset

### Authorized Domains

Firebase automatically allows:
- `localhost` (for development)
- Your Firebase project domain
- Your custom domain (if configured)

To add more domains:
1. Go to **Authentication** > **Settings** > **Authorized domains**
2. Click **Add domain**

---

## Creating the Admin User

**Admin Email**: `christopherbenosa81@gmail.com`  
**Default Password**: `Admin@123!` (⚠️ Change after first login!)

### Option 1: Using the Create Admin Script (Easiest - Recommended) ⭐

This is the simplest method - just run a script locally:

1. **Make sure you're in the project directory:**
   ```bash
   cd "C:\Users\Datafied\Desktop\chris\private repos\personal management app"
   ```

2. **Run the script:**
   ```bash
   npm run create-admin
   ```

3. **The script will:**
   - Check if the admin user already exists
   - Create the user in Firebase Auth
   - Create the user document in Firestore with hashed password
   - Send a verification email

4. **Done!** You can now log in with:
   - Email: `christopherbenosa81@gmail.com`
   - Password: `Admin@123!`

**Note**: Make sure Email/Password authentication is enabled in Firebase Console (see [Firebase Authentication Setup](#firebase-authentication-setup) above).

### Option 2: Firebase Console (Manual Setup)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **personal-modular-app-3ca9e**
3. Go to **Authentication** > **Users**
4. Click **Add user**
5. Enter:
   - **Email**: `christopherbenosa81@gmail.com`
   - **Password**: `Admin@123!`
6. Click **Add user**
7. Copy the **User UID** (you'll need this)
8. Go to **Firestore Database**
9. Create a new document in the `users` collection
10. Use the **User UID** as the document ID
11. Add these fields:
    ```json
    {
      "email": "christopherbenosa81@gmail.com",
      "password": "$2a$10$...", // Hashed password (use Admin API to generate)
      "name": "chris",
      "role": "administrator",
      "enabledModules": [],
      "isActive": true,
      "createdAt": [Current Timestamp],
      "updatedAt": [Current Timestamp]
    }
    ```

**Better Option**: Use the Admin API endpoint `/api/admin-users` with action `createUser` to automatically hash the password.

### Option 3: Use Admin API (After Vercel Setup)

Once you've set up `FIREBASE_SERVICE_ACCOUNT` in Vercel:

1. Deploy your app to Vercel
2. Call the Admin API:
   ```bash
   curl -X POST https://personal-modular-app.vercel.app/api/admin-users \
     -H "Content-Type: application/json" \
     -d '{
       "action": "createUser",
       "userData": {
         "email": "christopherbenosa81@gmail.com",
         "password": "Admin@123!",
         "name": "chris",
         "role": "administrator",
         "enabledModules": []
       }
     }'
   ```

### Option 4: Browser Console Script

1. Start your dev server: `npm run dev`
2. Open browser console (F12)
3. Run:
   ```javascript
   import { initializeApp } from 'firebase/app';
   import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
   import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';
   import * as bcrypt from 'bcryptjs';
   
   const firebaseConfig = {
     apiKey: "AIzaSyCtkAfzoBkErY0HHTxWQ6fVw1ZfKRsko5I",
     authDomain: "personal-modular-app-3ca9e.firebaseapp.com",
     projectId: "personal-modular-app-3ca9e",
     storageBucket: "personal-modular-app-3ca9e.firebasestorage.app",
     messagingSenderId: "294365009691",
     appId: "1:294365009691:web:a69a01c794d3b5a680e5be"
   };
   
   const app = initializeApp(firebaseConfig);
   const auth = getAuth(app);
   const db = getFirestore(app);
   
   const email = 'christopherbenosa81@gmail.com';
   const password = 'Admin@123!';
   
   try {
     // Create Firebase Auth user
     const userCredential = await createUserWithEmailAndPassword(auth, email, password);
     console.log('✅ Firebase Auth user created:', userCredential.user.uid);
     
     // Hash password
     const hashedPassword = await bcrypt.hash(password, 10);
     
     // Create Firestore user document
     await setDoc(doc(db, 'users', userCredential.user.uid), {
       email: email,
       password: hashedPassword,
       name: 'chris',
       role: 'administrator',
       enabledModules: [],
       isActive: true,
       createdAt: Timestamp.now(),
       updatedAt: Timestamp.now()
     });
     
     console.log('✅ Firestore user document created!');
     console.log('You can now login with:');
     console.log('Email:', email);
     console.log('Password:', password);
   } catch (error) {
     if (error.code === 'auth/email-already-in-use') {
       console.log('⚠️ User already exists in Firebase Auth');
       console.log('You may need to create the Firestore document manually');
     } else {
       console.error('❌ Error:', error);
     }
   }
   ```

### After Creating User

1. **Login** with:
   - Email: `christopherbenosa81@gmail.com`
   - Password: `Admin@123!`
2. **Change password** immediately after first login
3. **Verify email** (check your inbox)

---

## Secure Setup

### Overview

The secure authentication system includes:
- ✅ Firebase Admin SDK for user management
- ✅ Password hashing (bcrypt)
- ✅ Password reset functionality
- ✅ Email verification

### Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file securely

### Step 2: Set Up Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add the following variable:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Paste the entire contents of the service account JSON file (as a single-line string)
   - **Environments**: Production, Preview, Development
4. Click **Save**

**Important**: The service account JSON must be converted to a single-line string. You can use an online JSON minifier or manually remove all newlines.

### Step 3: Features

#### Password Hashing
- All passwords are hashed using bcrypt (10 rounds)
- Passwords are never stored in plain text
- Admin can still view hashed passwords (for support purposes)

#### Password Reset
- Users can request password reset from login page
- Reset link is sent via email
- Link expires after 1 hour (Firebase default)

#### Email Verification
- New users receive verification email
- Users can resend verification from profile page
- Unverified users see a banner reminder

#### Admin API Endpoints

The `/api/admin-users` endpoint supports:
- `createUser` - Create user with hashed password
- `updateUser` - Update user details
- `deleteUser` - Delete user from Auth and Firestore

### Admin Capabilities

- ✅ Create, read, update, and delete users
- ✅ View user passwords (stored hashed, but admin can view)
- ✅ Control which modules each member can access
- ✅ View user details including budget data
- ✅ Activate/deactivate user accounts
- ✅ Access all modules regardless of `enabledModules` setting

### Member Capabilities

- ✅ Update own profile (name, picture, gender, birthdate, phone, address)
- ❌ Cannot change user type (role)
- ❌ Cannot change enabled modules
- ❌ Cannot view other users
- ✅ Can only access modules assigned by admin

### Module Access Control

Admins can control which modules each member can access:
- **Budget Module**: Financial management features
- **Task Module**: Jira ticket management

To assign modules to a user:
1. Go to User Management module
2. Click "Edit" on a user
3. Check/uncheck the modules you want to enable
4. Save

Empty `enabledModules` array means the user can access all modules (admin only).

---

## Troubleshooting

### "auth/operation-not-allowed" Error

**Cause**: Email/Password authentication is not enabled in Firebase.

**Fix**:
1. Go to Firebase Console > Authentication > Sign-in method
2. Enable Email/Password
3. Wait a few seconds for changes to propagate
4. Hard refresh your browser (Ctrl+F5)

### "INVALID_LOGIN_CREDENTIALS" Error

**Cause**: User doesn't exist in Firebase Authentication or password is incorrect.

**Fix**:
1. Create the user using one of the methods above
2. Verify the email and password are correct
3. Check Firebase Console > Authentication > Users to confirm user exists

### "Email already in use"

**Cause**: The user exists in Firebase Auth but not in Firestore.

**Fix**: Create the Firestore document manually (see Option 1, Step 8-11 above).

### "User data not found" after login

**Cause**: User exists in Auth but not in Firestore.

**Fix**: Create the Firestore document (see Option 1, Step 8-11 above).

### Admin API Not Working

**Possible causes**:
- `FIREBASE_SERVICE_ACCOUNT` not set in Vercel
- Service account JSON is invalid
- Service account JSON not properly formatted as single-line string

**Fix**:
1. Check Vercel environment variables
2. Verify the service account JSON is valid
3. Check Vercel function logs
4. Ensure the JSON is a single-line string (no newlines)

### Email Not Sending

**Possible causes**:
- Email domain not authorized
- Email templates not configured
- Spam folder

**Fix**:
1. Check Firebase Auth email settings
2. Verify email domain is authorized
3. Check spam folder
4. Verify email templates are configured

### Password Reset Not Working

**Possible causes**:
- Firebase Auth not enabled
- Email templates not configured
- User email doesn't exist

**Fix**:
1. Verify Firebase Auth is enabled
2. Check email templates are configured
3. Verify user email exists in Firebase Auth

---

## Security Best Practices

1. **Change Default Password**: Change admin password immediately after first login
2. **Enable 2FA**: Consider adding two-factor authentication
3. **Regular Audits**: Review user access regularly
4. **Strong Passwords**: Enforce strong password requirements
5. **Email Verification**: Require email verification for all users
6. **Rate Limiting**: Consider adding rate limiting to API endpoints

---

## Production Checklist

- [ ] Service account key added to Vercel
- [ ] Admin user created with secure password
- [ ] Email templates customized
- [ ] Default password changed
- [ ] Email verification required
- [ ] Password reset tested
- [ ] User creation tested
- [ ] User deletion tested
