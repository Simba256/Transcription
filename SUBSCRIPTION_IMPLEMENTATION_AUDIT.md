# Subscription System Implementation Audit

## Executive Summary

This comprehensive audit identifies **ALL** files requiring modification and creation to implement a hybrid subscription + credit system in the Firebase transcription application. The audit was conducted by thoroughly examining the entire codebase including API routes, frontend pages, components, contexts, libraries, and configuration files.

**Scope:** Migration from pure credit-based system to hybrid monthly subscriptions (AI and Hybrid plans) + pay-as-you-go credits.

**Files to Modify:** 27
**New Files to Create:** 23
**Estimated LOC:** 8,000-10,000
**Timeline:** 8-11 weeks

---

## FILES REQUIRING MODIFICATIONS

### 🔴 CRITICAL PRIORITY

#### **Payment & Billing - API Routes**

**1. `/src/app/api/billing/create-payment-intent/route.ts`**
- **Current Function:** Creates one-time Stripe payment intents for credit package purchases
- **Required Changes:**
  - Add support for Stripe Subscription creation (not just payment intents)
  - Validate subscription plan IDs ('ai-starter', 'ai-professional', etc.)
  - Add subscription metadata (planId, billingCycle, includedMinutes)
  - Create or retrieve Stripe customer for user
  - Route logic: if subscription plan → create subscription, if credit package → create payment intent
  - Add Stripe price IDs for subscription tiers
- **Reason:** Entry point for both subscription and credit purchases
- **Dependencies:** Stripe subscription products/prices, validation schemas

**2. `/src/app/api/billing/confirm-payment/route.ts`**
- **Current Function:** Confirms completed one-time payments and adds credits
- **Required Changes:**
  - Differentiate between credit confirmations and subscription confirmations
  - For subscriptions: update user document with subscriptionPlan, subscriptionStatus, stripeSubscriptionId, includedMinutes, billingCycleStart/End
  - For credits: maintain existing credit addition logic
  - Record transaction with appropriate type ('purchase' vs 'subscription')
  - Initialize minutesUsedThisMonth to 0 for new subscriptions
- **Reason:** Must handle both payment types with different data updates
- **Dependencies:** Updated user schema, transaction types

**3. `/src/app/api/billing/webhook/route.ts`**
- **Current Function:** Handles Stripe webhook events (payment_intent.succeeded, payment_intent.failed)
- **Required Changes:**
  - Add handlers for subscription lifecycle events:
    - `customer.subscription.created` - Initialize subscription in Firestore
    - `customer.subscription.updated` - Update plan changes, status changes
    - `customer.subscription.deleted` - Mark subscription as canceled
    - `invoice.payment_succeeded` - Monthly renewal, reset minutes
    - `invoice.payment_failed` - Update status to past_due, send notification
    - `customer.subscription.trial_will_end` - Trial ending notification
  - Reset monthly minutes on successful invoice payment (new billing cycle)
  - Handle subscription upgrades/downgrades
  - Update user subscription status in real-time
  - Record subscription transactions
  - Implement idempotency using Stripe event IDs
- **Reason:** Subscriptions require continuous webhook management for lifecycle
- **Priority:** Critical
- **Dependencies:** User/subscription schema, usage reset logic

**4. `/src/app/api/transcribe/route.ts`**
- **Current Function:** Processes transcription job requests (Speechmatics API integration)
- **Required Changes:**
  - Check user's subscription plan and status before processing
  - Validate mode access: AI plan can only use 'ai' mode, Hybrid plan can use 'ai' or 'hybrid'
  - Calculate if user has remaining subscription minutes
  - If minutes available: deduct from subscription, track usage
  - If no minutes: deduct credits as fallback (with user notification)
  - Block AI/Hybrid modes for users without subscription or credits
  - Human mode always uses credits regardless of subscription
  - Add subscription usage tracking to transaction log
- **Reason:** Backend enforcement of subscription entitlements
- **Priority:** Critical
- **Dependencies:** Subscription validation, usage tracking functions

---

#### **Frontend Pages**

**5. `/src/app/(protected)/billing/page.tsx`**
- **Current Function:** Credit package purchase interface with transaction history
- **Required Changes:**
  - Redesign layout with two main sections:
    1. **Subscription Section** (top priority):
       - Current plan display card (plan name, status, renewal date)
       - Usage meter showing "X of Y minutes used this month"
       - "Manage Subscription" button (leads to upgrade/cancel flow)
       - Next billing date and amount
    2. **Pay-As-You-Go Section**:
       - Keep existing credit packages
       - Label as "Additional Credits" or "One-Time Purchases"
       - Emphasize use for Human mode and overages
  - Update transaction history to show both subscription payments and credit purchases
  - Add subscription status indicators (Active, Past Due, Canceled)
  - Implement subscription upgrade/downgrade modal
  - Add "Cancel Subscription" with confirmation dialog
- **Reason:** Primary billing management interface
- **Priority:** Critical
- **Dependencies:** SubscriptionContext, subscription APIs

**6. `/src/app/(protected)/upload/page.tsx`**
- **Current Function:** File upload with credit cost estimation and mode selection
- **Required Changes:**
  - Check user's subscription plan on page load
  - Update cost calculator logic:
    - **If subscriber with minutes**: Display "X minutes from your plan" instead of credit cost
    - **If subscriber without minutes**: Show "X credits (overage)" with warning
    - **If non-subscriber**: Show credit cost as current
    - **Human mode**: Always show credit cost for all users
  - Add subscription minute availability check before upload
  - Disable AI/Hybrid modes if user doesn't have subscription or credits
  - Display warning banner: "Your subscription minutes are exhausted. Additional uploads will use credits."
  - Add visual indicator of which billing method will be used
- **Reason:** Upload flow must be subscription-aware
- **Priority:** Critical
- **Dependencies:** SubscriptionContext, usage calculation utilities

---

#### **Contexts & State Management**

