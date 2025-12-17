// Telegram Notification Helper
// Send notifications to Telegram group for orders and wallet requests

// Get telegram credentials from environment variables
const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '';

// Telegram notification response type
export type TelegramResponse = {
    success: boolean;
    messageId?: number;
};

export async function sendTelegramNotification(
    message: string,
    replyMarkup?: any
): Promise<TelegramResponse> {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error('❌ Telegram credentials not configured in .env file');
        console.error('Required: NEXT_PUBLIC_TELEGRAM_BOT_TOKEN and NEXT_PUBLIC_TELEGRAM_CHAT_ID');
        return { success: false };
    }

    console.log('📤 Sending Telegram notification...');
    console.log('Bot Token (first 10 chars):', TELEGRAM_BOT_TOKEN.substring(0, 10) + '...');
    console.log('Chat ID:', TELEGRAM_CHAT_ID);

    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const body: any = {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML',
        };

        // Add inline keyboard if provided
        if (replyMarkup) {
            body.reply_markup = replyMarkup;
        }

        // console.log('Request URL:', url.substring(0, 50) + '...'); // Removed sensitive log
        // console.log('Request body:', JSON.stringify(body, null, 2)); // Removed sensitive log

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            console.error('❌ Telegram API error:', response.status);
            return { success: false };
        }

        const data = await response.json();

        // Only log success/failure, not the full response
        if (data.ok) {
            console.log('✅ Telegram notification sent successfully');
            return {
                success: true,
                messageId: data.result?.message_id
            };
        } else {
            console.error('❌ Telegram API returned error');
            // Optionally, log specific error details if needed for debugging, but avoid full response
            // console.error('❌ Telegram API error details:', {
            //     error_code: data.error_code,
            //     description: data.description,
            // });

            // Specific error messages (kept for clarity, but could be removed if too verbose)
            if (data.error_code === 400) {
                console.error('💡 Bad Request - Check chat ID format (should start with - for groups)');
            } else if (data.error_code === 401) {
                console.error('💡 Unauthorized - Invalid bot token');
            } else if (data.error_code === 403) {
                console.error('💡 Forbidden - Bot is not in the chat or has no permission');
            } else if (data.error_code === 404) {
                console.error('💡 Not Found - Invalid chat ID or bot token');
            }

            return { success: false };
        }

        console.log('✅ Telegram notification sent successfully!');
        return { success: true, messageId: data.result?.message_id };
    } catch (error) {
        console.error('❌ Error sending Telegram notification:', error);
        console.error('Error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error)
        });
        return { success: false };
    }
}

// Build inline keyboard for order actions
export function buildOrderActionKeyboard(orderId: string) {
    return {
        inline_keyboard: [
            [
                { text: '✅ Approve', callback_data: `order_action:Completed:${orderId}` },
                { text: '❌ Reject', callback_data: `order_action:Cancelled:${orderId}` }
            ],
            [
                { text: '💰 Refund', callback_data: `order_action:Refunded:${orderId}` },
                { text: '⏳ Processing', callback_data: `order_action:Processing:${orderId}` }
            ]
        ]
    };
}

// Edit an existing Telegram message
export async function editTelegramMessage(
    messageId: number,
    newText: string,
    replyMarkup?: any
): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error('❌ Telegram credentials not configured');
        return false;
    }

    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
        const body: any = {
            chat_id: TELEGRAM_CHAT_ID,
            message_id: messageId,
            text: newText,
            parse_mode: 'HTML',
        };

        if (replyMarkup) {
            body.reply_markup = replyMarkup;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!data.ok) {
            console.error('❌ Telegram edit message error:', data);
            return false;
        }

        console.log('✅ Telegram message edited successfully!');
        return true;
    } catch (error) {
        console.error('❌ Error editing Telegram message:', error);
        return false;
    }
}


