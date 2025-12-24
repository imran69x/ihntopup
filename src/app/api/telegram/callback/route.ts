import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = getFirestore();

// Helper to verify admin by Telegram User ID
async function verifyAdmin(telegramUserId: string): Promise<{ isAdmin: boolean; userId?: string; userName?: string }> {
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef
            .where('telegramUserId', '==', telegramUserId)
            .where('isAdmin', '==', true)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return { isAdmin: false };
        }

        const adminUser = snapshot.docs[0].data();
        return {
            isAdmin: true,
            userId: snapshot.docs[0].id,
            userName: adminUser.name || 'Unknown Admin'
        };
    } catch (error) {
        console.error('Error verifying admin:', error);
        return { isAdmin: false };
    }
}

// Helper to send Telegram answer callback query
async function answerCallbackQuery(
    callbackQueryId: string,
    text: string,
    showAlert: boolean = false
): Promise<void> {
    const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;

    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: callbackQueryId,
                text,
                show_alert: showAlert,
            }),
        });
    } catch (error) {
        console.error('Error answering callback query:', error);
    }
}

// Helper to edit Telegram message
async function editTelegramMessage(
    chatId: string,
    messageId: number,
    newText: string
): Promise<boolean> {
    const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const url = `https://api.telegram.org/bot${botToken}/editMessageText`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: newText,
                parse_mode: 'HTML',
            }),
        });

        const data = await response.json();
        return data.ok;
    } catch (error) {
        console.error('Error editing Telegram message:', error);
        return false;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        // Webhook received - not logging sensitive data

        // Handle callback query (button click)
        if (body.callback_query) {
            const callbackQuery = body.callback_query;
            const telegramUserId = callbackQuery.from.id.toString();
            const callbackData = callbackQuery.data;
            const messageId = callbackQuery.message.message_id;
            const chatId = callbackQuery.message.chat.id;

            // Determine action type and route accordingly
            if (callbackData.startsWith('order_action:')) {
                // Handle Order Actions
                const parts = callbackData.split(':');
                if (parts.length !== 3) {
                    await answerCallbackQuery(callbackQuery.id, 'Invalid action', true);
                    return NextResponse.json({ success: false, error: 'Invalid callback data' });
                }

                const [, newStatus, orderId] = parts;

                // Verify admin
                const adminVerification = await verifyAdmin(telegramUserId);
                if (!adminVerification.isAdmin) {
                    await answerCallbackQuery(
                        callbackQuery.id,
                        '❌ Unauthorized: You are not a registered admin',
                        true
                    );
                    return NextResponse.json({ success: false, error: 'Unauthorized' });
                }

                // Get order document
                const orderRef = db.collection('orders').doc(orderId);
                const orderDoc = await orderRef.get();

                if (!orderDoc.exists) {
                    await answerCallbackQuery(callbackQuery.id, '❌ Order not found', true);
                    return NextResponse.json({ success: false, error: 'Order not found' });
                }

                const orderData = orderDoc.data();

                // Check if already processed
                if (orderData?.status !== 'Pending') {
                    await answerCallbackQuery(
                        callbackQuery.id,
                        `⚠️ Order already processed as: ${orderData?.status}`,
                        true
                    );
                    return NextResponse.json({ success: false, error: 'Already processed' });
                }

                // Handle coin rewards for completed orders using transaction (non-reseller only)
                if (newStatus === 'Completed') {
                    // Use runTransaction to ensure atomicity
                    await db.runTransaction(async (transaction) => {
                        const userRef = db.collection('users').doc(orderData.userId);
                        const userDoc = await transaction.get(userRef);

                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            const isResellerProduct = orderData.isResellerProduct || false;

                            // Calculate coin reward (10% of order amount)
                            if (!isResellerProduct) {
                                const coinReward = (orderData.totalAmount || 0) * 0.1;
                                const currentCoinFund = userData?.coinFund || 0;
                                const newCoinFund = currentCoinFund + coinReward;

                                // Update user's coin fund within transaction
                                transaction.update(userRef, {
                                    coinFund: newCoinFund
                                });

                                console.log(`✅ Added ${coinReward} coins to user ${orderData.userId}`);
                            }
                        }

                        // Update order status within same transaction
                        transaction.update(orderRef, {
                            status: newStatus,
                            processedBy: adminVerification.userId,
                            processedByTelegramId: telegramUserId,
                            processedAt: new Date().toISOString(),
                        });
                    });

                    console.log('✅ Order status updated successfully with coin reward');
                } else {
                    // For non-Completed statuses, just update order
                    await orderRef.update({
                        status: newStatus,
                        processedBy: adminVerification.userId,
                        processedByTelegramId: telegramUserId,
                        processedAt: new Date().toISOString(),
                    });

                    console.log('✅ Order status updated successfully');
                }

                // Send success callback
                const statusEmoji = ({
                    'Completed': '✅',
                    'Cancelled': '❌',
                    'Refunded': '💰',
                    'Processing': '⏳'
                } as Record<string, string>)[newStatus] || '✓';

                await answerCallbackQuery(
                    callbackQuery.id,
                    `${statusEmoji} Order ${newStatus.toLowerCase()} successfully!`,
                    false
                );

                // Edit original message to show processed status
                const updatedMessage = `${callbackQuery.message.text}\n\n<b>━━━━━━━━━━━━━━━━</b>\n<b>Status: ${statusEmoji} ${newStatus}</b>\n<b>Processed by:</b> ${adminVerification.userName}\n<b>Processed at:</b> ${new Date().toLocaleString()}`;

                await editTelegramMessage(chatId.toString(), messageId, updatedMessage);

                return NextResponse.json({ success: true, status: newStatus });
            } else if (callbackData.startsWith('wallet_action:')) {
                // Handle Wallet Request Actions
                const parts = callbackData.split(':');
                if (parts.length !== 3) {
                    await answerCallbackQuery(callbackQuery.id, 'Invalid action', true);
                    return NextResponse.json({ success: false, error: 'Invalid callback data' });
                }

                const [, action, requestId] = parts; // action: "Approved" or "Rejected"

                console.log('🔍 Wallet callback received:');
                console.log('  - Action:', action);
                console.log('  - Request ID:', requestId);
                console.log('  - Telegram User ID:', telegramUserId);

                // Verify admin
                const adminVerification = await verifyAdmin(telegramUserId);
                if (!adminVerification.isAdmin) {
                    await answerCallbackQuery(
                        callbackQuery.id,
                        '❌ Unauthorized: You are not a registered admin',
                        true
                    );
                    return NextResponse.json({ success: false, error: 'Unauthorized' });
                }

                // Get wallet request document
                let requestRef = db.collection('wallet_top_up_requests').doc(requestId);
                console.log('📂 Looking for document with ID:', requestId);
                let requestDoc = await requestRef.get();

                // If not found by document ID, try to find by matching criteria
                if (!requestDoc.exists) {
                    console.log('⚠️ Direct lookup failed, searching by criteria...');

                    try {
                        // Extract request info from the Telegram message for matching
                        const messageText = callbackQuery.message.text || '';

                        // Try to find matching pending request
                        const pendingRequests = await db.collection('wallet_top_up_requests')
                            .where('status', '==', 'Pending')
                            .limit(50)
                            .get();

                        console.log(`  - Found ${pendingRequests.size} pending requests to check`);

                        // Try to match by ID field if it exists in the document
                        let matchedDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
                        pendingRequests.forEach(doc => {
                            const data = doc.data();
                            // Check if stored id field matches the callback requestId
                            if (data.id === requestId) {
                                console.log('✅ Found matching request by id field!');
                                matchedDoc = doc;
                            }
                        });

                        if (matchedDoc) {
                            requestDoc = matchedDoc;
                            requestRef = db.collection('wallet_top_up_requests').doc(matchedDoc.id);
                        } else {
                            console.error('❌ Request document not found!');
                            console.error('  - Searched for ID:', requestId);
                            console.error('  - Collection: wallet_top_up_requests');
                            console.error('  - Checked', pendingRequests.size, 'pending requests');

                            pendingRequests.forEach(doc => {
                                console.error('    • Document ID:', doc.id, '| Stored ID field:', doc.data().id);
                            });

                            await answerCallbackQuery(callbackQuery.id, '❌ Request not found', true);
                            return NextResponse.json({ success: false, error: 'Request not found' });
                        }
                    } catch (debugError) {
                        console.error('Error during fallback search:', debugError);
                        await answerCallbackQuery(callbackQuery.id, '❌ Request not found', true);
                        return NextResponse.json({ success: false, error: 'Request not found' });
                    }
                }

                console.log('✅ Request document found!');
                console.log('  - Document ID:', requestDoc.id);
                console.log('  - Status:', requestDoc.data()?.status);


                const requestData = requestDoc.data();

                // Check if already processed
                if (requestData?.status !== 'Pending') {
                    await answerCallbackQuery(
                        callbackQuery.id,
                        `⚠️ Request already ${requestData?.status}`,
                        true
                    );
                    return NextResponse.json({ success: false, error: 'Already processed' });
                }

                // Update wallet balance if approved
                if (action === 'Approved') {
                    const userRef = db.collection('users').doc(requestData.userId);
                    const userDoc = await userRef.get();

                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        const currentBalance = userData?.walletBalance || 0;
                        const newBalance = currentBalance + (requestData.amount || 0);

                        await userRef.update({
                            walletBalance: newBalance
                        });
                    }
                }

                // Update request status
                await requestRef.update({
                    status: action,
                    processedBy: adminVerification.userId,
                    processedByTelegramId: telegramUserId,
                    processedAt: new Date().toISOString(),
                });

                console.log('✅ Wallet request processed successfully');

                // Send success callback
                const actionEmoji = action === 'Approved' ? '✅' : '❌';
                await answerCallbackQuery(
                    callbackQuery.id,
                    `${actionEmoji} Request ${action.toLowerCase()} successfully!`,
                    false
                );

                // Edit original message
                const updatedMessage = `${callbackQuery.message.text}\n\n<b>━━━━━━━━━━━━━━━━</b>\n<b>Status: ${actionEmoji} ${action}</b>\n<b>Processed by:</b> ${adminVerification.userName}\n<b>Processed at:</b> ${new Date().toLocaleString()}`;

                await editTelegramMessage(chatId.toString(), messageId, updatedMessage);

                return NextResponse.json({ success: true, action });
            } else {
                // Unknown callback type
                await answerCallbackQuery(callbackQuery.id, 'Unknown action type', true);
                return NextResponse.json({ success: false, error: 'Unknown action' });
            }
        }

        // Handle other webhook events if needed
        return NextResponse.json({ success: true, message: 'Webhook received' });

    } catch (error) {
        console.error('❌ Error processing Telegram webhook:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Handle GET requests (for webhook verification)
export async function GET(request: NextRequest) {
    return NextResponse.json({ message: 'Telegram webhook endpoint is active' });
}
