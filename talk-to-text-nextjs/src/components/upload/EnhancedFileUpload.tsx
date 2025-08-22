'use client';

import { useState, useCallback } from 'react';
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
import { secureApiClient } from '@/lib/secure-api-client';

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
  step: 'upload' | 'mode' | 'processing' | 'complete';
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
  const [session, setSession] = useState<UploadSession>({
    files: [],
    step: 'upload',
    uploadedFiles: []
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUploaded = useCallback(async (fileId: string, downloadUrl: string) => {
    // Get file duration estimate
    const uploadedFile = session.uploadedFiles.find(f => !f.transcriptionId);
    if (uploadedFile) {
      try {
        const duration = await estimateAudioDuration(uploadedFile.file);
        setSession(prev => ({
          ...prev,
          uploadedFiles: prev.uploadedFiles.map(f => 
            f === uploadedFile ? { ...f, fileUrl: downloadUrl, duration, transcriptionId: fileId } : f
          )
        }));
      } catch (err) {
        console.warn('Could not estimate duration:', err);
        setSession(prev => ({
          ...prev,
          uploadedFiles: prev.uploadedFiles.map(f => 
            f === uploadedFile ? { ...f, fileUrl: downloadUrl, transcriptionId: fileId } : f
          )
        }));
      }
    }

    // Move to mode selection if all files are uploaded
    const allUploaded = session.uploadedFiles.every(f => f.transcriptionId);
    if (allUploaded && session.step === 'upload') {
      setSession(prev => ({ ...prev, step: 'mode' }));
    }

    onUploadComplete?.(fileId, downloadUrl);
  }, [session.uploadedFiles, onUploadComplete]);

  const handleUploadStart = useCallback(() => {
    setSession(prev => ({ 
      ...prev, 
      uploadedFiles: [...prev.uploadedFiles, ...prev.files.map(file => ({ file, fileUrl: '', duration: 0 }))]
    }));
    onUploadStart?.();
  }, [onUploadStart]);

  const handleModeSelection = async (modeSelection: TranscriptionModeSelection) => {
    setSession(prev => ({ ...prev, modeSelection }));
    setProcessing(true);
    setError(null);

    try {
      // Process each uploaded file with the selected mode
      for (const uploadedFile of session.uploadedFiles) {
        if (!uploadedFile.transcriptionId) continue;

        await secureApiClient.post('/api/transcription/modes/process', {
          fileName: uploadedFile.file.name,
          fileUrl: uploadedFile.fileUrl,
          fileSize: uploadedFile.file.size,
          duration: uploadedFile.duration,
          mode: modeSelection.mode,
          priority: modeSelection.priority,
          qualityLevel: modeSelection.qualityLevel,
          specialRequirements: modeSelection.specialRequirements,
          language: 'en', // Could be made configurable
          diarization: true // Could be made configurable
        });
      }

      setSession(prev => ({ ...prev, step: 'complete' }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const resetSession = () => {
    setSession({
      files: [],
      step: 'upload',
      uploadedFiles: []
    });
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
        
        <div className={`flex items-center space-x-2 ${session.step === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${session.step === 'complete' ? 'bg-green-100' : 'bg-gray-100'}`}>
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

      {session.step === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Transcription Started!
            </CardTitle>
            <CardDescription>
              Your files are being processed with {session.modeSelection?.mode} transcription
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
              <h4 className="font-medium">Files Processing:</h4>
              {session.uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">{file.file.name}</span>
                  <Badge variant="secondary">Processing</Badge>
                </div>
              ))}
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

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'secondary' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    variant === 'secondary' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
  }`}>
    {children}
  </span>
);