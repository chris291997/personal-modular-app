# Deployment Guide

Complete guide for deploying the Personal Management App to Vercel and configuring all integrations.

## Table of Contents

1. [Quick Deploy to Vercel](#quick-deploy-to-vercel)
2. [Environment Variables Setup](#environment-variables-setup)
3. [Jira API Integration](#jira-api-integration)
4. [Firebase Service Account Setup](#firebase-service-account-setup)
5. [Post-Deployment Testing](#post-deployment-testing)

---

## Quick Deploy to Vercel

### Why Deploy to Vercel?

✅ **HTTPS Required** - PWAs need HTTPS to install (Vercel provides this automatically)  
✅ **Free Hosting** - Vercel free tier is perfect for personal apps  
✅ **Easy Deployment** - One command to deploy  
✅ **Auto Updates** - Automatic deployments on git push  
✅ **Global CDN** - Fast loading worldwide

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Set up and deploy? **Yes**
   - Which scope? (Select your account)
   - Link to existing project? **No**
   - Project name? (Press Enter for default or type a name)
   - Directory? (Press Enter - it's `./`)
   - Override settings? **No**

4. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

5. **Done!** You'll get a URL like: `https://your-app.vercel.app`

### Option 2: Deploy via GitHub (Recommended for Auto-Updates)

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click **"Add New Project"**
   - Import your GitHub repository
   - Vercel will auto-detect settings
   - Click **"Deploy"**

3. **Automatic Deployments:**
   - Every push to `main` branch = Production deployment
   - Every push to other branches = Preview deployment

---

## Environment Variables Setup

### Required Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

#### For Jira Integration

1. **JIRA_EMAIL**
   - Value: `cbenosa@datafiedusa.com` (or your Jira email)
   - Environments: ✅ Production ✅ Preview ✅ Development

2. **JIRA_API_TOKEN**
   - Value: Your API token from https://id.atlassian.com/manage-profile/security/api-tokens
   - Environments: ✅ Production ✅ Preview ✅ Development

3. **JIRA_BASE_URL** (Optional, auto-detected)
   - Value: `https://datafiedusa.atlassian.net`
   - Environments: ✅ Production ✅ Preview ✅ Development

#### For Firebase Admin SDK

4. **FIREBASE_SERVICE_ACCOUNT**
   - Value: Entire service account JSON as a single-line string
   - How to get: Firebase Console → Project Settings → Service Accounts → Generate New Private Key
   - **Important**: Convert JSON to single-line (remove all newlines)
   - Environments: ✅ Production ✅ Preview ✅ Development

### How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New**
4. Enter the variable name and value
5. Select environments (Production, Preview, Development)
6. Click **Save**
7. **Redeploy** your project for changes to take effect

---

## Jira API Integration

### Step 1: Get Jira API Token

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Give it a name (e.g., "Personal Management App")
4. Copy the token immediately (you can't see it again!)

### Step 2: Set Environment Variables

Add `JIRA_EMAIL` and `JIRA_API_TOKEN` in Vercel (see above).

### Step 3: Verify Proxy Function

After deploying, test the proxy:

```
https://your-app.vercel.app/api/jira-proxy?url=https://datafiedusa.atlassian.net/rest/api/3/myself
```

This should return your user information if authentication is working.

### Step 4: Test in App

1. Visit your deployed app
2. Go to **Tasks** module
3. Click **Search Tickets**
4. It should fetch tickets from Jira! 🎉

### Troubleshooting Jira Integration

See `docs/JIRA_SETUP.md` for detailed troubleshooting.

---

## Firebase Service Account Setup

### Step 1: Get Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file securely

### Step 2: Convert to Single-Line String

The JSON must be converted to a single-line string for Vercel:

**Option A: Online Tool**
- Use https://www.jsonformatter.org/json-minify
- Paste your JSON
- Copy the minified result

**Option B: Manual**
- Remove all newlines
- Remove extra spaces
- Keep it as a single line

### Step 3: Add to Vercel

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: The single-line JSON string
   - **Environments**: Production, Preview, Development
3. Click **Save**
4. **Redeploy** your project

### Step 4: Verify

After redeploying, test the Admin API:

```bash
curl -X POST https://your-app.vercel.app/api/admin-users \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createUser",
    "userData": {
      "email": "test@example.com",
      "password": "Test123!",
      "name": "Test User",
      "role": "member",
      "enabledModules": []
    }
  }'
```

---

## Post-Deployment Testing

### 1. Test PWA Installation

1. Visit your deployed URL
2. Look for install banner at bottom
3. Or browser menu → Install app
4. Verify app works offline

### 2. Test Authentication

1. Try logging in with admin credentials
2. Test password reset
3. Test email verification
4. Create a test user (if admin)

### 3. Test Budget Module

1. Add income, expenses, debts
2. Test consult feature
3. Verify data syncs across devices

### 4. Test Task Module

1. Try "Search Tickets" (if Jira is configured)
2. Add manual tickets
3. Verify filtering works

### 5. Test on Mobile

1. Open URL on phone
2. Install as PWA
3. Verify everything works
4. Test offline functionality

---

## Quick Commands Reference

```bash
# Deploy to Vercel
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# List environment variables
vercel env ls

# Add environment variable
vercel env add VARIABLE_NAME
```

---

## Common Issues

### Environment Variables Not Working

- **Cause**: Variables not set for correct environment
- **Fix**: Ensure variables are enabled for Production, Preview, AND Development

### Function Not Found (404)

- **Cause**: Serverless function not deployed
- **Fix**: Check that `api/` folder exists and is committed to git

### Authentication Errors

- **Cause**: Wrong credentials or missing environment variables
- **Fix**: Double-check all environment variables in Vercel dashboard

### CORS Errors

- **Cause**: Proxy not working or not configured
- **Fix**: Verify proxy function is deployed and environment variables are set

---

## Next Steps

After successful deployment:

1. ✅ Test all features
2. ✅ Install as PWA
3. ✅ Share with team members
4. ✅ Set up monitoring (optional)
5. ✅ Configure custom domain (optional)

For more details, see:
- `docs/AUTHENTICATION.md` - User management setup
- `docs/JIRA_SETUP.md` - Jira integration troubleshooting
- `docs/PWA_SETUP.md` - PWA installation guide
