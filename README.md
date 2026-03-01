# Personal Management App

A Progressive Web App (PWA) for managing your budget, expenses, debts, savings goals, Jira tasks, and lotto planning.

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

### Lotto Module
- **Official Results Sync**: Pulls official PCSO results into Firestore
- **Smart Number Generator**: Generates suggestions from historical draws (balanced/hot/due/random)
- **Bet History**: Saves your bet numbers per draw and game
- **Reminders**: In-app and push reminders before scheduled draws

### User Management
- **Authentication**: Secure login/logout with Firebase Auth
- **Role-Based Access**: Administrator and member roles
- **Module Control**: Admin can control which modules each user can access

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Firebase:**
   See [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)

3. **Set up authentication:**
   See [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)

4. **Run the app:**
   ```bash
   npm run dev
   ```

5. **Deploy to production:**
   See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Documentation

All documentation is organized in the `docs/` folder:

- **[AUTHENTICATION.md](docs/AUTHENTICATION.md)** - User authentication, admin setup, and secure configuration
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Complete guide for deploying to Vercel
- **[JIRA_SETUP.md](docs/JIRA_SETUP.md)** - Jira integration setup and troubleshooting
- **[PWA_SETUP.md](docs/PWA_SETUP.md)** - PWA installation and configuration
- **[FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)** - Firebase configuration and security rules
- **[FIRESTORE_COLLECTIONS.md](docs/FIRESTORE_COLLECTIONS.md)** - Firestore collections reference and data structure
- **[NEXT_STEPS.md](docs/NEXT_STEPS.md)** - Quick reference for next steps
- **[PROJECT_SUMMARY.md](docs/PROJECT_SUMMARY.md)** - Complete project overview

## Project Structure

```
src/
├── components/          # Shared components
├── firebase/           # Firebase configuration
├── modules/            # Feature modules
│   ├── budget/        # Budget module
│   ├── lotto/         # Lotto module
│   ├── task/          # Task module
│   └── user/          # User management module
├── services/          # API and business logic
├── types/             # TypeScript type definitions
└── pages/             # Page components
api/                    # Serverless functions
docs/                   # Documentation
```

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Firebase** - Database, authentication, and push notifications
- **Firebase Admin SDK** - Secure user management
- **React Router** - Navigation
- **Tailwind CSS** - Styling
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

## Environment Variables

For backend APIs and scheduled jobs:

- `FIREBASE_SERVICE_ACCOUNT`: JSON string for Firebase Admin SDK credentials.
- `CRON_SECRET`: Secret token checked by `/api/cron/*` endpoints (`Authorization: Bearer <CRON_SECRET>`).
- `PCSO_BACKFILL_MONTHS` (optional): Number of months the scraper keeps from latest results (default: `12`).

## Offline Support

The app works offline with:
- Service worker caching
- Firestore offline persistence (enabled by default)
- Local storage for critical data

## License

MIT
