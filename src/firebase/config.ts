/* eslint-disable @typescript-eslint/no-explicit-any */
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase configuration
// TODO: Replace with your Firebase config
// Get this from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
    apiKey: "AIzaSyCtkAfzoBkErY0HHTxWQ6fVw1ZfKRsko5I",
    authDomain: "personal-modular-app-3ca9e.firebaseapp.com",
    projectId: "personal-modular-app-3ca9e",
    storageBucket: "personal-modular-app-3ca9e.firebasestorage.app",
    messagingSenderId: "294365009691",
    appId: "1:294365009691:web:a69a01c794d3b5a680e5be",
    measurementId: "G-NS5QEBRTLV"
  };
const VAPID_KEY = "BNLQYYInyhbO4-ZGc9OCF-WyOj7xvPV10BlWDuo2Kk8uotM-RvNTLAH-ZK-Cxld3TX4HTMwre0ybZC3rdUHTgfg"

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Initialize Cloud Messaging and get a reference to the service
let messaging: ReturnType<typeof getMessaging> | null = null;

if (typeof window !== 'undefined' && 'Notification' in window) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.warn('Firebase Messaging not supported:', error);
  }
}

export { messaging };

// Request notification permission and get token
export const requestNotificationPermission = async (): Promise<string | null> => {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY // Get this from Firebase Console > Cloud Messaging > Web Push certificates
      });
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error getting notification token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = () => {
  return new Promise((resolve) => {
    if (!messaging) {
      resolve(null);
      return;
    }
    onMessage(messaging, (payload: any) => {
      resolve(payload);
    });
  });
};
