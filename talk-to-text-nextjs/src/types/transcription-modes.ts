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

export interface HumanTranscriberAssignment {
  id?: string;
  transcriptionId: string;
  transcriberId: string;
  assignedAt: Timestamp;
  status: 'assigned' | 'in_progress' | 'completed' | 'rejected';
  estimatedCompletion?: Timestamp;
  notes?: string;
  completedAt?: Timestamp;
}

export interface HumanTranscriber {
  id?: string;
  userId: string;
  email: string;
  name: string;
  status: 'active' | 'inactive' | 'busy';
  specializations: string[]; // languages, domains, etc.
  rating: number;
  completedJobs: number;
  averageCompletionTime: number; // in minutes
  languages: string[];
  certifications?: string[];
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
}

export interface HybridTranscriptionData {
  aiTranscript?: string;
  aiConfidence?: number;
  aiProcessingTime?: number;
  humanTranscript?: string;
  humanNotes?: string;
  humanProcessingTime?: number;
  qualityScore?: number;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
}

export interface ExtendedTranscriptionJobData {
  id?: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'assigned' | 'human_review';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  mode: TranscriptionMode;
  
  // AI-specific fields
  speechmaticsJobId?: string;
  speechmaticsStatus?: string;
  aiTranscript?: string;
  
  // Human transcription fields
  assignedTranscriber?: string;
  humanAssignmentId?: string;
  humanTranscript?: string;
  humanNotes?: string;
  
  // Hybrid mode fields
  hybridData?: HybridTranscriptionData;
  
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
    description: 'Fast, automated transcription using advanced AI (Speechmatics)',
    icon: 'Zap',
    estimatedTime: '5-15 minutes',
    pricing: {
      basePrice: 0.10,
      currency: 'USD',
      unit: 'per minute'
    },
    features: [
      'Lightning fast processing',
      'Speaker diarization',
      'Multiple language support',
      'Automatic punctuation',
      'Confidence scoring'
    ],
    availability: 'available'
  },
  human: {
    mode: 'human',
    label: 'Human Transcription',
    description: 'Professional human transcribers for highest accuracy',
    icon: 'User',
    estimatedTime: '2-24 hours',
    pricing: {
      basePrice: 1.50,
      currency: 'USD',
      unit: 'per minute'
    },
    features: [
      'Highest accuracy (99%+)',
      'Context understanding',
      'Proper formatting',
      'Quality assurance',
      'Professional review'
    ],
    availability: 'available'
  },
  hybrid: {
    mode: 'hybrid',
    label: 'Hybrid (AI + Human)',
    description: 'AI transcription reviewed and refined by human experts',
    icon: 'Users',
    estimatedTime: '1-12 hours',
    pricing: {
      basePrice: 0.75,
      currency: 'USD',
      unit: 'per minute'
    },
    features: [
      'Best of both worlds',
      'AI speed + Human accuracy',
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