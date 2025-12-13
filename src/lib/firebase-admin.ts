

import { initializeApp, getApps, App, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import 'server-only';

let adminApp: App;

if (!getApps().length) {
    try {
        // This configuration is for environments like Vercel or other hosting platforms
        // where the service account JSON is stored in an environment variable.
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
            const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
            adminApp = initializeApp({
                credential: cert(serviceAccount),
            });
        } else {
            // This configuration is for Google Cloud environments (like Firebase App Hosting, Cloud Run)
            // where Application Default Credentials (ADC) are automatically available.
            adminApp = initializeApp({
                credential: applicationDefault(),
            });
        }
    } catch (e: any) {
        console.error("Failed to initialize Firebase Admin SDK:", e);
        // This error is critical. If the Admin SDK fails to initialize, server-side actions will fail.
        // We throw the error to make it visible during server startup or first execution.
        throw new Error(`Firebase Admin SDK initialization failed: ${e.message}`);
    }
} else {
    adminApp = getApps()[0];
}

export const adminFirestore = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
