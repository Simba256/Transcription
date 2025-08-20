# Firebase Setup Instructions

This document provides step-by-step instructions for setting up Firebase for the Talk to Text Canada project.

## Prerequisites

- Google account
- Firebase CLI (optional, but recommended)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `talk-to-text-canada`
4. Configure Google Analytics (recommended: enable)
5. Create the project

## Step 2: Set up Authentication

1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable the following providers:
   - **Email/Password**: Enable
   - **Google**: Enable (configure OAuth consent screen)
5. Configure authorized domains:
   - Add your production domain
   - `localhost` should already be included for development

## Step 3: Set up Firestore Database

1. Go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll add security rules later)
4. Select location: `us-central` (or closest to your users)
5. Create the database

## Step 4: Set up Storage

1. Go to "Storage"
2. Click "Get started"
3. Choose "Start in test mode"
4. Select same location as Firestore
5. Create the storage bucket

## Step 5: Get Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" → Web app
4. Register app name: `talk-to-text-canada-web`
5. Copy the configuration object

## Step 6: Update Environment Variables

Update your `.env.local` file with the actual Firebase configuration:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Step 7: Configure Security Rules

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own documents
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Transcription documents
    match /transcriptions/{transcriptionId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Admin-only collections
    match /admin/{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Audio files - users can upload to their own folders
    match /uploads/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Transcription results
    match /transcriptions/{userId}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Only server can write results
    }
  }
}
```

## Step 8: Test the Setup

1. Restart your development server: `npm run dev`
2. Try accessing `/login` and `/register` pages
3. Test user registration and login functionality
4. Check Firebase Console for user creation

## Step 9: Deploy Security Rules

Using Firebase CLI:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init

# Deploy rules
firebase deploy --only firestore:rules,storage
```

## Canadian Data Residency Compliance

For Canadian data residency requirements:

1. Choose `northamerica-northeast1` (Montreal) as your region
2. Configure Firestore and Storage in the same region
3. Ensure all Firebase services are set to Canadian region
4. Review Firebase's data processing addendum

## Security Best Practices

1. **Never expose API keys**: Environment variables are safe for Firebase client SDK
2. **Use security rules**: Always restrict data access appropriately
3. **Enable App Check**: Add extra security layer (optional but recommended)
4. **Monitor usage**: Set up alerts for unusual activity
5. **Regular security reviews**: Audit rules and access patterns

## Troubleshooting

### Common Issues

1. **"Firebase: Error (auth/invalid-api-key)"**
   - Check that API key is correctly set in `.env.local`
   - Restart development server after changing environment variables

2. **"Firebase: Error (auth/project-not-found)"**
   - Verify project ID is correct
   - Ensure project exists in Firebase Console

3. **"Permission denied" errors**
   - Check Firestore security rules
   - Ensure user is authenticated before accessing data

4. **CORS errors**
   - Add your domain to authorized domains in Authentication settings
   - Check that authDomain is correctly configured

## Next Steps

After Firebase is set up:

1. Test authentication flows
2. Implement file upload functionality
3. Set up Firestore collections for user data
4. Configure Firebase Functions for server-side processing
5. Set up monitoring and analytics

## Support

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Support](https://firebase.google.com/support)
- Internal project documentation: See `PROGRESS.md`