import { loadStripe, type Stripe } from '@stripe/stripe-js';

// Client-side Stripe instance
let stripePromise: Promise<Stripe | null>;
export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

// Credit packages configuration
export const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 1000, // 10 CAD worth
    priceCAD: 10.00,
    priceCredits: 1000,
    popular: false,
  },
  {
    id: 'professional',
    name: 'Professional Pack',
    credits: 5000, // 50 CAD worth
    priceCAD: 45.00, // 10% discount
    priceCredits: 5000,
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pack',
    credits: 12000, // 120 CAD worth
    priceCAD: 100.00, // ~17% discount
    priceCredits: 12000,
    popular: false,
  },
];

// Pricing configuration (credits per minute)
export const TRANSCRIPTION_PRICING = {
  ai: {
    standard: 100, // 1.00 CAD/min -> 100 credits/min
    premium: 150,  // 1.50 CAD/min -> 150 credits/min
  },
  human: {
    standard: 300, // 3.00 CAD/min -> 300 credits/min
    premium: 450,  // 4.50 CAD/min -> 450 credits/min
  },
  hybrid: {
    standard: 175, // 1.75 CAD/min -> 175 credits/min
    premium: 250,  // 2.50 CAD/min -> 250 credits/min
  },
} as const;

// TTT Canada pricing configuration (credits per minute)
export const TTT_CANADA_PRICING = {
  ai_human_review: 175,        // $1.75 CAD/min -> 175 credits/min
  verbatim_multispeaker: 225,  // $2.25 CAD/min -> 225 credits/min
  indigenous_oral: 250,        // $2.50 CAD/min -> 250 credits/min
  legal_dictation: 185,        // $1.85 CAD/min -> 185 credits/min
  copy_typing: 280,            // $2.80 CAD/min -> 280 credits/min
} as const;

// TTT Canada add-on pricing (credits)
export const TTT_CANADA_ADDONS = {
  timestamps: 25,        // $0.25 CAD/min -> 25 credits/min
  anonymization: 35,     // $0.35 CAD/min -> 35 credits/min
  customTemplate: 2500,  // $25.00 CAD -> 2500 credits (one-time)
  rushDelivery: 50,      // $0.50 CAD/min -> 50 credits/min
} as const;

// Helper function to calculate credits needed
export const calculateCreditsNeeded = (
  mode: 'ai' | 'human' | 'hybrid',
  qualityLevel: 'standard' | 'premium',
  durationMinutes: number
): number => {
  const pricePerMinute = TRANSCRIPTION_PRICING[mode][qualityLevel];
  return Math.ceil(durationMinutes * pricePerMinute);
};

// Helper function to calculate TTT Canada credits needed
export const calculateTTTCanadaCredits = (
  serviceType: keyof typeof TTT_CANADA_PRICING,
  durationMinutes: number,
  addOns: {
    timestamps?: boolean;
    anonymization?: boolean;
    customTemplate?: boolean;
    rushDelivery?: boolean;
  } = {}
): {
  baseCredits: number;
  addOnCredits: Record<string, number>;
  totalCredits: number;
} => {
  const baseCredits = Math.ceil(durationMinutes * TTT_CANADA_PRICING[serviceType]);
  const addOnCredits: Record<string, number> = {};
  let addOnTotal = 0;

  if (addOns.timestamps) {
    addOnCredits.timestamps = Math.ceil(durationMinutes * TTT_CANADA_ADDONS.timestamps);
    addOnTotal += addOnCredits.timestamps;
  }

  if (addOns.anonymization) {
    addOnCredits.anonymization = Math.ceil(durationMinutes * TTT_CANADA_ADDONS.anonymization);
    addOnTotal += addOnCredits.anonymization;
  }

  if (addOns.customTemplate) {
    addOnCredits.customTemplate = TTT_CANADA_ADDONS.customTemplate;
    addOnTotal += addOnCredits.customTemplate;
  }

  if (addOns.rushDelivery) {
    addOnCredits.rushDelivery = Math.ceil(durationMinutes * TTT_CANADA_ADDONS.rushDelivery);
    addOnTotal += addOnCredits.rushDelivery;
  }

  return {
    baseCredits,
    addOnCredits,
    totalCredits: baseCredits + addOnTotal
  };
};

// Convert CAD to credits (100 credits = 1 CAD)
export const cadToCredits = (cad: number): number => Math.round(cad * 100);

// Convert credits to CAD
export const creditsToCad = (credits: number): number => credits / 100;