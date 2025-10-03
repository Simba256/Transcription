/**
 * Subscription Types and Interfaces
 *
 * Defines all TypeScript types for the subscription system
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Plan Types
// ============================================================================

export type PlanType = 'ai' | 'hybrid';

export type PlanId =
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
  | 'trialing'
  | 'none';

// ============================================================================
// Plan Configuration
// ============================================================================

export interface PlanConfig {
  id: PlanId;
  name: string;
  type: PlanType;
  minutesIncluded: number;
  priceMonthly: number;
  currency: string;
  perMinuteRate: number;
  features: string[];
  stripePriceId?: string; // Set during Stripe product creation
  stripeProductId?: string;
  trialMinutes?: number; // Free trial allocation
}

// ============================================================================
// Subscription Document (Firestore)
// ============================================================================

export interface Subscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;

  // Plan details
  planId: PlanId;
  planType: PlanType;
  status: SubscriptionStatus;

  // Billing period
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelAtPeriodEnd: boolean;

  // Usage tracking
  minutesIncluded: number;
  minutesUsed: number;
  minutesRemaining: number;

  // Billing
  priceMonthly: number;
  currency: string;

  // Trial
  trialEnd?: Timestamp;
  trialMinutesUsed?: number;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  canceledAt?: Timestamp;
}

// ============================================================================
// Subscription Creation Request
// ============================================================================

export interface CreateSubscriptionRequest {
  planId: PlanId;
  paymentMethodId: string;
}

export interface CreateSubscriptionResponse {
  subscriptionId: string;
  clientSecret?: string; // For 3D Secure authentication
  status: SubscriptionStatus;
  subscription: Subscription;
}

// ============================================================================
// Subscription Update Request
// ============================================================================

export interface UpdateSubscriptionRequest {
  newPlanId: PlanId;
  prorate?: boolean;
}

export interface UpdateSubscriptionResponse {
  subscriptionId: string;
  status: SubscriptionStatus;
  subscription: Subscription;
  prorationAmount?: number;
}

// ============================================================================
// Subscription Cancellation
// ============================================================================

export interface CancelSubscriptionRequest {
  subscriptionId: string;
  immediate?: boolean; // Cancel immediately or at period end
}

export interface CancelSubscriptionResponse {
  subscriptionId: string;
  status: SubscriptionStatus;
  canceledAt: Timestamp;
  accessUntil: Timestamp;
}

// ============================================================================
// Usage Information
// ============================================================================

export interface SubscriptionUsage {
  subscriptionId: string;
  userId: string;
  planId: PlanId;

  // Current period
  periodStart: Timestamp;
  periodEnd: Timestamp;

  // Usage
  minutesIncluded: number;
  minutesUsed: number;
  minutesRemaining: number;
  usagePercentage: number;

  // Overage
  overageMinutes?: number;
  overageCreditsUsed?: number;

  // Status
  status: SubscriptionStatus;
  willRenew: boolean;
}

// ============================================================================
// Plan Preview (for upgrades/downgrades)
// ============================================================================

export interface PlanPreview {
  currentPlan: PlanId;
  newPlan: PlanId;

  // Current period info
  daysRemainingInPeriod: number;
  unusedMinutes: number;

  // Financial preview
  prorationAmount: number;
  immediateCharge: number;
  nextBillingAmount: number;

  // New allocation
  newMinutesIncluded: number;
  newPriceMonthly: number;

  // Effective date
  effectiveDate: Date;
  changeType: 'upgrade' | 'downgrade';
}

// ============================================================================
// Subscription Events (for webhooks)
// ============================================================================

export type SubscriptionEventType =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'subscription.renewed'
  | 'subscription.trial_ended'
  | 'subscription.payment_failed'
  | 'subscription.payment_succeeded';

export interface SubscriptionEvent {
  id: string;
  type: SubscriptionEventType;
  subscriptionId: string;
  userId: string;
  timestamp: Timestamp;
  data: Record<string, any>;
  processed: boolean;
  processedAt?: Timestamp;
}

// ============================================================================
// Client-Safe Subscription (without sensitive data)
// ============================================================================

export interface ClientSubscription {
  id: string;
  planId: PlanId;
  planName: string;
  planType: PlanType;
  status: SubscriptionStatus;

  minutesIncluded: number;
  minutesUsed: number;
  minutesRemaining: number;
  usagePercentage: number;

  priceMonthly: number;
  currency: string;

  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;

  trialEnd?: Date;

  createdAt: Date;
}
