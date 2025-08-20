'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Clock, CreditCard, User, TrendingUp, Shield, Download, CheckCircle } from 'lucide-react';
import Header from '@/components/shared/header';
import Footer from '@/components/shared/footer';
import FileUpload from '@/components/upload/FileUpload';
import FileManager from '@/components/upload/FileManager';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
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

  const isTrialUser = userProfile?.subscription?.plan === 'trial';
  const trialUploadsRemaining = 3 - (userProfile?.usage?.trialUploads || 0);
  const trialTimeRemaining = 180 - (userProfile?.usage?.trialTimeUsed || 0); // 3 hours = 180 minutes

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

          {/* Trial Status Banner */}
          {isTrialUser && (
            <div className="mb-8 bg-gradient-to-r from-ttt-lavender-light to-ttt-lavender p-6 rounded-lg border border-ttt-lavender-dark">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-ttt-navy">Trial Account</h3>
                  <p className="text-sm text-gray-700 mt-1">
                    {trialUploadsRemaining > 0 
                      ? `${trialUploadsRemaining} uploads and ${Math.max(0, trialTimeRemaining)} minutes remaining`
                      : 'Trial limits reached'
                    }
                  </p>
                </div>
                <Button variant="navy" asChild>
                  <a href="/pricing">Upgrade Now</a>
                </Button>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Uploads</CardTitle>
                <Upload className="h-4 w-4 text-ttt-navy" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userProfile?.usage?.trialUploads || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {isTrialUser ? `${trialUploadsRemaining} remaining` : 'Lifetime uploads'}
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
                  {isTrialUser ? `${Math.max(0, trialTimeRemaining)} min remaining` : 'Total processed'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Account Type</CardTitle>
                <User className="h-4 w-4 text-ttt-navy" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">
                  {userProfile?.subscription?.plan || 'Trial'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Status: {userProfile?.subscription?.status || 'Active'}
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
                    Upload your audio files for transcription processing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUpload
                    variant="default"
                    maxFiles={isTrialUser ? trialUploadsRemaining : 10}
                    disabled={isTrialUser && trialUploadsRemaining <= 0}
                    onUploadComplete={(fileId, downloadUrl) => {
                      setUploadSuccess(true);
                      setTimeout(() => setUploadSuccess(false), 5000);
                    }}
                    onUploadError={(error) => {
                      console.error('Upload error:', error);
                    }}
                    showPreview={true}
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