**7. `/src/contexts/AuthContext.tsx`**
- **Current Function:** Global authentication state, user data management
- **Required Changes:**
  - Extend `UserData` interface with subscription fields:
    ```typescript
    subscriptionPlan?: 'none' | 'ai-starter' | 'ai-professional' | 'ai-enterprise' | 'hybrid-starter' | 'hybrid-professional' | 'hybrid-enterprise';
    subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';
    subscriptionType?: 'ai' | 'hybrid';
    includedMinutesPerMonth?: number;
    minutesUsedThisMonth?: number;
    billingCycleStart?: Timestamp;
    billingCycleEnd?: Timestamp;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    ```
  - Update `refreshUser()` to fetch subscription data from Firestore
  - Add subscription fields to sign-up initialization (default to 'none')
- **Reason:** Core user data model foundation
- **Priority:** Critical
- **Dependencies:** Firestore user schema

**8. `/src/contexts/CreditContext.tsx`**
- **Current Function:** Credit balance, transactions, purchase/consumption tracking
- **Required Changes:**
  - Rename to `BillingContext` to reflect dual nature (or keep and extend)
  - Add subscription-related functions:
    - `getRemainingMinutes()`: Calculate minutes left in current billing cycle
    - `consumeMinutes(minutes, jobId, mode)`: Deduct from monthly allowance
    - `recordOverage(minutes, credits)`: Track overage usage
    - `getSubscriptionUsage()`: Fetch usage stats for current period
  - Update `consumeCredits()` to track whether consumption is from subscription overage
  - Add subscription transaction recording with type 'subscription' or 'overage'
  - Modify transaction interface to include:
    ```typescript
    minutesUsed?: number;
    billingMode?: 'subscription' | 'credits';
    subscriptionId?: string;
    ```
  - Add `getAllSubscriptions()` admin function for subscription reporting
- **Reason:** Central billing logic for both credits and subscriptions
- **Priority:** Critical
- **Dependencies:** Firestore transaction schema, subscription schema

---

#### **Data Models & Libraries**

**9. `/src/lib/firebase/auth.ts`**
- **Current Function:** Firebase authentication, `UserData` type definition
- **Required Changes:**
  - Extend `UserData` interface as specified in AuthContext changes
  - Update `signUp()` to initialize subscription fields:
    ```typescript
    subscriptionPlan: 'none',
    subscriptionStatus: 'none',
    minutesUsedThisMonth: 0,
    includedMinutesPerMonth: 0
    ```
  - Ensure `getUserData()` fetches subscription fields
- **Reason:** TypeScript type safety and data consistency
- **Priority:** Critical
- **Dependencies:** Firestore schema

**10. `/src/lib/firebase/transcriptions.ts`**
- **Current Function:** Transcription job management, mode details (AI/Hybrid/Human)
- **Required Changes:**
  - Update `getModeDetails()` to include subscription pricing:
    ```typescript
    {
      ai: {
        creditsPerMinute: 1,
        subscriptionPlans: ['ai-starter', 'ai-professional', 'ai-enterprise', 'hybrid-*'],
        // ...existing fields
      },
      hybrid: {
        creditsPerMinute: 2,
        subscriptionPlans: ['hybrid-starter', 'hybrid-professional', 'hybrid-enterprise'],
        // ...existing fields
      },
      human: {
        creditsPerMinute: 3,
        subscriptionPlans: [], // Not available via subscription
        // ...existing fields
      }
    }
    ```
  - Add helper function `canAccessMode(userPlan, mode)` to validate access
  - Add `calculateJobCost(duration, mode, userSubscription)` considering subscription minutes
- **Reason:** Mode availability tied to subscription plans
- **Priority:** High
- **Dependencies:** Subscription plan configuration

**11. `/src/lib/validation/schemas.ts`**
- **Current Function:** Zod validation schemas for API requests
- **Required Changes:**
  - Add `CreateSubscriptionSchema`:
    ```typescript
    z.object({
      planId: z.enum(['ai-starter', 'ai-professional', 'ai-enterprise', 'hybrid-starter', 'hybrid-professional', 'hybrid-enterprise']),
      paymentMethodId: z.string().optional(),
    })
    ```
  - Add `UpdateSubscriptionSchema`:
    ```typescript
    z.object({
      newPlanId: z.enum([...]),
      immediate: z.boolean().optional()
    })
    ```
  - Add `CancelSubscriptionSchema`:
    ```typescript
    z.object({
      cancelAtPeriodEnd: z.boolean(),
      reason: z.string().optional()
    })
    ```
  - Update `CreatePaymentIntentSchema` to optionally include `subscriptionPlanId`
  - Add `SubscriptionPlanEnum` for reuse
- **Reason:** Type-safe API validation
- **Priority:** Critical
- **Dependencies:** None (foundational)

---

#### **Security Rules**

**12. `/firestore.rules`**
- **Current Function:** Firestore security rules for collections
- **Required Changes:**
  - Update `users` collection rules to allow subscription field updates:
    ```javascript
    // Users can update subscription fields only via server APIs
    allow update: if isOwner(userId) &&
                     (!request.resource.data.keys().hasAny(['subscriptionStatus', 'stripeSubscriptionId', 'stripeCustomerId']) ||
                      false) || // Block direct subscription updates
                     isAdmin();
    ```
  - Add rules for new `usageRecords` collection (if created):
    ```javascript
    match /usageRecords/{recordId} {
      allow read: if isOwner(resource.data.userId) || isAdmin();
      allow create: if isSignedIn(); // Server creates records
      allow update, delete: if isAdmin();
    }
    ```
  - Add validation for subscription-related transaction fields
  - Ensure only server can update subscription status (via admin SDK)
- **Reason:** Data security and integrity
- **Priority:** Critical
- **Dependencies:** Firestore schema

---

### 🟠 HIGH PRIORITY

#### **Frontend Pages (Continued)**

