"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, AlertCircle, Play, Loader2 } from 'lucide-react';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'running';
  message: string;
  details?: unknown;
}

export default function TestRulesPage() {
  const { user, userData } = useAuth();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [configData, setConfigData] = useState<unknown>(null);

  const updateTest = (testName: string, status: TestResult['status'], message: string, details?: unknown) => {
    setTests(prev => prev.map(test => 
      test.name === testName 
        ? { ...test, status, message, details }
        : test
    ));
  };

  const initializeTests = () => {
    const testCases = [
      { name: 'User Authentication', status: 'pending' as const, message: 'Checking user authentication...' },
      { name: 'Read Own Data', status: 'pending' as const, message: 'Testing access to own data...' },
      { name: 'Write Own Data', status: 'pending' as const, message: 'Testing ability to create own data...' },
      { name: 'Cross-User Access', status: 'pending' as const, message: 'Testing restrictions on other users data...' },
      { name: 'Admin Access', status: 'pending' as const, message: 'Testing admin permissions...' },
      { name: 'Speechmatics Config', status: 'pending' as const, message: 'Checking Speechmatics configuration...' }
    ];
    setTests(testCases);
  };

  const testConfiguration = async () => {
    updateTest('Speechmatics Config', 'running', 'Checking API configuration...');
    
    try {
      const response = await fetch('/api/test-config');
      const data = await response.json();
      setConfigData(data);
      
      if (data.environment?.speechmatics?.hasApiKey) {
        updateTest('Speechmatics Config', 'success', 'Speechmatics API key found', data);
      } else {
        updateTest('Speechmatics Config', 'error', 'Speechmatics API key missing', data);
      }
    } catch (error) {
      updateTest('Speechmatics Config', 'error', 'Failed to check configuration', error);
    }
  };

  const testAuthentication = async () => {
    updateTest('User Authentication', 'running', 'Verifying authentication...');
    
    if (!user) {
      updateTest('User Authentication', 'error', 'No user authenticated');
      return;
    }
    
    updateTest('User Authentication', 'success', `Authenticated as ${user.email}`, {
      uid: user.uid,
      email: user.email,
      role: userData?.role
    });
  };

  const testReadOwnData = async () => {
    updateTest('Read Own Data', 'running', 'Testing read access to own data...');
    
    if (!user) {
      updateTest('Read Own Data', 'error', 'User not authenticated');
      return;
    }

    try {
      // Try to read user's own profile
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        updateTest('Read Own Data', 'success', 'Successfully read own user profile');
      } else {
        updateTest('Read Own Data', 'error', 'User profile not found');
      }
    } catch (error: unknown) {
      updateTest('Read Own Data', 'error', `Failed to read own data: ${error.message}`);
    }
  };

  const testWriteOwnData = async () => {
    updateTest('Write Own Data', 'running', 'Testing write access to own data...');
    
    if (!user) {
      updateTest('Write Own Data', 'error', 'User not authenticated');
      return;
    }

    try {
      // Try to create a test transcription
      const testTranscription = {
        userId: user.uid,
        filename: 'test-security-rules.mp3',
        status: 'processing',
        mode: 'ai',
        duration: 60,
        creditsUsed: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(collection(db, 'transcriptions'), testTranscription);
      
      // Clean up test data
      await deleteDoc(doc(db, 'transcriptions', docRef.id));
      
      updateTest('Write Own Data', 'success', 'Successfully created and deleted test transcription');
    } catch (error: unknown) {
      updateTest('Write Own Data', 'error', `Failed to write own data: ${error.message}`);
    }
  };

  const testCrossUserAccess = async () => {
    updateTest('Cross-User Access', 'running', 'Testing restrictions on other users data...');
    
    if (!user) {
      updateTest('Cross-User Access', 'error', 'User not authenticated');
      return;
    }

    try {
      // Try to create a transcription for a different user (should fail)
      const testTranscription = {
        userId: 'different-user-id',
        filename: 'unauthorized-test.mp3',
        status: 'processing',
        mode: 'ai',
        duration: 60,
        creditsUsed: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await addDoc(collection(db, 'transcriptions'), testTranscription);
      
      // If we get here, the rules failed
      updateTest('Cross-User Access', 'error', 'Security rules failed - was able to create data for another user');
    } catch (error: unknown) {
      // This is expected - the rules should prevent this
      updateTest('Cross-User Access', 'success', `Correctly blocked cross-user access: ${error.message}`);
    }
  };

  const testAdminAccess = async () => {
    updateTest('Admin Access', 'running', 'Testing admin permissions...');
    
    if (!user || !userData) {
      updateTest('Admin Access', 'error', 'User not authenticated');
      return;
    }

    if (userData.role === 'admin') {
      try {
        // Try to read all transcriptions (admin should be able to do this)
        const transcriptionsRef = collection(db, 'transcriptions');
        const snapshot = await getDocs(transcriptionsRef);
        
        updateTest('Admin Access', 'success', `Admin can access all transcriptions (${snapshot.size} documents)`);
      } catch (error: unknown) {
        updateTest('Admin Access', 'error', `Admin access failed: ${error.message}`);
      }
    } else {
      updateTest('Admin Access', 'success', 'User is not admin - admin tests skipped');
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    initializeTests();
    
    // Run tests sequentially
    await testAuthentication();
    await testConfiguration();
    await testReadOwnData();
    await testWriteOwnData();
    await testCrossUserAccess();
    await testAdminAccess();
    
    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800',
      pending: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge className={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  useEffect(() => {
    initializeTests();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please sign in to test the security rules.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Firebase Security Rules Test
          </h1>
          <p className="text-gray-600">
            Testing security rules for user: <strong>{user.email}</strong> 
            {userData?.role && <span> (Role: <strong>{userData.role}</strong>)</span>}
          </p>
        </div>

        <div className="mb-6">
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
        </div>

        <div className="space-y-4">
          {tests.map((test, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(test.status)}
                    <h3 className="text-lg font-semibold">{test.name}</h3>
                  </div>
                  {getStatusBadge(test.status)}
                </div>
                <p className="text-gray-600">{test.message}</p>
                {test.details && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                      View Details
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {configData && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Configuration Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Speechmatics</h4>
                  <p className="text-sm">
                    API Key: {configData.environment?.speechmatics?.hasApiKey ? '✅ Present' : '❌ Missing'}
                  </p>
                  <p className="text-sm">
                    API URL: {configData.environment?.speechmatics?.apiUrl}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Firebase</h4>
                  <p className="text-sm">
                    Project ID: {configData.environment?.firebase?.hasProjectId ? '✅ Present' : '❌ Missing'}
                  </p>
                  <p className="text-sm">
                    API Key: {configData.environment?.firebase?.hasApiKey ? '✅ Present' : '❌ Missing'}
                  </p>
                </div>
              </div>
              
              {configData.recommendations?.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <h4 className="font-semibold text-yellow-800 mb-2">Recommendations:</h4>
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {configData.recommendations.map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}