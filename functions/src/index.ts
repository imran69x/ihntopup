/**
 * Firebase Cloud Functions
 * 
 * Automatic coin reward system - triggered when order status changes to "Completed"
 */

// Export the coin reward function
export { addCoinsOnOrderComplete } from './addCoinsOnOrderComplete';

// Export the verified badge function
export { grantVerifiedBadgeOnSpending } from './grantVerifiedBadgeOnSpending';
