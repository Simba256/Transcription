import { SubscriptionPlan, SubscriptionPlanId, TranscriptionMode } from '@/types/subscription';

/**
 * Subscription Plan Configurations
 *
 * IMPORTANT: Update Stripe Price IDs in environment variables:
 * - NEXT_PUBLIC_STRIPE_PRICE_AI_STARTER
 * - NEXT_PUBLIC_STRIPE_PRICE_AI_PROFESSIONAL
 * - NEXT_PUBLIC_STRIPE_PRICE_AI_ENTERPRISE
 * - NEXT_PUBLIC_STRIPE_PRICE_HYBRID_STARTER
 * - NEXT_PUBLIC_STRIPE_PRICE_HYBRID_PROFESSIONAL
 * - NEXT_PUBLIC_STRIPE_PRICE_HYBRID_ENTERPRISE
 */

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlan | null> = {
  'none': null,

  // AI Plans
  'ai-starter': {
    id: 'ai-starter',
    name: 'AI Starter',
    type: 'ai',
    tier: 'starter',
    includedMinutes: 300,
    price: 210,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_STARTER || '',
    allowedModes: ['ai'],
    features: [
      '300 minutes of AI transcription per month',
      'Automated AI transcription',
      'Speaker detection',
      'Timestamped segments',
      'Export to PDF/DOCX',
      'Audio playback sync',
      '180-minute (3-hour) free trial',
      'No minute rollover (reset monthly)',
      'Pay-as-you-go credits for overages'
    ]
  },

  'ai-professional': {
    id: 'ai-professional',
    name: 'AI Professional',
    type: 'ai',
    tier: 'professional',
    includedMinutes: 750,
    price: 488,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_PROFESSIONAL || '',
    allowedModes: ['ai'],
    popular: true,
    features: [
      '750 minutes of AI transcription per month',
      'All AI Starter features',
      'Priority processing queue',
      'Advanced speaker detection',
      'Batch processing support',
      '180-minute (3-hour) free trial',
      'No minute rollover (reset monthly)',
      'Pay-as-you-go credits for overages'
    ]
  },

  'ai-enterprise': {
    id: 'ai-enterprise',
    name: 'AI Enterprise',
    type: 'ai',
    tier: 'enterprise',
    includedMinutes: 1500,
    price: 900,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_ENTERPRISE || '',
    allowedModes: ['ai'],
    features: [
      '1,500 minutes of AI transcription per month',
      'All AI Professional features',
      'Highest priority processing',
      'Dedicated support',
      'Custom integration options',
      '180-minute (3-hour) free trial',
      'No minute rollover (reset monthly)',
      'Pay-as-you-go credits for overages'
    ]
  },

  // Hybrid Plans
  'hybrid-starter': {
    id: 'hybrid-starter',
    name: 'Hybrid Starter',
    type: 'hybrid',
    tier: 'starter',
    includedMinutes: 300,
    price: 325,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_HYBRID_STARTER || '',
    allowedModes: ['ai', 'hybrid'],
    features: [
      '300 minutes of AI + Hybrid transcription per month',
      'AI and Hybrid mode access',
      'Enhanced accuracy with human review',
      'Speaker detection',
      'Timestamped segments',
      'Export to PDF/DOCX',
      'Audio playback sync',
      '180-minute (3-hour) free trial',
      'No minute rollover (reset monthly)',
      'Pay-as-you-go credits for overages'
    ]
  },

  'hybrid-professional': {
    id: 'hybrid-professional',
    name: 'Hybrid Professional',
    type: 'hybrid',
    tier: 'professional',
    includedMinutes: 750,
    price: 1050,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_HYBRID_PROFESSIONAL || '',
    allowedModes: ['ai', 'hybrid'],
    popular: true,
    features: [
      '750 minutes of AI + Hybrid transcription per month',
      'All Hybrid Starter features',
      'Priority processing queue',
      'Advanced quality controls',
      'Batch processing support',
      'Dedicated reviewer team',
      '180-minute (3-hour) free trial',
      'No minute rollover (reset monthly)',
      'Pay-as-you-go credits for overages'
    ]
  },

  'hybrid-enterprise': {
    id: 'hybrid-enterprise',
    name: 'Hybrid Enterprise',
    type: 'hybrid',
    tier: 'enterprise',
    includedMinutes: 1500,
    price: 1950,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_HYBRID_ENTERPRISE || '',
    allowedModes: ['ai', 'hybrid'],
    features: [
      '1,500 minutes of AI + Hybrid transcription per month',
      'All Hybrid Professional features',
      'Highest priority processing',
      'Premium quality assurance',
      'Dedicated support team',
      'Custom workflow integration',
      'SLA guarantees',
      '180-minute (3-hour) free trial',
      'No minute rollover (reset monthly)',
      'Pay-as-you-go credits for overages'
    ]
  }
};

