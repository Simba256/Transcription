'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmail, signInWithGoogle, getUserProfile } from '@/lib/auth';
import { validateEmail, EMAIL_VALIDATION_PRESETS } from '@/lib/email-validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, Mail, Eye, EyeOff, Check, X } from 'lucide-react';
import Header from '@/components/shared/header';
import Footer from '@/components/shared/footer';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailValidation, setEmailValidation] = useState<{
    isValid: boolean;
    errors: string[];
  } | null>(null);
  const router = useRouter();

  // Real-time email validation for login
  useEffect(() => {
    if (email.trim()) {
      const validation = validateEmail(email, EMAIL_VALIDATION_PRESETS.PERMISSIVE);
      setEmailValidation(validation);
    } else {
      setEmailValidation(null);
    }
  }, [email]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await signInWithEmail(email, password);
      
      // Check user role and redirect appropriately
      const userProfile = await getUserProfile(user.uid);
      if (userProfile?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const user = await signInWithGoogle();
      
      // Check user role and redirect appropriately
      const userProfile = await getUserProfile(user.uid);
      if (userProfile?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to sign in with Google.');
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
            <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
            <p className="mt-2 text-gray-600">Sign in to your Talk to Text Canada account</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Sign In</CardTitle>
              <CardDescription className="text-center">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className={`pr-10 ${
                        emailValidation?.isValid === true 
                          ? 'border-green-500 focus:ring-green-500' 
                          : emailValidation?.isValid === false 
                          ? 'border-red-500 focus:ring-red-500' 
                          : ''
                      }`}
                      required
                    />
                    {email.trim() && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {emailValidation?.isValid ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gap-x-2"
                  variant="navy"
                  disabled={loading}
                >
                  <LogIn className="h-4 w-4" />
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-x-2"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <Mail className="h-4 w-4" />
                Sign in with Google
              </Button>

              <div className="text-center text-sm">
                <Link 
                  href="/forgot-password" 
                  className="text-ttt-navy hover:underline"
                >
                  Forgot your password?
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