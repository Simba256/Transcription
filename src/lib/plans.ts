/**
 * Subscription Plan Configuration
 *
 * Central configuration for all subscription plans and pricing
 */

import { PlanConfig, PlanId, PlanType } from './types/subscription';

// ============================================================================
// Plan Definitions
// ============================================================================

export const SUBSCRIPTION_PLANS: Record<PlanId, PlanConfig> = {
  // ========== AI Plans ==========
  'ai-starter': {
    id: 'ai-starter',
    name: 'AI Starter',
    type: 'ai',
    minutesIncluded: 300,
    priceMonthly: 210,
    currency: 'CAD',
    perMinuteRate: 0.7,
    trialMinutes: 180, // 3 hours free trial
    features: [
      'Automated AI transcription',
      'Speaker detection',
      'Timestamped segments',
      'Export to PDF/DOCX',
      'Audio playback sync',
      'Priority processing',
      '180-minute (3-hour) free trial for new subscriptions',
      'No minute rollover (reset monthly)',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_AI_STARTER_PRICE_ID,
    stripeProductId: process.env.NEXT_PUBLIC_STRIPE_AI_STARTER_PRODUCT_ID,
  },

  'ai-professional': {
    id: 'ai-professional',
    name: 'AI Professional',
    type: 'ai',
    minutesIncluded: 750,
    priceMonthly: 488,
    currency: 'CAD',
    perMinuteRate: 0.65,
    trialMinutes: 180, // 3 hours free trial
    features: [
      'Automated AI transcription',
      'Speaker detection',
      'Timestamped segments',
      'Export to PDF/DOCX',
      'Audio playback sync',
      'Priority processing',
      'Dedicated support',
      '180-minute (3-hour) free trial for new subscriptions',
      'No minute rollover (reset monthly)',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_AI_PROFESSIONAL_PRICE_ID,
    stripeProductId: process.env.NEXT_PUBLIC_STRIPE_AI_PROFESSIONAL_PRODUCT_ID,
  },

  'ai-enterprise': {
    id: 'ai-enterprise',
    name: 'AI Enterprise',
    type: 'ai',
    minutesIncluded: 1500,
    priceMonthly: 900,
    currency: 'CAD',
    perMinuteRate: 0.6,
    trialMinutes: 180, // 3 hours free trial
    features: [
      'Automated AI transcription',
      'Speaker detection',
      'Timestamped segments',
      'Export to PDF/DOCX',
      'Audio playback sync',
      'Priority processing',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      '180-minute (3-hour) free trial for new subscriptions',
      'No minute rollover (reset monthly)',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_AI_ENTERPRISE_PRICE_ID,
    stripeProductId: process.env.NEXT_PUBLIC_STRIPE_AI_ENTERPRISE_PRODUCT_ID,
  },

  // ========== Hybrid Plans ==========
  'hybrid-starter': {
    id: 'hybrid-starter',
    name: 'Hybrid Starter',
    type: 'hybrid',
    minutesIncluded: 300,
    priceMonthly: 325,
    currency: 'CAD',
    perMinuteRate: 1.08,
    trialMinutes: 180, // 3 hours free trial
    features: [
      'AI transcription with human review',
      'Higher accuracy guarantee (99%+)',
      'Quality assurance review',
      'Speaker detection and labeling',
      'Timestamped segments',
      'Export to PDF/DOCX',
      'Audio playback sync',
      'Priority processing',
      'Dedicated support',
      '180-minute (3-hour) free trial for new subscriptions',
      'No minute rollover (reset monthly)',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_HYBRID_STARTER_PRICE_ID,
    stripeProductId: process.env.NEXT_PUBLIC_STRIPE_HYBRID_STARTER_PRODUCT_ID,
  },

  'hybrid-professional': {
    id: 'hybrid-professional',
    name: 'Hybrid Professional',
    type: 'hybrid',
    minutesIncluded: 750,
    priceMonthly: 1050,
    currency: 'CAD',
    perMinuteRate: 1.4,
    trialMinutes: 180, // 3 hours free trial
    features: [
      'AI transcription with human review',
      'Higher accuracy guarantee (99%+)',
      'Quality assurance review',
      'Speaker detection and labeling',
      'Timestamped segments',
      'Export to PDF/DOCX',
      'Audio playback sync',
      'Priority processing',
      'Dedicated account manager',
      'Custom terminology support',
      '180-minute (3-hour) free trial for new subscriptions',
      'No minute rollover (reset monthly)',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_HYBRID_PROFESSIONAL_PRICE_ID,
    stripeProductId: process.env.NEXT_PUBLIC_STRIPE_HYBRID_PROFESSIONAL_PRODUCT_ID,
  },

  'hybrid-enterprise': {
    id: 'hybrid-enterprise',
    name: 'Hybrid Enterprise',
    type: 'hybrid',
    minutesIncluded: 1500,
    priceMonthly: 1950,
    currency: 'CAD',
    perMinuteRate: 1.3,
    trialMinutes: 180, // 3 hours free trial
    features: [
      'AI transcription with human review',
      'Higher accuracy guarantee (99%+)',
      'Quality assurance review',
      'Speaker detection and labeling',
      'Timestamped segments',
      'Export to PDF/DOCX',
      'Audio playback sync',
      'Priority processing',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      '24/7 support',
      'Custom terminology database',
      '180-minute (3-hour) free trial for new subscriptions',
      'No minute rollover (reset monthly)',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_HYBRID_ENTERPRISE_PRICE_ID,
    stripeProductId: process.env.NEXT_PUBLIC_STRIPE_HYBRID_ENTERPRISE_PRODUCT_ID,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get plan configuration by ID
 */
export function getPlanById(planId: PlanId): PlanConfig | undefined {
  return SUBSCRIPTION_PLANS[planId];
}

/**
 * Get all plans of a specific type
 */
export function getPlansByType(type: PlanType): PlanConfig[] {
  return Object.values(SUBSCRIPTION_PLANS).filter((plan) => plan.type === type);
}

/**
 * Get all AI plans
 */
export function getAIPlans(): PlanConfig[] {
  return getPlansByType('ai');
}

/**
 * Get all Hybrid plans
 */
export function getHybridPlans(): PlanConfig[] {
  return getPlansByType('hybrid');
}

/**
 * Get all plans sorted by price
 */
export function getAllPlansSortedByPrice(): PlanConfig[] {
  return Object.values(SUBSCRIPTION_PLANS).sort((a, b) => a.priceMonthly - b.priceMonthly);
}

/**
 * Validate if a plan ID is valid
 */
export function isValidPlanId(planId: string): planId is PlanId {
  return planId in SUBSCRIPTION_PLANS;
}

/**
 * Calculate savings compared to pay-as-you-go
 */
export function calculateSavings(planId: PlanId, creditPricePerMinute: number = 0.01): number {
  const plan = getPlanById(planId);
  if (!plan) return 0;

  const subscriptionCostPerMinute = plan.priceMonthly / plan.minutesIncluded;
  const creditCost = plan.minutesIncluded * creditPricePerMinute;
  const savings = creditCost - plan.priceMonthly;

  return Math.max(0, savings);
}

/**
 * Get recommended plan based on expected monthly usage
 */
export function getRecommendedPlan(
  estimatedMonthlyMinutes: number,
  preferredType: PlanType = 'ai'
): PlanConfig | null {
  const plans = getPlansByType(preferredType).sort(
    (a, b) => a.minutesIncluded - b.minutesIncluded
  );

  // Find the smallest plan that covers the estimated usage
  const recommendedPlan = plans.find((plan) => plan.minutesIncluded >= estimatedMonthlyMinutes);

  // If no plan covers it, return the largest plan
  return recommendedPlan || plans[plans.length - 1] || null;
}

/**
 * Compare two plans
 */
export function comparePlans(planId1: PlanId, planId2: PlanId) {
  const plan1 = getPlanById(planId1);
  const plan2 = getPlanById(planId2);

  if (!plan1 || !plan2) return null;

  return {
    plan1,
    plan2,
    priceDifference: plan2.priceMonthly - plan1.priceMonthly,
    minutesDifference: plan2.minutesIncluded - plan1.minutesIncluded,
    perMinuteRateDifference: plan2.perMinuteRate - plan1.perMinuteRate,
  };
}

// ============================================================================
// Credit Packages (Pay-As-You-Go)
// ============================================================================

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  savings?: number; // Percentage savings
  stripePriceId?: string;
  stripeProductId?: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 1000,
    price: 10,
    currency: 'CAD',
    savings: 0,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_CREDIT_STARTER_PRICE_ID,
    stripeProductId: process.env.NEXT_PUBLIC_STRIPE_CREDIT_STARTER_PRODUCT_ID,
  },
  {
    id: 'professional',
    name: 'Professional Pack',
    credits: 5000,
    price: 45,
    currency: 'CAD',
    savings: 10,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_CREDIT_PROFESSIONAL_PRICE_ID,
    stripeProductId: process.env.NEXT_PUBLIC_STRIPE_CREDIT_PROFESSIONAL_PRODUCT_ID,
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pack',
    credits: 12000,
    price: 100,
    currency: 'CAD',
    savings: 17,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_CREDIT_ENTERPRISE_PRICE_ID,
    stripeProductId: process.env.NEXT_PUBLIC_STRIPE_CREDIT_ENTERPRISE_PRODUCT_ID,
  },
];

/**
 * Get credit package by ID
 */
export function getCreditPackageById(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((pkg) => pkg.id === packageId);
}
