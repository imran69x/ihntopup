# Telegram Webhook Coin Reward Debugging Guide

## Problem
Admin panel থেকে order complete করলে coin add হচ্ছে কিন্তু Telegram থেকে approve করলে হচ্ছে না।

## Debugging Steps

### 1. Check if Webhook is Receiving Requests

**Terminal/Console check করুন:**
- Telegram এ "✅ Approve" click করুন
- Dev server console এ এই logs দেখা উচিত:
  ```
  ✅ Added [amount] coins to user [userId]
  ✅ Order status updated successfully with coin reward
  ```

যদি এই logs না দেখেন, তাহলে webhook hit হচ্ছে না।

### 2. Restart Dev Server

API routes hot reload নাও করতে পারে। Restart করুন:

```powershell
# Ctrl+C চেপে server বন্ধ করুন
# তারপর আবার start করুন:
npm run dev
```

### 3. Check Webhook URL

Telegram webhook সঠিক URL এ configured আছে কিনা check করুন।

**Expected URL format:**
```
https://your-domain.com/api/telegram/callback
```

অথবা development এর জন্য ngrok ব্যবহার করছেন:
```
https://[your-ngrok-id].ngrok.io/api/telegram/callback
```

### 4. Test Webhook Manually

Browser বা Postman দিয়ে test করুন:

```
GET https://localhost:3002/api/telegram/callback
```

Response হওয়া উচিত:
```json
{
  "message": "Telegram webhook endpoint is active"
}
```

### 5. Check Database

Order complete করার পর manually database check করুন:

**Users collection:**
- Find the user by userId
- Check `coinFund` field
- দেখুন value increase হয়েছে কিনা

**Orders collection:**
- Order এর status "Completed" আছে কিনা
- `processedByTelegramId` field আছে কিনা

### 6. Check for Errors

Console এ কোনো এই ধরনের error দেখছেন কিনা:
- `Transaction failed`
- `User not found`
- `Permission denied`
- `CORS error`

## Expected Behavior

✅ **Telegram Approval:**
1. Admin clicks "✅ Approve" in Telegram
2. Webhook receives callback
3. Transaction starts
4. User's coinFund updated (+10%)
5. Order status updated to "Completed"
6. Transaction commits
7. Console logs success message

✅ **Admin Panel:**
1. Admin selects order
2. Changes status to "Completed"
3. Same transaction logic runs
4. Coins added, order updated

## Common Issues

### Issue 1: Webhook Not Configured
**Solution:** Set up Telegram webhook properly with your public URL

### Issue 2: Dev Server Not Reloaded
**Solution:** Restart `npm run dev`

### Issue 3: NGROK Expired
**Solution:** If using ngrok for local development, restart ngrok and update webhook

### Issue 4: Firebase Permissions
**Solution:** Check Firestore rules allow admin writes

## Next Steps

যদি এখনো কাজ না করে:

1. **Server logs সব share করুন** যখন Telegram approve করছেন
2. **Database screenshot** - user এর coinFund before/after
3. **Telegram webhook info** - কোন URL ব্যবহার করছেন
4. **Environment check** - development নাকি production?

## Quick Fix

যদি শুধু development environment এর জন্য test করছেন এবং webhook setup করা নেই:

**Temporary workaround:** শুধু admin panel থেকে approve করুন যতক্ষণ না production deployment হয়।

Production এ proper webhook setup থাকলে এই সমস্যা হবে না।
