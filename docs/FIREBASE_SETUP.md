# Firebase Setup Guide

Complete guide for setting up Firebase Firestore, fixing common errors, and configuring security rules.

## Table of Contents

1. [Firestore Setup](#firestore-setup)
2. [Security Rules](#security-rules)
3. [Troubleshooting](#troubleshooting)
4. [Cloud Messaging Setup](#cloud-messaging-setup)

---

## Firestore Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** (or select existing)
3. Enter project name: `personal-modular-app-3ca9e`
4. Follow the setup wizard

### Step 2: Enable Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development)
   - This allows reads/writes for 30 days
   - You can change rules later
4. Select a location (choose closest to you)
5. Click **Enable**

### Step 3: Get Firebase Configuration

1. Go to **Project Settings** > **General** tab
2. Scroll to **Your apps** section
3. Click the **Web** icon (`</>`) to add a web app
4. Register app (give it a name)
5. Copy the Firebase configuration object

### Step 4: Update App Configuration

Update `src/firebase/config.ts` with your Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

---

## Security Rules

### Development Rules (Permissive)

For development/testing, use permissive rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **Warning**: These rules allow anyone to read/write. Only use for development!

### Production Rules (Authenticated)

For production, require authentication:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

This requires users to be authenticated before accessing data.

### User-Specific Rules (Advanced)

For better security, restrict access to user's own data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Budget data is user-specific
    match /budget/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Tasks are user-specific
    match /tasks/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### How to Update Rules

1. Go to Firebase Console → **Firestore Database**
2. Click **Rules** tab
3. Paste your rules
4. Click **Publish**

---

## Troubleshooting

### Error: "Failed to save income" (or any data)

**Cause**: Firestore security rules blocking writes.

**Fix**:

1. **Check Security Rules:**
   - Go to Firebase Console → Firestore Database → Rules
   - Verify rules allow writes

2. **For Development:**
   - Use permissive rules (see above)
   - Click **Publish**

3. **For Production:**
   - Use authenticated rules
   - Ensure user is logged in

### Error: "PERMISSION_DENIED"

**Cause**: Security rules blocking the operation.

**Fix**:
- Check Firestore security rules
- Verify user is authenticated (if using auth rules)
- Check browser console for specific error details

### Error: "UNAUTHENTICATED"

**Cause**: User is not authenticated, but rules require authentication.

**Fix**:
- Log in to the app
- Or use permissive rules for development

### Error: "NOT_FOUND"

**Cause**: Collection doesn't exist.

**Fix**:
- Firestore will create collections automatically
- This error usually resolves itself
- Check that Firestore is enabled

### Verify Firestore is Enabled

1. Firebase Console → Firestore Database
2. If you see "Create database", click it
3. Choose **"Start in test mode"**
4. Select a location
5. Click **"Enable"**

### Check Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Try saving data again
4. Look for the actual error message

Common errors:
- `PERMISSION_DENIED` = Security rules blocking
- `UNAUTHENTICATED` = Need authentication
- `NOT_FOUND` = Collection doesn't exist (will be created automatically)

---

## Cloud Messaging Setup

### Step 1: Enable Cloud Messaging

1. Go to Firebase Console → **Project Settings**
2. Click **Cloud Messaging** tab
3. Under **Web Push certificates**, click **Generate key pair**
4. Copy the **Key pair** (VAPID key)

### Step 2: Update App Configuration

Update `src/firebase/config.ts` with your VAPID key:

```typescript
export const vapidKey = "YOUR_VAPID_KEY";
```

### Step 3: Request Notification Permission

The app will automatically request notification permission on first load. Users can:
- **Allow**: Receive push notifications
- **Block**: No notifications (app still works)

### Step 4: Test Notifications

1. Grant notification permission
2. Trigger a notification from the app
3. Should receive notification even when app is closed

---

## Firebase Storage Setup (For Profile Pictures)

### Step 1: Enable Storage

1. Go to Firebase Console → **Storage**
2. Click **Get started**
3. Choose **Start in test mode** (for development)
4. Click **Next** → **Done**

### Step 2: Security Rules

For development (permissive):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

For production (authenticated):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Configuration Checklist

- [ ] Firebase project created
- [ ] Firestore Database enabled
- [ ] Security rules configured
- [ ] Firebase config added to `src/firebase/config.ts`
- [ ] Cloud Messaging enabled (for notifications)
- [ ] VAPID key generated and added to config
- [ ] Firebase Storage enabled (for profile pictures)
- [ ] Storage security rules configured
- [ ] Test data saving works
- [ ] Test notifications work (if configured)

---

## Next Steps

After Firebase setup:

1. ✅ Test saving data (income, expenses, etc.)
2. ✅ Test authentication (see `docs/AUTHENTICATION.md`)
3. ✅ Test notifications (if configured)
4. ✅ Configure production security rules
5. ✅ Set up Firebase Admin SDK (see `docs/AUTHENTICATION.md`)

For more information, see:
- `docs/AUTHENTICATION.md` - User authentication setup
- `docs/DEPLOYMENT.md` - Deployment guide
