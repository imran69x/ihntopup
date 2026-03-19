

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import 'server-only';

function getAdminApp(): App {
    const apps = getApps();
    if (apps.length > 0) return apps[0];

    try {
        const serviceAccount = {
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/gm, '\n'),
        };

        if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
            // During build time, variables might be missing. We shouldn't throw here if we're just analyzing.
            // But if this is called at runtime, it's a fatal error.
            throw new Error('Missing required Firebase Admin credentials. Please check your environment variables.');
        }

        return initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.projectId,
        });
    } catch (e: any) {
        console.error("Failed to initialize Firebase Admin SDK:", e);
        throw e;
    }
}

export const adminFirestore = () => getFirestore(getAdminApp());
export const adminAuth = () => getAuth(getAdminApp());
