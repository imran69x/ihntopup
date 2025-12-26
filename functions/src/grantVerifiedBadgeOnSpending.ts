/**
 * Firebase Cloud Function: Grant Verified Badge on 5000 Taka Spending
 * 
 * Automatically grants verified badge to users when their total spending
 * from completed orders reaches or exceeds 5000 taka.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

export const grantVerifiedBadgeOnSpending = functions.firestore
    .document('orders/{orderId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();

        // Only proceed if order status changed to "Completed"
        if (newData.status !== 'Completed' || oldData.status === 'Completed') {
            return null;
        }

        const userId = newData.userId;
        if (!userId) {
            console.log('No userId found in order');
            return null;
        }

        try {
            // Get user document
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                console.log(`User ${userId} not found`);
                return null;
            }

            const userData = userDoc.data();

            // If user already has verified badge, no need to check spending
            if (userData?.hasVerifiedBadge === true) {
                console.log(`User ${userId} already has verified badge`);
                return null;
            }

            // Query all completed orders for this user
            const ordersSnapshot = await db
                .collection('orders')
                .where('userId', '==', userId)
                .where('status', '==', 'Completed')
                .get();

            // Calculate total spending
            let totalSpending = 0;
            ordersSnapshot.forEach((doc) => {
                const orderData = doc.data();
                totalSpending += orderData.totalAmount || 0;
            });

            console.log(`User ${userId} total spending: ${totalSpending} taka`);

            // Grant verified badge if spending >= 5000 taka
            if (totalSpending >= 5000) {
                await userRef.update({
                    hasVerifiedBadge: true
                });
                console.log(`✅ Verified badge granted to user ${userId} (spent ${totalSpending} taka)`);
            } else {
                console.log(`User ${userId} has not reached 5000 taka threshold yet (${totalSpending} taka)`);
            }

            return null;
        } catch (error) {
            console.error('Error granting verified badge:', error);
            return null;
        }
    });
