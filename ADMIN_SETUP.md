# Admin User Setup Guide

## Creating the Admin User "chris"

**Admin Email**: `christopherbenosa81@gmail.com`  
**Default Password**: `Admin@123!` (⚠️ Change after first login!)

To create the admin user, you have two options:

### Option 1: Using Browser Console (Recommended)

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to the app (usually `http://localhost:5173`)

3. Open the browser console (F12)

4. Run the following code:
   ```javascript
   import { initializeAdminUser } from './src/utils/initAdmin';
   await initializeAdminUser();
   ```

   Or if that doesn't work, you can manually create the user:

   ```javascript
   // In browser console - Use the secure initialization
   import { initializeAdminUser } from './src/utils/initAdmin';
   await initializeAdminUser();
   ```
   
   **Note**: The new secure system uses password hashing. Passwords are hashed with bcrypt before storage.

### Option 2: Manual Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** > **Users**
4. Click **Add user**
5. Enter:
   - Email: `christopherbenosa81@gmail.com`
   - Password: `Admin@123!`
6. Click **Add user**
7. Copy the User UID
8. Go to **Firestore Database**
9. Create a new document in the `users` collection with the User UID as the document ID
10. Add the following fields:
    - `email`: `christopherbenosa81@gmail.com`
    - `password`: `$2a$10$...` (hashed password - use Admin API to generate)
    - `name`: `chris`
    - `role`: `administrator`
    - `enabledModules`: `[]` (empty array means all modules)
    - `isActive`: `true`
    - `createdAt`: Current timestamp
    - `updatedAt`: Current timestamp

**Better Option**: Use the Admin API endpoint `/api/admin-users` with action `createUser` to automatically hash the password.

## Default Admin Credentials

- **Email**: `christopherbenosa81@gmail.com`
- **Password**: `Admin@123!`

⚠️ **IMPORTANT**: 
- Change the password after first login!
- Verify your email address!
- See `SECURE_SETUP.md` for complete secure setup instructions

## Features

### Admin Capabilities:
- ✅ Create, read, update, and delete users
- ✅ View user passwords (stored in plain text as requested)
- ✅ Control which modules each member can access
- ✅ View user details including budget data
- ✅ Activate/deactivate user accounts
- ✅ Access all modules regardless of `enabledModules` setting

### Member Capabilities:
- ✅ Update own profile (name, picture, gender, birthdate, phone, address)
- ❌ Cannot change user type (role)
- ❌ Cannot change enabled modules
- ❌ Cannot view other users
- ✅ Can only access modules assigned by admin

## Module Access Control

Admins can control which modules each member can access:
- **Budget Module**: Financial management features
- **Task Module**: Jira ticket management

To assign modules to a user:
1. Go to User Management module
2. Click "Edit" on a user
3. Check/uncheck the modules you want to enable
4. Save

Empty `enabledModules` array means the user can access all modules (admin only).

## User Management

The User Management module is only visible to administrators. It allows:
- Creating new users
- Editing user details
- Viewing user passwords
- Viewing user budget details
- Deleting users
- Controlling module access

## Security Features (Now Implemented!)

✅ **Password Hashing**: All passwords are hashed using bcrypt  
✅ **Firebase Admin SDK**: Secure user management via serverless functions  
✅ **Password Reset**: Users can reset passwords via email  
✅ **Email Verification**: New users receive verification emails  

See `SECURE_SETUP.md` for complete setup instructions.

⚠️ **Important**: 
- Change the default password after first login!
- Set up Firebase Service Account in Vercel for Admin API to work
- Verify your email address!
