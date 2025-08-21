'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { transcriptionService } from '@/lib/transcription';
import { TranscriptionJobData } from '@/lib/transcription-queue';
import TranscriptionStatus from './TranscriptionStatus';

interface TranscriptionListProps {
  status?: TranscriptionJobData['status'];
  limit?: number;
  compact?: boolean;
  showSearch?: boolean;
  showFilter?: boolean;
}

export default function TranscriptionList({ 
  status, 
  limit = 20,
  compact = false,
  showSearch = true,
  showFilter = true
}: TranscriptionListProps) {
  const { user } = useAuth();
  const [transcriptions, setTranscriptions] = useState<TranscriptionJobData[]>([]);
  const [filteredTranscriptions, setFilteredTranscriptions] = useState<TranscriptionJobData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TranscriptionJobData['status'] | 'all'>(status || 'all');
  const [refreshing, setRefreshing] = useState(false);

  // Load transcriptions
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsubscribe = transcriptionService.subscribeToTranscriptions(
      user.uid,
      (jobs) => {
        setTranscriptions(jobs);
        setLoading(false);
        setError(null);
      },
      status
    );

    return unsubscribe;
  }, [user, status]);

  // Filter transcriptions based on search and status
  useEffect(() => {
    let filtered = transcriptions;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.tags && job.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    // Apply limit
    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    setFilteredTranscriptions(filtered);
  }, [transcriptions, searchTerm, statusFilter, limit]);

  const handleRetry = async (jobId: string) => {
    if (!user) return;

    try {
      await transcriptionService.retryTranscription(user.uid, jobId);
      setError(null);
    } catch (error) {
      console.error('Error retrying transcription:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to retry transcription';
      
      // Check if it's a resubmission error
      if (errorMessage.includes('re-uploaded') || errorMessage.includes('re-upload')) {
        setError(`${errorMessage} You can delete this failed transcription and upload the file again.`);
      } else if (errorMessage.includes('Maximum retry attempts exceeded')) {
        // Try to reset and retry again
        try {
          await transcriptionService.resetTranscriptionRetries(user.uid, jobId);
          await transcriptionService.retryTranscription(user.uid, jobId);
          setError(null);
        } catch (resetError) {
          const resetErrorMessage = resetError instanceof Error ? resetError.message : 'Failed to retry transcription';
          if (resetErrorMessage.includes('re-uploaded') || resetErrorMessage.includes('re-upload')) {
            setError(`${resetErrorMessage} You can delete this failed transcription and upload the file again.`);
          } else {
            setError(resetErrorMessage);
          }
        }
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleRefreshStatus = async (jobId: string) => {
    if (!user) return;

    try {
      await transcriptionService.refreshTranscriptionStatus(user.uid, jobId);
      setError(null);
    } catch (error) {
      console.error('Error refreshing transcription status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh transcription status';
      
      // Provide helpful guidance for different error types
      if (errorMessage.includes('never submitted to Speechmatics')) {
        setError(`${errorMessage} This transcription needs to be re-uploaded.`);
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleForceRetrieve = async (jobId: string) => {
    if (!user) return;

    try {
      const transcript = await transcriptionService.forceRetrieveTranscript(user.uid, jobId);
      if (transcript) {
        setError(null);
        // Optionally show a success message
      } else {
        setError('No transcript could be retrieved for this job');
      }
    } catch (error) {
      console.error('Error force retrieving transcript:', error);
      setError(error instanceof Error ? error.message : 'Failed to retrieve transcript');
    }
  };

  const handleDiagnose = async (jobId: string) => {
    if (!user) return;

    try {
      const diagnosis = await transcriptionService.diagnoseStuckJob(user.uid, jobId);
      
      // Show diagnosis in a more user-friendly way
      let message = `Job Status: ${diagnosis.jobStatus}`;
      if (diagnosis.speechmaticsStatus) {
        message += `\nSpeechmatics Status: ${diagnosis.speechmaticsStatus}`;
      }
      if (diagnosis.lastChecked) {
        message += `\nLast Checked: ${diagnosis.lastChecked.toLocaleString()}`;
      }
      message += `\n\nRecommendation: ${diagnosis.recommendation}`;
      
      // For now, show in error field (you could create a dedicated diagnosis modal)
      setError(message);
    } catch (error) {
      console.error('Error diagnosing job:', error);
      setError(error instanceof Error ? error.message : 'Failed to diagnose job');
    }
  };

  const handleCancel = async (jobId: string) => {
    if (!user) return;

    try {
      await transcriptionService.cancelTranscription(user.uid, jobId);
    } catch (error) {
      console.error('Error canceling transcription:', error);
      setError(error instanceof Error ? error.message : 'Failed to cancel transcription');
    }
  };

  const handleDownload = async (jobId: string, format: 'txt' | 'json' | 'srt') => {
    if (!user) return;

    try {
      const content = await transcriptionService.downloadTranscription(user.uid, jobId, format);
      
      // Create download
      const blob = new Blob([content], { 
        type: format === 'json' ? 'application/json' : 'text/plain' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcription-${jobId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading transcription:', error);
      setError(error instanceof Error ? error.message : 'Failed to download transcription');
    }
  };

  const handleRefresh = async () => {
    if (!user) return;

    setRefreshing(true);
    try {
      const jobs = await transcriptionService.getUserTranscriptions(user.uid, status, limit);
      setTranscriptions(jobs);
      setError(null);
    } catch (error) {
      console.error('Error refreshing transcriptions:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh transcriptions');
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusCounts = () => {
    const counts = {
      all: transcriptions.length,
      pending: transcriptions.filter(j => j.status === 'pending').length,
      processing: transcriptions.filter(j => j.status === 'processing').length,
      completed: transcriptions.filter(j => j.status === 'completed').length,
      error: transcriptions.filter(j => j.status === 'error').length
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  if (!user) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please log in to view your transcriptions.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Loading transcriptions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      {(showSearch || showFilter) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Transcriptions
                </CardTitle>
                <CardDescription>
                  {filteredTranscriptions.length} of {transcriptions.length} transcriptions
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Search */}
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transcriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}

            {/* Status Filter */}
            {showFilter && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  All ({statusCounts.all})
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('pending')}
                  className="flex items-center gap-1"
                >
                  <Clock className="h-3 w-3" />
                  Pending ({statusCounts.pending})
                </Button>
                <Button
                  variant={statusFilter === 'processing' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('processing')}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Processing ({statusCounts.processing})
                </Button>
                <Button
                  variant={statusFilter === 'completed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('completed')}
                  className="flex items-center gap-1"
                >
                  <CheckCircle className="h-3 w-3" />
                  Completed ({statusCounts.completed})
                </Button>
                <Button
                  variant={statusFilter === 'error' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('error')}
                  className="flex items-center gap-1"
                >
                  <XCircle className="h-3 w-3" />
                  Error ({statusCounts.error})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Transcription List */}
      {filteredTranscriptions.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 mb-2">
                {transcriptions.length === 0 
                  ? 'No transcriptions found'
                  : 'No transcriptions match your search'
                }
              </p>
              {transcriptions.length === 0 && (
                <p className="text-sm text-gray-500">
                  Upload an audio file to get started with transcription.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTranscriptions.map((job) => (
            <TranscriptionStatus
              key={job.id}
              job={job}
              onRetry={handleRetry}
              onCancel={handleCancel}
              onDownload={handleDownload}
              onRefreshStatus={handleRefreshStatus}
              onForceRetrieve={handleForceRetrieve}
              onDiagnose={handleDiagnose}
              compact={compact}
            />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {!compact && transcriptions.length >= limit && (
        <Card>
          <CardContent className="text-center py-4">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Load More Transcriptions
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}