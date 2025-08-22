'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  PlayCircle,
  PauseCircle,
  CheckCircle, 
  FileAudio,
  User,
  Download,
  Upload,
  AlertTriangle,
  Star,
  MessageSquare,
  Timer,
  Award,
  TrendingUp
} from 'lucide-react';
import { ExtendedTranscriptionJobData, HumanTranscriberAssignment } from '@/types/transcription-modes';
import { secureApiClient } from '@/lib/secure-api-client';

interface TranscriberDashboardProps {
  transcriberId: string;
  isActive?: boolean;
}

interface TranscriberStats {
  totalJobs: number;
  completedJobs: number;
  averageRating: number;
  averageCompletionTime: number;
  earnings: number;
  activeJobs: number;
}

export default function TranscriberDashboard({ 
  transcriberId, 
  isActive = true 
}: TranscriberDashboardProps) {
  const [assignments, setAssignments] = useState<ExtendedTranscriptionJobData[]>([]);
  const [stats, setStats] = useState<TranscriberStats>({
    totalJobs: 0,
    completedJobs: 0,
    averageRating: 0,
    averageCompletionTime: 0,
    earnings: 0,
    activeJobs: 0
  });
  const [selectedJob, setSelectedJob] = useState<ExtendedTranscriptionJobData | null>(null);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load real assignment data from API
  useEffect(() => {
    loadAssignments();
    loadStats();
  }, [transcriberId]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const response = await secureApiClient.get(`/api/transcriber/assignments`);
      if (response.success) {
        setAssignments(response.assignments || []);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load assignments:', err);
      setError('Failed to load assignments');
      // Fallback to empty array
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await secureApiClient.get(`/api/transcriber/stats`);
      if (response.success) {
        setStats(response.stats || {
          totalJobs: 0,
          completedJobs: 0,
          averageRating: 5.0,
          averageCompletionTime: 45,
          earnings: 0,
          activeJobs: 0
        });
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
      // Keep default stats from state initialization
    }
  };

  const handleAcceptJob = (job: ExtendedTranscriptionJobData) => {
    setSelectedJob(job);
    if (job.aiTranscript && job.mode === 'hybrid') {
      setTranscriptionText(job.aiTranscript);
    } else {
      setTranscriptionText('');
    }
    setNotes('');
  };

  const handleRejectJob = async (jobId: string) => {
    setLoading(true);
    try {
      // API call to reject job
      setAssignments(prev => prev.filter(job => job.id !== jobId));
      setError(null);
    } catch (err) {
      setError('Failed to reject job');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTranscription = async () => {
    if (!selectedJob || !transcriptionText.trim()) return;

    setLoading(true);
    try {
      // API call to submit transcription
      setAssignments(prev => prev.map(job => 
        job.id === selectedJob.id 
          ? { ...job, status: 'completed', humanTranscript: transcriptionText, humanNotes: notes }
          : job
      ));
      setSelectedJob(null);
      setTranscriptionText('');
      setNotes('');
      setError(null);
    } catch (err) {
      setError('Failed to submit transcription');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  if (!isActive) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Your transcriber account is currently inactive. Please contact support to reactivate.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transcriber Dashboard</h1>
          <p className="text-gray-600">Manage your assigned transcription jobs</p>
        </div>
        <Badge variant="default" className="px-3 py-1">
          <User className="h-4 w-4 mr-2" />
          Active Transcriber
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Jobs</p>
                <p className="text-2xl font-bold">{stats.activeJobs}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{stats.completedJobs}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rating</p>
                <p className="text-2xl font-bold flex items-center">
                  {stats.averageRating}
                  <Star className="h-5 w-5 text-yellow-500 ml-1" />
                </p>
              </div>
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Time</p>
                <p className="text-2xl font-bold">{stats.averageCompletionTime}m</p>
              </div>
              <Timer className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Earnings</p>
                <p className="text-2xl font-bold">${stats.earnings}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="h-5 w-5" />
              Available Jobs ({assignments.length})
            </CardTitle>
            <CardDescription>
              Jobs assigned to you for transcription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignments.map((job) => (
                <Card key={job.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{job.fileName}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>Duration: {formatDuration(job.duration || 0)}</span>
                          <span>Size: {formatFileSize(job.fileSize)}</span>
                          <Badge variant={getPriorityColor(job.priority)}>{job.priority}</Badge>
                          <Badge variant="outline">{job.mode}</Badge>
                        </div>
                        
                        {job.mode === 'hybrid' && job.aiTranscript && (
                          <div className="mt-2">
                            <Badge variant="secondary" className="text-xs">
                              AI Preview Available
                            </Badge>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 mt-3">
                          <Button 
                            size="sm" 
                            onClick={() => handleAcceptJob(job)}
                            disabled={loading}
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Start Work
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleRejectJob(job.id!)}
                            disabled={loading}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {assignments.length === 0 && (
                <div className="text-center py-8">
                  <FileAudio className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No jobs currently assigned</p>
                  <p className="text-sm text-gray-500">New jobs will appear here when available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transcription Workspace */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Transcription Workspace
            </CardTitle>
            <CardDescription>
              {selectedJob ? `Working on: ${selectedJob.fileName}` : 'Select a job to start transcribing'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedJob ? (
              <div className="space-y-4">
                {/* Audio Controls */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <Button size="sm" variant="outline">
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Play
                  </Button>
                  <Button size="sm" variant="outline">
                    <PauseCircle className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                  <div className="flex-1">
                    <Progress value={0} className="h-2" />
                  </div>
                  <span className="text-sm text-gray-600">00:00 / {formatDuration(selectedJob.duration || 0)}</span>
                </div>

                {/* AI Transcript Preview (for hybrid mode) */}
                {selectedJob.mode === 'hybrid' && selectedJob.aiTranscript && (
                  <div>
                    <h4 className="font-medium mb-2">AI Transcript Preview</h4>
                    <div className="p-3 bg-blue-50 rounded border text-sm">
                      {selectedJob.aiTranscript.substring(0, 200)}...
                      <Badge variant="secondary" className="ml-2">AI Generated</Badge>
                    </div>
                  </div>
                )}

                {/* Transcription Input */}
                <div>
                  <h4 className="font-medium mb-2">
                    {selectedJob.mode === 'hybrid' ? 'Review & Correct Transcript' : 'Transcription'}
                  </h4>
                  <Textarea
                    placeholder={
                      selectedJob.mode === 'hybrid' 
                        ? 'Review the AI transcript above and make corrections here...' 
                        : 'Type your transcription here...'
                    }
                    value={transcriptionText}
                    onChange={(e) => setTranscriptionText(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>

                {/* Notes */}
                <div>
                  <h4 className="font-medium mb-2">Notes (Optional)</h4>
                  <Textarea
                    placeholder="Any notes about audio quality, unclear sections, or special requirements..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Submit */}
                <div className="flex gap-3">
                  <Button 
                    onClick={handleSubmitTranscription}
                    disabled={!transcriptionText.trim() || loading}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Submit Transcription
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedJob(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Select a job from the list to start transcribing</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}