// Order notification with comprehensive details
export function formatOrderNotification(order: any, isReseller: boolean = false): string {
    const type = isReseller ? '🔷 RESELLER ORDER' : '🛒 NEW ORDER';

    let message = `${type}\n\n`;
    message += `📦 <b>Order ID:</b> <code>${order.id || 'N/A'}</code>\n`;
    message += `👤 <b>Customer:</b> ${order.userName || 'Unknown'}\n`;
    message += `🎮 <b>Product:</b> ${order.productName || 'N/A'}\n`;
    message += `📋 <b>Option:</b> ${order.productOption || 'Standard'}\n`;
    message += `🔢 <b>Quantity:</b> ${order.quantity || 1}\n`;
    message += `💰 <b>Amount:</b> ৳${order.totalAmount || 0}\n`;

    // Payment Method Details
    if (order.paymentMethod === 'wallet' || order.paymentMethod === 'Wallet') {
        message += `💳 <b>Payment:</b> Wallet\n`;
    } else if (order.paymentMethod === 'coinFund' || order.paymentMethod === 'CoinFund') {
        message += `💳 <b>Payment:</b> Coin Fund\n`;
    } else if (order.paymentMethod === 'Manual' && order.manualPaymentDetails) {
        message += `💳 <b>Payment Method:</b> ${order.manualPaymentDetails.method || 'Manual'}\n`;
        message += `📱 <b>Sender Phone:</b> ${order.manualPaymentDetails.senderPhone || 'N/A'}\n`;
        if (order.manualPaymentDetails.transactionId) {
            message += `🔢 <b>Transaction ID:</b> ${order.manualPaymentDetails.transactionId}\n`;
        }
    } else {
        message += `💳 <b>Payment:</b> ${order.paymentMethod || 'Instant Pay'}\n`;
    }

    // Game UID (if not eFootball)
    if (!order.eFootballDetails && order.gameUid && order.gameUid !== 'Reseller Order') {
        message += `🎯 <b>Game UID:</b> <code>${order.gameUid}</code>\n`;
    }

    // eFootball Details
    if (order.eFootballDetails) {
        message += `\n⚽ <b>eFootball Details:</b>\n`;
        message += `   • Konami ID: <code>${order.eFootballDetails.konamiId || 'N/A'}</code>\n`;
        if (order.eFootballDetails.password) {
            message += `   • Password: <code>${order.eFootballDetails.password}</code>\n`;
        }
        message += `   • WhatsApp: ${order.eFootballDetails.whatsappNumber || 'N/A'}\n`;
    }

    // Unipin Codes (if allocated)
    if (order.allocatedCodes && order.allocatedCodes.length > 0) {
        message += `\n🎁 <b>Unipin Codes:</b>\n`;
        order.allocatedCodes.forEach((code: string, index: number) => {
            message += `   ${index + 1}. <code>${code}</code>\n`;
        });
    }

    message += `⏰ <b>Time:</b> ${new Date(order.orderDate).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}\n`;
    message += `\n📊 <b>Status:</b> ⏳ ${order.status || 'Pending'}`;

    return message.trim();
}

// Wallet request notification with comprehensive details
export function formatWalletRequestNotification(request: any, isReseller: boolean = false): string {
    const type = isReseller ? '🔷 RESELLER WALLET REQUEST' : '💰 WALLET TOP-UP REQUEST';

    let message = `${type}\n\n`;
    message += `📋 <b>Request ID:</b> <code>${request.id || 'N/A'}</code>\n`;
    message += `👤 <b>User:</b> ${request.userName || 'Unknown'}\n`;
    message += `📧 <b>Email:</b> ${request.userEmail || 'N/A'}\n`;
    message += `💵 <b>Amount:</b> ৳${request.amount || 0}\n`;
    message += `💳 <b>Method:</b> ${request.method || 'N/A'}\n`;
    message += `📱 <b>Sender Phone:</b> ${request.senderPhone || 'N/A'}\n`;
    if (request.transactionId) {
        message += `🔢 <b>Transaction ID:</b> ${request.transactionId}\n`;
    }
    message += `⏰ <b>Time:</b> ${new Date(request.requestDate).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}\n`;
    message += `\n📊 <b>Status:</b> ⏳ Pending`;

    return message.trim();
}

// Build inline keyboard for wallet request actions
export function buildWalletRequestKeyboard(requestId: string) {
    return {
        inline_keyboard: [
            [
                { text: '✅ Approve', callback_data: `wallet_action:Approved:${requestId}` },
                { text: '❌ Reject', callback_data: `wallet_action:Rejected:${requestId}` }
            ]
        ]
    };
}

// Balance transfer notification
export function formatBalanceTransferNotification(transfer: any): string {
    return `
💸 BALANCE TRANSFER

👤 From: ${transfer.senderName || transfer.senderUniqueId || 'Unknown'}
👤 To: ${transfer.recipientName || transfer.recipientUniqueId || 'Unknown'}
💰 Amount: ৳${transfer.amountSent || 0}
💵 Received: ৳${transfer.amountReceived || 0}
${transfer.fee && transfer.fee > 0 ? `💳 Fee: ৳${transfer.fee}` : ''}
⏰ Time: ${new Date(transfer.transferDate).toLocaleString()}
    `.trim();
}

// Helper function to send order alert with interactive buttons
export async function sendOrderAlert(order: any, isReseller: boolean = false): Promise<TelegramResponse> {
    const message = formatOrderNotification(order, isReseller);
    const keyboard = buildOrderActionKeyboard(order.id);
    return await sendTelegramNotification(message, keyboard);
}


// Helper function to send wallet request alert with interactive buttons
export async function sendWalletRequestAlert(request: any, isReseller: boolean = false): Promise<TelegramResponse> {
    const message = formatWalletRequestNotification(request, isReseller);
    const keyboard = buildWalletRequestKeyboard(request.id);
    return await sendTelegramNotification(message, keyboard);
}
