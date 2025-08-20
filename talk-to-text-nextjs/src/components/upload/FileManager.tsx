'use client';

import React from 'react';
import { TranscriptionJobData } from '@/lib/transcription-queue';
import TranscriptionList from '@/components/transcription/TranscriptionList';

interface FileManagerProps {
  variant?: 'full' | 'compact';
  showTranscriptions?: boolean;
  showRawFiles?: boolean;
  onFileSelect?: (file: TranscriptionJobData) => void;
  maxItems?: number;
  status?: TranscriptionJobData['status'];
}

export default function FileManager({ 
  variant = 'full',
  showTranscriptions = true,
  showRawFiles = false,
  onFileSelect,
  maxItems = 50,
  status
}: FileManagerProps) {
  
  // For now, we'll only show transcriptions using the new TranscriptionList component
  // Raw file management can be added later if needed
  
  if (!showTranscriptions) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">File management coming soon.</p>
        <p className="text-sm text-gray-500">Use the transcription view to manage your files.</p>
      </div>
    );
  }

  return (
    <TranscriptionList
      status={status}
      limit={maxItems}
      compact={variant === 'compact'}
      showSearch={variant === 'full'}
      showFilter={variant === 'full'}
    />
  );
}