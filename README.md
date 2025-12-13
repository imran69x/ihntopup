# 🎮 IHN TOPUP - Digital Products & Gaming Top-Up Platform

A comprehensive Next.js-based e-commerce platform for digital products, gaming top-ups, and reseller management with Firebase backend integration.

![Next.js](https://img.shields.io/badge/Next.js-15.3-black?style=flat-square&logo=next.js)
![Firebase](https://img.shields.io/badge/Firebase-Latest-orange?style=flat-square&logo=firebase)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC?style=flat-square&logo=tailwind-css)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [User Roles](#user-roles)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Features Documentation](#features-documentation)
- [API Integration](#api-integration)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## 🎯 Overview

IHN TOPUP is a full-featured digital marketplace specializing in:
- Gaming currency and diamonds (PUBG, Free Fire, Mobile Legends, etc.)
- Game account top-ups and eFootball coins
- Digital vouchers and gift cards
- Reseller program with wholesale pricing
- Multi-payment gateway integration
- Real-time order tracking and management

---

## ✨ Key Features

### 🛒 E-Commerce Features
- **Product Catalog**: Dynamic product listings with category filtering
- **Shopping Cart**: Multi-item cart with quantity management
- **Order Management**: Real-time order tracking with status updates
- **Payment Integration**: Multiple payment methods (bKash, Nagad, Rocket, etc.)
- **Coupon System**: Discount codes with validation
- **Wallet System**: Digital wallet for faster checkout
- **Coin Fund**: Loyalty rewards system (10% cashback on orders)
- **Recent Orders**: Public display of recent successful orders
- **Saved UIDs**: Quick access to frequently used game IDs

### 👥 User Management
- **Firebase Authentication**: Email/password and social login
- **User Profiles**: Customizable user information
- **Unique User IDs**: Auto-generated unique identifiers
- **Role-Based Access**: User, Reseller, and Admin roles
- **Ban System**: Admin ability to ban users with server-side enforcement
- **Account Verification**: Email verification for enhanced security

### 💰 Payment Systems
- **Multiple Payment Methods**: 
  - bKash (Personal & Payment)
  - Nagad Personal
  - Rocket
  - Islami Bank
  - Celfin
- **Manual Payment Processing**: Upload transaction details
- **Wallet Top-up**: Add balance for instant purchases
- **Balance Transfer**: User-to-user balance transfers
- **Reseller Balance**: Separate balance for wholesale purchases
- **Real-time Payment Validation**: Admin review and approval

### 🏪 Reseller Program
- **Application System**: Users can apply to become resellers
- **Admin Review**: Application management with approve/reject
- **Wholesale Pricing**: Exclusive reseller product catalog
- **Separate Dashboard**: Dedicated reseller panel
- **Reseller Orders**: Track reseller-specific orders
- **Reseller Wallet**: Independent balance management
- **Application Status**: Pending/Approved/Rejected notifications

### 📱 Admin Panel
- **Dashboard**: Overview with key metrics and statistics
- **Order Management**: 
  - View all orders with filtering
  - Update order status
  - Process refunds
  - Add coin rewards
- **User Management**:
  - View all users
  - Ban/unban users
  - Edit user details
  - Manage balances
- **Product Management**:
  - Add/edit/delete products
  - Category management
  - Stock management
  - Unipin code integration
- **Reseller Management**:
  - Review applications
  - Manage reseller products
  - Track reseller orders
- **Financial Management**:
  - Wallet top-up requests
  - Balance transfer tracking
  - Revenue reports
- **Content Management**:
  - Banners
  - Notices
  - Payment methods
  - Coupons
- **Notifications**: Real-time order alerts (browser + Telegram)

### 🎨 UI/UX Features
- **Responsive Design**: Mobile-first approach
- **Dark Mode Support**: System-preference aware
- **Smooth Animations**: Fade-in, scale, and bounce effects
- **Loading States**: Skeleton screens and loaders
- **Toast Notifications**: User feedback system
- **Modal Dialogs**: Clean popup interfaces
- **Search & Filter**: Advanced product filtering
- **Glassmorphism**: Modern frosted glass effects
- **Animated Backgrounds**: Living gradient backgrounds
- **Floating Support Button**: Quick access to support (WhatsApp/Telegram)

### 🔔 Notification System
- **Telegram Integration**: 
  - Order notifications
  - Wallet request alerts
  - Balance transfer notifications
  - Separate alerts for user/reseller orders
- **Browser Notifications**: 
  - Real-time order alerts for admin
  - Permission-based system
  - Service Worker integration
- **Toast Messages**: In-app notifications
- **Email Notifications**: Firebase Auth emails

### 🎮 Gaming Products
- **Wide Game Support**:
  - PUBG Mobile
  - Free Fire
  - Mobile Legends
  - Call of Duty Mobile
  - Genshin Impact
  - eFootball
  - And more...
- **Multiple Servers**: BD, Global, etc.
- **Instant Delivery**: Automated or manual fulfillment
- **UID Validation**: Format verification
- **eFootball Integration**: Konami ID + password + WhatsApp

### 🔐 Security Features
- **Firestore Security Rules**: Server-side data protection
- **Client-side Validation**: Input sanitization
- **Session Management**: Secure payment sessions
- **CORS Protection**: API security
- **Rate Limiting**: Prevent abuse
- **Ban System**: Prevent banned users from transactions
- **Transaction Verification**: Double-entry prevention

---

## 👤 User Roles

### 1. **Regular User**
- Browse products
- Place orders
- Manage wallet
- Transfer balance
- View order history
- Apply for reseller

### 2. **Reseller**
- All user features
- Access to wholesale products
- Separate reseller balance
- Reseller dashboard
- Bulk ordering capabilities

### 3. **Admin**
- Full system access
- User management
- Order processing
- Product management
- Financial oversight
- Content management
- System configuration

---

## 🛠 Technology Stack

### Frontend
- **Framework**: Next.js 15.3 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **State Management**: React Context API

### Backend
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage
- **Hosting**: Firebase Hosting / Vercel

### Integrations
- **Payment Gateway**: bKash, Nagad, Rocket (Manual)
- **Notifications**: Telegram Bot API
- **PWA**: Service Workers for offline support

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint
- **Version Control**: Git

---

## 🚀 Installation

### Prerequisites
- Node.js 18+ installed
- Firebase project created
- Telegram bot created (optional)

### Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd ihntopup-main
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your credentials
```

4. **Run development server**
```bash
npm run dev
```

5. **Open browser**
```
http://localhost:9002
```

---

## ⚙️ Configuration

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Create Firestore Database
4. Copy configuration to `.env`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Firestore Security Rules

Deploy security rules from `firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

Or copy content from `FIRESTORE_RULES_COPY_THIS.txt` to Firebase Console.

### Telegram Notifications (Optional)

1. Create bot via [@BotFather](https://t.me/BotFather)
2. Add bot to your group
3. Get chat ID from bot updates
4. Add to `.env`:

```env
NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=your_bot_token
NEXT_PUBLIC_TELEGRAM_CHAT_ID=your_chat_id
```

See `TELEGRAM_CREDENTIALS_SETUP.md` for detailed instructions.

---

## 📚 Features Documentation

### User Features

#### 1. Registration & Login
- Email/password authentication
- Auto-generation of unique user ID
- Profile customization
- Email verification

#### 2. Product Browsing
- Category-wise filtering
- Search functionality
- Product details with multiple options
- Stock availability
- Price display

#### 3. Ordering Process
1. Select product and option
2. Enter game UID
3. Choose quantity
4. Apply coupon (optional)
5. Select payment method:
   - **Wallet**: Instant deduction
   - **Coin Fund**: Use loyalty rewards
   - **Manual Payment**: Follow payment instructions
6. Submit order
7. Track order status

#### 4. Wallet Management
- View current balance
- Top-up via payment methods
- Transaction history
- Balance transfer to other users

#### 5. Profile Management
- Edit personal information
- View order history
- Manage saved game UIDs
- Check loyalty points

### Reseller Features

#### 1. Application Process
1. Navigate to "Apply for Reseller"
2. Fill application form:
   - Contact info (Phone, WhatsApp, Telegram)
   - Business details
   - Experience level
   - Expected volume
   - Reason for applying
3. Submit application
4. Wait for admin review
5. Receive approval/rejection notification

#### 2. Reseller Dashboard
- Access via `/reseller`
- Exclusive product catalog
- Wholesale pricing
- Order tracking
- Wallet management

#### 3. Reseller Benefits
- Lower prices on all products
- Bulk ordering
- Dedicated support
- Separate balance system

### Admin Features

#### 1. Dashboard Overview
- Total orders
- Revenue metrics
- User statistics
- Recent activity

#### 2. Order Management
- **View All Orders**: Filterable by status and type
- **Order Details**: Complete order information
- **Status Updates**:
  - Pending → Processing → Completed
  - Cancel with reason
  - Refund (auto wallet credit)
- **Coin Rewards**: Auto 10% for non-reseller orders
- **Delete Orders**: Remove invalid orders

#### 3. User Management
- View all registered users
- Search and filter
- Ban/unban users
- Edit user balances
- View user activity

#### 4. Product Management
- **Add Products**: Create new products
- **Edit Products**: Update details, pricing, stock
- **Categories**: Organize products
- **Stock Management**: Track inventory
- **Unipin Integration**: Manage voucher codes
- **Reseller Products**: Separate catalog for resellers

#### 5. Financial Operations
- **Wallet Requests**: Approve/reject top-ups
- **Balance Transfers**: Monitor user transfers
- **Revenue Reports**: Track earnings
- **Refund Processing**: Auto wallet credits

#### 6. Reseller Management
- **View Applications**: See all reseller applications
- **Review Details**: Complete applicant information
- **Approve**: Grant reseller status
- **Reject**: Deny with reason
- **Application Stats**: Track approval rates

#### 7. Content Management
- **Banners**: Homepage slider images
- **Notices**: Important announcements
- **Payment Methods**: Configure payment options
- **Coupons**: Create discount codes

---

## 🔌 API Integration

### Firestore Collections

```
/users
  - User profiles and balances

/orders
  - All customer orders

/top_up_cards
  - Product catalog

/categories
  - Product categories

/payment_methods
  - Available payment options

/wallet_top_up_requests
  - Wallet top-up requests

/balance_transfers
  - User-to-user transfers

/reseller_applications
  - Reseller applications

/coupons
  - Discount coupons

/banners
  - Homepage banners

/notices
  - System notices
```

### Telegram Bot API

**Endpoints Used:**
- `POST /bot<token>/sendMessage` - Send notifications

**Message Types:**
- Order notifications (user & reseller)
- Wallet request alerts
- Balance transfer notifications

---

## 🎨 UI Components

### Custom Components

1. **TopUpCard**: Product display card
2. **RecentOrders**: Live order feed
3. **InstallAppPrompt**: PWA installation
4. **NoticePopup**: Important announcements
5. **FloatingSupportButton**: Quick support access
6. **ProcessingLoader**: Payment processing state
7. **BannedUserOverlay**: Ban notification
8. **SavedUidsCard**: Quick UID access
9. **AddMoneyDialog**: Wallet top-up modal
10. **BalanceTransferDialog**: Transfer interface

### Animations

- Fade-in: Page transitions
- Scale-in-bounce: Card appearances
- Slide-up: Modal entrances
- Pulse: Loading states
- Living gradients: Background animations

---

## 📱 Progressive Web App (PWA)

- **Installable**: Add to home screen
- **Offline Support**: Service worker caching
- **App-like Experience**: Full-screen mode
- **Push Notifications**: Order alerts (admin)
- **Fast Loading**: Optimized assets

---

## 🔒 Security Best Practices

1. **Server-side Validation**: Firestore security rules
2. **Input Sanitization**: XSS prevention
3. **CSRF Protection**: Secure forms
4. **Session Management**: Secure payment sessions
5. **Ban System**: Prevent malicious users
6. **Rate Limiting**: API abuse prevention
7. **Environment Variables**: Sensitive data protection

---

## 📊 Performance Optimizations

- **Code Splitting**: Dynamic imports
- **Image Optimization**: Next.js Image component
- **Lazy Loading**: Components and routes
- **Caching**: Firebase offline persistence
- **Memoization**: React.memo and useMemo
- **Debouncing**: Search and filters

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### Firebase Hosting

```bash
# Build project
npm run build

# Deploy
firebase deploy
```

### Environment Variables

Set all required environment variables in your hosting platform:
- Vercel: Project Settings → Environment Variables
- Firebase: Via `firebase.json` and `.env` files

---

## 🐛 Troubleshooting

### Common Issues

**1. Telegram notifications not working**
- Verify bot token and chat ID
- Check if bot is in the group
- Ensure bot has admin permissions
- Restart dev server after .env changes

**2. Order failed / Firestore permission denied**
- Update Firestore security rules
- Deploy rules: `firebase deploy --only firestore:rules`
- Check user authentication status

**3. Payment session expired**
- Sessions are valid for 5 minutes
- Complete payment before timeout
- Clear browser cache if stuck

**4. Images not loading**
- Check Firebase Storage rules
- Verify image URLs in Firestore
- Ensure proper CORS configuration

---

## 📝 Documentation Files

- `README.md` - This file
- `TELEGRAM_SETUP.md` - Telegram bot configuration
- `TELEGRAM_CREDENTIALS_SETUP.md` - Detailed Telegram guide
- `FIRESTORE_RULES_COPY_THIS.txt` - Security rules
- `ALL_FIXES_COMPLETE.md` - Recent fixes and updates
- `BAN_TRANSACTION_BLOCK.md` - Ban system documentation
- `IMPLEMENTATION_SUMMARY.md` - Feature implementation log

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is proprietary and confidential.

---

## 👨‍💻 Development Team

- **Developer**: IHN Development Team
- **Contact**: [Support Telegram](https://t.me/ihntopup_help)
- **Website**: [IHN TOPUP](https://ihntopup.com)

---

## 🎯 Roadmap

### Upcoming Features
- [ ] Automated top-up integration (API)
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Crypto payments
- [ ] Affiliate program
- [ ] Analytics dashboard
- [ ] Advanced reporting
- [ ] SMS notifications
- [ ] Live chat support
- [ ] Product reviews and ratings

---

## 📞 Support

For support, contact us:
- **Telegram**: [@ihntopup_help](https://t.me/ihntopup_help)
- **WhatsApp**: [+8801795970380](https://wa.me/8801795970380)
- **Email**: support@ihntopup.com

---

## ⭐ Acknowledgments

- Next.js team for the amazing framework
- Firebase team for backend infrastructure
- Shadcn UI for beautiful components
- Vercel for hosting platform
- All contributors and testers

---

**Made with ❤️ by IHN Development Team**

---

*Last Updated: December 2025*
