# Jira Integration Setup & Troubleshooting

Complete guide for setting up Jira API integration, understanding CORS, and troubleshooting common issues.

## Table of Contents

1. [Understanding CORS](#understanding-cors)
2. [Setting Up Jira Integration](#setting-up-jira-integration)
3. [Troubleshooting](#troubleshooting)
4. [CORS Workarounds](#cors-workarounds)

---

## Understanding CORS

### What is CORS?

**CORS (Cross-Origin Resource Sharing)** is a browser security feature that prevents websites from making requests to different domains unless that domain explicitly allows it.

### The Problem

When your app runs in the browser at `http://localhost:3000` (or your deployed domain), and tries to fetch data from `https://datafiedusa.atlassian.net`, the browser checks:

1. **Origin**: Your app's domain (localhost:3000)
2. **Target**: Jira's domain (datafiedusa.atlassian.net)
3. **Are they the same?** No → CORS check applies

### Why Jira Blocks It

Jira's API servers don't send the necessary CORS headers that would allow browser-based JavaScript to make requests. Specifically, they don't include:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, etc.
Access-Control-Allow-Headers: Authorization, Content-Type, etc.
```

Without these headers, the browser blocks the request for security reasons.

### Why This Security Exists

CORS prevents malicious websites from:
- Stealing your data from other sites
- Making unauthorized requests with your credentials
- Accessing APIs without permission

### Solution: Serverless Proxy

The app uses a Vercel serverless function (`api/jira-proxy.ts`) to proxy requests:

```
Browser → Your Serverless Function → Jira API
```

The serverless function runs on a server (not in browser), so CORS doesn't apply.

---

## Setting Up Jira Integration

### Step 1: Get Jira API Token

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Give it a name (e.g., "Personal Management App")
4. Copy the token immediately (you can't see it again!)

### Step 2: Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:

   **Variable 1:**
   - Name: `JIRA_EMAIL`
   - Value: `cbenosa@datafiedusa.com` (or your Jira email)
   - Environments: ✅ Production ✅ Preview ✅ Development

   **Variable 2:**
   - Name: `JIRA_API_TOKEN`
   - Value: Your API token from step 1
   - Environments: ✅ Production ✅ Preview ✅ Development

   **Variable 3 (Optional):**
   - Name: `JIRA_BASE_URL`
   - Value: `https://datafiedusa.atlassian.net`
   - Environments: ✅ Production ✅ Preview ✅ Development

4. Click **Save**

### Step 3: Verify Proxy Function is Deployed

1. After deploying to Vercel, check that the function exists:
   - Go to your Vercel project → **Functions** tab
   - You should see `api/jira-proxy` listed

2. Test the function directly:
   ```
   https://your-app.vercel.app/api/jira-proxy?url=https://datafiedusa.atlassian.net/rest/api/3/myself
   ```
   - You should get a JSON response (or an error if credentials are wrong)

### Step 4: Test in App

1. Deploy your latest code to Vercel
2. Visit your deployed app
3. Go to **Tasks** module
4. Click **Search Tickets**
5. It should fetch tickets from Jira! 🎉

---

## Troubleshooting

### Error: "Failed to get current user: 401 Unauthorized"

**Cause**: The Jira API is rejecting your credentials.

**Fix**:

1. **Verify Environment Variables in Vercel**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Check that you have:
     - `JIRA_EMAIL` - Your Jira account email (e.g., `cbenosa@datafiedusa.com`)
     - `JIRA_API_TOKEN` - Your API token (NOT your password!)

2. **Get a Fresh API Token**
   - Go to: https://id.atlassian.com/manage-profile/security/api-tokens
   - Click **Create API token**
   - Give it a name (e.g., "Personal Management App")
   - Copy the token immediately
   - Update `JIRA_API_TOKEN` in Vercel with the new token

3. **Verify Your Email**
   - Make sure `JIRA_EMAIL` matches exactly:
     - The email you use to log into Jira
     - Case-sensitive (usually lowercase)
     - No extra spaces

4. **Test the Credentials**
   ```bash
   curl -u "your-email@example.com:YOUR_API_TOKEN" \
     "https://datafiedusa.atlassian.net/rest/api/3/myself"
   ```
   If this returns your user info, the credentials are correct.

5. **Redeploy After Changes**
   - After updating environment variables in Vercel:
     - Go to **Deployments** tab
     - Click the **⋯** menu on the latest deployment
     - Click **Redeploy**
     - Or push a new commit to trigger a new deployment

### Error: "Jira API error: 410 Gone"

**Cause**: Jira deprecated the old `/rest/api/3/search` endpoint.

**Fix**: The proxy automatically migrates to the new endpoint. If you still see this error:
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check that you're using the latest version of the code

### Error: "Jira API error: 400 Bad Request" with JQL syntax error

**Cause**: The JQL query has invalid syntax.

**Fix**: The app automatically handles `currentUser()` replacement. If you see this error:
1. Check browser console for the actual JQL query
2. Verify date range is valid
3. Try a simpler date range

### Error: "403 Forbidden"

**Cause**: API token doesn't have permissions.

**Fix**:
- Create a new API token with proper permissions
- Verify your Jira account has access to the projects

### Error: "404 Not Found"

**Cause**: Wrong Jira base URL.

**Fix**: Verify the URL is `https://datafiedusa.atlassian.net`

### Still Getting CORS Errors

**Possible causes**:
1. Proxy URL not being detected
2. Environment variables not set
3. Proxy function not deployed

**Fix**:

1. **Check that the proxy URL is being detected:**
   - Open browser console
   - Type: `window.location.origin`
   - Should show your Vercel URL

2. **Check network tab:**
   - Look for requests to `/api/jira-proxy`
   - Check if they're returning 200 or errors

3. **Manual Override (If Auto-Detection Fails):**
   - In Vercel dashboard → Settings → Environment Variables
   - Add a new variable:
     - **Name**: `VITE_SERVERLESS_PROXY_URL`
     - **Value**: `https://your-app.vercel.app/api/jira-proxy`
     - Select **Production, Preview, and Development**
   - Redeploy

---

## CORS Workarounds

### Option 1: Serverless Function (Current Solution) ⭐

This is the **best and most secure** solution. It's already implemented in the app.

**How it works:**
```
Browser → Your Serverless Function → Jira API
```

**Benefits:**
- ✅ API token stays on server (never exposed to browser)
- ✅ Free tier available (Vercel/Netlify)
- ✅ Automatic HTTPS
- ✅ Scales automatically
- ✅ Secure

### Option 2: Manual Entry (Fallback)

If the API fails, you can always add tickets manually:
- Go to Tasks module
- Click "Add Manual Ticket"
- Enter ticket details manually

**Benefits:**
- ✅ Always works
- ✅ No setup required
- ✅ Works offline

### Option 3: Public CORS Proxy (Not Recommended) ⚠️

**WARNING**: This exposes your API token to a third-party service. Only use for testing!

**Popular Services:**
- `https://cors-anywhere.herokuapp.com/` (requires demo access)
- `https://api.allorigins.win/raw?url=` (no auth needed, but less reliable)

**Security Risks:**
- ❌ Your API token is visible to the proxy service
- ❌ Proxy can log your requests
- ❌ Service may go down or rate limit you
- ❌ Violates Jira's terms of service potentially

### Option 4: Browser Extension (Not for PWA)

You can install a browser extension that disables CORS, but:
- ❌ Only works in that specific browser
- ❌ Not a true PWA solution
- ❌ Security risk (disables browser security)
- ❌ Doesn't work on mobile

---

## Quick Test

After fixing, test the proxy directly:
```
https://your-app.vercel.app/api/jira-proxy?url=https://datafiedusa.atlassian.net/rest/api/3/myself
```

This should return your user information if authentication is working.

---

## Common Issues Summary

| Error | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized | Wrong email or API token | Double-check both in Vercel environment variables |
| 403 Forbidden | API token doesn't have permissions | Create a new API token with proper permissions |
| 404 Not Found | Wrong Jira base URL | Verify the URL is `https://datafiedusa.atlassian.net` |
| CORS Error | Proxy not working | Check proxy function is deployed and environment variables are set |
| 410 Gone | Deprecated API endpoint | Proxy should auto-migrate, clear cache and refresh |

---

## Next Steps

After setting up Jira integration:

1. ✅ Test ticket fetching
2. ✅ Test date range filtering
3. ✅ Test manual ticket entry (fallback)
4. ✅ Verify tickets sync across devices

For more information, see:
- `docs/DEPLOYMENT.md` - Deployment guide
- `docs/AUTHENTICATION.md` - User management setup