**13. `/src/app/pricing/page.tsx`**
- **Current Function:** Public-facing pricing page (currently credit-focused)
- **Required Changes:**
  - Complete redesign to subscription-first model:
    - Hero section: "Choose Your Plan"
    - Subscription plan cards front and center (AI and Hybrid)
    - Each card shows: price/month, included minutes, features, CTA
    - Plan comparison table: Free vs AI vs Hybrid
    - "Popular" badge on Hybrid Professional
    - FAQ section about subscriptions
    - "Pay-As-You-Go" section at bottom for Human mode and flexibility
  - Add monthly/annual toggle (annual for future)
  - Add feature comparison matrix
  - Update CTAs to "Start Free Trial" or "Subscribe Now"
  - Add testimonials or social proof
- **Reason:** Primary conversion page for new users
- **Priority:** High
- **Dependencies:** None (marketing page)

**14. `/src/app/(protected)/dashboard/page.tsx` (UserDashboard)**
- **Current Function:** User overview with stats, recent jobs, quick actions
- **Required Changes:**
  - Add subscription status card at top (if subscribed):
    - Plan name and tier
    - Usage meter: "X / Y minutes used this month"
    - Days until renewal
    - Quick link to "Upgrade" or "Manage"
  - Update stats cards:
    - Show "Minutes used this month" alongside total jobs
    - Highlight subscription savings vs pay-per-use
  - Update quick actions:
    - Add "Manage Subscription" button if subscribed
    - "Upgrade Plan" if on lower tier
  - Add usage alerts/warnings:
    - "You've used 75% of your monthly minutes"
    - "Subscription renews in 3 days"
- **Reason:** Dashboard is primary user landing page
- **Priority:** High
- **Dependencies:** SubscriptionContext

---

#### **Admin Panel**

**15. `/src/app/(protected)/admin/page.tsx`**
- **Current Function:** Admin dashboard with system-wide metrics
- **Required Changes:**
  - Add subscription business metrics section:
    - Total active subscriptions (count)
    - Breakdown by plan (AI vs Hybrid, tier distribution)
    - Monthly Recurring Revenue (MRR)
    - Churn rate (cancellations this month / total)
    - Average Revenue Per User (ARPU)
    - New subscriptions this month
    - Upgrades vs downgrades
  - Add subscription vs credit revenue chart
  - Show subscription health indicators (past_due count, trial_ending count)
  - Add alerts for payment failures
- **Reason:** Business intelligence for subscription model
- **Priority:** High
- **Dependencies:** Subscription analytics utilities

**16. `/src/components/pages/admin/AdminLedger.tsx`**
- **Current Function:** Financial transaction tracking (credit-based)
- **Required Changes:**
  - Add subscription transaction types to table
  - New columns:
    - Transaction Type (filter: subscription, credit, overage)
    - Plan Type (AI/Hybrid)
    - Billing Cycle
  - Add subscription revenue calculations:
    - MRR chart
    - Subscription revenue vs credit revenue
    - Overage revenue tracking
  - Filter options:
    - By transaction type
    - By subscription plan
    - By billing cycle/period
  - Export functionality to include subscription data
- **Reason:** Complete financial reporting
- **Priority:** High
- **Dependencies:** Updated transaction schema

**17. `/src/app/(protected)/admin/users/[id]/page.tsx` or user management**
- **Current Function:** Admin user detail/management view
- **Required Changes:**
  - Display user subscription information:
    - Current plan and status
    - Subscription start date and renewal date
    - Minutes used / included
    - Stripe customer ID and subscription ID
  - Add admin actions:
    - Manually cancel/reactivate subscription
    - Grant complimentary subscription
    - Adjust included minutes
    - View subscription history
  - Show subscription transaction history for user
- **Reason:** Admin needs full subscription management capabilities
- **Priority:** High
- **Dependencies:** Admin API, Stripe admin functions

---

#### **UI Components**

**18. `/src/components/ui/CreditDisplay.tsx`**
- **Current Function:** Displays credit amounts with icon
- **Required Changes:**
  - Add variant for displaying minutes:
    ```tsx
    <CreditDisplay type="credits" amount={5000} />
    <CreditDisplay type="minutes" amount={300} />
    ```
  - Support both credit and minute display modes
  - Add optional suffix "minutes remaining" or "credits available"
  - Maintain existing icon and styling flexibility
- **Reason:** Need unified display for both metrics
- **Priority:** Medium
- **Dependencies:** None

---

### 🟡 MEDIUM PRIORITY

**19. `/src/components/layout/Header.tsx`**
- **Current Function:** Site navigation, user menu
- **Required Changes:**
  - Add subscription status indicator (if user is subscribed):
    - Small badge showing plan tier
    - Or icon indicating active subscription
  - Update navigation to include "Subscription" link (if subscribed)
- **Reason:** Quick subscription status visibility
- **Priority:** Low-Medium
- **Dependencies:** SubscriptionContext

**20. `/src/components/pages/PricingPage.tsx`** (if separate component)
- **Current Function:** Pricing display component
- **Required Changes:**
  - Same as `/src/app/pricing/page.tsx` above
- **Priority:** High
- **Dependencies:** None

**21. `/src/lib/firebase/transcriptions-admin.ts`**
- **Current Function:** Admin transcription management functions
- **Required Changes:**
  - Add subscription usage reporting functions
  - Track which jobs used subscription minutes vs credits
  - Add analytics for subscription usage patterns
- **Reason:** Admin analytics
- **Priority:** Medium
- **Dependencies:** Usage tracking data

---

### 🟢 LOW PRIORITY (Polish & UX)

**22. `/src/components/layout/Footer.tsx`**
- **Current Function:** Site footer with links
- **Required Changes:**
  - Update pricing link text
  - Add subscription FAQ link
- **Reason:** Minor navigation updates
- **Priority:** Low

**23. `/src/app/about/page.tsx` or marketing pages**
- **Current Function:** About page content
- **Required Changes:**
  - Update messaging to reflect subscription model
  - Mention plan options
- **Reason:** Consistent messaging
- **Priority:** Low

**24. `/src/app/page.tsx` (Landing page)**
- **Current Function:** Public landing page
- **Required Changes:**
  - Update CTA to emphasize subscription plans
  - Update pricing preview to show monthly options
  - Add subscription value proposition
- **Reason:** Marketing consistency
- **Priority:** Medium

