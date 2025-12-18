"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function TestTranscriptionPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runTest = async () => {
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch('/api/debug/test-transcription-flow');
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({
        error: 'Failed to run test',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'FAIL':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'ERROR':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'WARN':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'INFO':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-green-50 border-green-200';
      case 'FAIL':
        return 'bg-red-50 border-red-200';
      case 'ERROR':
        return 'bg-red-50 border-red-200';
      case 'WARN':
        return 'bg-yellow-50 border-yellow-200';
      case 'INFO':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#003366]">Transcription System Test</h1>
          <p className="text-gray-600 mt-2">
            Run a complete diagnostic to check if transcriptions will work on this device
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-6">
            <Button
              onClick={runTest}
              disabled={loading}
              className="flex items-center gap-2 bg-[#003366] hover:bg-[#002244]"
              size="lg"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Running Tests...' : 'Run Diagnostic Test'}
            </Button>

            <p className="text-sm text-gray-600 mt-4">
              This will test:
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside mt-2 space-y-1">
              <li>Your account and package status</li>
              <li>Ability to create transcription jobs</li>
              <li>API endpoint accessibility</li>
              <li>Firebase Storage configuration</li>
              <li>Speechmatics service status</li>
            </ul>
          </CardContent>
        </Card>

        {results && (
          <>
            {/* Overall Status */}
            <Card className={`mb-6 ${
              results.overallStatus === 'ALL_SYSTEMS_GO'
                ? 'border-2 border-green-500 bg-green-50'
                : 'border-2 border-red-500 bg-red-50'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  {results.overallStatus === 'ALL_SYSTEMS_GO' ? (
                    <>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="text-xl font-bold text-green-900">
                          All Systems Operational ✓
                        </h3>
                        <p className="text-green-700">
                          Transcriptions should work correctly on this device
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-8 w-8 text-red-600" />
                      <div>
                        <h3 className="text-xl font-bold text-red-900">
                          Issues Detected ✗
                        </h3>
                        <p className="text-red-700">
                          There are problems preventing transcriptions from working
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {results.summary && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-white rounded p-3 text-center">
                      <div className="text-2xl font-bold text-gray-700">{results.summary.total}</div>
                      <div className="text-xs text-gray-600">Total Checks</div>
                    </div>
                    <div className="bg-green-100 rounded p-3 text-center">
                      <div className="text-2xl font-bold text-green-700">{results.summary.passed}</div>
                      <div className="text-xs text-green-600">Passed</div>
                    </div>
                    <div className="bg-red-100 rounded p-3 text-center">
                      <div className="text-2xl font-bold text-red-700">{results.summary.failed}</div>
                      <div className="text-xs text-red-600">Failed</div>
                    </div>
                    <div className="bg-red-100 rounded p-3 text-center">
                      <div className="text-2xl font-bold text-red-700">{results.summary.errors}</div>
                      <div className="text-xs text-red-600">Errors</div>
                    </div>
                    <div className="bg-yellow-100 rounded p-3 text-center">
                      <div className="text-2xl font-bold text-yellow-700">{results.summary.warnings}</div>
                      <div className="text-xs text-yellow-600">Warnings</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Info */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>User Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><strong>User ID:</strong> {results.userId}</div>
                  <div><strong>Email:</strong> {results.email}</div>
                  <div><strong>Test Time:</strong> {new Date(results.timestamp).toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Checks */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Test Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.checks && Object.entries(results.checks).map(([key, check]: [string, any]) => (
                  <div key={key} className={`border rounded-lg p-4 ${getStatusColor(check.status)}`}>
                    <div className="flex items-start gap-3">
                      {getStatusIcon(check.status)}
                      <div className="flex-1">
                        <h4 className="font-semibold capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>

                        {check.status && (
                          <div className="text-xs font-medium mt-1">
                            Status: {check.status}
                          </div>
                        )}

                        {check.message && (
                          <div className="text-sm mt-2">{check.message}</div>
                        )}

                        {check.error && (
                          <div className="text-sm text-red-700 mt-2">
                            <strong>Error:</strong> {check.error}
                          </div>
                        )}

                        {/* Show additional details */}
                        {check.walletBalance !== undefined && (
                          <div className="text-sm mt-2">
                            <strong>Wallet Balance:</strong> CA${check.walletBalance.toFixed(2)}
                          </div>
                        )}

                        {check.packagesCount !== undefined && (
                          <div className="text-sm">
                            <strong>Total Packages:</strong> {check.packagesCount}
                          </div>
                        )}

                        {check.activePackages !== undefined && (
                          <div className="text-sm">
                            <strong>Active Packages:</strong> {check.activePackages}
                          </div>
                        )}

                        {check.jobId && (
                          <div className="text-sm mt-2">
                            <strong>Test Job ID:</strong> {check.jobId}
                          </div>
                        )}

                        {check.statusCode !== undefined && (
                          <div className="text-sm mt-2">
                            <strong>HTTP Status:</strong> {check.statusCode}
                          </div>
                        )}

                        {check.bucket && (
                          <div className="text-sm mt-2">
                            <strong>Storage Bucket:</strong> {check.bucket}
                          </div>
                        )}

                        {check.apiKeyConfigured !== undefined && (
                          <div className="text-sm mt-2">
                            <strong>API Key:</strong> {check.apiKeyConfigured ? '✓ Configured' : '✗ Missing'}
                          </div>
                        )}

                        {check.headers && (
                          <details className="mt-2">
                            <summary className="text-sm cursor-pointer">View Headers</summary>
                            <pre className="text-xs bg-gray-900 text-gray-100 p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify(check.headers, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Copy Results Button */}
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(results, null, 2));
                  alert('Results copied to clipboard!');
                }}
              >
                Copy Full Results
              </Button>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
