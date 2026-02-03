# CORS Workarounds for Jira API

## Option 1: Serverless Function (Recommended) ⭐

This is the **best and most secure** solution. It requires minimal setup and is free.

### How it works:
```
Browser → Your Serverless Function → Jira API
```

The serverless function runs on a server (not in browser), so CORS doesn't apply.

### Setup Steps:

#### 1. Deploy to Vercel (Free)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Create `.env.local` file (don't commit this):
   ```env
   JIRA_EMAIL=your-email@example.com
   JIRA_API_TOKEN=your-api-token-here
   ```
   Get your API token from: https://id.atlassian.com/manage-profile/security/api-tokens

3. Deploy:
   ```bash
   vercel
   ```

4. After deployment, you'll get a URL like: `https://your-app.vercel.app`

5. Update `src/services/jiraService.ts`:
   ```typescript
   const SERVERLESS_PROXY_URL = 'https://your-app.vercel.app/api/jira-proxy';
   ```

#### 2. Deploy to Netlify (Alternative)

1. Install Netlify CLI:
   ```bash
   npm i -g netlify-cli
   ```

2. Create `netlify.toml`:
   ```toml
   [build]
     functions = "api"
   ```

3. Rename `api/jira-proxy.ts` to `api/jira-proxy.js` and convert to JavaScript

4. Deploy:
   ```bash
   netlify deploy --prod
   ```

5. Set environment variables in Netlify dashboard

### Security Benefits:
- ✅ API token stays on server (never exposed to browser)
- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Scales automatically

---

## Option 2: Public CORS Proxy (Quick Test Only) ⚠️

**WARNING**: This exposes your API token to a third-party service. Only use for testing!

### Setup:

1. Update `src/services/jiraService.ts`:
   ```typescript
   const CORS_PROXY_URL = 'https://cors-anywhere.herokuapp.com/';
   ```

2. **Important**: Most public proxies require you to request temporary access:
   - Visit: https://cors-anywhere.herokuapp.com/corsdemo
   - Click "Request temporary access"
   - This gives you ~1 hour of access

### Popular CORS Proxy Services:
- `https://cors-anywhere.herokuapp.com/` (requires demo access)
- `https://api.allorigins.win/raw?url=` (no auth needed, but less reliable)
- `https://corsproxy.io/?` (requires signup)

### Security Risks:
- ❌ Your API token is visible to the proxy service
- ❌ Proxy can log your requests
- ❌ Service may go down or rate limit you
- ❌ Violates Jira's terms of service potentially

---

## Option 3: Run Your Own CORS Proxy (Advanced)

If you have a server, you can run your own proxy:

### Simple Node.js Proxy:

```javascript
// proxy-server.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

app.get('/proxy', async (req, res) => {
  const { url } = req.query;
  const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
    },
  });
  
  const data = await response.json();
  res.json(data);
});

app.listen(3001);
```

Then update:
```typescript
const CORS_PROXY_URL = 'http://localhost:3001/proxy?url=';
```

---

## Option 4: Browser Extension (Not for PWA)

You can install a browser extension that disables CORS, but:
- ❌ Only works in that specific browser
- ❌ Not a true PWA solution
- ❌ Security risk (disables browser security)
- ❌ Doesn't work on mobile

---

## Recommendation

**Use Option 1 (Serverless Function)** - It's:
- ✅ Free (Vercel/Netlify free tiers)
- ✅ Secure (token stays on server)
- ✅ Reliable
- ✅ Works everywhere
- ✅ Takes 5 minutes to set up

The serverless function in `api/jira-proxy.ts` is ready to deploy. Just follow the Vercel steps above!

---

## Quick Start (Vercel)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Set environment variables
vercel env add JIRA_EMAIL
vercel env add JIRA_API_TOKEN

# 4. Deploy
vercel

# 5. Copy the URL and update SERVERLESS_PROXY_URL in jiraService.ts
```

That's it! Your Jira API will work through the proxy. 🎉
