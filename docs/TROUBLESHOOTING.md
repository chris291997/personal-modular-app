# Troubleshooting Guide

## Admin API Error: FUNCTION_INVOCATION_FAILED

If you're getting a `500 Internal Server Error` or `FUNCTION_INVOCATION_FAILED` when trying to create users via the Admin API, follow these steps:

### Step 1: Check Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **personal-modular-app**
3. Go to **Settings** → **Environment Variables**
4. Verify that `FIREBASE_SERVICE_ACCOUNT` is set:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Should be the entire Firebase Service Account JSON as a **single-line string**
   - **Environments**: ✅ Production ✅ Preview ✅ Development

### Step 2: Get Firebase Service Account Key

If the variable is missing or incorrect:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **personal-modular-app-3ca9e**
3. Go to **Project Settings** → **Service Accounts** tab
4. Click **Generate New Private Key**
5. Save the JSON file

### Step 3: Convert to Single-Line String

The JSON must be converted to a single-line string for Vercel:

**Option A: Online Tool (Easiest)**
1. Go to https://www.jsonformatter.org/json-minify
2. Paste your JSON
3. Click "Minify"
4. Copy the result (it will be a single line)

**Option B: Manual (Remove Newlines)**
- Remove all newlines and extra spaces
- Keep it as one continuous line

### Step 4: Add to Vercel

1. In Vercel Dashboard → Settings → Environment Variables
2. Add or update:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Paste the single-line JSON string
   - **Environments**: Select all (Production, Preview, Development)
3. Click **Save**

### Step 5: Redeploy

After updating environment variables:

1. Go to **Deployments** tab
2. Find your latest deployment
3. Click the **⋯** (three dots) menu
4. Click **Redeploy**
5. Wait for deployment to complete

### Step 6: Test Again

Try creating a user again. The API should now work.

### Step 7: Check Vercel Function Logs

If it still doesn't work:

1. Go to Vercel Dashboard → Your Project
2. Click **Functions** tab
3. Click on `api/admin-users`
4. Check the **Logs** tab for error messages

Common errors you might see:
- `FIREBASE_SERVICE_ACCOUNT environment variable is not set` → Variable not configured
- `FIREBASE_SERVICE_ACCOUNT is not valid JSON` → JSON format is incorrect
- `Failed to initialize Firebase Admin SDK` → Service account credentials are invalid

## Alternative: Use the Create Admin Script

If the API continues to fail, you can use the local script instead:

```bash
npm run create-admin
```

This script works directly with Firebase and doesn't require the Vercel function.

## Common Issues

### Issue: "User already exists"

**Cause**: The email is already registered in Firebase Auth.

**Fix**: 
- Use a different email, or
- Delete the existing user from Firebase Console > Authentication > Users

### Issue: "Invalid email format"

**Cause**: The email doesn't match the required format.

**Fix**: Ensure the email is valid (e.g., `user@example.com`)

### Issue: "Password is too weak"

**Cause**: Firebase requires passwords to be at least 6 characters.

**Fix**: Use a password with at least 6 characters

### Issue: Environment variable not working after update

**Cause**: Vercel caches environment variables.

**Fix**: 
1. Make sure you selected all environments (Production, Preview, Development)
2. Redeploy the project
3. Wait a few minutes for changes to propagate

## Still Having Issues?

1. **Check Vercel Function Logs** (most important!)
   - Go to Functions tab → api/admin-users → Logs
   - Look for specific error messages

2. **Verify Service Account JSON**
   - Make sure it's valid JSON
   - Make sure it's a single line (no newlines)
   - Make sure all required fields are present

3. **Test Locally** (if possible)
   - Set `FIREBASE_SERVICE_ACCOUNT` in `.env.local`
   - Use `vercel dev` to test the function locally

4. **Use the Script Instead**
   - Run `npm run create-admin` locally
   - This bypasses the Vercel function entirely
