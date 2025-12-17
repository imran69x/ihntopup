# Quick Deployment Commands

## Step 1: Install Firebase CLI (একবার করলেই হবে)

```powershell
npm install -g firebase-tools
```

## Step 2: Login to Firebase

```powershell
firebase login
```

Browser খুলবে, login করুন আপনার Firebase account দিয়ে।

## Step 3: Deploy Function

```powershell
cd "j:\rahi v2\ihntopup-main"
firebase deploy --only functions
```

এই 3টা command run করলেই হয়ে যাবে! 🚀

---

## Important Notes:

⚠️ **Firebase CLI installed না থাকলে:**
- Step 1 এর command run করুন
- PowerShell admin mode এ run করতে হতে পারে

⚠️ **Firebase Blaze Plan প্রয়োজন:**
- Free tier এ Cloud Functions কাজ করে না
- Blaze Plan upgrade করতে হবে
- Monthly ~$0 cost হবে (2M free invocations)

## After Deployment:

Firebase Console check করুন:
- https://console.firebase.google.com
- Functions section এ যান
- `addCoinsOnOrderComplete` দেখতে পাবেন

## Test:

যেকোনো order "Completed" করুন, automatically coin add হবে! ✅