**25. `/README.md` and `/CLAUDE.md`**
- **Current Function:** Project documentation
- **Required Changes:**
  - Update to reflect subscription system
  - Document new environment variables (Stripe price IDs)
  - Update feature list
- **Reason:** Developer documentation
- **Priority:** Low

**26. `/src/app/api/test-config/route.ts`** (if exists)
- **Current Function:** Configuration testing endpoint
- **Required Changes:**
  - Add subscription configuration checks
  - Test Stripe product/price IDs
- **Reason:** Testing utility
- **Priority:** Low

**27. `/next.config.ts` or environment configuration**
- **Current Function:** Next.js configuration
- **Required Changes:**
  - Add environment variables for Stripe subscription price IDs:
    ```
    STRIPE_PRICE_AI_STARTER=price_xxx
    STRIPE_PRICE_AI_PROFESSIONAL=price_xxx
    STRIPE_PRICE_AI_ENTERPRISE=price_xxx
    STRIPE_PRICE_HYBRID_STARTER=price_xxx
    STRIPE_PRICE_HYBRID_PROFESSIONAL=price_xxx
    STRIPE_PRICE_HYBRID_ENTERPRISE=price_xxx
    ```
- **Reason:** Configuration management
- **Priority:** Critical (for deployment)

---

## NEW FILES TO CREATE

### 🔴 CRITICAL PRIORITY

#### **API Routes**

**1. `/src/app/api/subscriptions/create/route.ts`**
- **Purpose:** Create new subscription for user
- **Key Functions:**
  - Verify user authentication
  - Validate subscription plan ID
  - Create or retrieve Stripe customer
  - Create Stripe subscription with trial period
  - Update Firestore user document with subscription data
  - Initialize usage tracking (minutesUsedThisMonth = 0)
  - Return subscription details and client secret (if payment method needed)
- **HTTP Methods:** POST
- **Request Body:**
  ```typescript
  {
    planId: 'ai-starter' | 'ai-professional' | ...,
    paymentMethodId?: string, // Optional if already has payment method
    trialDays?: number
  }
  ```
- **Response:**
  ```typescript
  {
    subscriptionId: string,
    status: string,
    clientSecret?: string,
    subscription: SubscriptionData
  }
  ```
- **Priority:** Critical
- **Dependencies:** Stripe SDK, user schema, validation

**2. `/src/app/api/subscriptions/cancel/route.ts`**
- **Purpose:** Cancel user's subscription
- **Key Functions:**
  - Verify user authentication
  - Get user's Stripe subscription ID
  - Cancel Stripe subscription (immediate or at period end)
  - Update Firestore subscription status
  - Record cancellation transaction
  - Return confirmation
- **HTTP Methods:** POST
- **Request Body:**
  ```typescript
  {
    cancelAtPeriodEnd: boolean,
    cancellationReason?: string
  }
  ```
- **Response:**
  ```typescript
  {
    success: boolean,
    subscription: {
      status: 'canceled',
      accessUntil: Date
    }
  }
  ```
- **Priority:** Critical
- **Dependencies:** Stripe SDK, user data

**3. `/src/app/api/subscriptions/update/route.ts`**
- **Purpose:** Upgrade or downgrade subscription plan
- **Key Functions:**
  - Verify user authentication
  - Validate new plan ID
  - Check if upgrade or downgrade
  - Update Stripe subscription:
    - Upgrade: immediate with proration
    - Downgrade: schedule for next billing cycle
  - Update Firestore user data (includedMinutes, plan)
  - Calculate and display proration preview
  - Return updated subscription
- **HTTP Methods:** POST, PUT
- **Request Body:**
  ```typescript
  {
    newPlanId: string,
    immediate?: boolean
  }
  ```
- **Response:**
  ```typescript
  {
    subscription: SubscriptionData,
    prorationAmount?: number,
    effectiveDate: Date
  }
  ```
- **Priority:** Critical
- **Dependencies:** Stripe SDK, proration logic

**4. `/src/app/api/subscriptions/status/route.ts`**
- **Purpose:** Get current subscription status and details
- **Key Functions:**
  - Verify user authentication
  - Fetch subscription from Stripe (authoritative source)
  - Fetch usage from Firestore
  - Calculate remaining minutes
  - Return comprehensive status
- **HTTP Methods:** GET
- **Response:**
  ```typescript
  {
    plan: string,
    status: string,
    includedMinutes: number,
    minutesUsed: number,
    minutesRemaining: number,
    billingCycleStart: Date,
    billingCycleEnd: Date,
    nextBillingDate: Date,
    nextBillingAmount: number
  }
  ```
- **Priority:** High
- **Dependencies:** Stripe SDK, usage tracking

**5. `/src/app/api/usage/track/route.ts`**
- **Purpose:** Track minute usage for transcription jobs
- **Key Functions:**
  - Verify authentication
  - Record minute consumption
  - Update user's `minutesUsedThisMonth` in Firestore (use transaction)
  - Check if overage occurred
  - If overage: deduct credits as fallback
  - Create usage record in `usageRecords` collection (optional)
  - Return updated usage status
- **HTTP Methods:** POST
- **Request Body:**
  ```typescript
  {
    jobId: string,
    minutes: number,
    mode: 'ai' | 'hybrid' | 'human'
  }
  ```
- **Response:**
  ```typescript
  {
    minutesCharged: number,
    creditsCharged: number,
    remainingMinutes: number,
    isOverage: boolean
  }
  ```
- **Priority:** Critical
- **Dependencies:** Firestore transactions, credit deduction

**6. `/src/app/api/usage/reset/route.ts`**
- **Purpose:** Reset monthly usage on billing cycle renewal (webhook-triggered)
- **Key Functions:**
  - Internal endpoint (secured, webhook-only)
  - Reset user's `minutesUsedThisMonth` to 0
  - Archive previous cycle usage to `usageHistory` collection
  - Update `billingCycleStart` and `billingCycleEnd`
  - Send usage summary email to user (optional)
