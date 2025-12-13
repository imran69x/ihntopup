
export function getBengaliErrorMessage(errorCode: string): string {
  switch (errorCode) {
    // Login & General Auth Errors
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-email':
      return 'আপনার দেওয়া ইমেইল বা পাসওয়ার্ড ভুল। অনুগ্রহ করে আবার চেষ্টা করুন।';
    
    case 'auth/too-many-requests':
      return 'অনেকবার চেষ্টা করার কারণে আপনার অ্যাকাউন্ট সাময়িকভাবে লক করা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।';
      
    case 'auth/network-request-failed':
      return 'ইন্টারনেট সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে আপনার নেটওয়ার্ক পরীক্ষা করে আবার চেষ্টা করুন।';
      
    // Signup Errors
    case 'auth/email-already-in-use':
      return 'এই ইমেইল ঠিকানাটি দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা আছে।';
    
    case 'auth/weak-password':
      return 'আপনার পাসওয়ার্ডটি খুবই দুর্বল। অনুগ্রহ করে কমপক্ষে ৬ অক্ষরের একটি শক্তিশালী পাসওয়ার্ড ব্যবহার করুন।';
      
    // Password Reset Errors
    case 'auth/invalid-action-code':
      return 'আপনার পাসওয়ার্ড রিসেট লিঙ্কটি অবৈধ বা মেয়াদোত্তীর্ণ। অনুগ্রহ করে একটি নতুন রিসেট লিঙ্কের জন্য অনুরোধ করুন।';
      
    case 'auth/user-disabled':
      return 'আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে। সমর্থনের জন্য যোগাযোগ করুন।';
      
    // Verification Email Not Sent
    case 'auth/missing-android-pkg-name':
    case 'auth/missing-ios-bundle-id':
    case 'auth/missing-continue-uri':
      return 'ভেরিফিকেশন ইমেইল পাঠাতে একটি সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';

    // Default for unknown errors
    default:
      return 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন অথবা সাপোর্টে যোগাযোগ করুন।';
  }
}
