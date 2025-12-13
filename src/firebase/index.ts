import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

if (typeof window !== 'undefined' && !getApps().length) {
  // Client-side initialization
  try {
    firebaseApp = initializeApp();
  } catch (e) {
    firebaseApp = initializeApp(firebaseConfig);
  }
} else if (getApps().length > 0) {
  // If already initialized (can be on server or client)
  firebaseApp = getApp();
}
// Note: Admin SDK should be used for server-side logic, 
// but for environments where that's not set up, we ensure these don't break.
if (global.firebaseApp) {
    firebaseApp = global.firebaseApp;
}


// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
    if (!getApps().length) {
        let app;
        try {
            // This works in Firebase App Hosting
            app = initializeApp();
        } catch (e) {
            // Fallback for other environments
            app = initializeApp(firebaseConfig);
        }
        firebaseApp = app;
        auth = getAuth(app);
        firestore = getFirestore(app);
    } else {
        firebaseApp = getApp();
        auth = getAuth(firebaseApp);
        firestore = getFirestore(firebaseApp);
    }

    return { firebaseApp, auth, firestore };
}


export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';