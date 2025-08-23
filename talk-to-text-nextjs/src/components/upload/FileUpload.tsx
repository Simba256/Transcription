'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Pause,
  FileAudio,
  Clock,
  HardDrive
} from 'lucide-react';
import { uploadAudioFile, UploadProgress, formatFileSize, estimateAudioDuration } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';

interface FileUploadProps {
  onUploadComplete?: (fileId: string, downloadUrl: string) => void;
  onUploadStart?: () => void;
  onUploadError?: (error: string) => void;
  onFilesSelected?: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  showPreview?: boolean;
  variant?: 'default' | 'compact' | 'trial';
}

interface UploadingFile {
  file: File;
  progress: UploadProgress;
  id: string;
  status: 'uploading' | 'completed' | 'error';
  downloadUrl?: string;
  transcriptionId?: string;
  error?: string;
  estimatedDuration?: number;
}

export default function FileUpload({
  onUploadComplete,
  onUploadStart,
  onUploadError,
  onFilesSelected,
  maxFiles = 5,
  disabled = false,
  acceptedFileTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a'],
  maxFileSize = 100 * 1024 * 1024, // 100MB
  showPreview = true,
  variant = 'default'
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [error, setError] = useState<string>('');
  const { user, userProfile } = useAuth();
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!acceptedFileTypes.includes(file.type)) {
      return `Unsupported file type: ${file.type}. Supported: ${acceptedFileTypes.join(', ')}`;
    }

    // Check file size
    if (file.size > maxFileSize) {
      return `File too large: ${formatFileSize(file.size)}. Maximum: ${formatFileSize(maxFileSize)}`;
    }

    // Check if filename is valid
    if (file.name.length > 255) {
      return 'Filename too long (max 255 characters)';
    }

    // Check for potentially harmful file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (dangerousExtensions.includes(extension)) {
      return 'File type not allowed for security reasons';
    }

    return null;
  }, [acceptedFileTypes, maxFileSize]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      setError('Please sign in to upload files');
      return;
    }

    if (disabled) {
      return;
    }

    setError('');

    // Check total file limit
    if (uploadingFiles.length + acceptedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate each file
    for (const file of acceptedFiles) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // Notify parent about files being selected FIRST
    console.log('About to call onFilesSelected with files:', acceptedFiles);
    onFilesSelected?.(acceptedFiles);
    
    // Then notify that upload is starting (so session.files is populated first)
    const callId = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    console.log('About to call onUploadStart with callId:', callId);
    onUploadStart?.();

    // Process each file
    for (const file of acceptedFiles) {
      const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const estimatedDuration = estimateAudioDuration(file.size);

      const uploadingFile: UploadingFile = {
        file,
        id: fileId,
        status: 'uploading',
        progress: {
          bytesTransferred: 0,
          totalBytes: file.size,
          percentage: 0,
          state: 'running'
        },
        estimatedDuration
      };

      setUploadingFiles(prev => [...prev, uploadingFile]);

      try {
        // Create abort controller for this upload
        const abortController = new AbortController();
        abortControllers.current.set(fileId, abortController);

        // Upload file to Firebase Storage
        const { downloadUrl, filePath } = await uploadAudioFile(
          user.uid,
          file,
          (progress) => {
            setUploadingFiles(prev =>
              prev.map(f =>
                f.id === fileId
                  ? { ...f, progress }
                  : f
              )
            );
          }
        );

        // Create a simple unique ID for tracking the upload (no actual transcription created yet)
        const tempTranscriptionId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Update file status
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === fileId
              ? {
                  ...f,
                  status: 'completed',
                  downloadUrl,
                  transcriptionId: tempTranscriptionId,
                  progress: { ...f.progress, percentage: 100, state: 'success' }
                }
              : f
          )
        );

        // Clean up abort controller
        abortControllers.current.delete(fileId);

        // Notify parent component with temp ID (just for file tracking)
        onUploadComplete?.(tempTranscriptionId, downloadUrl);

      } catch (error: any) {
        console.error('Upload error:', error);
        
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === fileId
              ? {
                  ...f,
                  status: 'error',
                  error: error.message || 'Upload failed',
                  progress: { ...f.progress, state: 'error' }
                }
              : f
          )
        );

        abortControllers.current.delete(fileId);
        onUploadError?.(error.message || 'Upload failed');
      }
    }
  }, [user, userProfile, disabled, maxFiles, uploadingFiles.length, validateFile, onUploadStart, onUploadComplete, onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/mp4': ['.mp4'],
      'audio/m4a': ['.m4a']
    },
    maxFiles,
    disabled: disabled || !user,
    multiple: maxFiles > 1
  });

  const removeFile = (fileId: string) => {
    // Cancel upload if in progress
    const abortController = abortControllers.current.get(fileId);
    if (abortController) {
      abortController.abort();
      abortControllers.current.delete(fileId);
    }

    setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const retryUpload = async (fileId: string) => {
    const fileToRetry = uploadingFiles.find(f => f.id === fileId);
    if (!fileToRetry || !user) return;

    // Reset file status
    setUploadingFiles(prev =>
      prev.map(f =>
        f.id === fileId
          ? {
              ...f,
              status: 'uploading',
              error: undefined,
              progress: { ...f.progress, percentage: 0, state: 'running' }
            }
          : f
      )
    );

    // Retry upload
    try {
      const { downloadUrl, filePath } = await uploadAudioFile(
        user.uid,
        fileToRetry.file,
        (progress) => {
          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === fileId
                ? { ...f, progress }
                : f
            )
          );
        }
      );

      const transcriptionId = await createTranscription({
        userId: user.uid,
        fileName: filePath,
        originalName: fileToRetry.file.name,
        fileSize: fileToRetry.file.size,
        duration: fileToRetry.estimatedDuration || 0,
        status: 'processing',
        service: 'ai',
        uploadedAt: new Date(),
      });

      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? {
                ...f,
                status: 'completed',
                downloadUrl,
                transcriptionId,
                progress: { ...f.progress, percentage: 100, state: 'success' }
              }
            : f
        )
      );

      onUploadComplete?.(transcriptionId, downloadUrl);

    } catch (error: any) {
      setUploadingFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? {
                ...f,
                status: 'error',
                error: error.message || 'Upload failed'
              }
            : f
        )
      );
    }
  };

  const getDropzoneContent = () => {
    if (variant === 'compact') {
      return (
        <div className="p-4 text-center">
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Drop files or click to upload</p>
        </div>
      );
    }

    if (variant === 'trial') {
      return (
        <div className="p-8 text-center">
          <FileAudio className="h-16 w-16 text-ttt-navy mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Start Your Free Trial
          </h3>
          <p className="text-gray-600 mb-4">
            Upload up to 3 audio files for free transcription
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-4 w-4" />
              Up to 3 hours
            </div>
            <div className="flex items-center justify-center gap-1">
              <HardDrive className="h-4 w-4" />
              100MB per file
            </div>
          </div>
          <Button variant="navy" disabled={disabled || !user}>
            {!user ? 'Sign in to upload' : 'Choose Files'}
          </Button>
        </div>
      );
    }

    return (
      <div className="p-8 text-center">
        <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isDragActive ? 'Drop files here' : 'Drag and drop your audio files'}
        </h3>
        <p className="text-gray-600 mb-4">
          Supports MP3, WAV, M4A files up to {formatFileSize(maxFileSize)}
        </p>
        <Button variant="navy" disabled={disabled || !user}>
          {!user ? 'Sign in to upload' : 'Select Files'}
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Dropzone */}
      <Card>
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${isDragActive 
              ? 'border-ttt-navy bg-ttt-lavender-light' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled || !user ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          {getDropzoneContent()}
        </div>
      </Card>

      {/* File List */}
      {showPreview && uploadingFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload Progress</CardTitle>
            <CardDescription>
              {uploadingFiles.filter(f => f.status === 'completed').length} of {uploadingFiles.length} files completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadingFiles.map((file) => (
                <div key={file.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {file.status === 'completed' ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : file.status === 'error' ? (
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                    ) : (
                      <FileAudio className="h-6 w-6 text-ttt-navy" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.file.name}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(file.file.size)}
                      </span>
                    </div>
                    
                    {file.status === 'uploading' && (
                      <Progress value={file.progress.percentage} className="h-2" />
                    )}
                    
                    {file.status === 'error' && (
                      <p className="text-xs text-red-600">{file.error}</p>
                    )}
                    
                    {file.status === 'completed' && (
                      <p className="text-xs text-green-600">Upload completed</p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      {file.estimatedDuration && (
                        <span>~{Math.round(file.estimatedDuration / 60)}min</span>
                      )}
                      {file.status === 'uploading' && (
                        <span>{file.progress.percentage.toFixed(1)}%</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {file.status === 'error' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => retryUpload(file.id)}
                      >
                        Retry
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}