import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, RefreshCw, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { 
  checkEmailVerification, 
  resendVerificationEmail, 
  signOutUser 
} from '@/lib/auth';

interface EmailVerificationProps {
  userEmail: string;
  onVerificationComplete?: () => void;
}

export default function EmailVerification({ 
  userEmail, 
  onVerificationComplete
}: EmailVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [timeUntilResend, setTimeUntilResend] = useState(0);
  const router = useRouter();

  // Check verification status periodically
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      try {
        const verified = await checkEmailVerification();
        if (verified) {
          setIsVerified(true);
          setSuccess('Email verified successfully!');
          if (onVerificationComplete) {
            onVerificationComplete();
          }
          clearInterval(checkInterval);
        }
      } catch (error) {
        // Silently handle errors in background checking
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(checkInterval);
  }, [onVerificationComplete]);

  // Countdown timer for resend button
  useEffect(() => {
    if (timeUntilResend > 0) {
      const timer = setTimeout(() => {
        setTimeUntilResend(timeUntilResend - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeUntilResend]);

  const handleCheckVerification = async () => {
    setLoading(true);
    setError('');

    try {
      const verified = await checkEmailVerification();
      if (verified) {
        setIsVerified(true);
        setSuccess('Email verified successfully!');
        if (onVerificationComplete) {
          onVerificationComplete();
        }
      } else {
        setError('Email not yet verified. Please check your inbox and click the verification link.');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to check verification status');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    setError('');
    setSuccess('');

    try {
      await resendVerificationEmail();
      setSuccess('Verification email sent! Please check your inbox.');
      setTimeUntilResend(60); // 60 second cooldown
    } catch (error: any) {
      setError(error.message || 'Failed to resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      router.push('/login');
    } catch (error) {
      setError('Failed to sign out');
    }
  };

  if (isVerified) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-green-800">Email Verified!</CardTitle>
          <CardDescription>
            Your email address has been successfully verified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => router.push('/dashboard')} 
            className="w-full"
            variant="default"
          >
            Continue to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Mail className="w-6 h-6 text-blue-600" />
        </div>
        <CardTitle>Verify Your Email</CardTitle>
        <CardDescription>
          We've sent a verification link to <strong>{userEmail}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="text-sm text-gray-600 space-y-2">
            <p>📧 Check your email inbox (and spam folder)</p>
            <p>🔗 Click the verification link in the email</p>
            <p>✅ Return here and click "Check Verification"</p>
          </div>

          <Button
            onClick={handleCheckVerification}
            disabled={loading}
            className="w-full"
            variant="default"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Checking...' : 'Check Verification'}
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={handleResendEmail}
              disabled={resendLoading || timeUntilResend > 0}
              variant="outline"
              className="flex-1"
            >
              {resendLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : timeUntilResend > 0 ? (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Resend ({timeUntilResend}s)
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Email
                </>
              )}
            </Button>

            <Button
              onClick={handleSignOut}
              variant="outline"
              className="flex-1"
            >
              Sign Out
            </Button>
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center">
          <p>Didn't receive the email?</p>
          <p>• Check your spam/junk folder</p>
          <p>• Make sure {userEmail} is correct</p>
          <p>• Try resending the email</p>
        </div>
      </CardContent>
    </Card>
  );
}
