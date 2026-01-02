import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { buildOrderActionKeyboard, buildRejectReasonKeyboard, buildRefundReasonKeyboard } from '@/lib/telegram';

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
    newText: string,
    replyMarkup?: any
): Promise<boolean> {
    const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const url = `https://api.telegram.org/bot${botToken}/editMessageText`;

    try {
        const body: any = {
            chat_id: chatId,
            message_id: messageId,
            text: newText,
            parse_mode: 'HTML',
        };

        if (replyMarkup) {
            body.reply_markup = replyMarkup;
            console.log('📤 Sending reply_markup:', JSON.stringify(replyMarkup, null, 2));
        }

        console.log('📨 Telegram API request:', {
            url: url.substring(0, 50) + '...',
            chat_id: chatId,
            message_id: messageId,
            has_reply_markup: !!replyMarkup
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!data.ok) {
            console.error('❌ Telegram API error:', data);
        } else {
            console.log('✅ Telegram message edited successfully');
        }

        return data.ok;
    } catch (error) {
        console.error('❌ Error editing Telegram message:', error);
        return false;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log('🔔 ============ TELEGRAM WEBHOOK ============');
        console.log('Body type:', body.message ? 'MESSAGE' : body.callback_query ? 'CALLBACK' : 'OTHER');

        // Handle callback query (button click)
        if (body.callback_query) {
            const callbackQuery = body.callback_query;
            const telegramUserId = callbackQuery.from.id.toString();
            const callbackData = callbackQuery.data;
            const messageId = callbackQuery.message.message_id;
            const chatId = callbackQuery.message.chat.id.toString();

            console.log('📱 CALLBACK QUERY DETAILS:');
            console.log('  - Data:', callbackData);
            console.log('  - User ID:', telegramUserId);
            console.log('  - Message ID:', messageId);
            console.log('  - Chat ID:', chatId);
            console.log('  - Starts with order_action?', callbackData.startsWith('order_action:'));
            console.log('  - Starts with wallet_action?', callbackData.startsWith('wallet_action:'));

            // Handle order actions (direct processing)
            if (callbackData.startsWith('order_action:')) {
                const parts = callbackData.split(':');
                if (parts.length < 3) {
                    await answerCallbackQuery(callbackQuery.id, 'Invalid action', true);
                    return NextResponse.json({ success: false, error: 'Invalid callback data' });
                }

                const newStatus = parts[1];
                const orderId = parts[2];
                // const reason = parts[3]; // Optional reason from pre-defined buttons

                // Verify admin
                const adminVerification = await verifyAdmin(telegramUserId);
                if (!adminVerification.isAdmin) {
                    await answerCallbackQuery(callbackQuery.id, '❌ Unauthorized', true);
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

                if (orderData?.status !== 'Pending') {
                    await answerCallbackQuery(callbackQuery.id, `⚠️ Already ${orderData?.status}`, true);
                    return NextResponse.json({ success: false, error: 'Already processed' });
                }

                console.log(`\n🔄 Processing order ${orderId} as ${newStatus}`);

                // Process order based on status
                try {
                    if (newStatus === 'Completed') {
                        await db.runTransaction(async (transaction) => {
                            const userRef = db.collection('users').doc(orderData.userId);
                            const userDoc = await transaction.get(userRef);

                            if (userDoc.exists) {
                                const userData = userDoc.data();
                                const isResellerProduct = orderData.isResellerProduct || false;

                                const updates: any = { isActive: true }; // Activate user when order is completed

                                if (!isResellerProduct) {
                                    const coinReward = (orderData.totalAmount || 0) * 0.1;
                                    const currentCoinFund = userData?.coinFund || 0;
                                    const newCoinFund = currentCoinFund + coinReward;

                                    updates.coinFund = newCoinFund;
                                }

                                transaction.update(userRef, updates);
                            }

                            transaction.update(orderRef, {
                                status: newStatus,
                                processedBy: adminVerification.userId,
                                processedByTelegramId: telegramUserId,
                                processedAt: new Date().toISOString(),
                            });
                        });
                    } else if (newStatus === 'Refunded') {
                        console.log(`💰 Refunding order ${orderId}`);
                        console.log(`  - Payment: ${orderData.paymentMethod}`);
                        console.log(`  - Amount: ৳${orderData.totalAmount}`);

                        await db.runTransaction(async (transaction) => {
                            const userRef = db.collection('users').doc(orderData.userId);
                            const userDoc = await transaction.get(userRef);

                            if (userDoc.exists) {
                                const userData = userDoc.data();
                                const refundAmount = orderData.totalAmount || 0;

                                if (orderData.paymentMethod === 'wallet' || orderData.paymentMethod === 'Wallet') {
                                    const currentBalance = userData?.walletBalance || 0;
                                    const newBalance = currentBalance + refundAmount;

                                    transaction.update(userRef, {
                                        walletBalance: newBalance
                                    });

                                    console.log(`  ✅ Refunded ৳${refundAmount} to wallet`);
                                } else if (orderData.paymentMethod === 'coinFund' || orderData.paymentMethod === 'CoinFund') {
                                    const currentCoinFund = userData?.coinFund || 0;
                                    const newCoinFund = currentCoinFund + refundAmount;

                                    transaction.update(userRef, {
                                        coinFund: newCoinFund
                                    });

                                    console.log(`  ✅ Refunded ৳${refundAmount} to coin fund`);
                                }
                            }

                            transaction.update(orderRef, {
                                status: newStatus,
                                processedBy: adminVerification.userId,
                                processedByTelegramId: telegramUserId,
                                processedAt: new Date().toISOString(),
                            });
                        });

                        console.log(`✅ Refund completed\n`);
                    } else {
                        await orderRef.update({
                            status: newStatus,
                            processedBy: adminVerification.userId,
                            processedByTelegramId: telegramUserId,
                            processedAt: new Date().toISOString(),
                        });
                    }

                    // Edit message with status
                    const statusEmoji = ({
                        'Completed': '✅',
                        'Cancelled': '❌',
                        'Refunded': '💰',
                        'Processing': '⏳'
                    } as Record<string, string>)[newStatus] || '✓';

                    const updatedMessage = `${statusEmoji} <b>Order ${newStatus}</b>\n\n📦 Order ID: <code>#${orderData.orderId || orderId}</code>\n👤 Customer: ${orderData.userName}\n💰 Amount: ৳${orderData.totalAmount}\n\n<b>━━━━━━━━━━━━━━━━</b>\n<b>Processed by:</b> ${adminVerification.userName}\n<b>Processed at:</b> ${new Date().toLocaleString()}`;

                    await editTelegramMessage(chatId, messageId, updatedMessage);
                    await answerCallbackQuery(callbackQuery.id, `${statusEmoji} Order ${newStatus}!`, false);

                    return NextResponse.json({ success: true, status: newStatus });

                } catch (error) {
                    console.error('❌ Error processing order:', error);
                    await answerCallbackQuery(callbackQuery.id, '❌ Error processing order', true);
                    return NextResponse.json({ success: false, error: 'Processing failed' });
                }
            }

            // Handle wallet actions
            if (callbackData.startsWith('wallet_action:')) {
                const parts = callbackData.split(':');
                if (parts.length !== 3) {
                    await answerCallbackQuery(callbackQuery.id, 'Invalid action', true);
                    return NextResponse.json({ success: false, error: 'Invalid callback data' });
                }

                const [, action, requestId] = parts;

                const adminVerification = await verifyAdmin(telegramUserId);
                if (!adminVerification.isAdmin) {
                    await answerCallbackQuery(callbackQuery.id, '❌ Unauthorized', true);
                    return NextResponse.json({ success: false, error: 'Unauthorized' });
                }

                let requestRef = db.collection('wallet_top_up_requests').doc(requestId);
                let requestDoc = await requestRef.get();

                if (!requestDoc.exists) {
                    const pendingRequests = await db.collection('wallet_top_up_requests')
                        .where('status', '==', 'Pending')
                        .limit(50)
                        .get();

                    let matchedDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
                    pendingRequests.forEach(doc => {
                        const data = doc.data() as any;
                        if (data.id === requestId) {
                            matchedDoc = doc;
                        }
                    });

                    if (matchedDoc) {
                        requestDoc = matchedDoc;
                        requestRef = db.collection('wallet_top_up_requests').doc(matchedDoc!.id);
                    } else {
                        await answerCallbackQuery(callbackQuery.id, '❌ Request not found', true);
                        return NextResponse.json({ success: false, error: 'Request not found' });
                    }
                }

                const requestData = requestDoc.data();

                if (requestData?.status !== 'Pending') {
                    await answerCallbackQuery(callbackQuery.id, `⚠️ Already ${requestData?.status}`, true);
                    return NextResponse.json({ success: false, error: 'Already processed' });
                }

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

                await requestRef.update({
                    status: action,
                    processedBy: adminVerification.userId,
                    processedByTelegramId: telegramUserId,
                    processedAt: new Date().toISOString(),
                });

                const actionEmoji = action === 'Approved' ? '✅' : '❌';
                const updatedMessage = `${actionEmoji} <b>Request ${action}</b>\n\n💰 Amount: ৳${requestData.amount}\n👤 User: ${requestData.userName}\n\n<b>━━━━━━━━━━━━━━━━</b>\n<b>Processed by:</b> ${adminVerification.userName}\n<b>Processed at:</b> ${new Date().toLocaleString()}`;

                await editTelegramMessage(chatId, messageId, updatedMessage);
                await answerCallbackQuery(callbackQuery.id, `${actionEmoji} Request ${action}!`, false);

                return NextResponse.json({ success: true, action });
            }

            // For any other callbacks, just acknowledge them
            await answerCallbackQuery(callbackQuery.id, '✓ Received', false);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: true, message: 'Webhook received' });

    } catch (error) {
        console.error('❌ Error processing Telegram webhook:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    return NextResponse.json({ message: 'Telegram webhook endpoint is active' });
}