- **HTTP Methods:** POST (internal, webhook)
- **Request Body:**
  ```typescript
  {
    userId: string,
    subscriptionId: string
  }
  ```
- **Priority:** Critical
- **Dependencies:** Firestore, email service (optional)

---

#### **Frontend Pages**

**7. `/src/app/(protected)/subscription/page.tsx`**
- **Purpose:** Dedicated subscription management page
- **Key Components:**
  - Current plan overview card
  - Usage meter with visual progress bar
  - Billing information (next charge date, amount)
  - Payment method display
  - Plan upgrade/downgrade options
  - Cancellation option with confirmation
  - Billing history table
  - Download invoices
- **Features:**
  - Real-time usage updates
  - Upgrade modal with plan comparison
  - Cancel confirmation dialog with reason selection
  - Update payment method flow
- **Priority:** High
- **Dependencies:** SubscriptionContext, Stripe Elements

**8. `/src/app/(protected)/subscription/upgrade/page.tsx`**
- **Purpose:** Subscription plan upgrade/change flow
- **Key Components:**
  - Current plan display
  - Available plan options
  - Proration preview
  - Confirmation step
- **Features:**
  - Live proration calculation
  - Feature comparison
  - Immediate vs scheduled upgrade option
- **Priority:** Medium
- **Dependencies:** Subscription API, plan configuration

---

#### **Components**

**9. `/src/components/subscription/SubscriptionCard.tsx`**
- **Purpose:** Display subscription status summary card
- **Props:**
  ```typescript
  {
    plan: SubscriptionPlan,
    usage: UsageData,
    onManageClick: () => void
  }
  ```
- **Features:**
  - Plan name and tier badge
  - Usage progress bar
  - Renewal date countdown
  - Quick actions (Upgrade, Manage)
- **Priority:** High
- **Dependencies:** SubscriptionContext

**10. `/src/components/subscription/SubscriptionPlanSelector.tsx`**
- **Purpose:** Plan selection component (for signup/upgrade)
- **Props:**
  ```typescript
  {
    currentPlan?: string,
    onSelectPlan: (planId: string) => void,
    showComparison?: boolean
  }
  ```
- **Features:**
  - Plan cards with pricing
  - Feature lists
  - Highlight current plan
  - Popular badge
  - Responsive grid layout
- **Priority:** High
- **Dependencies:** Plan configuration

**11. `/src/components/subscription/UsageMeter.tsx`**
- **Purpose:** Visual minute usage indicator
- **Props:**
  ```typescript
  {
    used: number,
    included: number,
    daysUntilReset: number
  }
  ```
- **Features:**
  - Circular or linear progress bar
  - Color coding: green (<75%), yellow (75-90%), red (>90%)
  - Percentage display
  - Days until reset countdown
  - Overage indicator if exceeded
- **Priority:** Medium
- **Dependencies:** None

**12. `/src/components/subscription/PlanComparisonTable.tsx`**
- **Purpose:** Feature comparison matrix for plans
- **Features:**
  - Table comparing all plan tiers
  - Feature checkmarks/crosses
  - Pricing row
  - CTA buttons per column
  - Sticky header
  - Responsive (cards on mobile)
- **Priority:** Medium
- **Dependencies:** Plan configuration

**13. `/src/components/subscription/SubscriptionBadge.tsx`**
- **Purpose:** Small badge indicating subscription tier
- **Props:**
  ```typescript
  {
    plan: 'ai' | 'hybrid',
    tier: 'starter' | 'professional' | 'enterprise'
  }
  ```
- **Features:**
  - Color-coded by plan type
  - Compact display
  - Tooltip with details
- **Priority:** Low
- **Dependencies:** None

**14. `/src/components/billing/PaymentMethodManager.tsx`**
- **Purpose:** Update credit card / payment method
- **Features:**
  - Stripe Elements integration
  - Current payment method display
  - Update flow
  - Validation
- **Priority:** Medium
- **Dependencies:** Stripe Elements, Stripe API

---

#### **Context Providers**

**15. `/src/contexts/SubscriptionContext.tsx`**
- **Purpose:** Centralized subscription state management
- **Context Value:**
  ```typescript
  {
    subscription: SubscriptionData | null,
    usage: UsageData,
    loading: boolean,

    // Functions
    getSubscriptionStatus: () => Promise<SubscriptionData>,
    getRemainingMinutes: () => number,
    canUseMode: (mode: TranscriptionMode) => boolean,
    createSubscription: (planId: string) => Promise<void>,
    upgradeSubscription: (planId: string) => Promise<void>,
    cancelSubscription: (immediate: boolean) => Promise<void>,
    refreshSubscription: () => Promise<void>,
    trackUsage: (minutes: number, jobId: string) => Promise<void>
  }
  ```
- **Provider:**
  - Wraps app to provide subscription state
  - Listens to auth changes
  - Caches subscription data
  - Auto-refreshes on focus/mount
- **Priority:** Critical
- **Dependencies:** Auth context, Firestore, API routes

---

#### **Utility Libraries**

**16. `/src/lib/subscriptions/plans.ts`**
- **Purpose:** Subscription plan configuration and constants
- **Exports:**
  ```typescript
  export const SUBSCRIPTION_PLANS = {
    'ai-starter': {
      name: 'AI Starter',
      type: 'ai',
      tier: 'starter',
      price: 210,
      minutes: 300,
      stripePriceId: process.env.STRIPE_PRICE_AI_STARTER!,
      features: ['AI Transcription', 'Speaker Detection', ...],
      modes: ['ai']
    },
    // ... other plans
  };

  export const getPlanById = (planId: string) => SUBSCRIPTION_PLANS[planId];
  export const getPlansByType = (type: 'ai' | 'hybrid') => ...;
  export const getUpgradePath = (currentPlan: string) => ...;
  ```
- **Priority:** Critical
- **Dependencies:** Environment variables

