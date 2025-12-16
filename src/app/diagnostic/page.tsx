"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TestResult {
  name: string;
  status: 'running' | 'success' | 'failed' | 'pending';
  message: string;
  details?: any;
  timestamp?: string;
}

export default function DiagnosticPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId] = useState(`diag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const updateResult = (index: number, update: Partial<TestResult>) => {
    setResults(prev => {
      const newResults = [...prev];
      newResults[index] = { ...newResults[index], ...update };
      return newResults;
    });
  };

  const runDiagnostics = async () => {
    setIsRunning(true);

    const tests: TestResult[] = [
      { name: '1. Client Environment', status: 'pending', message: 'Checking...' },
      { name: '2. Network Status', status: 'pending', message: 'Checking...' },
      { name: '3. OPTIONS Request (CORS)', status: 'pending', message: 'Checking...' },
      { name: '4. POST Request (Upload)', status: 'pending', message: 'Checking...' },
    ];

    setResults(tests);

    // Test 1: Client Environment
    try {
      updateResult(0, { status: 'running' });
      const envInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages,
        platform: navigator.platform,
        online: navigator.onLine,
        cookiesEnabled: navigator.cookieEnabled,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: new Date().toISOString(),
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`,
        connection: (navigator as any).connection ? {
          effectiveType: (navigator as any).connection.effectiveType,
          downlink: (navigator as any).connection.downlink,
          rtt: (navigator as any).connection.rtt,
        } : 'Not available',
      };

      updateResult(0, {
        status: 'success',
        message: 'Environment info collected',
        details: envInfo,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      updateResult(0, {
        status: 'failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 2: Network Status
    try {
      updateResult(1, { status: 'running' });

      const dnsStart = performance.now();
      await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
      const dnsTime = performance.now() - dnsStart;

      updateResult(1, {
        status: 'success',
        message: 'Network is reachable',
        details: {
          online: navigator.onLine,
          dnsLatency: `${dnsTime.toFixed(2)}ms`,
          googleReachable: true,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      updateResult(1, {
        status: 'failed',
        message: 'Network issue detected',
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 3: OPTIONS Request
    try {
      updateResult(2, { status: 'running' });

      const optionsStart = performance.now();
      const optionsResponse = await fetch('/api/transcriptions/process', {
        method: 'OPTIONS',
      });
      const optionsTime = performance.now() - optionsStart;

      const headers: any = {};
      optionsResponse.headers.forEach((value, key) => {
        headers[key] = value;
      });

      if (optionsResponse.ok) {
        updateResult(2, {
          status: 'success',
          message: `✅ OPTIONS request successful (${optionsTime.toFixed(0)}ms)`,
          details: {
            status: optionsResponse.status,
            statusText: optionsResponse.statusText,
            headers,
            time: `${optionsTime.toFixed(2)}ms`,
            url: optionsResponse.url,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        updateResult(2, {
          status: 'failed',
          message: `❌ OPTIONS failed with status ${optionsResponse.status}`,
          details: {
            status: optionsResponse.status,
            statusText: optionsResponse.statusText,
            headers,
            time: `${optionsTime.toFixed(2)}ms`,
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      updateResult(2, {
        status: 'failed',
        message: `❌ OPTIONS request failed: ${error.message}`,
        details: {
          error: error.message,
          stack: error.stack,
        },
        timestamp: new Date().toISOString(),
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 4: POST Request
    try {
      updateResult(3, { status: 'running' });

      const postStart = performance.now();
      const postResponse = await fetch('/api/transcriptions/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: 'diagnostic-test-' + sessionId,
          language: 'en',
          operatingPoint: 'standard',
        }),
      });
      const postTime = performance.now() - postStart;

      const headers: any = {};
      postResponse.headers.forEach((value, key) => {
        headers[key] = value;
      });

      let responseBody;
      let responseText;
      try {
        responseText = await postResponse.text();
        responseBody = JSON.parse(responseText);
      } catch {
        responseBody = responseText;
      }

      if (postResponse.status === 405) {
        updateResult(3, {
          status: 'failed',
          message: `❌ POST request returned 405 (Method Not Allowed)`,
          details: {
            status: postResponse.status,
            statusText: postResponse.statusText,
            headers,
            responseBody,
            responseText,
            time: `${postTime.toFixed(2)}ms`,
            url: postResponse.url,
            redirected: postResponse.redirected,
            type: postResponse.type,
          },
          timestamp: new Date().toISOString(),
        });
      } else if (postResponse.status === 400 || postResponse.status === 404) {
        // Expected errors (no real job exists)
        updateResult(3, {
          status: 'success',
          message: `✅ POST request reached server (${postResponse.status} is expected)`,
          details: {
            status: postResponse.status,
            statusText: postResponse.statusText,
            headers,
            responseBody,
            time: `${postTime.toFixed(2)}ms`,
            note: 'Status 400/404 is expected since this is a test job ID',
          },
          timestamp: new Date().toISOString(),
        });
      } else if (postResponse.ok) {
        updateResult(3, {
          status: 'success',
          message: `✅ POST request successful`,
          details: {
            status: postResponse.status,
            headers,
            responseBody,
            time: `${postTime.toFixed(2)}ms`,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        updateResult(3, {
          status: 'failed',
          message: `❌ POST failed with status ${postResponse.status}`,
          details: {
            status: postResponse.status,
            statusText: postResponse.statusText,
            headers,
            responseBody,
            responseText,
            time: `${postTime.toFixed(2)}ms`,
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      updateResult(3, {
        status: 'failed',
        message: `❌ POST request failed: ${error.message}`,
        details: {
          error: error.message,
          errorType: error.name,
          stack: error.stack?.split('\n').slice(0, 3),
        },
        timestamp: new Date().toISOString(),
      });
    }

    setIsRunning(false);
  };

  useEffect(() => {
    // Auto-run on page load
    runDiagnostics();
  }, []);

  const copyResults = () => {
    const text = `
🔍 TRANSCRIPTION DIAGNOSTIC REPORT
Session ID: ${sessionId}
Generated: ${new Date().toISOString()}

${'='.repeat(60)}

${results.map((result, i) => `
${result.name}
Status: ${result.status.toUpperCase()}
Message: ${result.message}
Timestamp: ${result.timestamp || 'N/A'}

Details:
${JSON.stringify(result.details, null, 2)}

${'-'.repeat(60)}
`).join('\n')}

${'='.repeat(60)}

INSTRUCTIONS:
1. Copy this entire report
2. Send to support with subject: "Diagnostic Report - ${sessionId}"
3. Include any error screenshots if available
    `.trim();

    navigator.clipboard.writeText(text);
    alert('✅ Diagnostic results copied to clipboard!\n\nYou can now paste this in an email to support.');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'running': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'running': return '⏳';
      default: return '⏸️';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-[#003366]">
              🔍 Transcription Upload Diagnostics
            </CardTitle>
            <p className="text-gray-600 mt-2">
              This page automatically tests your connection to the transcription service.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Session ID: <code className="bg-gray-100 px-2 py-1 rounded">{sessionId}</code>
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{getStatusIcon(result.status)}</span>
                        <h3 className="font-semibold text-lg">{result.name}</h3>
                      </div>
                      <p className="text-sm mb-2">{result.message}</p>

                      {result.details && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs font-medium mb-2">
                            View Technical Details
                          </summary>
                          <pre className="text-xs bg-white p-3 rounded overflow-x-auto border">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                onClick={runDiagnostics}
                disabled={isRunning}
                className="bg-[#003366] hover:bg-[#002244] text-white"
              >
                {isRunning ? '⏳ Running Tests...' : '🔄 Run Tests Again'}
              </Button>

              <Button
                onClick={copyResults}
                disabled={results.length === 0}
                variant="outline"
                className="border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white"
              >
                📋 Copy Results
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">📧 How to Send Results</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Click "Copy Results" button above</li>
                <li>Email the results to support</li>
                <li>Include your Session ID: <code className="bg-blue-100 px-1 rounded">{sessionId}</code></li>
                <li>Take a screenshot of this page if needed</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
