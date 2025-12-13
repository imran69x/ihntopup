
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isUserAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isUserAuthenticated() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isUserAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    match /users/{userId} {
      allow read: if isUserAuthenticated();
      allow write: if isOwner(userId) || isAdmin();
      
      match /transactions/{transactionId} {
        allow read, write: if isOwner(userId) || isAdmin();
      }
      match /coupons/{userCouponId} {
        allow read, write: if isOwner(userId) || isAdmin();
      }
    }

    match /orders/{orderId} {
      allow read, list: if true;
      allow create: if isUserAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAdmin() || (isUserAuthenticated() && request.auth.uid == resource.data.userId);
      allow delete: if isAdmin();
    }

    match /categories/{categoryId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /top_up_cards/{topUpCardId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /coupons/{couponId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /referrals/{referralId} {
      allow read, write: if isAdmin();
      allow list: if isUserAuthenticated();
    }
    
    match /settings/{docId} {
        allow read, write: if isAdmin();
    }
    
    match /banners/{bannerId} {
        allow read: if true;
        allow write: if isAdmin();
    }

    match /wallet_top_up_requests/{requestId} {
      allow read, create: if isUserAuthenticated();
      allow update: if isAdmin();
    }

    match /notices/{noticeId} {
        allow read: if true;
        allow write: if isAdmin();
    }

    match /payment_methods/{methodId} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
