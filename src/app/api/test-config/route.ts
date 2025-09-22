import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const speechmaticsApiKey = process.env.SPEECHMATICS_API_KEY;
    const speechmaticsApiUrl = process.env.SPEECHMATICS_API_URL;
    
    // Check Firebase environment variables
    const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: {
        speechmatics: {
          hasApiKey: !!speechmaticsApiKey,
          apiKeyLength: speechmaticsApiKey?.length || 0,
          apiUrl: speechmaticsApiUrl || 'Not set',
          isDefaultUrl: speechmaticsApiUrl === 'https://asr.api.speechmatics.com/v2'
        },
        firebase: {
          hasProjectId: !!firebaseProjectId,
          projectId: firebaseProjectId || 'Not set',
          hasApiKey: !!firebaseApiKey
        }
      },
      recommendations: [] as string[]
    };
    
    // Add recommendations based on findings
    if (!speechmaticsApiKey) {
      diagnostics.recommendations.push('Add SPEECHMATICS_API_KEY to your environment variables');
    }
    
    if (!speechmaticsApiUrl) {
      diagnostics.recommendations.push('Add SPEECHMATICS_API_URL to your environment variables');
    }
    
    if (!firebaseProjectId) {
      diagnostics.recommendations.push('Add NEXT_PUBLIC_FIREBASE_PROJECT_ID to your environment variables');
    }
    
    // Test Speechmatics API connection if credentials are available
    if (speechmaticsApiKey && speechmaticsApiUrl) {
      try {
        console.log('[Test] Testing Speechmatics API connection...');
        const testResponse = await fetch(`${speechmaticsApiUrl}/jobs`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${speechmaticsApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`[Test] Speechmatics API response: ${testResponse.status} ${testResponse.statusText}`);
        
        diagnostics.speechmaticsConnection = {
          status: testResponse.status,
          statusText: testResponse.statusText,
          isWorking: testResponse.ok
        };
        
        if (!testResponse.ok) {
          diagnostics.recommendations.push('Speechmatics API key may be invalid or expired');
        } else {
          diagnostics.recommendations.push('Speechmatics API is working correctly');
        }
      } catch (error: any) {
        console.error('[Test] Speechmatics API test failed:', error);
        diagnostics.speechmaticsConnection = {
          error: error?.message || 'Unknown error',
          isWorking: false
        };
        diagnostics.recommendations.push('Check network connectivity to Speechmatics API');
      }
    } else {
      diagnostics.speechmaticsConnection = {
        error: 'Speechmatics credentials not configured',
        isWorking: false
      };
    }
    
    return NextResponse.json(diagnostics);
    
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to run diagnostics',
        message: error?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}