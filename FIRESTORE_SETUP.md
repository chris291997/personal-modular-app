# Firestore Setup - Fix "Failed to save income" Error

## The Problem

The error "Failed to save income" is usually caused by **Firestore security rules** blocking writes.

## Quick Fix (Development)

### Step 1: Go to Firebase Console

1. Visit: https://console.firebase.google.com/
2. Select your project: `personal-modular-app-3ca9e`
3. Go to **Firestore Database** in the left menu

### Step 2: Check Security Rules

1. Click on the **"Rules"** tab
2. You'll see your current security rules

### Step 3: Set Permissive Rules (For Development)

Replace the rules with this (allows all reads/writes):

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

3. Click **"Publish"**

⚠️ **Warning:** These rules allow anyone to read/write. Only use for development!

### Step 4: Test Again

Go back to your app and try saving income again. It should work now.

## Production Rules (Later)

For production, use proper authentication:

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

This requires users to be authenticated (you can add Firebase Auth later if needed).

## Alternative: Check Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Try saving income again
4. Look for the actual error message
5. Common errors:
   - `PERMISSION_DENIED` = Security rules blocking
   - `UNAUTHENTICATED` = Need authentication
   - `NOT_FOUND` = Collection doesn't exist (Firestore will create it automatically)

## Verify Firestore is Enabled

1. Firebase Console → Firestore Database
2. If you see "Create database", click it
3. Choose **"Start in test mode"** (allows reads/writes for 30 days)
4. Select a location (choose closest to you)
5. Click **"Enable"**

## Still Not Working?

Check:
- ✅ Firestore is enabled
- ✅ Security rules allow writes
- ✅ Firebase config in `src/firebase/config.ts` is correct
- ✅ Browser console for specific error
- ✅ Network tab to see if request is being made

The most common issue is security rules - set them to allow writes and it should work!
