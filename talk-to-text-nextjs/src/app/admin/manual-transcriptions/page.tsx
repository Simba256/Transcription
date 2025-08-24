'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Clock, 
  User,
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  Play,
  Upload,
  Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SimplifiedTranscriptionJobData } from '@/types/transcription-modes';
import AudioPlayer from '@/components/admin/AudioPlayer';

interface AdminTranscriptionJob extends SimplifiedTranscriptionJobData {
  id: string;
}

export default function AdminManualTranscriptionsPage() {
  const { user, userProfile } = useAuth();
  const [jobs, setJobs] = useState<AdminTranscriptionJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<AdminTranscriptionJob | null>(null);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'queued' | 'in_progress' | 'completed'>('queued');

  // Check admin permissions
  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin') {
      window.location.href = '/dashboard';
    }
  }, [userProfile]);

  // Load queued jobs
  useEffect(() => {
    loadQueuedJobs();
  }, [filter]);

  const loadQueuedJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/manual-transcriptions');
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Error loading queued jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJobSelect = (job: AdminTranscriptionJob) => {
    setSelectedJob(job);
    setTranscriptionText('');
    setAdminNotes('');
    
    // If job has existing admin data, load it
    if (job.adminData?.adminTranscript) {
      setTranscriptionText(job.adminData.adminTranscript);
      setAdminNotes(job.adminData.adminNotes || '');
    }
  };

  // Mark job as in progress when admin starts typing
  const markJobInProgress = async (jobId: string) => {
    try {
      const response = await fetch('/api/admin/mark-in-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      });

      if (response.ok) {
        // Update the local job status
        setJobs(prevJobs => 
          prevJobs.map(j => 
            j.id === jobId ? { ...j, status: 'admin_review' } : j
          )
        );
        // Update selected job status if it's the current one
        setSelectedJob(prev => prev?.id === jobId ? { ...prev, status: 'admin_review' } : prev);
        console.log(`✅ Job ${jobId} marked as in progress`);
      }
    } catch (error) {
      console.error('Error marking job as in progress:', error);
    }
  };

  // Handle transcription text changes and mark as in progress if needed
  const handleTranscriptionChange = (value: string) => {
    setTranscriptionText(value);
    
    // If job is queued and admin starts typing (non-empty value), mark as in progress
    if (selectedJob && selectedJob.status === 'queued_for_admin' && value.trim() && !transcriptionText.trim()) {
      markJobInProgress(selectedJob.id);
    }
  };

  const handleSubmitTranscription = async () => {
    if (!selectedJob || !transcriptionText.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/complete-transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: selectedJob.id,
          transcription: transcriptionText.trim(),
          adminNotes: adminNotes.trim(),
          reviewedBy: userProfile?.firstName || user?.displayName || 'Admin'
        }),
      });

      if (response.ok) {
        // Refresh the job list
        await loadQueuedJobs();
        setSelectedJob(null);
        setTranscriptionText('');
        setAdminNotes('');
      } else {
        console.error('Failed to submit transcription');
      }
    } catch (error) {
      console.error('Error submitting transcription:', error);
    } finally {
      setIsSubmitting(false);
    }
  };


  const getStatusBadge = (status: string, priority: string) => {
    const statusConfig = {
      'queued_for_admin': { color: 'bg-orange-100 text-orange-800', text: 'Queued for Admin' },
      'admin_review': { color: 'bg-blue-100 text-blue-800', text: 'In Admin Review' },
      'processing': { color: 'bg-yellow-100 text-yellow-800', text: 'Processing' },
      'completed': { color: 'bg-green-100 text-green-800', text: 'Completed' }
    };

    const priorityConfig = {
      'urgent': { color: 'bg-red-100 text-red-800' },
      'high': { color: 'bg-orange-100 text-orange-800' },
      'normal': { color: 'bg-gray-100 text-gray-800' },
      'low': { color: 'bg-green-100 text-green-800' }
    };

    return (
      <div className="flex gap-2">
        <Badge className={statusConfig[status as keyof typeof statusConfig]?.color || 'bg-gray-100 text-gray-800'}>
          {statusConfig[status as keyof typeof statusConfig]?.text || status}
        </Badge>
        {priority && (
          <Badge variant="outline" className={priorityConfig[priority as keyof typeof priorityConfig]?.color || 'bg-gray-100 text-gray-800'}>
            {priority.toUpperCase()}
          </Badge>
        )}
      </div>
    );
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ttt-navy mx-auto mb-4"></div>
          <p>Loading admin queue...</p>
        </div>
      </div>
    );
  }

  const filteredJobs = jobs.filter(job => {
    if (filter === 'queued') return job.status === 'queued_for_admin';
    if (filter === 'in_progress') return job.status === 'admin_review';
    if (filter === 'completed') return job.status === 'completed' && job.adminData;
    return true; // 'all' shows everything
  });

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manual Transcription Queue</h1>
        <p className="text-gray-600">Manage jobs requiring admin manual transcription</p>
      </div>

      {/* Filter and Stats */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex gap-2">
          <Button 
            variant={filter === 'queued' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('queued')}
          >
            Queued ({jobs.filter(j => j.status === 'queued_for_admin').length})
          </Button>
          <Button 
            variant={filter === 'in_progress' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('in_progress')}
          >
            In Progress ({jobs.filter(j => j.status === 'admin_review').length})
          </Button>
          <Button 
            variant={filter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('completed')}
          >
            Completed ({jobs.filter(j => j.status === 'completed' && j.adminData).length})
          </Button>
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({jobs.length})
          </Button>
        </div>
        
        <Button onClick={loadQueuedJobs} variant="outline" size="sm">
          Refresh Queue
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Manual Transcription Queue ({filteredJobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredJobs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No jobs in queue</p>
                ) : (
                  filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedJob?.id === job.id 
                          ? 'border-ttt-navy bg-ttt-lavender-light' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleJobSelect(job)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm truncate">{job.fileName}</h4>
                        <span className="text-xs text-gray-500">{formatDuration(job.duration)}</span>
                      </div>
                      
                      {getStatusBadge(job.status, job.priority)}
                      
                      <div className="mt-2 text-xs text-gray-600">
                        <p>Mode: {job.mode?.toUpperCase()}</p>
                        <p>Created: {formatDate(job.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Job Details and Transcription */}
        <div className="lg:col-span-2">
          {selectedJob ? (
            <div className="space-y-6">
              {/* Job Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {selectedJob.fileName}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Duration</p>
                      <p className="text-gray-600">{formatDuration(selectedJob.duration)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Language</p>
                      <p className="text-gray-600">{selectedJob.language?.toUpperCase() || 'EN'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Mode</p>
                      <p className="text-gray-600">{selectedJob.mode?.toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Created</p>
                      <p className="text-gray-600">{formatDate(selectedJob.createdAt)}</p>
                    </div>
                    {selectedJob.tags && selectedJob.tags.length > 0 && (
                      <div className="col-span-2">
                        <p className="font-medium text-gray-700">Tags</p>
                        <div className="flex gap-2 mt-1">
                          {selectedJob.tags.map(tag => (
                            <Badge key={tag} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Audio Player */}
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-700 mb-3">Audio File</h4>
                    <AudioPlayer
                      audioUrl={selectedJob.fileUrl}
                      fileName={selectedJob.fileName}
                      title={`${selectedJob.fileName} (${formatDuration(selectedJob.duration)})`}
                      onError={(error) => console.error('Audio player error:', error)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Transcription Interface */}
              <Card>
                <CardHeader>
                  <CardTitle>Manual Transcription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transcription Text *
                    </label>
                    <Textarea
                      value={transcriptionText}
                      onChange={(e) => handleTranscriptionChange(e.target.value)}
                      placeholder={selectedJob?.status === 'completed' ? 'This transcription has been completed.' : "Enter the manual transcription here..."}
                      rows={12}
                      className="w-full"
                      disabled={selectedJob?.status === 'completed'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Notes (Optional)
                    </label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder={selectedJob?.status === 'completed' ? 'Admin notes for this completed transcription.' : "Add any notes about the transcription quality, challenges, etc..."}
                      rows={3}
                      className="w-full"
                      disabled={selectedJob?.status === 'completed'}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleSubmitTranscription}
                      disabled={!transcriptionText.trim() || isSubmitting || selectedJob?.status === 'completed'}
                      className="flex items-center gap-2"
                    >
                      {selectedJob?.status === 'completed' ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Already Completed
                        </>
                      ) : isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Complete Transcription
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedJob(null);
                        setTranscriptionText('');
                        setAdminNotes('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Job</h3>
                  <p className="text-gray-600">Choose a job from the queue to start manual transcription</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}