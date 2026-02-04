# Jira Authentication Troubleshooting

## Error: "Failed to get current user: 401 Unauthorized"

This means the Jira API is rejecting your credentials. Here's how to fix it:

### Step 1: Verify Environment Variables in Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Check that you have:
   - `JIRA_EMAIL` - Your Jira account email (e.g., `cbenosa@datafiesusa.com`)
   - `JIRA_API_TOKEN` - Your API token (NOT your password!)

### Step 2: Get a Fresh API Token

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Give it a name (e.g., "Personal Management App")
4. Copy the token immediately (you can't see it again!)
5. Update `JIRA_API_TOKEN` in Vercel with the new token

### Step 3: Verify Your Email

Make sure `JIRA_EMAIL` matches exactly:
- The email you use to log into Jira
- Case-sensitive (usually lowercase)
- No extra spaces

### Step 4: Check Jira Account Type

- **Cloud Jira**: Should work with API tokens
- **Server/Data Center**: May require different authentication

### Step 5: Test the Credentials

You can test if your credentials work by making a direct API call:

```bash
curl -u "your-email@example.com:YOUR_API_TOKEN" \
  "https://datafiedusa.atlassian.net/rest/api/3/myself"
```

If this returns your user info, the credentials are correct.

### Step 6: Redeploy After Changes

After updating environment variables in Vercel:
1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger a new deployment

### Common Issues

#### Issue: "401 Unauthorized"
- **Cause**: Wrong email or API token
- **Fix**: Double-check both in Vercel environment variables

#### Issue: "403 Forbidden"
- **Cause**: API token doesn't have permissions
- **Fix**: Create a new API token with proper permissions

#### Issue: "404 Not Found"
- **Cause**: Wrong Jira base URL
- **Fix**: Verify the URL is `https://datafiedusa.atlassian.net`

### Quick Test

After fixing, test the proxy directly:
```
https://personal-modular-app.vercel.app/api/jira-proxy?url=https://datafiedusa.atlassian.net/rest/api/3/myself
```

This should return your user information if authentication is working.
