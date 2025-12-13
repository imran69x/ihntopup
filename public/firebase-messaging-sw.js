// This file should be in the public folder

importScripts("https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js");

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// The config object should be sourced securely.
// For demonstration, we'll use placeholder values.
// In a real app, you would replace these with your actual Firebase config.
const firebaseConfig = {
  apiKey: "AIzaSyDAvbQ5YdxakDf9q1DHro1xsPerrqu1gpU",
  authDomain: "studio-4351733650-57326.firebaseapp.com",
  projectId: "studio-4351733650-57326",
  storageBucket: "studio-4351733650-57326.appspot.com",
  messagingSenderId: "444473321423",
  appId: "1:444473321423:web:d5b0879e4e14d38f3514ba",
};


firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || "/icon-192x192.png", // default icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
