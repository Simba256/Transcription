'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TranscriberDashboard from '@/components/transcriber/TranscriberDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function TranscriberPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/transcriber');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading transcriber dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You must be logged in to access the transcriber dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if user is authorized as a transcriber
  const isAuthorizedTranscriber = userProfile?.role === 'transcriber' || 
                                 userProfile?.roles?.includes('transcriber');

  if (!isAuthorizedTranscriber) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You are not authorized to access the transcriber dashboard. 
            Please contact support to become a transcriber.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TranscriberDashboard 
        transcriberId={user.uid}
        isActive={userProfile?.status === 'active' || true}
      />
    </div>
  );
}