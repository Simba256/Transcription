'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  User, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  Mail,
  Phone,
  Languages,
  Award,
  Star,
  FileText
} from 'lucide-react';
import Header from '@/components/shared/header';

interface TranscriberApplication {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  experience: string;
  languages: string[];
  specializations: string[];
  portfolioUrl?: string;
  availableHours: number;
  timezone: string;
  whyJoin: string;
  previousWork: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  reviewNotes?: string;
}

export default function AdminTranscribersPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<TranscriberApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<TranscriberApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [loadingApps, setLoadingApps] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = userProfile?.role === 'admin' || 
                 userProfile?.roles?.includes('admin') ||
                 userProfile?.email === 'admin@example.com'; // Temporary admin check

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && !isAdmin) {
      router.push('/dashboard');
    } else if (user && isAdmin) {
      loadApplications();
    }
  }, [user, loading, isAdmin, router]);

  const loadApplications = async () => {
    setLoadingApps(true);
    try {
      // In a real implementation, this would call your API
      // For now, we'll use mock data
      const mockApplications: TranscriberApplication[] = [
        {
          id: 'app1',
          userId: 'user1',
          fullName: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          phone: '+1 (555) 123-4567',
          experience: '3-5',
          languages: ['English', 'Spanish'],
          specializations: ['Medical', 'Legal'],
          availableHours: 25,
          timezone: 'EST',
          whyJoin: 'I have been working as a freelance transcriber for over 4 years and am looking for steady work with a reputable company. I specialize in medical and legal transcription and have excellent attention to detail.',
          previousWork: 'I have worked with several transcription companies including Rev.com and GoTranscript. I have transcribed over 500 hours of medical interviews, legal depositions, and academic lectures. My accuracy rate is consistently above 98%.',
          status: 'pending',
          submittedAt: { seconds: Date.now() / 1000 - 86400 } // 1 day ago
        },
        {
          id: 'app2', 
          userId: 'user2',
          fullName: 'Michael Chen',
          email: 'michael.chen@email.com',
          phone: '+1 (555) 987-6543',
          experience: '1-3',
          languages: ['English', 'Mandarin'],
          specializations: ['Business', 'Academic'],
          availableHours: 40,
          timezone: 'PST',
          whyJoin: 'I am a native English speaker with fluency in Mandarin Chinese. I recently completed my degree in linguistics and want to apply my skills in a professional transcription role.',
          previousWork: 'During university, I worked part-time transcribing lectures for students with disabilities. I also completed an internship with a market research company where I transcribed focus group sessions.',
          status: 'pending',
          submittedAt: { seconds: Date.now() / 1000 - 172800 } // 2 days ago
        }
      ];

      setApplications(mockApplications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoadingApps(false);
    }
  };

  const handleReviewApplication = async (applicationId: string, decision: 'approved' | 'rejected') => {
    if (!selectedApp) return;

    setProcessing(true);
    try {
      // In a real implementation, this would call your API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update the application status
      setApplications(prev => prev.map(app => 
        app.id === applicationId 
          ? { 
              ...app, 
              status: decision,
              reviewedAt: { seconds: Date.now() / 1000 },
              reviewedBy: user?.uid,
              reviewNotes
            }
          : app
      ));

      // TODO: 
      // 1. Call API to update application status
      // 2. If approved, create transcriber profile and assign role
      // 3. Send notification email to applicant
      // 4. Update user profile with transcriber role

      setSelectedApp(null);
      setReviewNotes('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to review application');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  };

  if (loading || loadingApps) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading transcriber management...</p>
          </div>
        </main>
      </>
    );
  }

  if (!user || !isAdmin) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You do not have permission to access this page.
            </AlertDescription>
          </Alert>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Transcriber Management</h1>
              <p className="mt-2 text-gray-600">Review and manage transcriber applications</p>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              <Users className="h-4 w-4 mr-2" />
              {applications.filter(app => app.status === 'pending').length} Pending
            </Badge>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Applications List */}
            <Card>
              <CardHeader>
                <CardTitle>Applications</CardTitle>
                <CardDescription>
                  {applications.length} total applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div 
                      key={app.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedApp?.id === app.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedApp(app)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{app.fullName}</h4>
                          <p className="text-sm text-gray-600">{app.email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {getStatusBadge(app.status)}
                            <span className="text-xs text-gray-500">
                              {formatDate(app.submittedAt)}
                            </span>
                          </div>
                        </div>
                        <Eye className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  ))}

                  {applications.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No applications found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Application Details */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedApp ? 'Application Details' : 'Select an Application'}
                </CardTitle>
                {selectedApp && (
                  <CardDescription>
                    Review {selectedApp.fullName}'s application
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {selectedApp ? (
                  <div className="space-y-6">
                    {/* Personal Info */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Personal Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span>{selectedApp.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span>{selectedApp.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>{selectedApp.timezone} - {selectedApp.availableHours} hrs/week</span>
                        </div>
                      </div>
                    </div>

                    {/* Experience */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Experience & Skills
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Experience:</strong> {selectedApp.experience} years</p>
                        <div>
                          <strong>Languages:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedApp.languages.map(lang => (
                              <Badge key={lang} variant="outline" className="text-xs">
                                {lang}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <strong>Specializations:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedApp.specializations.map(spec => (
                              <Badge key={spec} variant="secondary" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {selectedApp.portfolioUrl && (
                          <p>
                            <strong>Portfolio:</strong> 
                            <a href={selectedApp.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                              View Portfolio
                            </a>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Motivation */}
                    <div>
                      <h4 className="font-medium mb-3">Why Join Us?</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {selectedApp.whyJoin}
                      </p>
                    </div>

                    {/* Previous Work */}
                    <div>
                      <h4 className="font-medium mb-3">Previous Work</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {selectedApp.previousWork}
                      </p>
                    </div>

                    {/* Review Section */}
                    {selectedApp.status === 'pending' && (
                      <div>
                        <h4 className="font-medium mb-3">Review & Decision</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-2">Review Notes</label>
                            <Textarea
                              placeholder="Add notes about your review decision..."
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleReviewApplication(selectedApp.id, 'approved')}
                              disabled={processing}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              {processing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReviewApplication(selectedApp.id, 'rejected')}
                              disabled={processing}
                              variant="destructive"
                              className="flex-1"
                            >
                              {processing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-2" />
                              )}
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Review Status */}
                    {selectedApp.status !== 'pending' && (
                      <div>
                        <h4 className="font-medium mb-3">Review Status</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(selectedApp.status)}
                            <span className="text-gray-500">
                              {formatDate(selectedApp.reviewedAt)}
                            </span>
                          </div>
                          {selectedApp.reviewNotes && (
                            <p className="bg-gray-50 p-3 rounded">
                              <strong>Review Notes:</strong> {selectedApp.reviewNotes}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Select an application from the list to review details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}