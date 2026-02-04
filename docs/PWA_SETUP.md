# PWA Installation Guide

Complete guide for setting up and installing the Personal Management App as a Progressive Web App.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Creating PWA Icons](#creating-pwa-icons)
3. [Installation Methods](#installation-methods)
4. [Troubleshooting](#troubleshooting)
5. [Testing PWA Features](#testing-pwa-features)

---

## Quick Start

### Step 1: Create PWA Icons (Required) ⚠️

You need two icon files. Choose the easiest option:

#### Option A: Use Online Generator (2 minutes) ⭐ RECOMMENDED

1. Go to: https://www.pwabuilder.com/imageGenerator
2. Click "Generate Images"
3. It will create all sizes automatically
4. Download the ZIP file
5. Extract and copy these files to `public/` folder:
   - `pwa-192x192.png`
   - `pwa-512x512.png`

#### Option B: Create Simple Icons Manually

1. Open any image editor (Paint, Photoshop, GIMP, etc.)
2. Create a 192x192 pixel image
3. Fill with color #6366f1 (or any color you like)
4. Add text "PMA" or a simple icon
5. Save as `pwa-192x192.png` in `public/` folder
6. Resize to 512x512 and save as `pwa-512x512.png`

#### Option C: Use ImageMagick (if installed)

```bash
# Create a simple colored square icon
convert -size 192x192 xc:#6366f1 -pointsize 48 -fill white -gravity center -annotate +0+0 "PMA" public/pwa-192x192.png
convert -size 512x512 xc:#6366f1 -pointsize 128 -fill white -gravity center -annotate +0+0 "PMA" public/pwa-512x512.png
```

### Step 2: Build the App

```bash
npm run build
```

This creates the production build with service worker.

### Step 3: Test the PWA

```bash
npm run preview
```

This starts a local server with the production build.

### Step 4: Check Installation

1. Open http://localhost:4173 (or the URL shown)
2. Look for:
   - **Install banner** at the bottom of the screen (custom component)
   - **Install icon (➕)** in the browser address bar
   - **Menu option**: Chrome menu (⋮) → "Install Personal Management App"

---

## Creating PWA Icons

### Why Icons Are Required

The PWA install prompt requires several conditions to be met:

1. ✅ **HTTPS or localhost** - Your app must be served over HTTPS (or localhost)
2. ✅ **Service Worker** - Must be registered (handled automatically by vite-plugin-pwa)
3. ✅ **Web App Manifest** - Must be valid (configured in vite.config.ts)
4. ⚠️ **Icons** - Required for installation (192x192 and 512x512 PNG files)
5. ✅ **User engagement** - User must interact with the site first

### Icon Requirements

- **Format**: PNG
- **Sizes**: 192x192 and 512x512 pixels
- **Location**: `public/` folder
- **Names**: Exactly `pwa-192x192.png` and `pwa-512x512.png`

### Icon Design Tips

- Use your brand colors
- Keep it simple (icons are small)
- Ensure good contrast
- Test on both light and dark backgrounds

---

## Installation Methods

### Desktop (Chrome/Edge)

1. **Automatic Prompt:**
   - After interacting with the site, an install banner appears at the bottom
   - Click "Install" on the banner

2. **Address Bar Icon:**
   - Look for the install icon (➕) in the address bar
   - Click it to install

3. **Browser Menu:**
   - Click menu (⋮) → "Install Personal Management App"
   - Or: Settings → Apps → Install this site as an app

### Mobile (Android - Chrome)

1. **Menu Method:**
   - Open in Chrome
   - Tap menu (three dots) → "Add to Home screen"
   - Or: Menu → "Install app"

2. **Automatic Prompt:**
   - After interacting with the site, Chrome may show an install prompt
   - Tap "Install" or "Add"

### Mobile (iOS - Safari)

1. **Share Button:**
   - Tap share button (□↑)
   - Select "Add to Home Screen"
   - Tap "Add"

2. **Note**: iOS doesn't support full PWA features, but the app will work as a web app.

---

## Troubleshooting

### Install Prompt Not Showing?

1. **Check icons exist:**
   ```bash
   ls public/pwa-*.png
   ```
   Files must be in `public/` folder (not `src/`)

2. **Check service worker:**
   - DevTools → Application → Service Workers
   - Should be "activated and running"

3. **Check manifest:**
   - DevTools → Application → Manifest
   - No errors should be shown
   - Icons should be listed

4. **Try in incognito mode:**
   - Sometimes browser extensions interfere

5. **Wait for user interaction:**
   - Browsers require user interaction before showing prompt
   - Click around the app first

6. **Check if already installed:**
   - If app is already installed, prompt won't show again
   - Uninstall first, then try again

### Service Worker Not Registering?

1. **Must use HTTPS or localhost**
   - Service workers only work on secure origins

2. **Build the app first:**
   ```bash
   npm run build
   npm run preview
   ```

3. **Check browser console for errors:**
   - Open DevTools (F12)
   - Look for service worker errors

4. **Try hard refresh:**
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

5. **Clear browser cache:**
   - DevTools → Application → Clear storage → Clear site data

### Icons Still Missing?

- Make sure files are in `public/` folder (not `src/`)
- File names must be exactly: `pwa-192x192.png` and `pwa-512x512.png`
- Files must be PNG format
- Files must exist before building (`npm run build`)

### Install Prompt Still Not Showing After Fixes?

1. **Make sure you're using `npm run preview`** (not `npm run dev`)
   - Dev mode doesn't include service worker

2. **Try a different browser:**
   - Chrome/Edge work best
   - Firefox has limited PWA support
   - Safari (iOS) has limited support

3. **Clear browser cache:**
   - Ctrl+Shift+Delete → Clear cached images and files

4. **Check browser console:**
   - Look for any errors or warnings

---

## Testing PWA Features

### 1. Check Service Worker

1. Open DevTools (F12)
2. Go to **Application** → **Service Workers**
3. Should see "sw.js" registered and running ✅

### 2. Check Manifest

1. DevTools → **Application** → **Manifest**
2. Should show all manifest details
3. Check for errors (especially missing icons) ✅

### 3. Test Offline Functionality

1. Install the app
2. Go offline (disable network)
3. App should still work with cached data ✅

### 4. Test Install

1. Look for install button in address bar ✅
2. Or use the custom install banner (bottom of screen) ✅
3. After installing, app should open in its own window ✅

### 5. Test Push Notifications (If Configured)

1. Grant notification permission
2. Test notification from app
3. Should receive notification even when app is closed ✅

---

## What You Should See

✅ **Success indicators:**
- Install banner appears at bottom of screen
- Service worker registered in DevTools
- Manifest shows no errors
- Install option in browser menu
- App works offline
- App opens in its own window after installation

---

## Production Deployment

For production, deploy to Vercel (or similar):

1. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

2. **HTTPS is required:**
   - Vercel provides HTTPS automatically
   - Service workers only work on HTTPS (or localhost)

3. **Test installation:**
   - Visit your deployed URL
   - Install as PWA
   - Verify everything works

For deployment details, see `docs/DEPLOYMENT.md`.

---

## Next Steps

After successful PWA installation:

1. ✅ Test offline functionality
2. ✅ Test on mobile devices
3. ✅ Share with team members
4. ✅ Configure push notifications (optional)
5. ✅ Customize app icon and name (optional)

For more information, see:
- `docs/DEPLOYMENT.md` - Deployment guide
- `README.md` - Project overview