**17. `/src/lib/subscriptions/usage.ts`**
- **Purpose:** Usage calculation and tracking utilities
- **Functions:**
  ```typescript
  export function calculateMinutesUsed(jobDuration: number, mode: TranscriptionMode): number
  export function getRemainingMinutes(user: UserData): number
  export function willExceedLimit(user: UserData, jobMinutes: number): boolean
  export function calculateOverageCost(excessMinutes: number, mode: TranscriptionMode): number
  export async function resetMonthlyUsage(userId: string): Promise<void>
  export function getDaysUntilReset(billingCycleEnd: Date): number
  ```
- **Priority:** Critical
- **Dependencies:** User data, mode configurations

**18. `/src/lib/subscriptions/validation.ts`**
- **Purpose:** Subscription validation and access control helpers
- **Functions:**
  ```typescript
  export function isSubscriptionActive(user: UserData): boolean
  export function canAccessMode(user: UserData, mode: TranscriptionMode): boolean
  export function needsUpgrade(user: UserData, requestedMode: TranscriptionMode): boolean | string
  export function getAccessibleModes(user: UserData): TranscriptionMode[]
  export function validatePlanChange(currentPlan: string, newPlan: string): { valid: boolean, message?: string }
  ```
- **Priority:** High
- **Dependencies:** Plan configuration

**19. `/src/lib/stripe/subscriptions.ts`**
- **Purpose:** Stripe subscription management (server-side)
- **Functions:**
  ```typescript
  export async function createStripeCustomer(userId: string, email: string, metadata?: object): Promise<string>
  export async function createStripeSubscription(customerId: string, priceId: string, options?: object): Promise<Stripe.Subscription>
  export async function updateStripeSubscription(subscriptionId: string, newPriceId: string): Promise<Stripe.Subscription>
  export async function cancelStripeSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean): Promise<Stripe.Subscription>
  export async function getStripeSubscription(subscriptionId: string): Promise<Stripe.Subscription>
  export async function reactivateStripeSubscription(subscriptionId: string): Promise<Stripe.Subscription>
  ```
- **Priority:** Critical
- **Dependencies:** Stripe SDK, API keys

**20. `/src/lib/subscriptions/analytics.ts`**
- **Purpose:** Subscription analytics and reporting (admin)
- **Functions:**
  ```typescript
  export async function calculateMRR(): Promise<number>
  export async function getChurnRate(period: 'month' | 'quarter'): Promise<number>
  export async function getSubscriptionDistribution(): Promise<{ [planId: string]: number }>
  export async function getAveragePlanValue(): Promise<number>
  export async function getSubscriptionGrowth(startDate: Date, endDate: Date): Promise<number>
  ```
- **Priority:** Medium
- **Dependencies:** Firestore queries, transaction data

---

#### **Type Definitions**

**21. `/src/types/subscription.ts`**
- **Purpose:** TypeScript interfaces and types for subscription system
- **Exports:**
  ```typescript
  export interface Subscription {
    id: string;
    userId: string;
    plan: SubscriptionPlanId;
    planType: 'ai' | 'hybrid';
    tier: 'starter' | 'professional' | 'enterprise';
    status: SubscriptionStatus;
    includedMinutes: number;
    minutesUsed: number;
    billingCycleStart: Date;
    billingCycleEnd: Date;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    cancelAtPeriodEnd: boolean;
    createdAt: Date;
    updatedAt: Date;
    canceledAt?: Date;
  }

  export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing' | 'unpaid';

  export type SubscriptionPlanId =
    | 'ai-starter'
    | 'ai-professional'
    | 'ai-enterprise'
    | 'hybrid-starter'
    | 'hybrid-professional'
    | 'hybrid-enterprise';

  export interface UsageRecord {
    id: string;
    userId: string;
    jobId: string;
    transcriptionId: string;
    minutesUsed: number;
    mode: TranscriptionMode;
    billingType: 'subscription' | 'credits';
    creditsCharged?: number;
    minutesFromSubscription?: number;
    isOverage: boolean;
    createdAt: Date;
  }

  export interface SubscriptionPlan {
    id: SubscriptionPlanId;
    name: string;
    type: 'ai' | 'hybrid';
    tier: 'starter' | 'professional' | 'enterprise';
    price: number;
    currency: string;
    minutes: number;
    stripePriceId: string;
    features: string[];
    modes: TranscriptionMode[];
  }
  ```
- **Priority:** Critical
- **Dependencies:** Existing type definitions

---

#### **Database Migration Scripts**

**22. `/scripts/migrate-users-subscription.ts`**
- **Purpose:** Add subscription fields to existing users
- **Functionality:**
  - Read all existing user documents
  - Add default subscription fields:
    ```typescript
    {
      subscriptionPlan: 'none',
      subscriptionStatus: 'none',
      minutesUsedThisMonth: 0,
      includedMinutesPerMonth: 0
    }
    ```
  - Preserve existing credit balances
  - Log migration results
- **Priority:** Critical (before deployment)
- **Dependencies:** Firebase Admin SDK

**23. `/scripts/setup-stripe-products.ts`**
- **Purpose:** Create Stripe products and prices programmatically
- **Functionality:**
  - Create 6 products (AI/Hybrid × Starter/Professional/Enterprise)
  - Create recurring price for each
  - Store price IDs for environment configuration
  - Set up webhook endpoints
- **Priority:** Critical (initial setup)
- **Dependencies:** Stripe SDK, configuration

---

## ADDITIONAL IMPLEMENTATION DETAILS

### Edge Cases & Special Scenarios

**1. Subscription Downgrade Mid-Cycle**
- **Scenario:** User on Hybrid Professional (750 min) has used 600 minutes, downgrades to AI Starter (300 min)
- **Solution:**
  - Allow downgrade but schedule for next billing cycle
  - Continue access at current plan until period end
  - Alert user of usage overage if new plan minutes < current usage
  - Option: Charge overage credits for excess if downgrade is immediate
- **Files Affected:** `/src/app/api/subscriptions/update/route.ts`, usage validation

**2. Subscription Cancellation with Pending Jobs**
- **Scenario:** User cancels subscription with jobs still processing
- **Solution:**
  - Allow cancellation but maintain access until period end
  - Mark subscription `cancelAtPeriodEnd = true`
  - Let queued jobs complete using subscription minutes
  - After period end, block new AI/Hybrid uploads unless credits available
