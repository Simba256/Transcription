import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = `${protocol}://${host}`;

  return NextResponse.json({
    title: '🔍 Get Your User ID for Testing',
    instructions: {
      step1: '1️⃣ Sign in to your account',
      step2: '2️⃣ Open browser console (F12)',
      step3: '3️⃣ Copy and paste this code:'
    },
    browserConsoleCode: `// Copy and paste this entire block into your browser console:
(async () => {
  try {
    // Try to get from localStorage
    const localUser = localStorage.getItem('user');
    if (localUser) {
      const userData = JSON.parse(localUser);
      console.log('%c✅ Found User ID!', 'color: green; font-size: 16px');
      console.log('%cUser ID: ' + userData.uid, 'color: blue; font-size: 14px');
      console.log('%cEmail: ' + userData.email, 'color: blue; font-size: 14px');

      // Copy to clipboard
      navigator.clipboard.writeText(userData.uid);
      console.log('%c📋 User ID copied to clipboard!', 'color: green');

      // Show test command
      console.log('%c\\n📝 Test Payment Command:', 'color: orange; font-size: 14px');
      console.log(\`curl -X POST ${baseUrl}/api/debug/simulate-payment \\\\
  -H "Content-Type: application/json" \\\\
  -d '{
    "userId": "\${userData.uid}",
    "amount": 10,
    "type": "wallet"
  }'\`);

      return userData.uid;
    }

    // Try Firebase Auth
    if (typeof window !== 'undefined' && window.firebase && window.firebase.auth) {
      const user = window.firebase.auth().currentUser;
      if (user) {
        console.log('%c✅ Found User ID from Firebase!', 'color: green; font-size: 16px');
        console.log('%cUser ID: ' + user.uid, 'color: blue; font-size: 14px');
        navigator.clipboard.writeText(user.uid);
        console.log('%c📋 User ID copied to clipboard!', 'color: green');
        return user.uid;
      }
    }

    // Try auth context
    const authContext = document.querySelector('[data-user-id]');
    if (authContext) {
      const userId = authContext.getAttribute('data-user-id');
      console.log('%c✅ Found User ID from DOM!', 'color: green; font-size: 16px');
      console.log('%cUser ID: ' + userId, 'color: blue; font-size: 14px');
      navigator.clipboard.writeText(userId);
      console.log('%c📋 User ID copied to clipboard!', 'color: green');
      return userId;
    }

    console.log('%c❌ Could not find user ID. Try signing out and back in.', 'color: red; font-size: 14px');

    // Alternative method
    console.log('%c\\n🔄 Alternative: Visit this URL while signed in:', 'color: orange');
    console.log('${baseUrl}/api/auth/me');

  } catch (error) {
    console.error('Error getting user ID:', error);
  }
})();`,
    alternativeMethod: {
      title: '🔄 Alternative Method',
      description: 'Visit this URL while signed in:',
      url: `${baseUrl}/api/auth/me`,
      note: 'This will display your user ID directly'
    },
    quickTest: {
      title: '⚡ Quick Test Payment (After Getting User ID)',
      command: 'Copy the command from the console output, or use:',
      template: `curl -X POST ${baseUrl}/api/debug/simulate-payment \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "PASTE_YOUR_USER_ID_HERE",
    "amount": 10,
    "type": "wallet"
  }'`
    }
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}