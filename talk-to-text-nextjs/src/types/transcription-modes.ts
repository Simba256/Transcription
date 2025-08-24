import { Timestamp } from 'firebase/firestore';

export type TranscriptionMode = 'ai' | 'human' | 'hybrid';

export interface TranscriptionModeConfig {
  mode: TranscriptionMode;
  label: string;
  description: string;
  icon: string;
  estimatedTime: string;
  pricing?: {
    basePrice: number;
    currency: string;
    unit: string;
  };
  features: string[];
  availability: 'available' | 'limited' | 'unavailable';
}

// Simplified for admin-only human transcription
export interface AdminTranscriptionData {
  adminTranscript?: string;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  processingTime?: number;
}

export interface SimplifiedTranscriptionJobData {
  id?: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'queued_for_admin' | 'admin_review';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  mode: TranscriptionMode;
  
  // AI-specific fields (OpenAI)
  openaiJobId?: string;
  aiTranscript?: string;
  processingTime?: number;
  wordCount?: number;
  confidence?: number;
  
  // Admin transcription fields (simplified human process)
  adminData?: AdminTranscriptionData;
  
  // Final output
  finalTranscript?: string;
  fullTranscript?: any;
  
  duration?: number;
  error?: string;
  createdAt: Timestamp;
  submittedAt?: Timestamp;
  completedAt?: Timestamp;
  errorAt?: Timestamp;
  lastCheckedAt?: Timestamp;
  retryCount: number;
  maxRetries: number;
  language: string;
  diarization: boolean;
  tags?: string[];
  
  // Quality and feedback
  qualityRating?: number;
  clientFeedback?: string;
  internalNotes?: string;
}

export const TRANSCRIPTION_MODES: Record<TranscriptionMode, TranscriptionModeConfig> = {
  ai: {
    mode: 'ai',
    label: 'AI Transcription',
    description: 'Fast, automated transcription using OpenAI Whisper + GPT-4',
    icon: 'Zap',
    estimatedTime: '2-8 minutes',
    pricing: {
      basePrice: 0.06,
      currency: 'USD',
      unit: 'per minute'
    },
    features: [
      'Lightning fast processing',
      'Superior accuracy with OpenAI',
      'Speaker identification',
      'Multiple language support',
      'Professional formatting'
    ],
    availability: 'available'
  },
  human: {
    mode: 'human',
    label: 'Admin Manual Review',
    description: 'Manual transcription review by admin for specialized content',
    icon: 'User',
    estimatedTime: '4-48 hours',
    pricing: {
      basePrice: 1.50,
      currency: 'USD',
      unit: 'per minute'
    },
    features: [
      'Highest accuracy (99%+)',
      'Specialized content handling',
      'Custom formatting',
      'Quality assurance',
      'Admin oversight'
    ],
    availability: 'available'
  },
  hybrid: {
    mode: 'hybrid',
    label: 'AI + Admin Review',
    description: 'OpenAI transcription with admin review for premium quality',
    icon: 'Users',
    estimatedTime: '2-24 hours',
    pricing: {
      basePrice: 0.85,
      currency: 'USD',
      unit: 'per minute'
    },
    features: [
      'Best of both worlds',
      'AI speed + Admin precision',
      'Cost-effective premium option',
      'Quality validation',
      'Expert review and correction'
    ],
    availability: 'available'
  }
};

export interface TranscriptionModeSelection {
  mode: TranscriptionMode;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  specialRequirements?: string;
  deadline?: Date;
  qualityLevel: 'standard' | 'premium' | 'enterprise';
}