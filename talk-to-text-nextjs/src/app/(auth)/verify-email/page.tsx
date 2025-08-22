'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import EmailVerification from '@/components/auth/EmailVerification';
import Header from '@/components/shared/header';
import Footer from '@/components/shared/footer';
import { requireEmailVerification } from '@/lib/auth';

export default function VerifyEmailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!loading && user) {
        const needsVerif = await requireEmailVerification();
        setNeedsVerification(needsVerif);
        
        // If already verified, redirect to dashboard
        if (!needsVerif) {
          router.push('/dashboard');
        }
      } else if (!loading && !user) {
        // Not logged in, redirect to login
        router.push('/login');
      }
    };

    checkVerificationStatus();
  }, [user, loading, router]);

  const handleVerificationComplete = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!user || !needsVerification) {
    return null; // Will redirect
  }

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <EmailVerification
          userEmail={user.email || ''}
          onVerificationComplete={handleVerificationComplete}
        />
      </main>
      <Footer />
    </>
  );
}
