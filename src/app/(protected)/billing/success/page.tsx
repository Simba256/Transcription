"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get session ID from URL params
    const id = searchParams.get('session_id');
    setSessionId(id);

    if (!id) {
      setError('No session ID found');
      setIsVerifying(false);
      return;
    }

    // Wait a moment for webhook to process
    const timer = setTimeout(() => {
      setIsVerifying(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchParams]);

  if (isVerifying) {
    return (
      <>
        <Header />
        <main className="flex-grow flex items-center justify-center px-4 py-12">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-center">Processing Your Subscription</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">
                Please wait while we confirm your subscription...
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="flex-grow flex items-center justify-center px-4 py-12">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-center text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={() => router.push('/billing')}>
                Return to Billing
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">Subscription Activated!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Welcome to Your Plan</h3>
              <p className="text-muted-foreground">
                Your subscription has been successfully activated. You can now access all your plan features.
              </p>
            </div>
            <div className="pt-4 space-y-2">
              <Button onClick={() => router.push('/billing')} className="w-full">
                View Billing Details
              </Button>
              <Button
                onClick={() => router.push('/upload')}
                variant="outline"
                className="w-full"
              >
                Start Transcribing
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}
