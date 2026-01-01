'use client';

import { Headset, ShieldCheck, Truck, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  uniqueId?: string;
  resellerId?: string; // Unique ID for reseller transactions (separate from uniqueId)
  savedGameUids?: SavedUid[];
  walletBalance?: number;
  resellerBalance?: number; // DEPRECATED: Use walletBalance instead. Kept for backward compatibility.
  coinFund?: number;
  referralCode?: string;
  isVerified?: boolean;
  hasVerifiedBadge?: boolean; // Manual verified badge (blue checkmark)
  isAdmin?: boolean;
  telegramUserId?: string; // Telegram user ID for admin verification in bot callbacks
  isBanned?: boolean;
  isReseller?: boolean;
  photoURL?: string;
  points?: number;
  spinData?: UserSpinData; // Spin wheel tracking data
  createdAt?: any;
}

export type UnipinCode = {
  code: string;
  isUsed: boolean;
  usedBy?: string; // Order ID
  usedAt?: string; // ISO timestamp
};

export type TopUpCardOption = {
  name: string;
  price: number;
  inStock?: boolean;
  stockLimit?: number;
  stockSoldCount?: number;
  // Unipin-specific fields
  unipinCodes?: UnipinCode[]; // Array of codes for unipin_only type
  availableCodeCount?: number; // Calculated field: number of unused codes
};

export type TopUpCardData = {
  id: string;
  name: string;
  description: string;
  image: {
    src: string;
    hint: string;
  };
  price: number;
  serviceType?: 'Game' | 'Others' | 'eFootball' | 'Subscriptions' | 'Social Media';
  purchaseType?: 'Paid' | 'Free'; // Free = Coin only, Paid = Wallet/Instant
  isResellerProduct?: boolean; // True = Only for resellers
  cardType?: 'normal' | 'unipin_only'; // Type of reseller card
  gameUidFormat?: string;
  categoryId: string;
  isActive: boolean;
  sortOrder?: number;
  options?: TopUpCardOption[];
};

export type TopUpCategory = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  status?: 'Active' | 'Draft';
  cards?: TopUpCardData[]; // This could be a subcollection
  sortOrder?: number;
};

export type BannerData = {
  id: string;
  imageUrl: string;
  linkUrl: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  alt?: string; // for accessibility
  image?: {
    src: string;
    hint: string;
  }
};

export type Order = {
  id: string;
  orderId?: number; // Sequential order ID (100, 101, 102...)
  userId: string;
  userName: string;
  topUpCardId: string;
  productName?: string;
  productOption?: string;
  quantity: number;
  gameUid: string;
  paymentMethod: string;
  couponId?: string | null;
  originalAmount?: number;
  totalAmount: number;
  orderDate: string; // ISO 8601 format
  status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled' | 'Refunded';
  cancellationReason?: string;
  manualPaymentDetails?: {
    senderPhone: string;
    transactionId: string;
    method: string;
  };
  isLimitedStock?: boolean;
  eFootballDetails?: {
    konamiId: string;
    password?: string;
    whatsappNumber: string;
  }
  serviceType?: 'Game' | 'Others' | 'eFootball' | 'Subscriptions' | 'Social Media'; // Added to identify order type
  isResellerProduct?: boolean; // Added this field
  allocatedCodes?: string[]; // Unipin codes assigned to this order
  // Telegram processing metadata
  processedBy?: string; // Website userId of admin who processed via Telegram
  processedByTelegramId?: string; // Telegram user ID of processor
  processedAt?: string; // ISO timestamp of when order was processed
  telegramMessageId?: number; // Telegram message ID for editing
};

export type WalletTopUpRequest = {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  approvedAmount?: number;
  senderPhone: string;
  transactionId: string;
  method: string;
  requestDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string;
}

export type WalletTransaction = {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  transactionDate: string;
  status: 'Pending' | 'Completed' | 'Failed';
};

export type TrustBadge = {
  icon: LucideIcon;
  title: string;
  description: string;
}

export type PaymentMethod = {
  id: string;
  name: string;
  image: {
    src: string;
    hint: string;
  };
  accountNumber: string;
  accountType: string;
  isActive: boolean;
}

export type SavedUid = {
  game: string;
  uid: string;
}

export type Referral = {
  id: string;
  referrerId: string;
  refereeId: string;
  referralDate: string;
  bonusEarnedReferrer?: number;
  bonusEarnedReferee?: number;
  isFirstOrderComplete?: boolean;
};


export type ReferralSettings = {
  id: string; // Should be a singleton document id like 'default'
  signupBonus: number;
  referrerBonus: number;
  firstOrderBonus: number;
  purchaseBonusTiers: { threshold: number; bonus: number }[];
};


export type Coupon = {
  id: string;
  name: string;
  code: string;
  type: 'Percentage' | 'Fixed';
  value: number;
  minPurchaseAmount?: number;
  expiryDate?: string;
  usageLimitPerUser?: number;
  totalUsageLimit?: number;
  categoryIds?: string[];
  isActive: boolean;
  isStoreVisible?: boolean;
  claimLimit?: number;
  claimedCount: number;
}

export type UserCoupon = {
  id: string;
  code: string;
  description: string;
  acquiredDate: string;
}

export type PaymentSettings = {
  mode: 'manual' | 'automatic';
};

export type Notice = {
  id: string;
  title: string;
  content: string;
  image?: {
    src: string;
    hint: string;
  };
  linkUrl?: string;
  type: 'Info' | 'Popup' | 'HowToOrder';
  status: 'Active' | 'Inactive';
}

export type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};

export type SupportTicket = {
  id: string;
  userId: string;
  userEmail: string;
  status: 'Open' | 'Closed';
  createdAt: string;
  updatedAt: string;
  chatHistory?: ChatMessage[];
};

export type BalanceTransfer = {
  id: string;
  senderId: string;
  senderUniqueId: string;
  recipientId: string;
  recipientUniqueId: string;
  amountSent: number;
  fee: number;
  amountReceived: number;
  transferDate: string;
};

export type SpinWheelConfig = {
  id: string;
  isEnabled: boolean;              // Global ON/OFF
  autoEnableDay: number;           // 0=Sunday, 1=Monday, ..., 5=Friday
  manualOverride: boolean;         // Admin manual ON/OFF
  spinLimitPerWeek: number;        // Default: e.g., 3
  currentWeekStart: any;           // Timestamp for tracking week reset
};

export type SpinWheelItem = {
  id: string;
  name: string;                    // e.g., "৳50 Wallet Bonus"
  type: 'wallet' | 'coins' | 'discount' | 'item';
  value: number;                   // Amount or percentage
  imageUrl?: string;               // Optional item image
  color: string;                   // Wheel segment color
  probability: number;             // Weight for random selection (1-100)

  // Eligibility toggles
  isEligibleForNormal: boolean;
  isEligibleForVerified: boolean;
  isEligibleForDummy: boolean;

  isActive: boolean;               // Can be disabled without deletion
  createdAt: any;
  updatedAt: any;
};

export type UserSpinData = {
  currentWeekSpins: number;        // Spins done this week
  lastSpinDate: any;               // Last spin timestamp
  totalLifetimeSpins: number;      // All-time spin count
  lastRewardWon?: {                // Last reward details
    itemId: string;
    itemName: string;
    value: number;
    wonAt: any;
  };
};

export type ResellerApplication = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  phone: string;
  whatsapp: string;
  telegram?: string;
  businessName: string;
  businessType: string; // 'online' | 'offline' | 'both'
  experience: string;
  expectedMonthlyVolume: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
};
