'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  FileText, 
  Languages, 
  Award, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Star
} from 'lucide-react';
import Header from '@/components/shared/header';
import Footer from '@/components/shared/footer';

interface TranscriberApplication {
  fullName: string;
  email: string;
  phone: string;
  experience: string;
  languages: string[];
  specializations: string[];
  portfolioUrl?: string;
  certifications: string[];
  availableHours: number;
  timezone: string;
  whyJoin: string;
  previousWork: string;
}

export default function TranscriberApplyPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [application, setApplication] = useState<TranscriberApplication>({
    fullName: '',
    email: user?.email || '',
    phone: '',
    experience: '',
    languages: [],
    specializations: [],
    portfolioUrl: '',
    certifications: [],
    availableHours: 20,
    timezone: '',
    whyJoin: '',
    previousWork: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user already applied or is already a transcriber
  const isAlreadyTranscriber = userProfile?.role === 'transcriber' || 
                              userProfile?.roles?.includes('transcriber');
  const hasApplied = userProfile?.transcriberApplication?.status;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/transcriber/apply');
    }
    if (user?.email) {
      setApplication(prev => ({ ...prev, email: user.email! }));
    }
  }, [user, loading, router]);

  const handleInputChange = (field: keyof TranscriberApplication, value: string | string[] | number) => {
    setApplication(prev => ({ ...prev, [field]: value }));
  };

  const addLanguage = (language: string) => {
    if (language && !application.languages.includes(language)) {
      setApplication(prev => ({ 
        ...prev, 
        languages: [...prev.languages, language] 
      }));
    }
  };

  const removeLanguage = (language: string) => {
    setApplication(prev => ({ 
      ...prev, 
      languages: prev.languages.filter(l => l !== language) 
    }));
  };

  const addSpecialization = (specialization: string) => {
    if (specialization && !application.specializations.includes(specialization)) {
      setApplication(prev => ({ 
        ...prev, 
        specializations: [...prev.specializations, specialization] 
      }));
    }
  };

  const removeSpecialization = (specialization: string) => {
    setApplication(prev => ({ 
      ...prev, 
      specializations: prev.specializations.filter(s => s !== specialization) 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError(null);

    try {
      // In a real implementation, you would submit to your API
      // For now, we'll simulate the submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // TODO: Implement actual API call to submit application
      console.log('Transcriber application submitted:', {
        userId: user.uid,
        ...application,
        submittedAt: new Date().toISOString()
      });

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You must be logged in to apply as a transcriber.
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
      </>
    );
  }

  if (isAlreadyTranscriber) {
    return (
      <>
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Alert className="mb-6">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                You're already an approved transcriber! Access your dashboard below.
              </AlertDescription>
            </Alert>
            <div className="text-center">
              <Button onClick={() => router.push('/transcriber')} size="lg">
                Go to Transcriber Dashboard
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (hasApplied) {
    return (
      <>
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  Application Under Review
                </CardTitle>
                <CardDescription>
                  Your transcriber application has been submitted and is being reviewed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-900">What happens next?</h4>
                    <ul className="mt-2 text-sm text-yellow-800 space-y-1">
                      <li>• Our team will review your application (typically 2-3 business days)</li>
                      <li>• We may contact you for additional information or an interview</li>
                      <li>• You'll receive an email with the decision</li>
                      <li>• If approved, you'll get access to the transcriber dashboard</li>
                    </ul>
                  </div>
                  <div className="text-center">
                    <Button variant="outline" onClick={() => router.push('/dashboard')}>
                      Return to Dashboard
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Application Submitted Successfully!
                </CardTitle>
                <CardDescription>
                  Thank you for your interest in becoming a transcriber.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your application has been submitted and will be reviewed within 2-3 business days.
                      We'll contact you at {application.email} with updates.
                    </AlertDescription>
                  </Alert>
                  <div className="text-center">
                    <Button onClick={() => router.push('/dashboard')}>
                      Return to Dashboard
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Become a Transcriber</h1>
            <p className="mt-2 text-gray-600">
              Join our team of professional transcribers and help deliver high-quality transcriptions.
            </p>
          </div>

          {/* Requirements */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                What We're Looking For
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Excellent English typing skills (60+ WPM)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Strong attention to detail</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Experience with audio transcription</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Reliable internet connection</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Available 15+ hours per week</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Professional communication skills</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Application Form */}
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Application Form
                </CardTitle>
                <CardDescription>
                  Please provide detailed information about your qualifications and experience.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Personal Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        required
                        value={application.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        placeholder="Your full legal name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        required
                        value={application.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={application.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">This is your account email and cannot be changed.</p>
                  </div>
                </div>

                {/* Experience */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Experience & Qualifications
                  </h3>
                  
                  <div>
                    <Label htmlFor="experience">Years of Transcription Experience *</Label>
                    <Select value={application.experience} onValueChange={(value) => handleInputChange('experience', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-1">0-1 years (Beginner)</SelectItem>
                        <SelectItem value="1-3">1-3 years (Intermediate)</SelectItem>
                        <SelectItem value="3-5">3-5 years (Experienced)</SelectItem>
                        <SelectItem value="5+">5+ years (Expert)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Languages You Can Transcribe *</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Enter a language (e.g., English, Spanish)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addLanguage((e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {application.languages.map((lang) => (
                        <Badge key={lang} variant="secondary" className="cursor-pointer" onClick={() => removeLanguage(lang)}>
                          {lang} ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Areas of Specialization</Label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Enter specialization (e.g., Medical, Legal, Academic)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSpecialization((e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {application.specializations.map((spec) => (
                        <Badge key={spec} variant="outline" className="cursor-pointer" onClick={() => removeSpecialization(spec)}>
                          {spec} ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="previousWork">Previous Transcription Work *</Label>
                    <Textarea
                      id="previousWork"
                      required
                      value={application.previousWork}
                      onChange={(e) => handleInputChange('previousWork', e.target.value)}
                      placeholder="Describe your previous transcription experience, including types of content you've worked with..."
                      rows={4}
                    />
                  </div>
                </div>

                {/* Availability */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Availability
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="availableHours">Available Hours per Week</Label>
                      <Select value={application.availableHours.toString()} onValueChange={(value) => handleInputChange('availableHours', parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 hours (Part-time)</SelectItem>
                          <SelectItem value="25">25 hours (Regular)</SelectItem>
                          <SelectItem value="40">40 hours (Full-time)</SelectItem>
                          <SelectItem value="50">50+ hours (High Volume)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select value={application.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EST">Eastern Time (EST)</SelectItem>
                          <SelectItem value="CST">Central Time (CST)</SelectItem>
                          <SelectItem value="MST">Mountain Time (MST)</SelectItem>
                          <SelectItem value="PST">Pacific Time (PST)</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="font-medium">Additional Information</h3>
                  
                  <div>
                    <Label htmlFor="whyJoin">Why do you want to join our transcription team? *</Label>
                    <Textarea
                      id="whyJoin"
                      required
                      value={application.whyJoin}
                      onChange={(e) => handleInputChange('whyJoin', e.target.value)}
                      placeholder="Tell us what motivates you to work as a transcriber with us..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="portfolioUrl">Portfolio/Sample Work URL</Label>
                    <Input
                      id="portfolioUrl"
                      type="url"
                      value={application.portfolioUrl}
                      onChange={(e) => handleInputChange('portfolioUrl', e.target.value)}
                      placeholder="https://example.com/my-portfolio"
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional: Link to samples of your transcription work</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    type="submit" 
                    disabled={submitting || !application.fullName || !application.phone || !application.experience}
                    className="flex-1"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting Application...
                      </>
                    ) : (
                      'Submit Application'
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}