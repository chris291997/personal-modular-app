# Secure Authentication Setup Guide

## Overview

This guide explains how to set up the secure authentication system with:
- ✅ Firebase Admin SDK for user management
- ✅ Password hashing (bcrypt)
- ✅ Password reset functionality
- ✅ Email verification

## Prerequisites

1. Firebase project set up
2. Vercel account (for serverless functions)
3. Firebase Service Account key

## Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file securely

## Step 2: Set Up Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add the following variable:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Paste the entire contents of the service account JSON file
   - **Environments**: Production, Preview, Development

## Step 3: Update Admin User Email

The admin user is configured with:
- **Email**: `christopherbenosa81@gmail.com`
- **Default Password**: `Admin@123!` (change after first login!)

## Step 4: Initialize Admin User

### Option A: Using Browser Console (Development)

1. Start your dev server: `npm run dev`
2. Open browser console
3. Run:
   ```javascript
   import { initializeAdminUser } from './src/utils/initAdmin';
   await initializeAdminUser();
   ```

### Option B: Using Admin API (Production)

The admin user will be created automatically when you first deploy, or you can call the API endpoint:

```bash
POST /api/admin-users
{
  "action": "createUser",
  "userData": {
    "email": "christopherbenosa81@gmail.com",
    "password": "Admin@123!",
    "name": "chris",
    "role": "administrator",
    "enabledModules": []
  }
}
```

## Step 5: Configure Email Templates (Optional)

Firebase Auth sends emails automatically, but you can customize them:

1. Go to Firebase Console > **Authentication** > **Templates**
2. Customize:
   - Email address verification
   - Password reset

## Features

### Password Hashing
- All passwords are hashed using bcrypt (10 rounds)
- Passwords are never stored in plain text
- Admin can still view hashed passwords (for support purposes)

### Password Reset
- Users can request password reset from login page
- Reset link is sent via email
- Link expires after 1 hour (Firebase default)

### Email Verification
- New users receive verification email
- Users can resend verification from profile page
- Unverified users see a banner reminder

### Admin API Endpoints

The `/api/admin-users` endpoint supports:
- `createUser` - Create user with hashed password
- `deleteUser` - Delete user from Auth and Firestore
- `resetPassword` - Generate password reset link
- `sendVerificationEmail` - Generate verification link

## Security Best Practices

1. **Change Default Password**: Change admin password immediately after first login
2. **Enable 2FA**: Consider adding two-factor authentication
3. **Regular Audits**: Review user access regularly
4. **Strong Passwords**: Enforce strong password requirements
5. **Email Verification**: Require email verification for all users
6. **Rate Limiting**: Consider adding rate limiting to API endpoints

## Troubleshooting

### Admin API Not Working
- Check that `FIREBASE_SERVICE_ACCOUNT` is set in Vercel
- Verify the service account JSON is valid
- Check Vercel function logs

### Email Not Sending
- Check Firebase Auth email settings
- Verify email domain is authorized
- Check spam folder

### Password Reset Not Working
- Verify Firebase Auth is enabled
- Check email templates are configured
- Verify user email exists

## Production Checklist

- [ ] Service account key added to Vercel
- [ ] Admin user created with secure password
- [ ] Email templates customized
- [ ] Default password changed
- [ ] Email verification required
- [ ] Password reset tested
- [ ] User creation tested
- [ ] User deletion tested
