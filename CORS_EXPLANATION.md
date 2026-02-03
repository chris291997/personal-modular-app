# Why Can't We Access Jira API Directly from the Browser?

## What is CORS?

**CORS (Cross-Origin Resource Sharing)** is a browser security feature that prevents websites from making requests to different domains unless that domain explicitly allows it.

## The Problem

When your app runs in the browser at `http://localhost:3000` (or your deployed domain), and tries to fetch data from `https://datafiedusa.atlassian.net`, the browser checks:

1. **Origin**: Your app's domain (localhost:3000)
2. **Target**: Jira's domain (datafiedusa.atlassian.net)
3. **Are they the same?** No → CORS check applies

## Why Jira Blocks It

Jira's API servers don't send the necessary CORS headers that would allow browser-based JavaScript to make requests. Specifically, they don't include:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, etc.
Access-Control-Allow-Headers: Authorization, Content-Type, etc.
```

Without these headers, the browser blocks the request for security reasons.

## Why This Security Exists

CORS prevents malicious websites from:
- Stealing your data from other sites
- Making unauthorized requests with your credentials
- Accessing APIs without permission

## Solutions

### ✅ Option 1: Manual Entry (Current - Recommended)
- **Pros**: Simple, works everywhere, no setup needed
- **Cons**: Manual work
- **Best for**: Personal use, small number of tickets

### ✅ Option 2: Backend Proxy Server
- **Pros**: Can access Jira API, automatic sync
- **Cons**: Requires hosting a server (costs money)
- **How it works**: 
  ```
  Browser → Your Backend Server → Jira API
  ```
  The backend server isn't subject to CORS restrictions

### ✅ Option 3: Browser Extension
- **Pros**: Can bypass CORS, works automatically
- **Cons**: Only works in that specific browser, not a true PWA
- **How it works**: Extensions have special permissions

### ⚠️ Option 4: CORS Proxy (Not Recommended)
- **Pros**: Quick workaround
- **Cons**: Security risk, unreliable, violates Jira's terms
- **Examples**: cors-anywhere, allorigins.win

## Why Manual Entry is Best for This App

1. **No hosting costs** - You wanted to avoid hosting
2. **Works everywhere** - Mobile, desktop, any browser
3. **Secure** - No proxy services handling your credentials
4. **Simple** - Just add tickets as you work on them
5. **Persistent** - Saved to Firebase, syncs across devices

## Technical Details

When you try to fetch from Jira API, the browser:
1. Makes a "preflight" OPTIONS request
2. Jira responds without CORS headers
3. Browser blocks the actual GET request
4. You see: "Failed to fetch" or CORS error

This happens **before** your request even reaches Jira's servers - it's blocked by your browser for security.

## Could Jira Fix This?

Yes! Jira could add CORS headers to allow browser access, but they don't because:
- Security: They want to control who can access their API
- They expect API access from servers, not browsers
- It's a design decision to prevent unauthorized access

## Summary

**CORS is a browser security feature, not a bug.** It's working as intended to protect you. Manual entry is the best solution for a personal PWA that doesn't require hosting a backend server.
