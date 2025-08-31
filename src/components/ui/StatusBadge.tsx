import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'queued' | 'processing' | 'under-review' | 'complete' | 'failed' | 'cancelled' | 'pending-review' | 'pending-transcription';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    queued: {
      label: 'Queued',
      className: 'bg-gray-100 text-gray-800 border-gray-200'
    },
    processing: {
      label: 'Processing',
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    'under-review': {
      label: 'Under Review',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    'pending-review': {
      label: 'Pending Review',
      className: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    'pending-transcription': {
      label: 'Pending Transcription',
      className: 'bg-purple-100 text-purple-800 border-purple-200'
    },
    complete: {
      label: 'Complete',
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 text-red-800 border-red-200'
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-gray-100 text-gray-600 border-gray-200'
    }
  };

  const config = statusConfig[status] || {
    label: status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown',
    className: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}