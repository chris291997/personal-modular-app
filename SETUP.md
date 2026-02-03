# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Firestore Database**:
   - Go to Firestore Database
   - Click "Create database"
   - Start in test mode (for development)
4. Enable **Cloud Messaging**:
   - Go to Project Settings > Cloud Messaging
   - Generate a Web Push certificate (VAPID key)
5. Get your config:
   - Project Settings > General > Your apps > Web app
   - Copy the config object

6. Update `src/firebase/config.ts`:
   - Replace `YOUR_API_KEY`, `YOUR_AUTH_DOMAIN`, etc. with your Firebase config
   - Replace `YOUR_VAPID_KEY` with your VAPID key from step 4

## Step 3: Configure Jira

1. Update `src/services/jiraService.ts`:
   - Replace `YOUR_JIRA_EMAIL@example.com` with your actual Jira email
   - The API token is already configured, but if you need a new one:
     - Go to https://id.atlassian.com/manage-profile/security/api-tokens
     - Create a new token
     - Update `JIRA_API_TOKEN` in the file

## Step 4: Run the App

```bash
npm run dev
```

The app will open at `http://localhost:3000`

## Step 5: Install as PWA

### Desktop (Chrome/Edge):
- Click the install icon in the address bar
- Or: Menu > Install app

### Mobile (Android):
- Open in Chrome
- Menu (three dots) > "Add to Home screen"

## Troubleshooting

### Firebase errors:
- Make sure Firestore is enabled
- Check that your config values are correct
- Verify Firestore security rules allow read/write

### Jira errors:
- Verify your email is correct
- Check that the API token is valid
- Ensure you have access to the Jira instance
- If API fails, you can always add tickets manually

### PWA not installing:
- Make sure you're using HTTPS (or localhost)
- Check browser console for errors
- Verify service worker is registered (check DevTools > Application > Service Workers)
