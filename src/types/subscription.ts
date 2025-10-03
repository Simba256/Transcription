import { Timestamp } from 'firebase/firestore';

// Subscription Plan Types
export type SubscriptionPlanId =
  | 'none'
  | 'ai-starter'
  | 'ai-professional'
  | 'ai-enterprise'
  | 'hybrid-starter'
  | 'hybrid-professional'
  | 'hybrid-enterprise';

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'unpaid';

export type TranscriptionMode = 'ai' | 'hybrid' | 'human';

// Subscription Plan Configuration
export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  type: 'ai' | 'hybrid';
  tier: 'starter' | 'professional' | 'enterprise';
  includedMinutes: number;
  price: number; // Monthly price in dollars
  stripePriceId: string;
  features: string[];
  allowedModes: TranscriptionMode[];
  popular?: boolean;
}

// User Subscription Data (stored in users/{userId})
export interface UserSubscriptionData {
  // Subscription identifiers
  subscriptionPlan: SubscriptionPlanId;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;

  // Usage tracking
  includedMinutesPerMonth: number;
  minutesUsedThisMonth: number;
  minutesReserved: number; // For concurrent job handling

  // Billing cycle
  billingCycleStart: Timestamp | null;
  billingCycleEnd: Timestamp | null;
  currentPeriodStart: Timestamp | null;
  currentPeriodEnd: Timestamp | null;

  // Trial information
  trialStart: Timestamp | null;
  trialEnd: Timestamp | null;

  // Cancellation
  cancelAtPeriodEnd: boolean;
  canceledAt: Timestamp | null;

  // Legacy credit system (still active)
  credits: number;
}

// Usage Record (stored in usageRecords collection)
export interface UsageRecord {
  id: string;
  userId: string;
  transcriptionId: string;
  mode: TranscriptionMode;
  minutesUsed: number;
  creditsUsed: number;
  source: 'subscription' | 'credits' | 'overage';
  timestamp: Timestamp;
  billingCycleStart: Timestamp;
  billingCycleEnd: Timestamp;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    duration?: number;
  };
}

// Subscription Usage Summary
export interface SubscriptionUsage {
  planName: string;
  includedMinutes: number;
  minutesUsed: number;
  minutesRemaining: number;
  minutesReserved: number;
  percentageUsed: number;
  billingCycleStart: Date;
  billingCycleEnd: Date;
  daysRemaining: number;
  status: SubscriptionStatus;
  overageMinutes: number;
  overageCreditsUsed: number;
}

// Subscription Change Request
export interface SubscriptionChangeRequest {
  userId: string;
  newPlanId: SubscriptionPlanId;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}

// Subscription Creation Request
export interface SubscriptionCreateRequest {
  userId: string;
  planId: SubscriptionPlanId;
  paymentMethodId: string;
  trialEnabled?: boolean;
}

// Subscription Cancellation Request
export interface SubscriptionCancelRequest {
  userId: string;
  immediate?: boolean; // If true, cancel immediately; otherwise at period end
  reason?: string;
}

// Minute Consumption Request
export interface MinuteConsumptionRequest {
  userId: string;
  transcriptionId: string;
  mode: TranscriptionMode;
  estimatedMinutes: number;
  actualMinutes?: number; // Set when job completes
}

// Minute Consumption Result
export interface MinuteConsumptionResult {
  success: boolean;
  source: 'subscription' | 'credits' | 'insufficient';
  minutesFromSubscription: number;
  creditsUsed: number;
  minutesReserved: number;
  remainingMinutes: number;
  remainingCredits: number;
  message: string;
}

// Admin Analytics Types
export interface SubscriptionAnalytics {
  totalActiveSubscriptions: number;
  subscriptionsByPlan: Record<SubscriptionPlanId, number>;
  totalMonthlyRecurringRevenue: number;
  averageMinutesUsedPerPlan: Record<SubscriptionPlanId, number>;
  churnRate: number;
  trialConversionRate: number;
  overageRevenue: number;
}

// Webhook Event Data
export interface SubscriptionWebhookEvent {
  type: string;
  subscriptionId: string;
  customerId: string;
  userId?: string;
  status: SubscriptionStatus;
  priceId: string;
  currentPeriodStart: number; // Unix timestamp
  currentPeriodEnd: number; // Unix timestamp
  cancelAtPeriodEnd: boolean;
  trialStart?: number;
  trialEnd?: number;
}

// Plan Comparison Data
export interface PlanComparison {
  currentPlan: SubscriptionPlan | null;
  targetPlan: SubscriptionPlan;
  proratedAmount: number;
  immediateCharge: number;
  nextBillingAmount: number;
  effectiveDate: Date;
  minutesDifference: number;
}

// Validation Results
export interface AccessValidationResult {
  hasAccess: boolean;
  reason: string;
  allowedModes: TranscriptionMode[];
  requiresCredits: boolean;
  estimatedCost: number;
}
