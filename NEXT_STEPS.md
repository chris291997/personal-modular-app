# Next Steps - What to Do Now

## ✅ What's Done
- ✅ API tokens removed from code
- ✅ Code updated to use environment variables
- ✅ Commit amended
- ✅ Ready to push to GitHub

## 🚀 Next Steps (In Order)

### Step 1: Push to GitHub

```bash
git push --force-with-lease
```

This will push your cleaned commit to GitHub. The `--force-with-lease` is safer than `--force` as it won't overwrite if someone else pushed changes.

### Step 2: Create Local Environment File

Create `.env.local` in your project root:

```bash
VITE_JIRA_BASE_URL=https://datafiedusa.atlassian.net
VITE_JIRA_EMAIL=cbenosa@datafiedusa.com
VITE_JIRA_API_TOKEN=ATATT3xFfGF0HrRFt5s9uGOpwjdUqz9bSDqSjtnOMAhEl0NUIjnUqNFmeC2R9GpTs88a10TEKq-TSW3N_1smCxWFUH3aloPeRmMQWAMTp0ZsS1T17jdrjgBSzTxGh3TeWBBMEueg1Qbv-9mNdr5VCfc3J-j48eWxgM-T0fU-ztRmHjYo8BywieI=F2C9F376
```

**Important:** This file is gitignored and won't be committed.

### Step 3: Test Locally

```bash
npm run dev
```

Verify everything works:
- ✅ App loads
- ✅ Budget module works
- ✅ Task module works (manual entry)
- ✅ No console errors

### Step 4: Deploy to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts, then deploy to production:
vercel --prod
```

You'll get a URL like: `https://your-app.vercel.app`

### Step 5: Set Environment Variables in Vercel

1. Go to [vercel.com](https://vercel.com) → Your project
2. Settings → Environment Variables
3. Add these three variables:

   **Variable 1:**
   - Name: `VITE_JIRA_BASE_URL`
   - Value: `https://datafiedusa.atlassian.net`
   - Environments: ✅ Production ✅ Preview ✅ Development

   **Variable 2:**
   - Name: `VITE_JIRA_EMAIL`
   - Value: `cbenosa@datafiedusa.com`
   - Environments: ✅ Production ✅ Preview ✅ Development

   **Variable 3:**
   - Name: `VITE_JIRA_API_TOKEN`
   - Value: ``
   - Environments: ✅ Production ✅ Preview ✅ Development

4. Click **Save**
5. **Redeploy** (Vercel will auto-redeploy, or click "Redeploy" button)

### Step 6: Enable Jira API Proxy (Optional)

If you want automatic Jira ticket fetching:

1. In Vercel dashboard, also add these for the serverless function:
   - `JIRA_EMAIL` = `cbenosa@datafiedusa.com`
   - `JIRA_API_TOKEN` = ``

2. Update `src/services/jiraService.ts`:
   ```typescript
   const SERVERLESS_PROXY_URL: string | null = 'https://your-app.vercel.app/api/jira-proxy';
   ```

3. Rebuild and redeploy:
   ```bash
   npm run build
   vercel --prod
   ```

### Step 7: Test Everything

1. **Visit your Vercel URL**
2. **Install as PWA:**
   - Look for install banner at bottom
   - Or browser menu → Install app
3. **Test Budget Module:**
   - Add income, expenses, debts
   - Test consult feature
4. **Test Task Module:**
   - Add manual tickets
   - Try "Search Tickets" (if proxy is set up)
5. **Test on Mobile:**
   - Open URL on phone
   - Install as PWA
   - Verify everything works

## 🎯 Priority Order

1. **Push to GitHub** (5 seconds)
2. **Create .env.local** (1 minute)
3. **Deploy to Vercel** (5 minutes)
4. **Set Vercel environment variables** (2 minutes)
5. **Test and install PWA** (5 minutes)

Total time: ~15 minutes to have a fully working, deployed PWA!

## 📝 Quick Commands Reference

```bash
# Push to GitHub
git push --force-with-lease

# Deploy to Vercel
vercel --prod

# Test locally
npm run dev

# Build for production
npm run build
```

---

**Ready?** Start with Step 1: `git push --force-with-lease` 🚀
