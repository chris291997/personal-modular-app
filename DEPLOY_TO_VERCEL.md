# Deploy to Vercel - Step by Step Guide

## Why Deploy to Vercel?

✅ **HTTPS Required** - PWAs need HTTPS to install (Vercel provides this automatically)
✅ **Free Hosting** - Vercel free tier is perfect for personal apps
✅ **Easy Deployment** - One command to deploy
✅ **Auto Updates** - Automatic deployments on git push
✅ **Global CDN** - Fast loading worldwide

## Quick Deploy (5 minutes)

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
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/Login with GitHub
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Vite settings
   - Click "Deploy"

3. **Done!** Every git push will auto-deploy

## Enable Jira API Integration (Optional but Recommended)

The Task module currently uses manual entry due to CORS restrictions. You can enable automatic Jira ticket fetching by deploying the Jira proxy function.

### Step 1: Set Environment Variables in Vercel

1. Go to your project in Vercel dashboard
2. Settings → Environment Variables
3. Add these two variables:
   - **Name:** `JIRA_EMAIL`
     **Value:** `cbenosa@datafiedusa.com`
   - **Name:** `JIRA_API_TOKEN`
     **Value:** `your-api-token-here` (get from https://id.atlassian.com/manage-profile/security/api-tokens)
4. Make sure to select **Production, Preview, and Development** for both variables
5. Click "Save"

### Step 2: Deploy the Jira Proxy Function

The proxy function is already in your codebase at `api/jira-proxy.ts`. Vercel will automatically detect and deploy it.

**After deployment:**
1. Your Vercel URL will be something like: `https://your-app.vercel.app`
2. The proxy will be available at: `https://your-app.vercel.app/api/jira-proxy`

### Step 3: Update Your Code to Use the Proxy

1. Open `src/services/jiraService.ts`
2. Find the line:
   ```typescript
   const SERVERLESS_PROXY_URL: string | null = null;
   ```
3. Replace it with:
   ```typescript
   const SERVERLESS_PROXY_URL: string | null = 'https://your-app.vercel.app/api/jira-proxy';
   ```
   (Replace `your-app.vercel.app` with your actual Vercel URL)

4. Rebuild and redeploy:
   ```bash
   npm run build
   vercel --prod
   ```

### Step 4: Test Jira Integration

1. Go to your deployed app
2. Navigate to the Tasks module
3. Click "Search Tickets"
4. It should now fetch tickets from Jira automatically! 🎉

**Note:** If you don't set up the proxy, the Task module will still work perfectly using manual entry. The proxy just enables automatic ticket fetching.

## Firebase Configuration

Your Firebase config is already in the code. Make sure:
- ✅ Firestore security rules allow read/write (for development, you can use permissive rules)
- ✅ Firebase project is set up correctly

## After Deployment

1. **Test the PWA:**
   - Visit your Vercel URL
   - Look for install banner
   - Install the app

2. **Check Service Worker:**
   - Open DevTools (F12)
   - Application → Service Workers
   - Should see service worker registered

3. **Test Offline:**
   - Install the app
   - Turn off internet
   - App should still work (cached)

## Custom Domain (Optional)

1. Go to Vercel project settings
2. Domains → Add Domain
3. Enter your domain
4. Follow DNS setup instructions

## Troubleshooting

### Build Fails?
- Check build logs in Vercel dashboard
- Make sure all dependencies are in `package.json`
- Check for TypeScript errors locally first

### PWA Not Installing?
- Make sure you're on HTTPS (Vercel provides this)
- Check that icons are in `public/` folder
- Verify service worker is registered

### Firebase Errors?
- Check Firestore security rules
- Verify Firebase config in `src/firebase/config.ts`
- Check browser console for specific errors

## Next Steps After Deployment

1. ✅ Test PWA installation on your deployed URL
2. ✅ Test on mobile device
3. ✅ Share the URL with yourself to access from anywhere
4. ✅ Set up auto-deployment from GitHub (if using Option 2)
5. ✅ **Enable Jira API** (optional) - Follow the "Enable Jira API Integration" section above

## Complete Deployment Checklist

### Basic Deployment
- [ ] Deploy to Vercel
- [ ] Test PWA installation
- [ ] Verify service worker is registered
- [ ] Test on mobile device

### Jira API Integration (Optional)
- [ ] Set `JIRA_EMAIL` environment variable in Vercel
- [ ] Set `JIRA_API_TOKEN` environment variable in Vercel
- [ ] Update `SERVERLESS_PROXY_URL` in `src/services/jiraService.ts`
- [ ] Rebuild and redeploy
- [ ] Test "Search Tickets" in Tasks module

### Firebase Setup
- [ ] Verify Firestore is enabled
- [ ] Check Firestore security rules
- [ ] Test data saving/loading
- [ ] Verify offline persistence works

## Cost

**Vercel Free Tier Includes:**
- ✅ 100GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Perfect for personal apps!

You only pay if you exceed the free tier limits (very unlikely for a personal app).

---

**Ready to deploy?** Just run `vercel` and you're done! 🚀
