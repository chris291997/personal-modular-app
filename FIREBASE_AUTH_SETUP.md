# Firebase Authentication Setup Guide

## Error: "auth/operation-not-allowed"

This error means **Email/Password authentication is not enabled** in your Firebase project.

## Quick Fix: Enable Email/Password Authentication

### Step 1: Go to Firebase Console

1. Visit: https://console.firebase.google.com/
2. Select your project: **personal-modular-app-3ca9e**

### Step 2: Enable Email/Password Authentication

1. In the left sidebar, click **Authentication** (or **Build** > **Authentication**)
2. If you see "Get started", click it
3. Click on the **Sign-in method** tab (at the top)
4. You'll see a list of sign-in providers

### Step 3: Enable Email/Password

1. Find **Email/Password** in the list
2. Click on it
3. Toggle the **Enable** switch to **ON**
4. You can leave "Email link (passwordless sign-in)" disabled (unless you want it)
5. Click **Save**

### Step 4: Verify It's Enabled

You should now see:
- ✅ **Email/Password** - Enabled
- Status: **Enabled**

### Step 5: Test Login Again

Go back to your app and try logging in again. The error should be gone!

## Additional Authentication Settings (Optional)

### Authorized Domains

Firebase automatically allows:
- `localhost` (for development)
- Your Firebase project domain
- Your custom domain (if configured)

To add more domains:
1. Go to **Authentication** > **Settings** > **Authorized domains**
2. Click **Add domain**
3. Enter your domain (e.g., `yourdomain.com`)

### Email Templates

You can customize email templates:
1. Go to **Authentication** > **Templates**
2. Customize:
   - **Email address verification**
   - **Password reset**

## Common Issues

### Still Getting "operation-not-allowed" After Enabling

1. **Wait a few seconds** - Changes can take a moment to propagate
2. **Hard refresh** your browser (Ctrl+F5 or Cmd+Shift+R)
3. **Clear browser cache**
4. **Check you're on the correct Firebase project**

### "Email already in use" Error

This means the email is already registered. Either:
- Use the existing account
- Or delete the user from Firebase Console > Authentication > Users

### "Invalid email format"

Make sure the email is valid:
- Contains `@`
- Has a domain (e.g., `@gmail.com`)
- No spaces

## Testing Authentication

After enabling, test with:

1. **Create a test user**:
   - Go to Firebase Console > Authentication > Users
   - Click **Add user**
   - Enter email and password
   - Click **Add user**

2. **Try logging in** in your app with those credentials

## Security Rules

Make sure your Firestore security rules allow authenticated users:

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

## Next Steps

After enabling Email/Password authentication:

1. ✅ Test login with a test user
2. ✅ Create admin user (see `ADMIN_SETUP.md`)
3. ✅ Test password reset
4. ✅ Test email verification
