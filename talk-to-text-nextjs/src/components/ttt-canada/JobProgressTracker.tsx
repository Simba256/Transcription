'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Download,
  Eye,
  User
} from 'lucide-react';

interface JobProgressTrackerProps {
  jobId: string;
  serviceType: string;
  onJobComplete?: (result: any) => void;
  pollInterval?: number; // milliseconds
}

export default function JobProgressTracker({ 
  jobId, 
  serviceType, 
  onJobComplete,
  pollInterval = 10000 // 10 seconds default
}: JobProgressTrackerProps) {
  const { user } = useAuth();
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (!isPolling || !jobId || !user) return;

    const pollJobStatus = async () => {
      try {
        // Get Firebase ID token for authentication
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        const token = await user.getIdToken();
        
        const response = await fetch(`/api/ttt-canada/status?jobId=${jobId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to check job status');
        }

        setJobStatus(data);
        setLastUpdate(new Date());
        setError(null);

        // Stop polling if job is completed or failed
        if (['completed', 'failed'].includes(data.status)) {
          setIsPolling(false);
          if (data.status === 'completed' && onJobComplete) {
            onJobComplete(data);
          }
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Job status polling error:', err);
      }
    };

    // Poll immediately, then set interval
    pollJobStatus();
    const interval = setInterval(pollJobStatus, pollInterval);

    return () => clearInterval(interval);
  }, [jobId, isPolling, pollInterval, onJobComplete, user]);

  const handleManualRefresh = () => {
    setIsPolling(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
      case 'ai_processing':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />;
      case 'pending_human_review':
        return <User className="h-4 w-4 text-yellow-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
      case 'ai_processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending_human_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatServiceType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (error && !jobStatus) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          <div className="flex items-center justify-between">
            <span>Error checking job status: {error}</span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleManualRefresh}
              className="ml-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-l-4 border-l-blue-600">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">
                {formatServiceType(serviceType)}
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">Job ID: {jobId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {jobStatus && (
              <Badge className={getStatusColor(jobStatus.status)}>
                <span className="flex items-center gap-1">
                  {getStatusIcon(jobStatus.status)}
                  {jobStatus.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </Badge>
            )}
            {isPolling && (
              <RefreshCw className="h-3 w-3 text-gray-400 animate-spin" />
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {jobStatus && (
          <>
            {/* Progress Bar */}
            {jobStatus.progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Progress</span>
                  <span className="font-medium">{jobStatus.progress}%</span>
                </div>
                <Progress value={jobStatus.progress} className="w-full" />
              </div>
            )}

            {/* Status Message */}
            {jobStatus.message && (
              <p className="text-sm text-gray-700 dark:text-gray-300">{jobStatus.message}</p>
            )}

            {/* AI Draft Available */}
            {jobStatus.status === 'pending_human_review' && jobStatus.result?.aiDraft && (
              <Alert className="border-blue-200 bg-blue-50">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      🤖 AI Draft Ready!
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Your AI-generated transcript is available while we queue it for human review.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                        <Eye className="h-3 w-3 mr-1" />
                        Preview AI Draft
                      </Button>
                      <Button size="sm" variant="outline" className="text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                        <Download className="h-3 w-3 mr-1" />
                        Download AI Draft
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Estimated Times */}
            {(jobStatus.estimatedHumanReviewTime || jobStatus.estimatedCompletionTime) && (
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {jobStatus.estimatedHumanReviewTime && (
                  <p>👤 Estimated human review time: {jobStatus.estimatedHumanReviewTime}</p>
                )}
                {jobStatus.estimatedCompletionTime && (
                  <p>⏱️ Estimated completion: {jobStatus.estimatedCompletionTime}</p>
                )}
              </div>
            )}

            {/* Final Result */}
            {jobStatus.status === 'completed' && jobStatus.result && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium text-green-900 dark:text-green-100">
                      ✅ Transcription Complete!
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Your professionally reviewed transcript is ready for download.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        <Download className="h-3 w-3 mr-1" />
                        Download Final Transcript
                      </Button>
                      <Button size="sm" variant="outline" className="text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                        <Eye className="h-3 w-3 mr-1" />
                        View Online
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Error State */}
            {jobStatus.status === 'failed' && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  <p className="font-medium">Processing Failed</p>
                  <p className="text-sm mt-1">{jobStatus.error || 'Unknown error occurred'}</p>
                </AlertDescription>
              </Alert>
            )}

            {/* Order Time */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {jobStatus?.createdAt 
                ? `Ordered: ${new Date(jobStatus.createdAt).toLocaleString()}`
                : `Last updated: ${lastUpdate.toLocaleTimeString()}`
              }
            </p>
          </>
        )}

        {!jobStatus && !error && (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-4 w-4 animate-spin text-gray-400 mr-2" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Loading job status...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}