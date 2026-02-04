# Firestore Collections Reference

This document lists all Firestore collections used in the Personal Management App and where each data type is stored.

## Budget Module Collections

### 1. **Incomes** → `incomes` collection
- **Collection Name**: `incomes`
- **Fields**:
  - `userId` (string) - User ID from Firebase Auth
  - `amount` (number)
  - `source` (string)
  - `frequency` (string: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly')
  - `date` (Timestamp)
  - `notes` (string, optional)
  - `createdAt` (Timestamp)
  - `updatedAt` (Timestamp)

### 2. **Expenses** → `expenses` collection
- **Collection Name**: `expenses`
- **Fields**:
  - `userId` (string) - User ID from Firebase Auth
  - `amount` (number)
  - `categoryId` (string)
  - `description` (string)
  - `date` (Timestamp)
  - `isRecurring` (boolean)
  - `recurringFrequency` (string, optional)
  - `nextDueDate` (Timestamp, optional)
  - `notes` (string, optional)
  - `createdAt` (Timestamp)
  - `updatedAt` (Timestamp)

### 3. **Debts** → `debts` collection
- **Collection Name**: `debts`
- **Fields**:
  - `userId` (string) - User ID from Firebase Auth
  - `type` (string: 'credit_card' | 'loan' | 'other')
  - `creditor` (string)
  - `totalAmount` (number)
  - `remainingAmount` (number)
  - `minimumPayment` (number)
  - `interestRate` (number, optional)
  - `dueDate` (number) - Day of month (1-31)
  - `downPayment` (number, optional)
  - `isPaid` (boolean, optional)
  - `totalAmountDue` (number, optional)
  - `notes` (string, optional)
  - `createdAt` (Timestamp)
  - `updatedAt` (Timestamp)

### 4. **Savings Goals** → `savingsGoals` collection
- **Collection Name**: `savingsGoals`
- **Fields**:
  - `userId` (string) - User ID from Firebase Auth
  - `name` (string)
  - `targetAmount` (number)
  - `currentAmount` (number)
  - `targetDate` (Timestamp, optional)
  - `notes` (string, optional)
  - `createdAt` (Timestamp)
  - `updatedAt` (Timestamp)

### 5. **Expense Categories** → `categories` collection
- **Collection Name**: `categories`
- **Fields**:
  - `userId` (string) - User ID from Firebase Auth
  - `name` (string)
  - `isCustom` (boolean)

## Task Module Collections

### 6. **Jira Tickets** → `tickets` collection
- **Collection Name**: `tickets`
- **Fields**:
  - `userId` (string) - User ID from Firebase Auth
  - `key` (string) - Jira ticket key (e.g., "PROJ-123")
  - `title` (string)
  - `status` (string)
  - `url` (string)
  - `assignee` (string, optional)
  - `isManual` (boolean) - Flag for manually added tickets
  - `created` (Timestamp)
  - `updated` (Timestamp)

## User Management Collections

### 7. **Users** → `users` collection
- **Collection Name**: `users`
- **Document ID**: Firebase Auth UID
- **Fields**: See `src/types/user.ts`

### 8. **Site Settings** → `settings` collection
- **Collection Name**: `settings`
- **Document ID**: `site-settings` (single document)
- **Fields**:
  - `currency` (string)
  - `currencySymbol` (string)
  - `updatedAt` (Timestamp)

## How to View Data in Firestore Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `personal-modular-app-3ca9e`
3. Navigate to **Firestore Database**
4. You should see these collections:
   - `categories`
   - `debts`
   - `expenses`
   - `incomes`
   - `savingsGoals`
   - `settings`
   - `tickets`
   - `users`

## Important Notes

### User-Specific Data
All budget and task data is **user-specific**. Each document includes a `userId` field that matches the Firebase Auth UID. This ensures:
- Users can only see their own data
- Data is properly isolated between users
- Queries filter by `userId`

### Viewing Your Data
When viewing in Firestore Console:
1. Click on a collection (e.g., `incomes`)
2. You'll see documents with auto-generated IDs
3. Each document will have a `userId` field
4. To see only your data, you can filter by `userId` in the console (though the app does this automatically)

### If You Don't See Data

1. **Check if you're logged in**: Data is only saved when authenticated
2. **Check browser console**: Look for any errors when saving
3. **Check Firestore Security Rules**: Make sure rules allow read/write for authenticated users
4. **Verify userId**: Check that `auth.currentUser.uid` matches the `userId` in documents
5. **Check collection names**: Make sure you're looking at the correct collection names (case-sensitive)

## Firestore Security Rules

Your Firestore security rules should allow authenticated users to read/write their own data. Example:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Budget data - users can only access their own data
    match /incomes/{document=**} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    match /expenses/{document=**} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    match /debts/{document=**} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    match /savingsGoals/{document=**} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    match /categories/{document=**} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Tickets - users can only access their own data
    match /tickets/{document=**} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Site settings - admin only
    match /settings/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'administrator';
    }
  }
}
```
