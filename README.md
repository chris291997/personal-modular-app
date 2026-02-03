# Personal Management App

A Progressive Web App (PWA) for managing your budget, expenses, debts, savings goals, and Jira tasks.

## Features

### Budget Module
- **Income Tracking**: Track income from multiple sources with different frequencies
- **Expense Management**: Categorize expenses, track recurring expenses
- **Debt Management**: Track credit cards, loans with minimum payments, interest rates, and due dates
- **Savings Goals**: Set and track progress toward savings goals
- **Consult Feature**: Analyze the financial impact before adding new expenses or debts

### Task Module
- **Jira Integration**: Fetch tickets from your Jira instance
- **Smart Filtering**: Filter tickets by mentions, previous assignments, comments, and date range
- **Manual Entry**: Add tickets manually if API access is unavailable
- **Bullet List View**: Clean, organized view of all your tickets

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Enable Cloud Messaging for push notifications
4. Get your Firebase config from Project Settings > General > Your apps
5. Update `src/firebase/config.ts` with your Firebase configuration:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

6. Generate a VAPID key for push notifications:
   - Go to Firebase Console > Project Settings > Cloud Messaging
   - Under "Web Push certificates", generate a new key pair
   - Update `YOUR_VAPID_KEY` in `src/firebase/config.ts`

### 3. Jira Configuration

1. Update `src/services/jiraService.ts` with your Jira email:
   ```typescript
   const JIRA_EMAIL = 'your-email@example.com';
   ```
2. The API token is already configured. If you need to regenerate it:
   - Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
   - Create a new API token
   - Update `JIRA_API_TOKEN` in `src/services/jiraService.ts`

### 4. Firestore Security Rules

Set up Firestore security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

For development/testing, you can use:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **Warning**: The permissive rules above are for development only. Use proper authentication in production.

### 5. Run the Application

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 6. Build for Production

```bash
npm run build
```

The production build will be in the `dist` folder.

## PWA Installation

### Desktop
1. Open the app in Chrome/Edge
2. Click the install icon in the address bar
3. Or go to Settings > Apps > Install this site as an app

### Mobile (Android)
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home screen" or "Install app"

## Project Structure

```
src/
├── components/          # Shared components
├── firebase/           # Firebase configuration
├── modules/            # Feature modules
│   ├── budget/        # Budget module
│   └── task/          # Task module
├── services/          # API and business logic
├── types/             # TypeScript type definitions
└── pages/             # Page components
```

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Firebase** - Database and push notifications
- **React Router** - Navigation
- **date-fns** - Date utilities
- **PWA Plugin** - Progressive Web App features

## Module System

The app uses a modular architecture. To add a new module:

1. Create a new folder in `src/modules/`
2. Create your module component
3. Register it in `src/modules/index.ts`

Example:
```typescript
{
  id: 'new-module',
  name: 'New Module',
  icon: '🔧',
  path: '/new-module',
  component: NewModuleComponent,
  enabled: true,
}
```

## Notifications

The app supports push notifications for:
- Budget alerts (bill due dates, overspending)
- Debt payment reminders
- Task updates

Notifications require:
1. User permission (requested on first load)
2. Firebase Cloud Messaging setup
3. Service worker registration (handled automatically by PWA plugin)

## Offline Support

The app works offline with:
- Service worker caching
- Firestore offline persistence (enabled by default)
- Local storage for critical data

## License

MIT
