

import { initializeApp, getApps, App, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import 'server-only';

let adminApp: App;

if (!getApps().length) {
    try {
        // Create service account object from environment variables
        const serviceAccount = {
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        };

        // Validate that all required credentials are present
        if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
            throw new Error('Missing required Firebase Admin credentials. Please check your environment variables.');
        }

        adminApp = initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.projectId,
        });
    } catch (e: any) {
        console.error("Failed to initialize Firebase Admin SDK:", e);
        throw new Error(`Firebase Admin SDK initialization failed: ${e.message}`);
    }
} else {
    adminApp = getApps()[0];
}

export const adminFirestore = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
