'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileAudio, 
  Settings,
  CheckCircle,
  AlertTriangle,
  Zap,
  User,
  Users
} from 'lucide-react';
import FileUpload from './FileUpload';
import ModeSelector from '@/components/transcription/ModeSelector';
import { TranscriptionModeSelection } from '@/types/transcription-modes';
import { estimateAudioDuration } from '@/lib/storage';
import { getCachedAudioDuration } from '@/lib/client-audio-utils';
import { secureApiClient } from '@/lib/secure-api-client';
import { transcriptionService } from '@/lib/transcription';
import { TranscriptionJobData } from '@/lib/transcription-queue';
import { useAuth } from '@/contexts/AuthContext';

interface EnhancedFileUploadProps {
  onUploadComplete?: (fileId: string, downloadUrl: string) => void;
  onUploadStart?: () => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  disabled?: boolean;
  variant?: 'default' | 'compact' | 'trial';
}

interface UploadSession {
  files: File[];
  modeSelection?: TranscriptionModeSelection;
  step: 'upload' | 'mode' | 'processing' | 'complete' | 'processing_complete';
  uploadedFiles: Array<{
    file: File;
    fileUrl: string;
    duration?: number;
    transcriptionId?: string;
  }>;
}

export default function EnhancedFileUpload({
  onUploadComplete,
  onUploadStart,
  onUploadError,
  maxFiles = 5,
  disabled = false,
  variant = 'default'
}: EnhancedFileUploadProps) {
  const { user } = useAuth();
  const [session, setSession] = useState<UploadSession>({
    files: [],
    step: 'upload',
    uploadedFiles: []
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdJobIds, setCreatedJobIds] = useState<string[]>([]);
  const [recentTranscriptions, setRecentTranscriptions] = useState<TranscriptionJobData[]>([]);

  // Get jobs created in this session from the real-time Firestore data
  const sessionJobs = recentTranscriptions.filter(job => 
    createdJobIds.includes(job.id)
  );

  // Derive job states directly from Firestore data (no separate polling needed)
  const processingJobs = sessionJobs.filter(job => 
    job.status === 'processing' || (job.status === 'pending' && job.speechmaticsJobId)
  );
  
  const completedJobs = sessionJobs.filter(job => 
    job.status === 'completed'
  );
  
  const failedJobs = sessionJobs.filter(job => 
    job.status === 'error' || job.status === 'failed'
  );

  console.log('🔍 EnhancedFileUpload real-time sync:', {
    createdJobIds,
    totalSessionJobs: sessionJobs.length,
    processing: processingJobs.length,
    completed: completedJobs.length,
    failed: failedJobs.length,
    jobStatuses: sessionJobs.map(job => ({ id: job.id, status: job.status }))
  });

  // Subscribe to transcriptions (same as Recent Transcriptions)
  useEffect(() => {
    if (!user) return;

    const unsubscribe = transcriptionService.subscribeToTranscriptions(
      user.uid,
      (jobs) => {
        setRecentTranscriptions(jobs);
        console.log('📊 EnhancedFileUpload: transcriptions updated', {
          totalJobs: jobs.length,
          allJobIds: jobs.map(job => job.id)
        });
      }
    );

    return unsubscribe;
  }, [user]);

  const handleFileUploaded = useCallback(async (fileId: string, downloadUrl: string) => {
    console.log('=== handleFileUploaded called ===');
    console.log('fileId:', fileId, 'downloadUrl:', downloadUrl);
    
    // First, find the file and estimate duration outside of setState
    let uploadedFile: any = null;
    let uploadedFileIndex = -1;
    let duration = 0;
    
    setSession(prev => {
      uploadedFileIndex = prev.uploadedFiles.findIndex(f => !f.transcriptionId);
      if (uploadedFileIndex !== -1) {
        uploadedFile = prev.uploadedFiles[uploadedFileIndex];
      }
      return prev; // Don't update yet
    });
    
    if (!uploadedFile) {
      console.warn('No uploadedFile found without transcriptionId!');
      onUploadComplete?.(fileId, downloadUrl);
      return;
    }
    
    // Get actual duration from audio metadata (asynchronously)
    try {
      console.log('🎵 Getting actual duration from audio metadata...');
      duration = await getCachedAudioDuration(uploadedFile.file);
      console.log('✅ Actual duration detected:', duration, 'minutes');
    } catch (err) {
      console.warn('⚠️ Could not get actual duration, falling back to estimation:', err);
      try {
        duration = estimateAudioDuration(uploadedFile.file.size);
        console.log('📊 Fallback estimation:', duration, 'minutes');
      } catch (estimationErr) {
        console.warn('Could not estimate duration:', estimationErr);
      }
    }
    
    // Now update the session with all the data
    setSession(prev => {
      console.log('Current uploadedFiles in prev:', prev.uploadedFiles);
      
      // Re-find the file index (in case state changed)
      const currentIndex = prev.uploadedFiles.findIndex(f => !f.transcriptionId);
      if (currentIndex === -1) {
        console.warn('File disappeared from uploadedFiles!');
        return prev;
      }

      // Update the file with upload details
      const updatedFiles = [...prev.uploadedFiles];
      updatedFiles[currentIndex] = {
        ...prev.uploadedFiles[currentIndex],
        fileUrl: downloadUrl,
        duration,
        transcriptionId: fileId
      };

      const updated = {
        ...prev,
        uploadedFiles: updatedFiles
      };
      
      console.log('Updated session after file upload:', updated);

      // Check if we should move to mode selection
      const hasFiles = updated.uploadedFiles.length > 0;
      const allUploaded = hasFiles && updated.uploadedFiles.every(f => f.transcriptionId);
      console.log('Has files:', hasFiles, 'All uploaded check:', allUploaded, 'current step:', prev.step);
      
      if (allUploaded && prev.step === 'upload') {
        console.log('Moving to mode selection step');
        return { ...updated, step: 'mode' };
      }

      return updated;
    });

    onUploadComplete?.(fileId, downloadUrl);
  }, [onUploadComplete]);

  const handleFilesSelected = useCallback((files: File[]) => {
    console.log('=== handleFilesSelected called ===');
    console.log('Selected files:', files);
    
    setSession(prev => {
      const updated = {
        ...prev,
        files: files
      };
      console.log('Updated session with selected files:', updated);
      return updated;
    });
  }, []);

  const handleUploadStart = useCallback(() => {
    const callId = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    console.log('=== handleUploadStart called === with callId:', callId);
    
    setSession(prev => {
      console.log('Current session files in prev:', prev.files);
      
      // Only add files that aren't already in uploadedFiles
      const existingFiles = new Set(prev.uploadedFiles.map(f => f.file.name + f.file.size));
      const newFiles = prev.files.filter(file => 
        !existingFiles.has(file.name + file.size)
      );
      
      if (newFiles.length === 0) {
        console.log('No new files to add, skipping update');
        return prev;
      }
      
      const newUploadedFiles = [...prev.uploadedFiles, ...newFiles.map(file => ({ file, fileUrl: '', duration: 0 }))];
      console.log('Adding files to uploadedFiles:', newUploadedFiles);
      
      const updated = { 
        ...prev, 
        uploadedFiles: newUploadedFiles
      };
      console.log('Updated session in handleUploadStart:', updated);
      return updated;
    });
    onUploadStart?.();
  }, [onUploadStart]);

  const handleModeSelection = async (modeSelection: TranscriptionModeSelection) => {
    console.log('=== handleModeSelection called ===');
    console.log('Mode selection:', modeSelection);
    console.log('Current session state:', session);
    console.log('Uploaded files:', session.uploadedFiles);
    
    setSession(prev => ({ ...prev, modeSelection }));
    setProcessing(true);
    setError(null);

    try {
      console.log('Starting to process', session.uploadedFiles.length, 'files');
      
      if (session.uploadedFiles.length === 0) {
        console.error('No uploaded files found in session!');
        setError('No files to process');
        return;
      }

      const createdJobIds: string[] = [];

      // Process each uploaded file with the selected mode
      for (const uploadedFile of session.uploadedFiles) {
        console.log('Checking file:', uploadedFile);
        
        if (!uploadedFile.transcriptionId) {
          console.warn('Skipping file with no transcriptionId:', uploadedFile);
          continue;
        }

        console.log('Processing file:', uploadedFile.file.name, 'with mode:', modeSelection.mode);
        console.log('File details:', {
          fileName: uploadedFile.file.name,
          fileUrl: uploadedFile.fileUrl,
          fileSize: uploadedFile.file.size,
          duration: uploadedFile.duration,
          transcriptionId: uploadedFile.transcriptionId
        });
        
        const response = await secureApiClient.post('/api/transcription/modes/process', {
          fileName: uploadedFile.file.name,
          fileUrl: uploadedFile.fileUrl,
          fileSize: uploadedFile.file.size,
          duration: isNaN(uploadedFile.duration || 0) ? 0 : (uploadedFile.duration || 0),
          mode: modeSelection.mode,
          priority: modeSelection.priority,
          qualityLevel: modeSelection.qualityLevel,
          ...(modeSelection.specialRequirements && { specialRequirements: modeSelection.specialRequirements }),
          language: 'en', // Could be made configurable
          diarization: true // Could be made configurable
        });
        
        console.log('Processing response:', response);

        // Collect job ID for polling
        if (response.data?.success && response.data?.jobId) {
          createdJobIds.push(response.data.jobId);
          console.log('Added job ID for polling:', response.data.jobId);
        }
      }

      console.log('All files processed, setting step to complete');
      
      // Store created job IDs for polling
      if (createdJobIds.length > 0) {
        console.log(`Setting created job IDs for polling: ${createdJobIds.length} jobs:`, createdJobIds);
        setCreatedJobIds(createdJobIds);
        
        // Give jobs a moment to be set up in Firestore before polling starts
        setTimeout(() => {
          console.log('🚀 Jobs should be ready for polling now');
        }, 2000);
      }

      setSession(prev => ({ ...prev, step: 'complete' }));
    } catch (err) {
      console.error('Error in handleModeSelection:', err);
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  // Monitor job status changes to update the UI step (using real-time data)
  useEffect(() => {
    console.log('🔍 Job monitoring effect triggered:', {
      createdJobIds,
      completedJobsCount: completedJobs.length,
      processingJobsCount: processingJobs.length,
      failedJobsCount: failedJobs.length,
      sessionJobsCount: sessionJobs.length
    });
    
    if (createdJobIds.length > 0) {
      const hasCompletedJobs = completedJobs.length > 0;
      const hasFailedJobs = failedJobs.length > 0;
      const hasProcessingJobs = processingJobs.length > 0;
      
      console.log('📊 Job status summary:', {
        completed: completedJobs.length,
        failed: failedJobs.length,
        processing: processingJobs.length,
        total: createdJobIds.length,
        sessionJobs: sessionJobs.length
      });
      
      // If all jobs are completed, update to success state
      if (completedJobs.length === createdJobIds.length && createdJobIds.length > 0) {
        console.log('🎉 All jobs completed! Moving to success state');
        setSession(prev => ({ ...prev, step: 'processing_complete' }));
      }
      // If some jobs failed, show error
      else if (hasFailedJobs && !hasProcessingJobs) {
        console.log('❌ Some jobs failed and no jobs processing');
        setError('Some transcriptions failed. Please check your dashboard for details.');
      }
      // Otherwise stay in processing mode
      else if (hasProcessingJobs) {
        console.log('⏳ Jobs still processing...');
        // Keep in complete/processing step
      }
    }
  }, [completedJobs, failedJobs, processingJobs, createdJobIds, sessionJobs]);

  const resetSession = () => {
    setSession({
      files: [],
      step: 'upload',
      uploadedFiles: []
    });
    setCreatedJobIds([]);
    setError(null);
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'ai': return <Zap className="h-5 w-5 text-blue-500" />;
      case 'human': return <User className="h-5 w-5 text-green-500" />;
      case 'hybrid': return <Users className="h-5 w-5 text-purple-500" />;
      default: return <FileAudio className="h-5 w-5" />;
    }
  };

  const totalDuration = session.uploadedFiles.reduce((sum, f) => sum + (f.duration || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4">
        <div className={`flex items-center space-x-2 ${session.step === 'upload' ? 'text-blue-600' : session.uploadedFiles.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${session.step === 'upload' ? 'bg-blue-100' : session.uploadedFiles.length > 0 ? 'bg-green-100' : 'bg-gray-100'}`}>
            {session.uploadedFiles.length > 0 ? <CheckCircle className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
          </div>
          <span className="font-medium">Upload Files</span>
        </div>
        
        <div className={`h-0.5 w-16 ${session.uploadedFiles.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
        
        <div className={`flex items-center space-x-2 ${session.step === 'mode' ? 'text-blue-600' : session.modeSelection ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${session.step === 'mode' ? 'bg-blue-100' : session.modeSelection ? 'bg-green-100' : 'bg-gray-100'}`}>
            {session.modeSelection ? <CheckCircle className="h-5 w-5" /> : <Settings className="h-5 w-5" />}
          </div>
          <span className="font-medium">Select Mode</span>
        </div>
        
        <div className={`h-0.5 w-16 ${session.modeSelection ? 'bg-green-500' : 'bg-gray-300'}`} />
        
        <div className={`flex items-center space-x-2 ${(session.step === 'complete' || session.step === 'processing_complete') ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${(session.step === 'complete' || session.step === 'processing_complete') ? 'bg-green-100' : 'bg-gray-100'}`}>
            <CheckCircle className="h-5 w-5" />
          </div>
          <span className="font-medium">Complete</span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Content based on current step */}
      {session.step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Audio Files
            </CardTitle>
            <CardDescription>
              Upload your audio files to get started. Supported formats: MP3, WAV, M4A, MP4
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload
              onUploadComplete={handleFileUploaded}
              onUploadStart={handleUploadStart}
              onUploadError={onUploadError}
              onFilesSelected={handleFilesSelected}
              maxFiles={maxFiles}
              disabled={disabled}
              variant={variant}
            />
          </CardContent>
        </Card>
      )}

      {session.step === 'mode' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Choose Transcription Mode
            </CardTitle>
            <CardDescription>
              Select how you want your {session.uploadedFiles.length} file(s) to be transcribed
              {totalDuration > 0 && ` (Total duration: ~${Math.ceil(totalDuration)} minutes)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ModeSelector 
              onModeSelect={handleModeSelection}
              duration={totalDuration}
              disabled={processing}
            />
          </CardContent>
        </Card>
      )}

      {(session.step === 'complete' || session.step === 'processing_complete') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {completedJobs.length === createdJobIds.length && createdJobIds.length > 0 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Transcriptions Completed!
                </>
              ) : processingJobs.length > 0 ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  Transcriptions Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Transcription Started!
                </>
              )}
            </CardTitle>
            <CardDescription>
              {completedJobs.length === createdJobIds.length && createdJobIds.length > 0
                ? `All ${createdJobIds.length} file${createdJobIds.length > 1 ? 's' : ''} have been transcribed successfully`
                : `Your files are being processed with ${session.modeSelection?.mode} transcription`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
              {getModeIcon(session.modeSelection?.mode || '')}
              <div className="flex-1">
                <h4 className="font-medium">
                  {session.modeSelection?.mode === 'ai' && 'AI Transcription'}
                  {session.modeSelection?.mode === 'human' && 'Human Transcription'} 
                  {session.modeSelection?.mode === 'hybrid' && 'Hybrid (AI + Human) Transcription'}
                </h4>
                <p className="text-sm text-gray-600">
                  Priority: {session.modeSelection?.priority} | Quality: {session.modeSelection?.qualityLevel}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Transcription Status:</h4>
              
              {/* Show appropriate message based on job creation status */}
              {createdJobIds.length === 0 ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Initializing transcription jobs...</span>
                  </div>
                  <p className="mt-1 text-xs text-blue-600">
                    Setting up your {session.uploadedFiles.length} file{session.uploadedFiles.length > 1 ? 's' : ''} for {session.modeSelection?.mode} transcription
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  Job IDs: {createdJobIds.join(', ')} | Real-time sync: Active
                </div>
              )}
              
              {createdJobIds.map((jobId, index) => {
                const fileName = session.uploadedFiles[index]?.file.name || `File ${index + 1}`;
                const duration = session.uploadedFiles[index]?.duration;
                
                // Find the actual job data from session jobs
                const jobData = sessionJobs.find(job => job.id === jobId);
                
                let statusBadge;
                let statusIcon;
                let statusText = 'Starting...';
                
                if (jobData) {
                  switch (jobData.status) {
                    case 'completed':
                      statusBadge = <Badge variant="default" style={{backgroundColor: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0'}}>Completed</Badge>;
                      statusIcon = <CheckCircle className="h-5 w-5 text-green-500" />;
                      statusText = 'Completed';
                      break;
                    case 'error':
                    case 'failed':
                      statusBadge = <Badge variant="default" style={{backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca'}}>Failed</Badge>;
                      statusIcon = <AlertTriangle className="h-5 w-5 text-red-500" />;
                      statusText = 'Failed';
                      break;
                    case 'processing':
                      statusBadge = <Badge variant="secondary">Processing</Badge>;
                      statusIcon = <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>;
                      statusText = 'Processing';
                      break;
                    case 'pending':
                      if (jobData.speechmaticsJobId) {
                        statusBadge = <Badge variant="secondary">Processing</Badge>;
                        statusIcon = <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>;
                        statusText = 'Processing';
                      } else {
                        statusBadge = <Badge variant="secondary">Starting...</Badge>;
                        statusIcon = <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>;
                        statusText = 'Starting...';
                      }
                      break;
                    default:
                      statusBadge = <Badge variant="secondary">Starting...</Badge>;
                      statusIcon = <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>;
                  }
                } else {
                  // Job not found in session jobs yet
                  statusBadge = <Badge variant="secondary">Initializing...</Badge>;
                  statusIcon = <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>;
                }
                
                return (
                  <div key={jobId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-3 flex-1">
                      {statusIcon}
                      <div>
                        <span className="font-medium">{fileName}</span>
                        <div className="text-sm text-gray-500">
                          {duration && `~${Math.round(duration / 60)} min`} • {session.modeSelection?.mode} transcription
                          {jobData?.error && <span className="text-red-600 ml-2">• {jobData.error}</span>}
                        </div>
                      </div>
                    </div>
                    {statusBadge}
                  </div>
                );
              })}
              
              {/* Show processing message only if there are still processing jobs */}
              {processingJobs.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-blue-800">
                      {processingJobs.length} transcription{processingJobs.length > 1 ? 's' : ''} still processing...
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    You can safely close this page - processing will continue in the background. 
                    Check the "Recent Transcriptions" section below for live updates and download options.
                  </p>
                </div>
              )}
              
              {/* Show completion message when all jobs are done */}
              {completedJobs.length === createdJobIds.length && createdJobIds.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">
                      All transcriptions completed successfully! Your transcripts are available in the "Recent Transcriptions" section below with download options.
                    </span>
                  </div>
                </div>
              )}
              
              {/* Show error message if some jobs failed and none are processing */}
              {failedJobs.length > 0 && processingJobs.length === 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-800">
                      {failedJobs.length} transcription{failedJobs.length > 1 ? 's' : ''} failed. Please check the error messages above or try again.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={resetSession} variant="outline">
                Upload More Files
              </Button>
              <Button onClick={() => window.location.href = '/dashboard'}>
                View Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const Badge = ({ children, variant = 'default', style }: { children: React.ReactNode; variant?: 'default' | 'secondary'; style?: React.CSSProperties }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    variant === 'secondary' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
  }`} style={style}>
    {children}
  </span>
);