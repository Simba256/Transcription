#!/bin/bash

# Firebase Storage Verification Script
# This script checks your Firebase Storage configuration

echo "🔍 Firebase Storage Configuration Checker"
echo "=========================================="
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local file found"

    # Check for storage bucket
    if grep -q "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=" .env.local; then
        BUCKET=$(grep "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=" .env.local | cut -d '=' -f2)
        if [ -n "$BUCKET" ]; then
            echo "✅ Storage bucket configured: $BUCKET"
        else
            echo "❌ Storage bucket variable exists but is empty"
        fi
    else
        echo "❌ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET not found in .env.local"
    fi

    # Check for project ID
    if grep -q "NEXT_PUBLIC_FIREBASE_PROJECT_ID=" .env.local; then
        PROJECT_ID=$(grep "NEXT_PUBLIC_FIREBASE_PROJECT_ID=" .env.local | cut -d '=' -f2)
        if [ -n "$PROJECT_ID" ]; then
            echo "✅ Project ID configured: $PROJECT_ID"
        else
            echo "❌ Project ID variable exists but is empty"
        fi
    else
        echo "❌ NEXT_PUBLIC_FIREBASE_PROJECT_ID not found in .env.local"
    fi
else
    echo "❌ .env.local file not found"
fi

echo ""

# Check if storage.rules exists
if [ -f "storage.rules" ]; then
    echo "✅ storage.rules file found"
else
    echo "❌ storage.rules file not found"
fi

echo ""

# Check if firebase.json is configured for storage
if [ -f "firebase.json" ]; then
    echo "✅ firebase.json file found"
    if grep -q '"storage"' firebase.json; then
        echo "✅ Storage configuration found in firebase.json"
    else
        echo "❌ Storage configuration missing in firebase.json"
    fi
else
    echo "❌ firebase.json file not found"
fi

echo ""

# Check Firebase CLI
if command -v firebase &> /dev/null; then
    echo "✅ Firebase CLI installed"

    # Check current project
    CURRENT_PROJECT=$(firebase projects:list 2>/dev/null | grep "(current)" | awk '{print $1}')
    if [ -n "$CURRENT_PROJECT" ]; then
        echo "✅ Firebase project selected: $CURRENT_PROJECT"
        echo ""
        echo "📋 You can deploy storage rules with:"
        echo "   firebase deploy --only storage"
    else
        echo "⚠️  No Firebase project currently selected"
        echo "   Run: firebase use <project-id>"
    fi
else
    echo "❌ Firebase CLI not installed"
    echo "   Install with: npm install -g firebase-tools"
fi

echo ""
echo "=========================================="
echo ""
echo "📝 Next Steps:"
echo "1. Fix any ❌ issues listed above"
echo "2. Deploy storage rules: firebase deploy --only storage"
echo "3. Check Firebase Console → Storage → Usage"
echo "4. Verify billing plan (Spark vs Blaze)"
echo "5. Test upload at /upload page with browser console open (F12)"
echo ""
echo "📖 For detailed troubleshooting, see: STORAGE-DIAGNOSTIC.md"
