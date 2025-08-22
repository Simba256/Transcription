import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { requireEmailVerification } from '@/lib/auth';

interface EmailVerificationGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  showLoading?: boolean;
}

export default function EmailVerificationGuard({ 
  children, 
  redirectTo = '/verify-email',
  showLoading = true 
}: EmailVerificationGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [verificationChecked, setVerificationChecked] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    const checkEmailVerification = async () => {
      if (!authLoading && user) {
        try {
          const needs = await requireEmailVerification();
          setNeedsVerification(needs);
          
          if (needs) {
            router.push(redirectTo);
          }
        } catch (error) {
          console.error('Error checking email verification:', error);
        } finally {
          setVerificationChecked(true);
        }
      } else if (!authLoading && !user) {
        // Not authenticated, redirect to login
        router.push('/login');
      } else if (!authLoading) {
        setVerificationChecked(true);
      }
    };

    checkEmailVerification();
  }, [user, authLoading, router, redirectTo]);

  // Show loading while checking authentication and verification
  if (authLoading || !verificationChecked) {
    if (!showLoading) return null;
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If user needs verification or isn't authenticated, don't render children
  if (!user || needsVerification) {
    return null;
  }

  // User is authenticated and email is verified
  return <>{children}</>;
}
