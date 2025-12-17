# Complete Deployment Guide

## ⚠️ Prerequisites

Firebase CLI installed না থাকায়, এই steps follow করুন:

## Step 1: Install Firebase CLI

```powershell
npm install -g firebase-tools
```

Wait for installation to complete...

## Step 2: Install Function Dependencies

```powershell
cd "j:\rahi v2\ihntopup-main\functions"
npm install
```

## Step 3: Login to Firebase

```powershell
cd "j:\rahi v2\ihntopup-main"
firebase login
```

Browser open হবে, আপনার Google account দিয়ে login করুন।

## Step 4: Link Firebase Project

```powershell
firebase use --add
```

আপনার Firebase project select করুন।

## Step 5: Deploy Function

```powershell
firebase deploy --only functions
```

## ⏱️ Deployment Time

- Initial deployment: 2-5 minutes
- আপনার function deploy হচ্ছে...
- Console এ progress দেখাবে

## ✅ Success Indicators

Deployment successful হলে দেখবেন:

```
✔  Deploy complete!
Function URL: https://us-central1-[project-id].cloudfunctions.net/addCoinsOnOrderComplete
```

## 🧪 Testing

Deploy হওয়ার পর:

1. **Test Order তৈরি করুন**
2. **Status "Completed" করুন** (যেকোনো উপায়ে)
3. **Check করুন:**
   - User এর `coinFund` বেড়েছে কিনা (10%)
   - Console logs এ function execution দেখা যাচ্ছে কিনা

## 📊 Firebase Console

Deploy verification:
- https://console.firebase.google.com
- Select your project
- Functions → See `addCoinsOnOrderComplete`

## 🐛 Troubleshooting

### Error: "Firebase CLI not found"
```powershell
npm install -g firebase-tools
```

### Error: "Not logged in"
```powershell
firebase login
```

### Error: "Billing required"
আপনার Firebase project কে Blaze Plan এ upgrade করতে হবে:
- Firebase Console → Upgrade
- Credit card add করুন
- Free tier: 2M function invocations/month

### View Logs
```powershell
firebase functions:log
```

## 💰 Cost Estimate

- Free tier: 2 million invocations/month
- আপনার usage: ~3000-5000 orders/month
- **Expected cost: $0** (free tier এর মধ্যেই থাকবে)

## 🎯 What Happens After Deployment?

✅ যেকোনো order "Completed" হলে **automatically** coin add হবে
✅ Telegram, Admin Panel, API - সবখানে কাজ করবে
✅ No more manual intervention needed
✅ Duplicate prevention built-in

## 🔄 Re-deploy (যদি code change করেন)

```powershell
cd "j:\rahi v2\ihntopup-main"
firebase deploy --only functions:addCoinsOnOrderComplete
```

---

**এখন Step 1 থেকে শুরু করে একটা একটা করে commands run করুন!** 🚀
