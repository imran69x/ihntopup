// Telegram Notification Helper
// Send notifications to Telegram group for orders and wallet requests

// Get telegram credentials from environment variables
const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '';

export async function sendTelegramNotification(message: string): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error('❌ Telegram credentials not configured in .env file');
        console.error('Required: NEXT_PUBLIC_TELEGRAM_BOT_TOKEN and NEXT_PUBLIC_TELEGRAM_CHAT_ID');
        return false;
    }

    console.log('📤 Sending Telegram notification...');
    console.log('Bot Token (first 10 chars):', TELEGRAM_BOT_TOKEN.substring(0, 10) + '...');
    console.log('Chat ID:', TELEGRAM_CHAT_ID);

    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const body = {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML',
        };

        console.log('Request URL:', url.substring(0, 50) + '...');
        console.log('Request body:', JSON.stringify(body, null, 2));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        console.log('📥 Telegram API Response:', JSON.stringify(data, null, 2));

        if (!data.ok) {
            console.error('❌ Telegram API error details:', {
                error_code: data.error_code,
                description: data.description,
                full_response: data
            });

            // Specific error messages
            if (data.error_code === 400) {
                console.error('💡 Bad Request - Check chat ID format (should start with - for groups)');
            } else if (data.error_code === 401) {
                console.error('💡 Unauthorized - Invalid bot token');
            } else if (data.error_code === 403) {
                console.error('💡 Forbidden - Bot is not in the chat or has no permission');
            } else if (data.error_code === 404) {
                console.error('💡 Not Found - Invalid chat ID or bot token');
            }

            return false;
        }

        console.log('✅ Telegram notification sent successfully!');
        return true;
    } catch (error) {
        console.error('❌ Error sending Telegram notification:', error);
        console.error('Error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error)
        });
        return false;
    }
}

// Order notification
export function formatOrderNotification(order: any, isReseller: boolean = false): string {
    const type = isReseller ? '🔷 RESELLER ORDER' : '🛒 NEW ORDER';

    return `
${type}

📦 Order ID: <code>${order.id || 'N/A'}</code>
👤 Customer: ${order.customerName || order.userName || 'Unknown'}
💰 Amount: ৳${order.totalPrice || order.totalAmount || 0}
🎮 Product: ${order.productName || 'N/A'}
${order.selectedOption || order.productOption ? `📋 Option: ${order.selectedOption || order.productOption}` : ''}
${order.quantity && order.quantity > 1 ? `🔢 Quantity: ${order.quantity}` : ''}
💳 Payment: ${order.paymentMethod === 'wallet' ? 'Wallet' : order.paymentMethod === 'coinFund' ? 'Coin Fund' : order.paymentMethod || 'Instant Pay'}
⏰ Time: ${new Date(order.orderDate).toLocaleString()}

Status: ⏳ ${order.status || 'Pending'}
    `.trim();
}

// Wallet request notification
export function formatWalletRequestNotification(request: any, isReseller: boolean = false): string {
    const type = isReseller ? '🔷 RESELLER WALLET REQUEST' : '💰 WALLET TOP-UP REQUEST';

    return `
${type}

📋 Request ID: <code>${request.id || 'N/A'}</code>
👤 User: ${request.userName || 'Unknown'}
💵 Amount: ৳${request.amount || 0}
📱 Method: ${request.method || 'N/A'}
📞 Sender: ${request.senderPhone || 'N/A'}
🔢 Txn ID: ${request.transactionId || 'N/A'}
⏰ Time: ${new Date(request.requestDate).toLocaleString()}

Status: ⏳ Pending
    `.trim();
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

// Helper function to send order alert (backward compatibility)
export async function sendOrderAlert(order: any, isReseller: boolean = false): Promise<boolean> {
    const message = formatOrderNotification(order, isReseller);
    return await sendTelegramNotification(message);
}

// Helper function to send wallet request alert (backward compatibility)
export async function sendWalletRequestAlert(request: any, isReseller: boolean = false): Promise<boolean> {
    const message = formatWalletRequestNotification(request, isReseller);
    return await sendTelegramNotification(message);
}
