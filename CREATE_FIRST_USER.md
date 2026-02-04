# Creating Your First User (Admin)

## The Problem

If you're getting "INVALID_LOGIN_CREDENTIALS", it means:
- The user doesn't exist in Firebase Authentication yet
- You need to create the user first

## Solution: Create Admin User

You have **3 options** to create the admin user:

### Option 1: Firebase Console (Easiest - Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **personal-modular-app-3ca9e**
3. Go to **Authentication** > **Users**
4. Click **Add user**
5. Enter:
   - **Email**: `christopherbenosa81@gmail.com`
   - **Password**: `Admin@123!`
6. Click **Add user**
7. Copy the **User UID** (you'll need this)
8. Go to **Firestore Database**
9. Create a new document in the `users` collection
10. Use the **User UID** as the document ID
11. Add these fields:
    ```json
    {
      "email": "christopherbenosa81@gmail.com",
      "password": "$2a$10$...", // Hashed password (use Admin API or leave empty for now)
      "name": "chris",
      "role": "administrator",
      "enabledModules": [],
      "isActive": true,
      "createdAt": [Current Timestamp],
      "updatedAt": [Current Timestamp]
    }
    ```

### Option 2: Use Admin API (After Vercel Setup)

Once you've set up `FIREBASE_SERVICE_ACCOUNT` in Vercel:

1. Deploy your app to Vercel
2. Call the Admin API:
   ```bash
   curl -X POST https://your-app.vercel.app/api/admin-users \
     -H "Content-Type: application/json" \
     -d '{
       "action": "createUser",
       "userData": {
         "email": "christopherbenosa81@gmail.com",
         "password": "Admin@123!",
         "name": "chris",
         "role": "administrator",
         "enabledModules": []
       }
     }'
   ```

### Option 3: Browser Console Script

1. Start your dev server: `npm run dev`
2. Open browser console (F12)
3. Run:
   ```javascript
   import { initializeApp } from 'firebase/app';
   import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
   import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';
   import * as bcrypt from 'bcryptjs';
   
   const firebaseConfig = {
     apiKey: "AIzaSyCtkAfzoBkErY0HHTxWQ6fVw1ZfKRsko5I",
     authDomain: "personal-modular-app-3ca9e.firebaseapp.com",
     projectId: "personal-modular-app-3ca9e",
     storageBucket: "personal-modular-app-3ca9e.firebasestorage.app",
     messagingSenderId: "294365009691",
     appId: "1:294365009691:web:a69a01c794d3b5a680e5be"
   };
   
   const app = initializeApp(firebaseConfig);
   const auth = getAuth(app);
   const db = getFirestore(app);
   
   const email = 'christopherbenosa81@gmail.com';
   const password = 'Admin@123!';
   
   try {
     // Create Firebase Auth user
     const userCredential = await createUserWithEmailAndPassword(auth, email, password);
     console.log('✅ Firebase Auth user created:', userCredential.user.uid);
     
     // Hash password
     const hashedPassword = await bcrypt.hash(password, 10);
     
     // Create Firestore user document
     await setDoc(doc(db, 'users', userCredential.user.uid), {
       email: email,
       password: hashedPassword,
       name: 'chris',
       role: 'administrator',
       enabledModules: [],
       isActive: true,
       createdAt: Timestamp.now(),
       updatedAt: Timestamp.now()
     });
     
     console.log('✅ Firestore user document created!');
     console.log('You can now login with:');
     console.log('Email:', email);
     console.log('Password:', password);
   } catch (error) {
     if (error.code === 'auth/email-already-in-use') {
       console.log('⚠️ User already exists in Firebase Auth');
       console.log('You may need to create the Firestore document manually');
     } else {
       console.error('❌ Error:', error);
     }
   }
   ```

## After Creating User

1. **Login** with:
   - Email: `christopherbenosa81@gmail.com`
   - Password: `Admin@123!`

2. **Change password** immediately after first login

3. **Verify email** (check your inbox)

## Troubleshooting

### "Email already in use"
- The user exists in Firebase Auth
- You just need to create the Firestore document
- Use Option 1, Step 8-11 above

### "User data not found" after login
- User exists in Auth but not in Firestore
- Create the Firestore document (Option 1, Step 8-11)

### Still can't login
1. Check Firebase Console > Authentication > Users
2. Verify the user exists
3. Try resetting password from Firebase Console
4. Make sure Email/Password is enabled (see `FIREBASE_AUTH_SETUP.md`)
