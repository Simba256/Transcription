/**
 * Usage Tracking Types
 *
 * Defines types for tracking transcription usage across subscriptions and credits
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Transcription Modes
// ============================================================================

export type TranscriptionMode = 'ai' | 'hybrid' | 'human';

// ============================================================================
// Billing Types
// ============================================================================

export type BillingType = 'subscription' | 'credits';

// ============================================================================
// Usage Record (Firestore)
// ============================================================================

export interface UsageRecord {
  id: string;
  userId: string;
  subscriptionId?: string;
  transcriptionId: string;

  // Usage details
  minutes: number;
  mode: TranscriptionMode;

  // Billing tracking
  billingType: BillingType;
  creditsUsed?: number;
  minutesFromSubscription?: number;

  // Cost calculation
  costAmount?: number;
  costCurrency?: string;

  // Metadata
  createdAt: Timestamp;
  recordingDate: Timestamp;
  filename?: string;
}

// ============================================================================
// Monthly Usage Summary
// ============================================================================

export interface MonthlyUsageSummary {
  userId: string;
  subscriptionId?: string;
  month: string; // Format: 'YYYY-MM'

  // Totals
  totalMinutes: number;
  totalJobs: number;

  // By mode
  aiMinutes: number;
  hybridMinutes: number;
  humanMinutes: number;

  // By billing type
  subscriptionMinutes: number;
  creditMinutes: number;

  // Credits
  totalCreditsUsed: number;

  // Period
  periodStart: Timestamp;
  periodEnd: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// Usage Tracking Request
// ============================================================================

export interface TrackUsageRequest {
  transcriptionId: string;
  minutes: number;
  mode: TranscriptionMode;
  recordingDate?: Date;
  filename?: string;
}

export interface TrackUsageResponse {
  usageRecordId: string;
  billingType: BillingType;
  minutesCharged: number;
  creditsCharged?: number;
  remainingMinutes?: number;
  remainingCredits?: number;
}

// ============================================================================
// Credit Usage (for PAYG)
// ============================================================================

export const CREDIT_RATES: Record<TranscriptionMode, number> = {
  ai: 1, // 1 credit per minute
  hybrid: 2, // 2 credits per minute
  human: 3, // 3 credits per minute
};

export interface CreditUsage {
  mode: TranscriptionMode;
  minutes: number;
  creditsRequired: number;
  creditsAvailable: number;
  canProceed: boolean;
}

// ============================================================================
// Subscription Minute Usage
// ============================================================================

export interface SubscriptionMinuteUsage {
  subscriptionId: string;
  planId: string;
  mode: TranscriptionMode;
  minutes: number;
  minutesAvailable: number;
  minutesUsed: number;
  canProceed: boolean;
  willUseCredits: boolean; // If subscription exhausted, fall back to credits
}

// ============================================================================
// Usage Analytics
// ============================================================================

export interface UsageAnalytics {
  userId: string;
  period: 'day' | 'week' | 'month' | 'year' | 'all-time';

  // Aggregates
  totalMinutes: number;
  totalJobs: number;
  totalCost: number;

  // By mode
  breakdown: {
    ai: { minutes: number; jobs: number; cost: number };
    hybrid: { minutes: number; jobs: number; cost: number };
    human: { minutes: number; jobs: number; cost: number };
  };

  // Trends
  averageMinutesPerJob: number;
  mostUsedMode: TranscriptionMode;

  // Time range
  startDate: Date;
  endDate: Date;
}

// ============================================================================
// Overage Tracking
// ============================================================================

export interface OverageRecord {
  id: string;
  userId: string;
  subscriptionId: string;
  billingPeriodStart: Timestamp;
  billingPeriodEnd: Timestamp;

  // Overage details
  overageMinutes: number;
  creditsUsed: number;
  costAmount: number;
  costCurrency: string;

  // Metadata
  createdAt: Timestamp;
}

// ============================================================================
// Usage Alerts
// ============================================================================

export type UsageAlertThreshold = 50 | 75 | 90 | 100;

export interface UsageAlert {
  id: string;
  userId: string;
  subscriptionId: string;
  threshold: UsageAlertThreshold;
  minutesUsed: number;
  minutesIncluded: number;
  usagePercentage: number;
  sentAt: Timestamp;
  acknowledged: boolean;
}

// ============================================================================
// Client-Safe Usage Summary
// ============================================================================

export interface ClientUsageSummary {
  currentPeriod: {
    minutesUsed: number;
    minutesIncluded: number;
    minutesRemaining: number;
    usagePercentage: number;
    overageMinutes: number;
  };
  recentJobs: Array<{
    id: string;
    filename: string;
    minutes: number;
    mode: TranscriptionMode;
    billingType: BillingType;
    createdAt: Date;
  }>;
  alerts: UsageAlert[];
}
