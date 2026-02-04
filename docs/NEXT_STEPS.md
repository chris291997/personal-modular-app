# Next Steps

Quick reference guide for what to do after initial setup.

## Priority Order

1. **Push to GitHub** (5 seconds)
2. **Create .env.local** (1 minute)
3. **Deploy to Vercel** (5 minutes)
4. **Set Vercel environment variables** (2 minutes)
5. **Test and install PWA** (5 minutes)

Total time: ~15 minutes to have a fully working, deployed PWA!

---

## Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

---

## Step 2: Create Local Environment File

Create `.env.local` in your project root:

```bash
VITE_JIRA_BASE_URL=https://datafiedusa.atlassian.net
VITE_JIRA_EMAIL=cbenosa@datafiedusa.com
VITE_JIRA_API_TOKEN=your-api-token-here
```

**Important:** This file is gitignored and won't be committed.

---

## Step 3: Test Locally

```bash
npm run dev
```

Verify everything works:
- ✅ App loads
- ✅ Budget module works
- ✅ Task module works (manual entry)
- ✅ No console errors

---

## Step 4: Deploy to Vercel

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

---

## Step 5: Set Environment Variables in Vercel

1. Go to [vercel.com](https://vercel.com) → Your project
2. Settings → Environment Variables
3. Add these variables:

   **For Jira:**
   - `JIRA_EMAIL` = `cbenosa@datafiedusa.com`
   - `JIRA_API_TOKEN` = Your API token
   - `JIRA_BASE_URL` = `https://datafiedusa.atlassian.net` (optional)

   **For Firebase Admin SDK:**
   - `FIREBASE_SERVICE_ACCOUNT` = Your service account JSON (as single-line string)

4. Enable for: ✅ Production ✅ Preview ✅ Development
5. Click **Save**
6. **Redeploy** (Vercel will auto-redeploy, or click "Redeploy" button)

---

## Step 6: Test Everything

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

---

## Quick Commands Reference

```bash
# Push to GitHub
git push

# Deploy to Vercel
vercel --prod

# Test locally
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Documentation Reference

For detailed guides, see:

- `docs/AUTHENTICATION.md` - User authentication and admin setup
- `docs/DEPLOYMENT.md` - Complete deployment guide
- `docs/JIRA_SETUP.md` - Jira integration setup
- `docs/PWA_SETUP.md` - PWA installation guide
- `docs/FIREBASE_SETUP.md` - Firebase configuration

---

## Ready?

Start with Step 1: `git push` 🚀
