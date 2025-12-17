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

                // Update order status with metadata
                await orderRef.update({
                    status: newStatus,
                    processedBy: adminVerification.userId,
                    processedByTelegramId: telegramUserId,
                    processedAt: new Date().toISOString(),
                });

                console.log('✅ Order status updated successfully');

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
                const requestRef = db.collection('wallet_top_up_requests').doc(requestId);
                const requestDoc = await requestRef.get();

                if (!requestDoc.exists) {
                    await answerCallbackQuery(callbackQuery.id, '❌ Request not found', true);
                    return NextResponse.json({ success: false, error: 'Request not found' });
                }

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
