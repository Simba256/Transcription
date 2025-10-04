"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Download, CheckCircle, XCircle, Eye, Edit, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CreditDisplay } from '@/components/ui/CreditDisplay';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditContext';
import {
  getAllTranscriptionJobs,
  approveTranscriptionReview,
  rejectTranscriptionJob,
  submitHumanTranscription,
  TranscriptionJob
} from '@/lib/firebase/transcriptions';
import { formatDuration } from '@/lib/utils';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { AudioPlayer } from '@/components/ui/AudioPlayer';

export function TranscriptionQueue() {
  const { user, userData } = useAuth();
  const { refundCredits } = useCredits();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedJob, setSelectedJob] = useState<TranscriptionJob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [queueItems, setQueueItems] = useState<TranscriptionJob[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [userEmails, setUserEmails] = useState<{[key: string]: string}>({});
  const [storageTranscripts, setStorageTranscripts] = useState<{[key: string]: string}>({});
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const { toast } = useToast();

  // Load transcription jobs from Firebase
  const loadQueueItems = useCallback(async () => {
    if (!user || !userData || userData.role !== 'admin') return;
    
    setQueueLoading(true);
    try {
      const jobs = await getAllTranscriptionJobs();
      setQueueItems(jobs);
      
      // Fetch user emails for jobs that don't have them
      const db = getFirestore();
      const emailMap: {[key: string]: string} = {};
      
      for (const job of jobs) {
        if (job.userId && !emailMap[job.userId]) {
          try {
            const userRef = doc(db, 'users', job.userId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              emailMap[job.userId] = userDoc.data().email || 'Unknown';
            }
          } catch (error) {
            console.warn(`Could not fetch user data for ${job.userId}`);
            emailMap[job.userId] = 'Unknown';
          }
        }
      }
      
      setUserEmails(emailMap);
    } catch (error) {
      console.error('Error loading queue items:', error);
      toast({
        title: "Error loading queue",
        description: "Failed to load transcription queue. Please try again.",
        variant: "destructive",
      });
    } finally {
      setQueueLoading(false);
    }
  }, [user, userData, toast]);
  
  useEffect(() => {
    loadQueueItems();
  }, [loadQueueItems]);

  // Fetch transcript from Storage if needed
  const fetchTranscriptFromStorage = async (jobId: string) => {
    // Check if already fetched
    if (storageTranscripts[jobId]) {
      return storageTranscripts[jobId];
    }

    setLoadingTranscript(true);
    try {
      const response = await fetch(`/api/transcriptions/${jobId}/transcript`);
      if (!response.ok) {
        throw new Error('Failed to fetch transcript');
      }
      const data = await response.json();

      // Extract plain text from the response
      let transcriptText = '';
      if (typeof data.transcript === 'string') {
        transcriptText = data.transcript;
      } else if (data.timestampedTranscript && Array.isArray(data.timestampedTranscript)) {
        transcriptText = data.timestampedTranscript.map((seg: any) => seg.text).join(' ');
      }

      // Cache it
      setStorageTranscripts(prev => ({ ...prev, [jobId]: transcriptText }));
      return transcriptText;
    } catch (error) {
      console.error('Error fetching transcript from storage:', error);
      toast({
        title: "Error",
        description: "Failed to load transcript from storage.",
        variant: "destructive",
      });
      return '';
    } finally {
      setLoadingTranscript(false);
    }
  };

  // Get transcript text helper (handles all formats)
  const getTranscriptText = (job: TranscriptionJob): string => {
    // Check if transcript is in storage
    if (job.transcriptStoragePath && storageTranscripts[job.id || '']) {
      return storageTranscripts[job.id || ''];
    }

    // Check if transcript is a string
    if (typeof job.transcript === 'string') {
      return job.transcript;
    }

    // Fallback to timestamped transcript
    if (job.timestampedTranscript && Array.isArray(job.timestampedTranscript)) {
      return job.timestampedTranscript.map(seg => seg.text).join(' ');
    }

    return '';
  };

  const processJobWithSpeechmatics = async (jobId: string) => {
    try {
      const response = await fetch('/api/admin/process-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobId: jobId,
          language: 'en',
          operatingPoint: 'standard'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process job');
      }

      const result = await response.json();
      console.log('Speechmatics processing result:', result);
    } catch (error) {
      console.error('Error processing job with Speechmatics:', error);
      throw error;
    }
  };

  const handleAction = async (jobId: string, action: string, transcriptText?: string) => {
    setIsLoading(true);
    try {
      switch (action) {
        case 'approve-review':
          await approveTranscriptionReview(jobId);
          setSelectedJob(null); // Close modal after approval
          toast({
            title: "Review Approved",
            description: "Transcription has been approved and marked as complete.",
          });
          break;
        case 'reject':
          // Find the job to get credit amount and user ID for refund
          const jobToReject = queueItems.find(job => job.id === jobId);
          if (jobToReject && jobToReject.creditsUsed > 0) {
            // Process refund to the job owner
            await refundCredits(jobToReject.creditsUsed, jobId, jobToReject.userId);
          }
          
          await rejectTranscriptionJob(jobId, 'Rejected by admin');
          setSelectedJob(null); // Close modal after rejection
          toast({
            title: "Job Rejected",
            description: `Transcription job has been rejected${jobToReject?.creditsUsed ? ` and ${jobToReject.creditsUsed} credits have been refunded` : ''}.`,
          });
          break;
        case 'submit-transcription':
          if (transcriptText) {
            await submitHumanTranscription(jobId, transcriptText);
            setSelectedJob(null); // Close modal after submission
            toast({
              title: "Transcription Submitted",
              description: "Human transcription has been submitted successfully.",
            });
          }
          break;
        case 'process-with-speechmatics':
          await processJobWithSpeechmatics(jobId);
          toast({
            title: "Processing Started",
            description: "Job is now being processed with Speechmatics AI.",
          });
          break;
      }
      
      // Refresh the queue after action
      await loadQueueItems();
      setTranscript('');
    } catch (error) {
      console.error('Action error:', error);
      toast({
        title: "Error",
        description: "Failed to complete action. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = queueItems.filter(item => {
    const userEmail = userEmails[item.userId] || '';
    const filename = item.originalFilename || item.filename || '';
    const matchesSearch = filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    
    // Filter out completed jobs and AI-only jobs that don't need admin intervention
    // Only show jobs that need admin action:
    // - Human mode jobs (except completed/cancelled)
    // - Hybrid mode jobs that need review (pending-review, under-review)
    // - Failed AI/Hybrid jobs that might need retry
    const needsAdminAction = (item.mode === 'human' && !['complete', 'cancelled'].includes(item.status)) || 
                            (item.mode === 'hybrid' && ['pending-review', 'under-review'].includes(item.status)) ||
                            (item.mode === 'ai' && item.status === 'failed') ||
                            (item.mode === 'hybrid' && item.status === 'failed');
    
    return matchesSearch && matchesStatus && needsAdminAction;
  });

  // Calculate stats only for jobs that need admin action
  const adminActionItems = queueItems.filter(item => {
    return (item.mode === 'human' && !['complete', 'cancelled'].includes(item.status)) || 
           (item.mode === 'hybrid' && ['pending-review', 'under-review'].includes(item.status)) ||
           (item.mode === 'ai' && item.status === 'failed') ||
           (item.mode === 'hybrid' && item.status === 'failed');
  });

  const stats = {
    pendingReview: adminActionItems.filter(item => item.status === 'pending-review').length,
    pendingTranscription: adminActionItems.filter(item => item.status === 'pending-transcription').length,
    total: adminActionItems.length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#003366] mb-2">
                Transcription Queue
              </h1>
              <p className="text-gray-600">
                Monitor and manage active transcription jobs.
              </p>
            </div>
            <Button 
              onClick={loadQueueItems}
              disabled={queueLoading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${queueLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Queue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.pendingReview}</p>
              <p className="text-sm text-gray-500">Pending Review</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.pendingTranscription}</p>
              <p className="text-sm text-gray-500">Pending Transcription</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Queue</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by filename or user..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="pending-review">Pending Review</SelectItem>
                  <SelectItem value="pending-transcription">Pending Transcription</SelectItem>
                  <SelectItem value="under-review">Under Review</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Queue Items */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#003366]">
              Queue Items ({filteredItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queueLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
                <span className="ml-2 text-gray-600">Loading queue items...</span>
              </div>
            ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-[#003366]">{item.originalFilename || item.filename || 'Unknown file'}</h3>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{userEmails[item.userId] || 'Loading...'}</span>
                        <span>{item.mode}</span>
                        <span>{formatDuration(item.duration || 0)}</span>
                        <CreditDisplay amount={item.creditsUsed || 0} size="sm" />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {item.status === 'pending-review' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600"
                            onClick={async () => {
                              // Pre-fetch transcript if it's in storage
                              if (item.transcriptStoragePath && item.id) {
                                await fetchTranscriptFromStorage(item.id);
                              }
                              setSelectedJob(item);
                            }}
                            disabled={loadingTranscript}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {loadingTranscript ? 'Loading...' : 'Review'}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-green-600"
                            onClick={() => item.id && handleAction(item.id, 'approve-review')}
                            disabled={isLoading}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </>
                      )}
                      {item.status === 'pending-transcription' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-600"
                          onClick={() => {
                            setSelectedJob(item);
                            setTranscript('');
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Transcribe
                        </Button>
                      )}
                      {item.status === 'failed' && 
                       (item.mode === 'ai' || item.mode === 'hybrid') && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-purple-600"
                          onClick={() => item.id && handleAction(item.id, 'process-with-speechmatics')}
                          disabled={isLoading}
                          title="Retry with Speechmatics AI"
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          Retry AI
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600"
                        onClick={() => item.id && handleAction(item.id, 'reject')}
                        disabled={isLoading}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      {item.downloadURL && (
                        <Button variant="ghost" size="sm" className="text-gray-600">
                          <a href={item.downloadURL} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-1" />
                            Audio
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Show AI transcript for hybrid review */}
                  {item.status === 'pending-review' && (item.transcript || item.transcriptStoragePath) && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <h4 className="font-medium text-blue-900 mb-2">AI Transcript (for review):</h4>
                      <p className="text-sm text-blue-800 line-clamp-3">
                        {item.transcriptStoragePath && !storageTranscripts[item.id || '']
                          ? '[Transcript stored in cloud - click Review to load]'
                          : (getTranscriptText(item) || '[Click Review to view transcript]')}
                      </p>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Submitted: {item.createdAt ? item.createdAt.toDate().toISOString().slice(0, 19).replace('T', ' ') : 'Unknown'}</span>
                    <span>Status: {item.status || 'Unknown'}</span>
                  </div>
                </div>
              ))}

              {filteredItems.length === 0 && !queueLoading && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No items found matching your criteria.</p>
                </div>
              )}
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transcription Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-full sm:max-w-2xl w-full max-h-[95vh] sm:max-h-[85vh] overflow-y-auto my-4">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-[#003366]">
                  {selectedJob.status === 'pending-review' ? 'Review AI Transcript' : 'Create Transcript'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedJob(null);
                    setTranscript('');
                  }}
                  className="flex-shrink-0"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>

              <div className="mb-4 space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>File:</strong> <span className="break-words">{selectedJob.originalFilename || selectedJob.filename || 'Unknown file'}</span>
                </p>
                <p className="text-sm text-gray-600">
                  <strong>User:</strong> <span className="break-words">{userEmails[selectedJob.userId] || 'Loading...'}</span>
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Duration:</strong> {formatDuration(selectedJob.duration || 0)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Mode:</strong> {selectedJob.mode || 'Unknown'}
                </p>

                {selectedJob.downloadURL && (
                  <div className="mb-4 pt-2">
                    <AudioPlayer
                      src={selectedJob.downloadURL}
                      standalone={true}
                    />
                  </div>
                )}
              </div>

              {selectedJob.status === 'pending-review' && (selectedJob.transcript || selectedJob.transcriptStoragePath) && (
                <div className="mb-4">
                  <h4 className="font-medium text-[#003366] mb-2 text-sm sm:text-base">AI Transcript:</h4>
                  <div className="p-3 bg-gray-50 border rounded text-sm max-h-48 sm:max-h-64 overflow-y-auto">
                    {loadingTranscript ? (
                      <div className="flex items-center justify-center py-4">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2 text-gray-600">Loading transcript...</span>
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed">
                        {getTranscriptText(selectedJob) || 'Unable to load transcript'}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {selectedJob.status === 'pending-transcription' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Transcript:
                  </label>
                  <Textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Enter the transcription here..."
                    rows={6}
                    className="w-full min-h-[150px] sm:min-h-[200px]"
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedJob(null);
                    setTranscript('');
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                {selectedJob.status === 'pending-review' && (
                  <Button
                    onClick={() => selectedJob.id && handleAction(selectedJob.id, 'approve-review')}
                    disabled={isLoading}
                    className="bg-[#003366] hover:bg-[#004080] w-full sm:w-auto"
                  >
                    Approve Transcript
                  </Button>
                )}
                {selectedJob.status === 'pending-transcription' && (
                  <Button
                    onClick={() => selectedJob.id && handleAction(selectedJob.id, 'submit-transcription', transcript)}
                    disabled={isLoading || !transcript.trim()}
                    className="bg-[#003366] hover:bg-[#004080] w-full sm:w-auto"
                  >
                    Submit Transcript
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
// Default export for Next.js pages compatibility
export default TranscriptionQueue;
