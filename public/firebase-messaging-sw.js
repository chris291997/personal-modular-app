/* global firebase, importScripts */
// Firebase Cloud Messaging service worker - required for push notifications
// Must be at /firebase-messaging-sw.js (root) so Firebase can register it
// https://firebase.google.com/docs/cloud-messaging/js/receive

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCtkAfzoBkErY0HHTxWQ6fVw1ZfKRsko5I",
  authDomain: "personal-modular-app-3ca9e.firebaseapp.com",
  projectId: "personal-modular-app-3ca9e",
  storageBucket: "personal-modular-app-3ca9e.firebasestorage.app",
  messagingSenderId: "294365009691",
  appId: "1:294365009691:web:a69a01c794d3b5a680e5be",
  measurementId: "G-NS5QEBRTLV"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png'
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});
