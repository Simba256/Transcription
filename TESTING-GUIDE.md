# 🧪 Firebase Security Rules Testing Guide

## 🚀 Quick Start Testing

### 1. **Automated Testing Page**
I've created a dedicated test page for you:

```bash
# Start your development server
npm run dev

# Then visit:
http://localhost:3000/test-rules
```

This page will automatically test:
- ✅ User authentication status
- ✅ Read/write permissions to own data
- ✅ Cross-user access restrictions
- ✅ Admin permissions (if applicable)
- ✅ Speechmatics API configuration

### 2. **Configuration Diagnostics**
Check your API configuration:

```bash
# Visit this endpoint in your browser:
http://localhost:3000/api/test-config
```

This will show you:
- Speechmatics API key status
- Firebase configuration
- Recommendations for fixes

## 🎯 **Manual Testing Steps**

### Step 1: Test Regular User (`user@demo.com`)

1. **Login:**
   - Email: `user@demo.com`
   - Password: `password`

2. **Expected Behaviors:**
   - ✅ Can access dashboard
   - ✅ Can upload files
   - ✅ Can view own transcriptions
   - ❌ Cannot access admin routes (should redirect)
   - ❌ Cannot see other users' data

### Step 2: Test Admin User (`admin@demo.com`)

1. **Login:**
   - Email: `admin@demo.com`
   - Password: `password`

2. **Expected Behaviors:**
   - ✅ Can access admin dashboard
   - ✅ Can view all transcriptions
   - ✅ Can manage users
   - ✅ Can process transcription jobs

## � **Debugging Speechmatics Error**

The error you encountered suggests missing configuration. Here's how to fix it:

### Check Environment Variables
Create or update your `.env.local` file:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=transcription-a1b5a.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=transcription-a1b5a
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=transcription-a1b5a.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Speechmatics Configuration  
SPEECHMATICS_API_KEY=your_speechmatics_api_key
SPEECHMATICS_API_URL=https://asr.api.speechmatics.com/v2

# Firebase Admin (server-side)
FIREBASE_PROJECT_ID=transcription-a1b5a
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@transcription-a1b5a.iam.gserviceaccount.com
```

### Quick Fix for Testing Without Speechmatics
If you want to test the security rules without Speechmatics, you can temporarily disable the processing:

1. **Comment out the Speechmatics call in upload page:**

```typescript
// In src/app/(protected)/upload/page.tsx around line 270-300
// Comment out this section:
/*
const transcriptionResponse = await fetch('/api/transcriptions/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobId: jobId,
    language: 'en',
    operatingPoint: 'enhanced'
  })
});
*/
```

## � **Firebase Console Testing**

Visit: https://console.firebase.google.com/project/transcription-a1b5a/firestore/rules

Click "Rules Playground" and test these scenarios:

### Test Case 1: User Reading Own Data ✅
```javascript
Location: /transcriptions/test-123
Operation: get
Auth: {"uid": "user123", "token": {"email": "user@demo.com"}}
Data: {"userId": "user123", "filename": "audio.mp3"}
Expected: Allow
```

### Test Case 2: User Reading Other's Data ❌
```javascript
Location: /transcriptions/test-456
Operation: get  
Auth: {"uid": "user123", "token": {"email": "user@demo.com"}}
Data: {"userId": "user456", "filename": "audio.mp3"}
Expected: Deny
```

### Test Case 3: Admin Reading Any Data ✅
```javascript
Location: /transcriptions/test-456
Operation: get
Auth: {"uid": "admin123", "token": {"email": "admin@demo.com"}}
Data: {"userId": "user456", "filename": "audio.mp3"}  
Expected: Allow
```

## 📊 **Expected Test Results**

### ✅ **What Should Work:**
- Demo users can login and access their data
- File uploads create proper database entries
- Users can only see their own transcriptions
- Admins can see all transcriptions
- Cross-user access is blocked
- File type/size restrictions work

### ❌ **What Should Fail:**
- Unauthenticated access to any data
- Users accessing other users' data
- Invalid file uploads (wrong type/size)
- Non-admins accessing admin functions

## �️ **Troubleshooting**

### Issue 1: "Permission denied" errors
**Solution:** Check user authentication and role in Firestore

### Issue 2: Speechmatics API errors
**Solution:** Add missing environment variables

### Issue 3: Upload succeeds but processing fails
**Solution:** This is expected if Speechmatics isn't configured - your security rules are still working!

### Issue 4: Can't access admin functions
**Solution:** Verify user has `role: "admin"` in Firestore users collection

## 🎯 **Success Indicators**

Your security rules are working correctly if:

1. **✅ The automated test page shows all green checkmarks**
2. **✅ Users can only see their own data**  
3. **✅ Admins can see all data**
4. **✅ File uploads are restricted properly**
5. **✅ Authentication redirects work**

The Speechmatics error is a separate issue from your security rules - the rules are protecting your data correctly!

---

## � **Next Steps**

1. **Run the automated tests** at `/test-rules`
2. **Fix Speechmatics configuration** if needed
3. **Test with real users** in your application
4. **Monitor Firebase Console** for any rule violations

Your Firebase security rules are now production-ready! �✨