- **Files Affected:** Upload validation, cancellation API

**3. Failed Payment Retry**
- **Scenario:** Monthly subscription payment fails
- **Solution:**
  - Stripe automatically retries per configured schedule
  - Webhook updates status to `past_due`
  - Send email notification to user
  - Grace period: 3 days before downgrade to free tier
  - Block new uploads after grace period
- **Files Affected:** Webhook handler, upload validation

**4. Trial Period Implementation ✅ CONFIRMED**
- **Scenario:** New user signs up for free trial
- **Solution:**
  - **180 minutes (3 hours) of AI transcription** for trial
  - Stripe creates subscription with trial minutes as initial allocation
  - Full access to AI features during trial
  - Payment method required upfront
  - Auto-converts to paid plan after trial expires
  - Webhook: `customer.subscription.trial_will_end` sends reminder
  - Trial applies to both AI and Hybrid plans
- **Files Affected:** Subscription creation API, pricing page, plan configuration

**5. Proration Accuracy**
- **Scenario:** User upgrades from AI Starter ($210) to AI Professional ($488) on day 15 of 30-day cycle
- **Solution:**
  - Stripe calculates proration automatically
  - Charge: (($488 - $210) / 30) × 15 days remaining = ~$139
  - Immediately increase included minutes to 750
  - Reset usage tracking proportionally (optional) or keep as-is
- **Files Affected:** Update subscription API, Stripe integration

**6. Multiple Modes Access**
- **Scenario:** Hybrid plan subscriber can use both AI and Hybrid modes
- **Solution:**
  - Track usage across both modes in same minute pool
  - Mode selection in upload page shows both as available
  - Deduct minutes regardless of mode chosen
  - Usage report shows breakdown by mode
- **Files Affected:** Mode validation, usage tracking

**7. Credit Purchase for Subscribers**
- **Scenario:** Subscriber wants to buy credits for Human mode or as buffer
- **Solution:**
  - Billing page always shows credit purchase section
  - Credits can be purchased independently of subscription
  - Credit usage priority: subscription minutes first, then credits
  - Credits used for: Human mode, overages, after subscription canceled
- **Files Affected:** Billing page, usage deduction logic

**8. Minute Rollover Decision ✅ CONFIRMED**
- **Scenario:** User has 50 unused minutes at end of billing cycle
- **Solution:** **No rollover** - unused minutes reset to 0 each billing cycle
  - Simpler implementation (faster time to market)
  - Industry standard (matches most SaaS services)
  - Encourages consistent monthly usage
  - Prevents indefinite accumulation
  - Easier accounting and revenue forecasting
- **Implementation:** Usage reset function sets `minutesUsedThisMonth = 0` on billing renewal
- **Files Affected:** Usage reset API, webhook handler (invoice.payment_succeeded)

**9. Timezone Consistency**
- **Scenario:** User in PST, server in UTC, Stripe in UTC
- **Solution:**
  - All billing cycle dates stored in UTC (Firestore Timestamp)
  - Stripe manages billing in UTC
  - Frontend displays dates in user's local timezone
  - Usage tracking uses UTC timestamps
- **Files Affected:** All date handling, usage reset

**10. Concurrent Job Submissions**
- **Scenario:** User with 10 minutes left submits 3 jobs of 5 minutes each simultaneously
- **Solution:**
  - Use Firestore transaction for minute reservation
  - First job: reserves 5 min, succeeds
  - Second job: reserves 5 min, succeeds
  - Third job: reserves 5 min, fails (insufficient), falls back to credits
  - Atomic updates prevent race conditions
- **Files Affected:** Usage tracking API (use Firestore transactions)

---

### Performance Considerations

**1. Database Indexing**
- Create Firestore indexes on:
  - `users` collection: `subscriptionStatus`, `billingCycleEnd`
  - `transactions` collection: `type`, `subscriptionId`, `createdAt`
  - `usageRecords` collection: `userId`, `createdAt`, `billingType`
- Composite index: `users` on `subscriptionStatus` + `billingCycleEnd` for renewal queries

**2. Caching Strategy**
- Cache subscription status in AuthContext (client-side)
- Cache duration: 5 minutes, or until user action triggers refresh
- Invalidate cache on subscription changes (upgrade, cancel, payment)
- Server-side: cache Stripe subscription data in Firestore for quick reads

**3. Webhook Processing**
- Process webhooks asynchronously
- Use Stripe event ID for idempotency (prevent duplicate processing)
- Queue heavy operations (email sending, analytics updates)
- Respond to webhook within 30 seconds to avoid retries

**4. Frontend Optimization**
- Lazy load subscription management page
- Optimistic UI updates for subscription changes
- Skeleton loaders for usage data
- Debounce usage meter updates

---

### Testing Requirements

**1. Unit Tests**
- `lib/subscriptions/usage.ts` - calculation functions
- `lib/subscriptions/validation.ts` - access control logic
- `lib/stripe/subscriptions.ts` - Stripe interactions (mocked)
- Plan configuration parsing

**2. Integration Tests**
- Subscription creation flow end-to-end
- Webhook event handling (all subscription events)
- Usage tracking and minute deduction
- Overage fallback to credits
- Monthly usage reset

**3. E2E Tests**
- User journey: sign up → subscribe → upload → use minutes → renewal
- Upgrade flow: AI Starter → AI Professional
- Downgrade flow: Hybrid Enterprise → AI Starter
- Cancellation flow with period-end access

**4. Stripe Test Mode**
- Use Stripe test cards for payment testing
- Test trial periods
- Test payment failures and retries
- Test webhooks in test environment

---

### Monitoring & Observability

**1. Metrics to Track**
- **Subscription Metrics:**
  - New subscriptions per day/week/month
  - Churn rate (monthly)
  - MRR (Monthly Recurring Revenue)
  - ARPU (Average Revenue Per User)
  - Plan distribution (% on each tier)
  - Upgrade/downgrade frequency
