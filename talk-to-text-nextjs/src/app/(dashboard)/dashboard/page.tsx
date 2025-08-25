'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Clock, CreditCard, User, TrendingUp, Shield, Download, CheckCircle } from 'lucide-react';
import Header from '@/components/shared/header';
import Footer from '@/components/shared/footer';
import EnhancedFileUpload from '@/components/upload/EnhancedFileUpload';
import FileManager from '@/components/upload/FileManager';
import { Alert, AlertDescription } from '@/components/ui/alert';
import CreditBalance from '@/components/credits/CreditBalance';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { secureApiClient } from '@/lib/secure-api-client';
import { CreditBalanceResponse } from '@/types/credits';
import { creditsToCad } from '@/lib/stripe';

export default function DashboardPage() {
  const { user, userProfile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [creditBalance, setCreditBalance] = useState<CreditBalanceResponse | null>(null);

  // Load credit balance
  const loadCreditBalance = async () => {
    if (!user) return;
    
    try {
      const data = await secureApiClient.get('/api/credits/balance');
      setCreditBalance(data.balance);
    } catch (error) {
      console.error('Failed to load credit balance:', error);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      loadCreditBalance();
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-ttt-navy border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!user) {
    return null;
  }

  const isNewUser = !userProfile?.usage?.totalTranscribed || userProfile?.usage?.totalTranscribed === 0;
  const hasLowCredits = creditBalance && creditBalance.balance < 100;

  return (
    <>
      <Header />
      
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {userProfile?.firstName || user.displayName || 'User'}!
            </h1>
            <p className="mt-2 text-gray-600">
              Manage your transcription projects and account settings.
            </p>
          </div>

          {/* Welcome Banner for New Users */}
          {isNewUser && (
            <div className="mb-8 bg-gradient-to-r from-ttt-lavender-light to-ttt-lavender p-6 rounded-lg border border-ttt-lavender-dark">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-ttt-navy">Welcome to Talk to Text Canada!</h3>
                  <p className="text-sm text-gray-700 mt-1">
                    Get started by uploading your first audio file below. You'll need credits for transcription services.
                  </p>
                </div>
                <Button variant="navy" onClick={() => router.push('/credits')}>
                  Buy Credits
                </Button>
              </div>
            </div>
          )}

          {/* Low Credits Warning */}
          {hasLowCredits && !isNewUser && (
            <div className="mb-8 bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-orange-800">Low Credit Balance</h3>
                  <p className="text-sm text-orange-700 mt-1">
                    You have {creditBalance?.balance || 0} credits remaining (≈${creditsToCad(creditBalance?.balance || 0).toFixed(2)} CAD).
                    Purchase more credits to continue transcribing.
                  </p>
                </div>
                <Button variant="default" onClick={() => router.push('/credits')}>
                  Buy Credits
                </Button>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
                <CreditCard className="h-4 w-4 text-ttt-navy" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{creditBalance?.balance || 0}</div>
                <p className="text-xs text-muted-foreground">
                  ≈ ${creditsToCad(creditBalance?.balance || 0).toFixed(2)} CAD available
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Uploads</CardTitle>
                <Upload className="h-4 w-4 text-ttt-navy" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userProfile?.usage?.trialUploads || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Lifetime uploads
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Time Transcribed</CardTitle>
                <Clock className="h-4 w-4 text-ttt-navy" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userProfile?.usage?.totalTranscribed || 0} min</div>
                <p className="text-xs text-muted-foreground">
                  Total processed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credits Spent</CardTitle>
                <TrendingUp className="h-4 w-4 text-ttt-navy" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{creditBalance?.totalSpent || 0}</div>
                <p className="text-xs text-muted-foreground">
                  ≈ ${creditsToCad(creditBalance?.totalSpent || 0).toFixed(2)} CAD spent
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security</CardTitle>
                <Shield className="h-4 w-4 text-ttt-navy" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Secure</div>
                <p className="text-xs text-muted-foreground">
                  Canadian data residency
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Success Message */}
          {uploadSuccess && (
            <Alert className="mb-6">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Upload successful! Your file is being processed and will appear in your transcriptions list shortly.
              </AlertDescription>
            </Alert>
          )}

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Upload Section */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload New Audio
                  </CardTitle>
                  <CardDescription>
                    Upload your audio files and choose between AI, Human, or Hybrid transcription modes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EnhancedFileUpload
                    variant="default"
                    maxFiles={10}
                    disabled={hasLowCredits && (creditBalance?.balance || 0) === 0}
                    onUploadComplete={(fileId, downloadUrl) => {
                      setUploadSuccess(true);
                      // Refresh user profile and credit balance to update stats in real-time
                      refreshProfile();
                      loadCreditBalance();
                      setTimeout(() => setUploadSuccess(false), 5000);
                    }}
                    onUploadError={(error) => {
                      console.error('Upload error:', error);
                    }}
                  />
                </CardContent>
              </Card>

              {/* Recent Transcriptions */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Recent Transcriptions
                  </CardTitle>
                  <CardDescription>
                    Your latest transcription projects
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
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start gap-2" variant="outline" asChild>
                    <a href="/services">
                      <TrendingUp className="h-4 w-4" />
                      View Services
                    </a>
                  </Button>
                  <Button className="w-full justify-start gap-2" variant="outline" asChild>
                    <a href="/pricing">
                      <CreditCard className="h-4 w-4" />
                      Upgrade Plan
                    </a>
                  </Button>
                  <Button className="w-full justify-start gap-2" variant="outline" asChild>
                    <a href="/contact">
                      <User className="h-4 w-4" />
                      Contact Support
                    </a>
                  </Button>
                  {!(userProfile?.role === 'transcriber' || userProfile?.roles?.includes('transcriber')) && (
                    <Button className="w-full justify-start gap-2" variant="outline" asChild>
                      <a href="/transcriber/apply">
                        <User className="h-4 w-4" />
                        Become a Transcriber
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Account Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-gray-600">{user.email}</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">Member since</p>
                    <p className="text-gray-600">
                      {userProfile?.createdAt ? 
                        new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString() : 
                        'Recently'
                      }
                    </p>
                  </div>
                  <Button className="w-full justify-start gap-2" variant="outline" asChild>
                    <a href="/settings">
                      <User className="h-4 w-4" />
                      Edit Profile
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle>Platform Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>Bank-level encryption</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-green-600" />
                    <span>Multiple download formats</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span>Fast processing times</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span>99%+ accuracy rates</span>
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