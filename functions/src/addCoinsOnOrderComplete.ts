import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function: Automatically add coins when order status changes to "Completed"
 * Triggers on any order document update
 */
export const addCoinsOnOrderComplete = functions.firestore
    .document('orders/{orderId}')
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data();
        const afterData = change.after.data();
        const orderId = context.params.orderId;

        // Check if status changed TO "Completed" (and wasn't already Completed)
        if (afterData.status === 'Completed' && beforeData.status !== 'Completed') {
            console.log(`🪙 Order ${orderId} completed, processing coin reward...`);

            try {
                // Check if this is a reseller product (no coins for reseller orders)
                const isResellerProduct = afterData.isResellerProduct || false;

                if (isResellerProduct) {
                    console.log(`⏭️  Order ${orderId} is reseller product, skipping coin reward`);
                    return null;
                }

                // Check if coins were already added (prevent duplicate rewards)
                if (afterData.coinRewardAdded === true) {
                    console.log(`⏭️  Coins already added for order ${orderId}, skipping`);
                    return null;
                }

                const userId = afterData.userId;
                const totalAmount = afterData.totalAmount || 0;
                const coinReward = totalAmount * 0.1; // 10% of order amount

                if (!userId) {
                    console.error(`❌ No userId found for order ${orderId}`);
                    return null;
                }

                // Use transaction to ensure atomicity
                await db.runTransaction(async (transaction) => {
                    const userRef = db.collection('users').doc(userId);
                    const orderRef = db.collection('orders').doc(orderId);

                    const userDoc = await transaction.get(userRef);

                    if (!userDoc.exists) {
                        throw new Error(`User ${userId} not found`);
                    }

                    const userData = userDoc.data();
                    const currentCoinFund = userData?.coinFund || 0;
                    const newCoinFund = currentCoinFund + coinReward;

                    // Update user's coin fund
                    transaction.update(userRef, {
                        coinFund: newCoinFund
                    });

                    // Mark order as coin-rewarded to prevent duplicates
                    transaction.update(orderRef, {
                        coinRewardAdded: true,
                        coinRewardAmount: coinReward,
                        coinRewardAddedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                });

                console.log(`✅ Added ${coinReward} coins to user ${userId} for order ${orderId}`);
                return null;

            } catch (error) {
                console.error(`❌ Error adding coins for order ${orderId}:`, error);
                // Don't throw - we don't want to fail the entire transaction
                return null;
            }
        }

        // Status didn't change to Completed, no action needed
        return null;
    });
