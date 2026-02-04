# Complete Deployment Guide - Personal Management App

This guide covers deploying your app to Vercel AND enabling the Jira API integration.

## Part 1: Deploy the App to Vercel

### Quick Deploy (5 minutes)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   Follow prompts, then:
   ```bash
   vercel --prod
   ```

4. **You'll get a URL like:** `https://your-app.vercel.app`

✅ **Your app is now live!** You can install it as a PWA.

---

## Part 2: Enable Jira API Integration (Fix Task Module)

The Task module currently uses manual entry. To enable automatic Jira ticket fetching:

### Step 1: Set Environment Variables

1. Go to [vercel.com](https://vercel.com) and open your project
2. Go to **Settings** → **Environment Variables**
3. Add these two variables:

   **Variable 1:**
   - Name: `JIRA_EMAIL`
   - Value: `cbenosa@datafiedusa.com`
   - Environments: ✅ Production ✅ Preview ✅ Development

   **Variable 2:**
   - Name: `JIRA_API_TOKEN`
   - Value: `your-api-token-here` (get from https://id.atlassian.com/manage-profile/security/api-tokens)
   - Environments: ✅ Production ✅ Preview ✅ Development

4. Click **Save**

### Step 2: Update Code to Use Proxy

1. Open `src/services/jiraService.ts`
2. Find this line (around line 15):
   ```typescript
   const SERVERLESS_PROXY_URL: string | null = null;
   ```
3. Replace with your Vercel URL:
   ```typescript
   const SERVERLESS_PROXY_URL: string | null = 'https://your-app.vercel.app/api/jira-proxy';
   ```
   (Replace `your-app.vercel.app` with your actual Vercel domain)

### Step 3: Redeploy

```bash
npm run build
vercel --prod
```

### Step 4: Test

1. Go to your deployed app
2. Navigate to **Tasks** module
3. Click **"Search Tickets"**
4. It should now fetch tickets from Jira! 🎉

---

## How It Works

```
Your Browser
    ↓
Vercel App (your-app.vercel.app)
    ↓
/api/jira-proxy (serverless function)
    ↓
Jira API (datafiedusa.atlassian.net)
    ↓
Returns tickets (no CORS issues!)
```

The serverless function runs on Vercel's servers (not in your browser), so CORS doesn't apply.

---

## Troubleshooting

### Jira API Still Not Working?

1. **Check environment variables:**
   - Go to Vercel dashboard → Settings → Environment Variables
   - Make sure both are set for Production environment
   - Redeploy after adding variables

2. **Check proxy URL:**
   - Verify `SERVERLESS_PROXY_URL` in `jiraService.ts` matches your Vercel URL
   - Make sure it's: `https://your-app.vercel.app/api/jira-proxy`

3. **Test the proxy directly:**
   - Visit: `https://your-app.vercel.app/api/jira-proxy?url=https://datafiedusa.atlassian.net/rest/api/3/search?jql=...`
   - Should return JSON (or an error message)

4. **Check Vercel function logs:**
   - Go to Vercel dashboard → Your project → Functions
   - Click on `api/jira-proxy`
   - Check logs for errors

### Manual Entry Still Works

Even if the API doesn't work, you can still:
- Add tickets manually
- All tickets are saved to Firebase
- They persist across sessions

---

## Security Notes

✅ **API token is secure:**
- Stored as environment variable in Vercel
- Never exposed to browser
- Only used on server-side

✅ **Proxy function:**
- Only accepts GET requests
- Validates input
- Returns proper CORS headers

---

## Complete Checklist

### Basic App Deployment
- [ ] Deploy to Vercel
- [ ] Test PWA installation
- [ ] Verify service worker registered
- [ ] Test on mobile

### Jira API Integration
- [ ] Set `JIRA_EMAIL` in Vercel
- [ ] Set `JIRA_API_TOKEN` in Vercel
- [ ] Update `SERVERLESS_PROXY_URL` in code
- [ ] Rebuild and redeploy
- [ ] Test "Search Tickets" button
- [ ] Verify tickets load from Jira

### Firebase
- [ ] Verify Firestore enabled
- [ ] Check security rules
- [ ] Test data saving
- [ ] Test offline mode

---

## What You Get

✅ **Full PWA** - Installable on any device
✅ **Jira Integration** - Automatic ticket fetching
✅ **Offline Support** - Works without internet
✅ **Firebase Sync** - Data syncs across devices
✅ **Free Hosting** - Vercel free tier

---

**Need help?** Check the logs in Vercel dashboard or browser console for specific errors.