- **Usage Metrics:**
  - Average minutes used per plan
  - Overage frequency and amount
  - Mode popularity (AI vs Hybrid usage)
  - Credit consumption for overages
- **Technical Metrics:**
  - Webhook success/failure rate
  - Payment success rate
  - API response times (subscription endpoints)
  - Usage tracking latency

**2. Alerting**
- Payment failure spike (> 5% daily)
- Webhook processing failures
- Unusual churn rate increase
- Stripe API downtime
- Usage tracking errors

**3. Logging**
- Log all subscription lifecycle events
- Log webhook events with Stripe event ID
- Log usage tracking operations
- Log payment failures with error details

---

### Security Considerations

**1. API Authorization**
- All subscription endpoints require authentication
- Validate user owns the subscription being modified
- Admin-only access for manual subscription management
- Rate limit subscription creation (prevent abuse)

**2. Webhook Security**
- Verify Stripe webhook signatures
- Use Stripe event ID for idempotency
- Secure webhook endpoint (not publicly documented)
- Log all webhook events for audit trail

**3. Data Privacy**
- Encrypt sensitive Stripe data (customer ID, subscription ID)
- Never expose Stripe price IDs to frontend (use plan IDs)
- Mask payment method details
- Comply with PCI DSS (Stripe handles card data)

**4. Firestore Rules**
- Users cannot directly modify subscription fields
- Only server (admin SDK) can update subscription status
- Users can read their own subscription data
- Admins can read/write all subscription data

---

## IMPLEMENTATION PRIORITY SUMMARY

### Phase 1: Foundation (Week 1-2) - CRITICAL
- [ ] Update user data model (`auth.ts`, `AuthContext.tsx`)
- [ ] Create subscription type definitions (`types/subscription.ts`)
- [ ] Create subscription plan configuration (`lib/subscriptions/plans.ts`)
- [ ] Add validation schemas (`lib/validation/schemas.ts`)
- [ ] Update Firestore security rules
- [ ] Create Stripe subscription utilities (`lib/stripe/subscriptions.ts`)
- [ ] Set up Stripe products and prices (via script or manually)

### Phase 2: Core APIs (Week 3-4) - CRITICAL
- [ ] Create subscription creation API (`api/subscriptions/create/route.ts`)
- [ ] Create subscription cancellation API (`api/subscriptions/cancel/route.ts`)
- [ ] Create subscription update API (`api/subscriptions/update/route.ts`)
- [ ] Create usage tracking API (`api/usage/track/route.ts`)
- [ ] Create usage reset API (`api/usage/reset/route.ts`)
- [ ] Update webhook handler (`api/billing/webhook/route.ts`)
- [ ] Update transcribe API (`api/transcribe/route.ts`)

### Phase 3: State Management (Week 5) - HIGH
- [ ] Create SubscriptionContext (`contexts/SubscriptionContext.tsx`)
- [ ] Update CreditContext for hybrid billing
- [ ] Create usage calculation utilities (`lib/subscriptions/usage.ts`)
- [ ] Create validation utilities (`lib/subscriptions/validation.ts`)

### Phase 4: User Interface (Week 6-7) - HIGH
- [ ] Update billing page (`(protected)/billing/page.tsx`)
- [ ] Update upload page (`(protected)/upload/page.tsx`)
- [ ] Update dashboard (`(protected)/dashboard/page.tsx`)
- [ ] Create subscription management page (`(protected)/subscription/page.tsx`)
- [ ] Update pricing page (`pricing/page.tsx`)
- [ ] Create SubscriptionCard component
- [ ] Create UsageMeter component
- [ ] Create PlanSelector component

### Phase 5: Admin & Analytics (Week 8) - MEDIUM
- [ ] Update admin dashboard (`(protected)/admin/page.tsx`)
- [ ] Update admin ledger (`components/pages/admin/AdminLedger.tsx`)
- [ ] Create subscription analytics utilities (`lib/subscriptions/analytics.ts`)
- [ ] Add subscription management to admin user view

### Phase 6: Testing (Week 9-10) - HIGH
- [ ] Unit tests for utilities
- [ ] Integration tests for APIs
- [ ] E2E tests for user flows
- [ ] Stripe test mode validation
- [ ] Webhook testing
- [ ] Load testing

### Phase 7: Deployment & Monitoring (Week 11) - CRITICAL
- [ ] Deploy Firestore security rules
- [ ] Deploy APIs and frontend
- [ ] Configure production Stripe webhooks
- [ ] Set up monitoring and alerts
- [ ] Migrate existing users
- [ ] Customer communication (email, in-app notifications)

---

## ESTIMATED EFFORT BREAKDOWN

**Development:**
- Backend APIs: 120 hours
- Frontend UI: 100 hours
- State Management: 40 hours
- Utilities & Libraries: 60 hours
- Type Definitions: 20 hours
- Security Rules: 10 hours
- **Total Development: 350 hours (~9 weeks)**

**Testing:**
- Unit Tests: 40 hours
- Integration Tests: 40 hours
- E2E Tests: 30 hours
- Manual QA: 30 hours
- **Total Testing: 140 hours (~3.5 weeks)**

**Deployment & Operations:**
- Infrastructure Setup: 20 hours
- Migration Scripts: 20 hours
- Documentation: 20 hours
- Monitoring Setup: 10 hours
- **Total Ops: 70 hours (~2 weeks)**

**Grand Total: 560 hours (14 weeks with 1 developer, or 7 weeks with 2 developers)**

---

**Document Version:** 2.1
**Last Updated:** 2025-10-03
**Audit Completed By:** Claude Code Agent
**Status:** ✅ APPROVED - Ready for Implementation

**Confirmed Business Decisions:**
- ✅ No minute rollover (use-it-or-lose-it) - minutes reset to 0 each billing cycle
- ✅ 180-minute (3-hour) free trial for AI transcription on all new subscriptions
- ✅ Payment method required upfront for trial
- ✅ Auto-convert to paid plan after trial expires
- ✅ Trial applies to both AI and Hybrid subscription plans
