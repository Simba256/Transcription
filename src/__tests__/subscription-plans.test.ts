/**
 * Subscription Plans Configuration Tests
 */

import {
  SUBSCRIPTION_PLANS,
  ACTIVE_PLANS,
  AI_PLANS,
  HYBRID_PLANS,
  MODE_PRICING,
  FREE_TRIAL_CONFIG,
  getPlanById,
  getPlanByStripePriceId,
  planAllowsMode,
  calculateCreditsRequired,
  getRecommendedPlan,
  calculateSavings,
  validatePriceIdsConfigured
} from '@/lib/subscriptions/plans';
import { SubscriptionPlanId, TranscriptionMode } from '@/types/subscription';

describe('Subscription Plans Configuration', () => {
  describe('Plan Structure', () => {
    test('should have 6 active plans', () => {
      expect(ACTIVE_PLANS.length).toBe(6);
    });

    test('should have 3 AI plans', () => {
      expect(AI_PLANS.length).toBe(3);
      AI_PLANS.forEach(plan => {
        expect(plan.type).toBe('ai');
      });
    });

    test('should have 3 Hybrid plans', () => {
      expect(HYBRID_PLANS.length).toBe(3);
      HYBRID_PLANS.forEach(plan => {
        expect(plan.type).toBe('hybrid');
      });
    });

    test('AI plans should have correct pricing', () => {
      const aiStarter = getPlanById('ai-starter');
      const aiPro = getPlanById('ai-professional');
      const aiEnterprise = getPlanById('ai-enterprise');

      expect(aiStarter?.price).toBe(210);
      expect(aiPro?.price).toBe(488);
      expect(aiEnterprise?.price).toBe(900);
    });

    test('Hybrid plans should have correct pricing', () => {
      const hybridStarter = getPlanById('hybrid-starter');
      const hybridPro = getPlanById('hybrid-professional');
      const hybridEnterprise = getPlanById('hybrid-enterprise');

      expect(hybridStarter?.price).toBe(325);
      expect(hybridPro?.price).toBe(1050);
      expect(hybridEnterprise?.price).toBe(1950);
    });

    test('All plans should have correct minute allocations', () => {
      const starter = getPlanById('ai-starter');
      const professional = getPlanById('ai-professional');
      const enterprise = getPlanById('ai-enterprise');

      expect(starter?.includedMinutes).toBe(300);
      expect(professional?.includedMinutes).toBe(750);
      expect(enterprise?.includedMinutes).toBe(1500);
    });
  });

  describe('Plan Mode Permissions', () => {
    test('AI plans should only allow AI mode', () => {
      const aiPlans: SubscriptionPlanId[] = ['ai-starter', 'ai-professional', 'ai-enterprise'];

      aiPlans.forEach(planId => {
        expect(planAllowsMode(planId, 'ai')).toBe(true);
        expect(planAllowsMode(planId, 'hybrid')).toBe(false);
        expect(planAllowsMode(planId, 'human')).toBe(false);
      });
    });

    test('Hybrid plans should allow AI and Hybrid modes', () => {
      const hybridPlans: SubscriptionPlanId[] = ['hybrid-starter', 'hybrid-professional', 'hybrid-enterprise'];

      hybridPlans.forEach(planId => {
        expect(planAllowsMode(planId, 'ai')).toBe(true);
        expect(planAllowsMode(planId, 'hybrid')).toBe(true);
        expect(planAllowsMode(planId, 'human')).toBe(false);
      });
    });

    test('None plan should not allow any modes', () => {
      expect(planAllowsMode('none', 'ai')).toBe(false);
      expect(planAllowsMode('none', 'hybrid')).toBe(false);
      expect(planAllowsMode('none', 'human')).toBe(false);
    });
  });

  describe('Credit Calculations', () => {
    test('AI mode should cost 1 credit per minute', () => {
      expect(calculateCreditsRequired('ai', 60)).toBe(60);
      expect(calculateCreditsRequired('ai', 120)).toBe(120);
      expect(calculateCreditsRequired('ai', 30.5)).toBe(31); // Rounds up
    });

    test('Hybrid mode should cost 2 credits per minute', () => {
      expect(calculateCreditsRequired('hybrid', 60)).toBe(120);
      expect(calculateCreditsRequired('hybrid', 120)).toBe(240);
      expect(calculateCreditsRequired('hybrid', 30.5)).toBe(61); // Rounds up
    });

    test('Human mode should cost 3 credits per minute', () => {
      expect(calculateCreditsRequired('human', 60)).toBe(180);
      expect(calculateCreditsRequired('human', 120)).toBe(360);
      expect(calculateCreditsRequired('human', 30.5)).toBe(92); // Rounds up
    });
  });

  describe('Plan Recommendations', () => {
    test('should recommend correct AI plan based on usage', () => {
      const plan200 = getRecommendedPlan(200, false);
      const plan500 = getRecommendedPlan(500, false);
      const plan1000 = getRecommendedPlan(1000, false);
      const plan2000 = getRecommendedPlan(2000, false);

      expect(plan200.id).toBe('ai-starter'); // 300 minutes
      expect(plan500.id).toBe('ai-professional'); // 750 minutes
      expect(plan1000.id).toBe('ai-professional'); // 750 minutes
      expect(plan2000.id).toBe('ai-enterprise'); // 1500 minutes (largest)
    });

    test('should recommend correct Hybrid plan based on usage', () => {
      const plan200 = getRecommendedPlan(200, true);
      const plan500 = getRecommendedPlan(500, true);
      const plan1000 = getRecommendedPlan(1000, true);

      expect(plan200.id).toBe('hybrid-starter');
      expect(plan500.id).toBe('hybrid-professional');
      expect(plan1000.id).toBe('hybrid-professional');
    });
  });

  describe('Savings Calculations', () => {
    test('should calculate savings for AI transcription', () => {
      const savings = calculateSavings(500, 'ai');

      // 500 minutes * 1 credit = 500 credits vs $488 subscription
      expect(savings.creditsCost).toBe(500);
      expect(savings.subscriptionCost).toBe(488);
      expect(savings.savings).toBe(12);
      expect(savings.savingsPercentage).toBeClosedTo(2.4, 1);
      expect(savings.recommendedPlan.id).toBe('ai-professional');
    });

    test('should calculate savings for Hybrid transcription', () => {
      const savings = calculateSavings(500, 'hybrid');

      // 500 minutes * 2 credits = 1000 credits vs $1050 subscription
      expect(savings.creditsCost).toBe(1000);
      expect(savings.subscriptionCost).toBe(1050);
      expect(savings.savings).toBe(-50); // More expensive with subscription
      expect(savings.recommendedPlan.id).toBe('hybrid-professional');
    });
  });

  describe('Free Trial Configuration', () => {
    test('should have correct trial configuration', () => {
      expect(FREE_TRIAL_CONFIG.enabled).toBe(true);
      expect(FREE_TRIAL_CONFIG.durationDays).toBe(30);
      expect(FREE_TRIAL_CONFIG.includedMinutes).toBe(180); // 3 hours
      expect(FREE_TRIAL_CONFIG.requiresPaymentMethod).toBe(true);
      expect(FREE_TRIAL_CONFIG.autoConvertToPaid).toBe(true);
    });

    test('should include all plans in trial', () => {
      expect(FREE_TRIAL_CONFIG.applicablePlans).toHaveLength(6);
      expect(FREE_TRIAL_CONFIG.applicablePlans).toContain('ai-starter');
      expect(FREE_TRIAL_CONFIG.applicablePlans).toContain('hybrid-enterprise');
    });
  });

  describe('Helper Functions', () => {
    test('getPlanById should return correct plan', () => {
      const plan = getPlanById('ai-professional');
      expect(plan).not.toBeNull();
      expect(plan?.name).toBe('AI Professional');
      expect(plan?.popular).toBe(true);
    });

    test('getPlanById should return null for invalid plan', () => {
      const plan = getPlanById('invalid-plan' as SubscriptionPlanId);
      expect(plan).toBeUndefined();
    });

    test('getPlanById should return null for none plan', () => {
      const plan = getPlanById('none');
      expect(plan).toBeNull();
    });
  });

  describe('Mode Pricing', () => {
    test('should have correct mode pricing structure', () => {
      expect(MODE_PRICING.ai.creditsPerMinute).toBe(1);
      expect(MODE_PRICING.hybrid.creditsPerMinute).toBe(2);
      expect(MODE_PRICING.human.creditsPerMinute).toBe(3);
    });

    test('should have descriptive names', () => {
      expect(MODE_PRICING.ai.name).toBe('AI Transcription');
      expect(MODE_PRICING.hybrid.name).toBe('Hybrid Transcription');
      expect(MODE_PRICING.human.name).toBe('Human Transcription');
    });
  });
});

// Helper function for floating point comparison
expect.extend({
  toBeClosedTo(received: number, expected: number, precision: number = 2) {
    const pass = Math.abs(received - expected) < Math.pow(10, -precision);
    return {
      pass,
      message: () => `expected ${received} to be close to ${expected} (precision: ${precision})`
    };
  }
});
