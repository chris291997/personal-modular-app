# Jira Vercel Integration Troubleshooting

## ✅ What I Just Fixed

1. **Auto-detection**: The app now automatically detects if you're on Vercel and uses the proxy
2. **CORS preflight**: Added OPTIONS request handling for CORS
3. **Auth handling**: Proxy now handles authentication (no need to send auth from browser)

## 🔧 Setup Checklist

### Step 1: Verify Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Make sure you have these variables set:
   - `JIRA_EMAIL` = `cbenosa@datafiesusa.com` (or your Jira email)
   - `JIRA_API_TOKEN` = Your API token from https://id.atlassian.com/manage-profile/security/api-tokens
4. **Important**: Select **Production, Preview, and Development** for both variables
5. Click **Save**

### Step 2: Verify the Proxy Function is Deployed

1. After deploying to Vercel, check that the function exists:
   - Go to your Vercel project → **Functions** tab
   - You should see `api/jira-proxy` listed
2. Test the function directly:
   - Visit: `https://your-app.vercel.app/api/jira-proxy?url=https://datafiedusa.atlassian.net/rest/api/3/myself`
   - You should get a JSON response (or an error if credentials are wrong)

### Step 3: Check Browser Console

1. Open your deployed app
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Try to search for tickets
5. Look for any errors

### Step 4: Common Issues

#### Issue: "Server configuration error"
**Solution**: Environment variables not set in Vercel
- Go to Vercel dashboard → Settings → Environment Variables
- Add `JIRA_EMAIL` and `JIRA_API_TOKEN`
- Redeploy

#### Issue: "Jira API error: 401"
**Solution**: Invalid credentials
- Verify your API token is correct
- Get a new token from: https://id.atlassian.com/manage-profile/security/api-tokens
- Update in Vercel environment variables
- Redeploy

#### Issue: "Jira API error: 403"
**Solution**: Insufficient permissions
- Make sure your Jira account has access to the projects
- Check that the API token has proper permissions

#### Issue: Still getting CORS errors
**Solution**: 
1. Check that the proxy URL is being detected:
   - Open browser console
   - Type: `window.location.origin`
   - Should show your Vercel URL
2. Check network tab:
   - Look for requests to `/api/jira-proxy`
   - Check if they're returning 200 or errors

### Step 5: Manual Override (If Auto-Detection Fails)

If auto-detection doesn't work, you can manually set the proxy URL:

1. In Vercel dashboard → Settings → Environment Variables
2. Add a new variable:
   - **Name**: `VITE_SERVERLESS_PROXY_URL`
   - **Value**: `https://your-app.vercel.app/api/jira-proxy`
   - Select **Production, Preview, and Development**
3. Redeploy

### Step 6: Test the Integration

1. Deploy your latest code to Vercel
2. Visit your deployed app
3. Go to **Tasks** module
4. Click **Search Tickets**
5. It should fetch tickets from Jira! 🎉

## 🐛 Debug Mode

To see what's happening, check the browser console. The app will log:
- Whether proxy is being used
- Any errors from the API
- Network requests

## 📝 Notes

- The proxy automatically handles authentication
- No need to set `VITE_JIRA_API_TOKEN` in the frontend (it's only used as fallback)
- The proxy URL is auto-detected when deployed to Vercel
- Manual entry still works if API fails
