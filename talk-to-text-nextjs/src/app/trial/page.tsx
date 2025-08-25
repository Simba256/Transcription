'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Zap, 
  Shield,
  FileAudio,
  User,
  CreditCard,
  ArrowRight
} from 'lucide-react';
import EnhancedFileUpload from '@/components/upload/EnhancedFileUpload';
import FileManager from '@/components/upload/FileManager';
import Header from '@/components/shared/header';
import Footer from '@/components/shared/footer';

export default function TrialPage() {
  const { user, userProfile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Calculate trial usage
  const trialUploadsUsed = userProfile?.usage?.trialUploads || 0;
  const trialTimeUsed = userProfile?.usage?.trialTimeUsed || 0;
  const trialUploadsRemaining = Math.max(0, 3 - trialUploadsUsed);
  const trialTimeRemaining = Math.max(0, 180 - trialTimeUsed); // 3 hours = 180 minutes

  const isTrialExhausted = trialUploadsRemaining === 0 || trialTimeRemaining === 0;
  const isTrialUser = userProfile?.subscription?.plan === 'trial';

  useEffect(() => {
    // Redirect non-authenticated users to login
    if (!loading && !user) {
      router.push('/login?redirect=/trial');
    }
  }, [user, loading, router]);

  const handleUploadComplete = (fileId: string, downloadUrl: string) => {
    setUploadSuccess(true);
    
    // Refresh user profile to update trial usage stats in real-time
    refreshProfile();
    
    // Auto-hide success message after 5 seconds
    setTimeout(() => {
      setUploadSuccess(false);
    }, 5000);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-ttt-navy border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your trial...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <>
      <Header />
      
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Free Trial - AI Transcription
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Experience our AI-powered transcription service with 3 free uploads and up to 3 hours of processing time.
            </p>
          </div>

          {/* Trial Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4 text-ttt-navy" />
                  Uploads Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {trialUploadsUsed} / 3
                </div>
                <Progress value={(trialUploadsUsed / 3) * 100} className="h-2" />
                <p className="text-xs text-gray-500 mt-2">
                  {trialUploadsRemaining} uploads remaining
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-ttt-navy" />
                  Time Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {trialTimeUsed} / 180 min
                </div>
                <Progress value={(trialTimeUsed / 180) * 100} className="h-2" />
                <p className="text-xs text-gray-500 mt-2">
                  {trialTimeRemaining} minutes remaining
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-ttt-navy" />
                  Account Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">Trial Account</Badge>
                </div>
                <p className="text-xs text-gray-500">
                  {isTrialExhausted ? 'Trial exhausted' : 'Active trial'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Success Message */}
          {uploadSuccess && (
            <Alert className="mb-6">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Upload successful! Your file is being processed and you'll receive an email when it's ready.
              </AlertDescription>
            </Alert>
          )}

          {/* Trial Exhausted Warning */}
          {isTrialExhausted && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    Your trial limits have been reached. Upgrade to continue using our services.
                  </span>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/pricing">View Plans</a>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Section */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileAudio className="h-5 w-5" />
                    Upload Audio Files
                  </CardTitle>
                  <CardDescription>
                    {isTrialExhausted 
                      ? 'Trial limits reached. Please upgrade to continue.'
                      : `Upload up to ${trialUploadsRemaining} more files and choose your transcription mode (trial includes AI transcription).`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EnhancedFileUpload
                    variant="trial"
                    maxFiles={trialUploadsRemaining}
                    disabled={isTrialExhausted}
                    onUploadComplete={handleUploadComplete}
                    onUploadError={handleUploadError}
                  />
                </CardContent>
              </Card>

              {/* Recent Uploads */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Transcriptions</CardTitle>
                  <CardDescription>
                    View and download your completed transcriptions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileManager 
                    variant="compact"
                    showTranscriptions={true}
                    showRawFiles={false}
                    maxItems={10}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Trial Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Trial Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">AI Transcription</p>
                      <p className="text-xs text-gray-600">
                        99%+ accuracy with fast processing
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Secure Processing</p>
                      <p className="text-xs text-gray-600">
                        Bank-level encryption and Canadian data residency
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <FileAudio className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Multiple Formats</p>
                      <p className="text-xs text-gray-600">
                        Supports MP3, WAV, M4A files up to 100MB
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Fast Delivery</p>
                      <p className="text-xs text-gray-600">
                        Results in 5-15 minutes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upgrade Prompt */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ready to Upgrade?</CardTitle>
                  <CardDescription>
                    Get unlimited transcriptions and premium features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Unlimited uploads</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Human verification available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Priority processing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>API access</span>
                    </div>
                  </div>
                  
                  <Button className="w-full gap-2" variant="navy" asChild>
                    <a href="/pricing">
                      <CreditCard className="h-4 w-4" />
                      View Pricing Plans
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* Support */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Need Help?</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium">Email Support</p>
                      <p className="text-gray-600">support@talktotextcanada.com</p>
                    </div>
                    <div>
                      <p className="font-medium">Live Chat</p>
                      <p className="text-gray-600">Available Mon-Fri 9AM-6PM EST</p>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href="/contact">Contact Support</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}