// Array of all active plans (excluding 'none')
export const ACTIVE_PLANS = Object.values(SUBSCRIPTION_PLANS).filter(
  (plan): plan is SubscriptionPlan => plan !== null
);

// Plans grouped by type
export const AI_PLANS = ACTIVE_PLANS.filter(plan => plan.type === 'ai');
export const HYBRID_PLANS = ACTIVE_PLANS.filter(plan => plan.type === 'hybrid');

/**
 * Transcription Mode Pricing (for credit-based pay-as-you-go)
 */
export const MODE_PRICING = {
  ai: {
    creditsPerMinute: 1,
    name: 'AI Transcription',
    description: 'Fully automated AI-powered transcription'
  },
  hybrid: {
    creditsPerMinute: 2,
    name: 'Hybrid Transcription',
    description: 'AI transcription with human review and correction'
  },
  human: {
    creditsPerMinute: 3,
    name: 'Human Transcription',
    description: 'Fully manual human transcription (credits only)'
  }
} as const;

/**
 * Free Trial Configuration
 * Trial is usage-based (180 minutes of AI transcription), not time-based
 * Users get one trial when they first subscribe, regardless of plan
 */
export const FREE_TRIAL_CONFIG = {
  enabled: true,
  includedMinutes: 180, // 3 hours of AI transcription
  requiresPaymentMethod: false, // No payment method required for trial
  applicablePlans: ['ai-starter', 'ai-professional', 'ai-enterprise', 'hybrid-starter', 'hybrid-professional', 'hybrid-enterprise'] as SubscriptionPlanId[]
};

/**
 * Get plan by ID
 */
export function getPlanById(planId: SubscriptionPlanId): SubscriptionPlan | null {
  return SUBSCRIPTION_PLANS[planId];
}

/**
 * Get plan by Stripe Price ID
 */
export function getPlanByStripePriceId(stripePriceId: string): SubscriptionPlan | null {
  return ACTIVE_PLANS.find(plan => plan.stripePriceId === stripePriceId) || null;
}

/**
 * Check if a plan allows a specific transcription mode
 */
export function planAllowsMode(planId: SubscriptionPlanId, mode: TranscriptionMode): boolean {
  const plan = getPlanById(planId);
  if (!plan) return false;
  return plan.allowedModes.includes(mode);
}

/**
 * Calculate credits required for a transcription
 */
export function calculateCreditsRequired(mode: TranscriptionMode, minutes: number): number {
  const pricing = MODE_PRICING[mode];
  return Math.ceil(minutes * pricing.creditsPerMinute);
}

/**
 * Get recommended plan based on monthly usage
 */
export function getRecommendedPlan(
  estimatedMonthlyMinutes: number,
  needsHybrid: boolean
): SubscriptionPlan {
  const plans = needsHybrid ? HYBRID_PLANS : AI_PLANS;

  // Find the smallest plan that covers the estimated usage
  const suitablePlan = plans.find(plan => plan.includedMinutes >= estimatedMonthlyMinutes);

  // If no plan covers it, return the largest plan
  return suitablePlan || plans[plans.length - 1];
}

/**
 * Calculate potential savings with subscription vs credits
 */
export function calculateSavings(
  monthlyMinutes: number,
  mode: TranscriptionMode
): {
  creditsCost: number;
  subscriptionCost: number;
  savings: number;
  savingsPercentage: number;
  recommendedPlan: SubscriptionPlan;
} {
  const creditsRequired = calculateCreditsRequired(mode, monthlyMinutes);
  const creditsCost = creditsRequired; // Assuming 1 credit = $1 (adjust based on your pricing)

  const recommendedPlan = getRecommendedPlan(monthlyMinutes, mode === 'hybrid');
  const subscriptionCost = recommendedPlan.price;

  const savings = creditsCost - subscriptionCost;
  const savingsPercentage = creditsCost > 0 ? (savings / creditsCost) * 100 : 0;

  return {
    creditsCost,
    subscriptionCost,
    savings,
    savingsPercentage,
    recommendedPlan
  };
}

/**
 * Validate Stripe Price IDs are configured
 */
export function validatePriceIdsConfigured(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  ACTIVE_PLANS.forEach(plan => {
    if (!plan.stripePriceId) {
      missing.push(`NEXT_PUBLIC_STRIPE_PRICE_${plan.id.toUpperCase().replace('-', '_')}`);
    }
  });

  return {
    valid: missing.length === 0,
    missing
  };
}
