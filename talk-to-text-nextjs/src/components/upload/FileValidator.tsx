'use client';

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  Clock, 
  HardDrive,
  Volume2,
  Zap
} from 'lucide-react';
import { formatFileSize, estimateAudioDuration } from '@/lib/storage';

interface FileValidatorProps {
  file: File;
  onValidationComplete?: (isValid: boolean, errors: string[]) => void;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    size: string;
    type: string;
    estimatedDuration: number;
    securityScore: 'high' | 'medium' | 'low';
  };
}

export default function FileValidator({ file, onValidationComplete }: FileValidatorProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const validateFile = async (file: File): Promise<ValidationResult> => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let securityScore: 'high' | 'medium' | 'low' = 'high';

    // File type validation
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a'];
    if (!allowedTypes.includes(file.type)) {
      errors.push(`Unsupported file type: ${file.type}`);
      securityScore = 'low';
    }

    // File size validation
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      errors.push(`File too large: ${formatFileSize(file.size)}. Maximum allowed: ${formatFileSize(maxSize)}`);
    }

    if (file.size < 1024) { // Less than 1KB
      warnings.push('File seems unusually small. Please verify it contains audio content.');
      securityScore = securityScore === 'high' ? 'medium' : securityScore;
    }

    // Filename validation
    if (file.name.length > 255) {
      errors.push('Filename too long (maximum 255 characters)');
    }

    // Security checks
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.dll'];
    const fileName = file.name.toLowerCase();
    const hasMultipleExtensions = (fileName.match(/\./g) || []).length > 1;
    
    if (hasMultipleExtensions) {
      warnings.push('File has multiple extensions. Please verify this is a legitimate audio file.');
      securityScore = securityScore === 'high' ? 'medium' : securityScore;
    }

    for (const ext of dangerousExtensions) {
      if (fileName.includes(ext)) {
        errors.push('File contains potentially dangerous extension and cannot be uploaded');
        securityScore = 'low';
        break;
      }
    }

    // Special character check
    const hasSpecialChars = /[<>:"/\\|?*\x00-\x1f]/.test(file.name);
    if (hasSpecialChars) {
      warnings.push('Filename contains special characters that may cause issues');
      securityScore = securityScore === 'high' ? 'medium' : securityScore;
    }

    // Duration estimation
    const estimatedDuration = estimateAudioDuration(file.size);
    if (estimatedDuration > 180 * 60) { // More than 3 hours
      warnings.push('File appears to be longer than 3 hours. Processing may take longer.');
    }

    // Content type vs extension mismatch check
    const extension = fileName.split('.').pop() || '';
    const expectedTypes: Record<string, string[]> = {
      'mp3': ['audio/mpeg', 'audio/mp3'],
      'wav': ['audio/wav', 'audio/wave'],
      'm4a': ['audio/mp4', 'audio/m4a'],
      'mp4': ['audio/mp4', 'video/mp4']
    };

    if (expectedTypes[extension] && !expectedTypes[extension].includes(file.type)) {
      warnings.push(`File extension (${extension}) doesn't match detected type (${file.type})`);
      securityScore = securityScore === 'high' ? 'medium' : securityScore;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileInfo: {
        size: formatFileSize(file.size),
        type: file.type,
        estimatedDuration,
        securityScore
      }
    };
  };

  // Perform validation when component mounts or file changes
  useEffect(() => {
    const performValidation = async () => {
      const result = await validateFile(file);
      setValidation(result);
      onValidationComplete?.(result.isValid, result.errors);
    };

    performValidation();
  }, [file, onValidationComplete]);

  if (!validation) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-ttt-navy border-t-transparent"></div>
            <span className="text-sm text-gray-600">Validating file...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSecurityBadgeVariant = (score: string) => {
    switch (score) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'destructive';
      default: return 'default';
    }
  };

  const getSecurityIcon = (score: string) => {
    switch (score) {
      case 'high': return <Shield className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <AlertTriangle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Validation Status */}
      {validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validation.errors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validation.warnings.map((warning, index) => (
                <div key={index}>• {warning}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {validation.isValid && validation.warnings.length === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            File validation passed. Ready for upload.
          </AlertDescription>
        </Alert>
      )}

      {/* File Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              File Details
            </span>
            <Badge variant={getSecurityBadgeVariant(validation.fileInfo.securityScore)}>
              {getSecurityIcon(validation.fileInfo.securityScore)}
              Security: {validation.fileInfo.securityScore}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-sm font-medium">Filename</div>
                  <div className="text-sm text-gray-600 truncate" title={file.name}>
                    {file.name}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-sm font-medium">File Size</div>
                  <div className="text-sm text-gray-600">
                    {validation.fileInfo.size}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-sm font-medium">File Type</div>
                  <div className="text-sm text-gray-600">
                    {validation.fileInfo.type}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-sm font-medium">Estimated Duration</div>
                  <div className="text-sm text-gray-600">
                    ~{Math.round(validation.fileInfo.estimatedDuration / 60)} minutes
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Processing Information */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-ttt-navy" />
              <span className="text-sm font-medium">Processing Estimate</span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>• AI Transcription: 5-15 minutes</div>
              <div>• Upload time: ~{Math.round(file.size / (1024 * 1024))} seconds (estimated)</div>
              <div>• Storage: Encrypted and stored in Canada</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}