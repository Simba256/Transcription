# Talk to Text Canada

A professional AI-powered transcription platform built with Next.js and Firebase, featuring Speechmatics integration for high-accuracy audio transcription.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 📖 Documentation

**All project documentation is located in the [`/docs`](./docs) folder:**

- **[📋 Documentation Index](./docs/README.md)** - Start here for complete overview
- **[📊 Development Progress](./docs/PROGRESS.md)** - Detailed project status and completed features  
- **[🎯 Stage 5 Options](./docs/STAGE_5_OPTIONS.md)** - Next development phase planning
- **[🔧 Firebase Setup](./docs/FIREBASE_SETUP.md)** - Backend configuration guide

## ✨ Current Features

- ✅ **User Authentication** - Secure login/register with Firebase Auth
- ✅ **File Upload** - Drag & drop audio files with validation
- ✅ **AI Transcription** - Speechmatics integration with real-time tracking
- ✅ **Trial System** - Free trial with usage limits and tracking
- ✅ **Dashboard** - Comprehensive transcription management
- ✅ **Multiple Exports** - Download as TXT, JSON, or SRT formats
- ✅ **Responsive Design** - Mobile, tablet, and desktop optimized

## 🏗️ Tech Stack

- **Frontend**: Next.js 15.4.6, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Transcription**: Speechmatics API
- **UI Components**: Shadcn/ui + Custom components

## 📈 Project Status

**✅ Stage 4 Complete**: Full transcription workflow operational

**🎯 Ready for Stage 5**: Choose from Enhanced Dashboard, Payment Integration, Authentication Enhancement, or LegalScript Studio

See [Stage 5 Options](./docs/STAGE_5_OPTIONS.md) for detailed analysis and recommendations.

## 🔧 Environment Setup

Create `.env.local` with:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Speechmatics API
SPEECHMATICS_API_KEY=your_speechmatics_key
```

See [Firebase Setup Guide](./docs/FIREBASE_SETUP.md) for detailed configuration instructions.

## 📞 Support

For detailed documentation, setup guides, and development planning, visit the [`/docs`](./docs) folder.

---

*Professional transcription services for businesses, legal professionals, and content creators across Canada.*
