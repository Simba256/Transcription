'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { resetPassword } from '@/lib/auth';
import { validateEmail, EMAIL_VALIDATION_PRESETS } from '@/lib/email-validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, ArrowLeft, CheckCircle, Check, X } from 'lucide-react';
import Header from '@/components/shared/header';
import Footer from '@/components/shared/footer';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailValidation, setEmailValidation] = useState<{
    isValid: boolean;
    errors: string[];
  } | null>(null);

  // Real-time email validation
  useEffect(() => {
    if (email.trim()) {
      const validation = validateEmail(email, EMAIL_VALIDATION_PRESETS.PERMISSIVE);
      setEmailValidation(validation);
    } else {
      setEmailValidation(null);
    }
  }, [email]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (error: any) {
      setError(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Reset your password</h1>
            <p className="mt-2 text-gray-600">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Password Reset</CardTitle>
              <CardDescription className="text-center">
                We'll email you instructions to reset your password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Password reset email sent! Check your inbox and follow the instructions to reset your password.
                  </AlertDescription>
                </Alert>
              )}

              {!success && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full gap-x-2"
                    variant="navy"
                    disabled={loading}
                  >
                    <Mail className="h-4 w-4" />
                    {loading ? 'Sending...' : 'Send reset email'}
                  </Button>
                </form>
              )}

              <div className="text-center">
                <Link 
                  href="/login" 
                  className="inline-flex items-center gap-2 text-sm text-ttt-navy hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>

              <div className="text-center text-sm">
                <span className="text-gray-600">Don't have an account? </span>
                <Link 
                  href="/register" 
                  className="text-ttt-navy hover:underline font-medium"
                >
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </>
  );
}