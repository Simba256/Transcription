import { Timestamp } from 'firebase/firestore';

export interface CreditBalance {
  userId: string;
  balance: number;
  totalPurchased: number;
  totalSpent: number;
  lastUpdated: Timestamp;
  createdAt: Timestamp;
}

export interface CreditTransaction {
  id?: string;
  userId: string;
  type: 'purchase' | 'deduction' | 'refund' | 'bonus';
  amount: number; // positive for additions, negative for deductions
  description: string;
  relatedJobId?: string; // For transcription-related transactions
  stripePaymentIntentId?: string; // For purchases
  createdAt: Timestamp;
  metadata?: {
    transcriptionMode?: 'ai' | 'human' | 'hybrid';
    qualityLevel?: 'standard' | 'premium';
    durationMinutes?: number;
    packageId?: string;
  };
}

export interface CreditPurchase {
  id?: string;
  userId: string;
  packageId: string;
  credits: number;
  priceCAD: number;
  stripePaymentIntentId: string;
  stripeSessionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceCAD: number;
  priceCredits: number;
  popular: boolean;
}

// Helper types for API responses
export interface CreditBalanceResponse {
  balance: number;
  totalPurchased: number;
  totalSpent: number;
}

export interface CreditTransactionResponse extends Omit<CreditTransaction, 'createdAt'> {
  createdAt: string;
}

export interface PurchaseCreditsRequest {
  packageId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface PurchaseCreditsResponse {
  sessionId: string;
  url: string;
}