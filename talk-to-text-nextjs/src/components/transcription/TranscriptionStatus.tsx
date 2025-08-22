'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Download,
  AlertTriangle,
  PlayCircle,
  PauseCircle,
  Zap
} from 'lucide-react';
import { TranscriptionJobData } from '@/lib/transcription-queue';

interface TranscriptionStatusProps {
  job: TranscriptionJobData;
  onRetry?: (jobId: string) => void;
  onCancel?: (jobId: string) => void;
  onDownload?: (jobId: string, format: 'txt' | 'json' | 'srt' | 'pdf') => void;
  onRefreshStatus?: (jobId: string) => void;
  onForceRetrieve?: (jobId: string) => void;
  onDiagnose?: (jobId: string) => void;
  compact?: boolean;
}

export default function TranscriptionStatus({ 
  job, 
  onRetry, 
  onCancel, 
  onDownload,
  onRefreshStatus,
  onForceRetrieve,
  onDiagnose,
  compact = false 
}: TranscriptionStatusProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary' as const,
      processing: 'default' as const,
      completed: 'default' as const,
      error: 'destructive' as const
    };

    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'} 
             className={colors[status as keyof typeof colors]}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  const getProgress = () => {
    switch (job.status) {
      case 'pending':
        return 10;
      case 'processing':
        return 50;
      case 'completed':
        return 100;
      case 'error':
        return 0;
      default:
        return 0;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getErrorGuidance = (error?: string) => {
    if (!error) return null;
    
    if (error.includes('never submitted to Speechmatics') || error.includes('re-upload')) {
      return (
        <div className="text-xs text-orange-600 mt-1">
          💡 This file was never properly uploaded. Please upload the audio file again.
        </div>
      );
    }
    
    if (error.includes('retry')) {
      return (
        <div className="text-xs text-blue-600 mt-1">
          💡 Try using the Refresh Status button first, then Retry if needed.
        </div>
      );
    }
    
    return null;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleString();
  };

  const getEstimatedCompletion = () => {
    if (job.status !== 'processing' || !job.submittedAt) return null;
    
    const submittedTime = job.submittedAt.seconds * 1000;
    const now = Date.now();
    const elapsed = now - submittedTime;
    
    // Estimate 5-15 minutes processing time
    const estimatedTotal = 10 * 60 * 1000; // 10 minutes average
    const remaining = Math.max(0, estimatedTotal - elapsed);
    
    return Math.ceil(remaining / 60000); // Return minutes
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center space-x-3">
          {getStatusIcon(job.status)}
          <div>
            <p className="font-medium text-sm truncate" title={job.fileName}>
              {job.fileName}
            </p>
            <p className="text-xs text-gray-500">
              {formatDate(job.createdAt)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getStatusBadge(job.status)}
          
          {job.status === 'completed' && onDownload && (
            <Button size="sm" variant="outline" onClick={() => onDownload(job.id!, 'pdf')}>
              <Download className="h-3 w-3" />
            </Button>
          )}
          
          {job.status === 'error' && onRetry && (
            <Button size="sm" variant="outline" onClick={() => onRetry(job.id!)}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          
          {(job.status === 'error' || job.status === 'processing') && onRefreshStatus && (
            <Button size="sm" variant="outline" onClick={() => onRefreshStatus(job.id!)} title="Refresh status from Speechmatics">
              <Zap className="h-3 w-3" />
            </Button>
          )}
          
          {job.status === 'error' && onForceRetrieve && (
            <Button size="sm" variant="outline" onClick={() => onForceRetrieve(job.id!)} title="Force retrieve transcript">
              <Download className="h-3 w-3" />
            </Button>
          )}
          
          {job.status === 'processing' && onDiagnose && (
            <Button size="sm" variant="outline" onClick={() => onDiagnose(job.id!)} title="Diagnose stuck job">
              <AlertTriangle className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getStatusIcon(job.status)}
            <span className="truncate" title={job.fileName}>{job.fileName}</span>
          </span>
          {getStatusBadge(job.status)}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {(job.status === 'pending' || job.status === 'processing') && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{getProgress()}%</span>
            </div>
            <Progress value={getProgress()} className="h-2" />
            
            {job.status === 'processing' && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Zap className="h-4 w-4" />
                <span>
                  Estimated completion: {getEstimatedCompletion()} minutes
                </span>
              </div>
            )}
          </div>
        )}

        {/* Job Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">Created</p>
            <p className="text-gray-600">{formatDate(job.createdAt)}</p>
          </div>
          
          <div>
            <p className="font-medium text-gray-700">File Size</p>
            <p className="text-gray-600">{(job.fileSize / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          
          {job.duration && (
            <div>
              <p className="font-medium text-gray-700">Duration</p>
              <p className="text-gray-600">{formatDuration(job.duration)}</p>
            </div>
          )}
          
          <div>
            <p className="font-medium text-gray-700">Language</p>
            <p className="text-gray-600">{job.language?.toUpperCase() || 'EN'}</p>
          </div>
          
          {job.submittedAt && (
            <div>
              <p className="font-medium text-gray-700">Submitted</p>
              <p className="text-gray-600">{formatDate(job.submittedAt)}</p>
            </div>
          )}
          
          {job.completedAt && (
            <div>
              <p className="font-medium text-gray-700">Completed</p>
              <p className="text-gray-600">{formatDate(job.completedAt)}</p>
            </div>
          )}
        </div>

        {/* Processing Details */}
        {job.status === 'processing' && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <PlayCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Processing Status</span>
            </div>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Audio file uploaded successfully</p>
              <p>• Transcription job submitted to Speechmatics</p>
              <p>• AI processing in progress...</p>
              {job.speechmaticsJobId && (
                <p className="font-mono text-xs">Job ID: {job.speechmaticsJobId}</p>
              )}
            </div>
          </div>
        )}

        {/* Error Details */}
        {job.status === 'error' && job.error && (
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-900">Error Details</span>
            </div>
            <p className="text-sm text-red-800">{job.error}</p>
            {job.retryCount > 0 && (
              <p className="text-xs text-red-600 mt-1">
                Retry attempts: {job.retryCount}/{job.maxRetries}
              </p>
            )}
            {getErrorGuidance(job.error)}
          </div>
        )}

        {/* Success Details */}
        {job.status === 'completed' && (
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-900">Transcription Complete</span>
            </div>
            <div className="text-sm text-green-800 space-y-1">
              <p>• AI transcription completed successfully</p>
              <p>• Transcript ready for download</p>
              {job.duration && <p>• Audio duration: {formatDuration(job.duration)}</p>}
            </div>
          </div>
        )}

        {/* Tags */}
        {job.tags && job.tags.length > 0 && (
          <div>
            <p className="font-medium text-gray-700 text-sm mb-2">Tags</p>
            <div className="flex flex-wrap gap-1">
              {job.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {job.status === 'completed' && onDownload && (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => onDownload(job.id!, 'pdf')}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onDownload(job.id!, 'txt')}
              >
                TXT
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onDownload(job.id!, 'json')}
              >
                JSON
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onDownload(job.id!, 'srt')}
              >
                SRT
              </Button>
            </div>
          )}

          {job.status === 'error' && onRetry && job.retryCount < job.maxRetries && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onRetry(job.id!)}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Transcription
            </Button>
          )}

          {(job.status === 'error' || job.status === 'processing') && onRefreshStatus && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onRefreshStatus(job.id!)}
              className="flex-1"
            >
              <Zap className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          )}

          {job.status === 'error' && onForceRetrieve && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onForceRetrieve(job.id!)}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Force Retrieve
            </Button>
          )}

          {job.status === 'processing' && onDiagnose && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onDiagnose(job.id!)}
              className="flex-1"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Diagnose
            </Button>
          )}

          {(job.status === 'pending' || job.status === 'processing') && onCancel && (
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => onCancel(job.id!)}
              className="flex-1"
            >
              <PauseCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}