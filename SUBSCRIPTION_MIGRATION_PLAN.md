# Subscription Migration Plan

## Overview

This document outlines the migration from a pure credit-based payment system to a hybrid model supporting both **monthly subscriptions** and **pay-as-you-go credits**.

---

## Pricing Structure

### 1. AI-Based Subscription Plans

Monthly subscriptions with included transcription minutes using AI transcription:

| Plan | Monthly Minutes | Price (CAD/month) | Per-Minute Rate |
|------|----------------|-------------------|-----------------|
| **AI Starter** | 300 minutes | $210/month | $0.70/min |
| **AI Professional** | 750 minutes | $488/month | $0.65/min |
| **AI Enterprise** | 1,500 minutes | $900/month | $0.60/min |

**Features:**
- Automated AI transcription
- Speaker detection
- Timestamped segments
- Export to PDF/DOCX
- Audio playback sync
- Priority processing
- **180-minute (3-hour) free trial** for new subscriptions
- No minute rollover (reset monthly)

---

### 2. Hybrid Subscription Plans

Monthly subscriptions with included minutes for Hybrid transcription (AI + Human review):

| Plan | Monthly Minutes | Price (CAD/month) | Per-Minute Rate |
|------|----------------|-------------------|-----------------|
| **Hybrid Starter** | 300 minutes | $325/month | $1.08/min |
| **Hybrid Professional** | 750 minutes | $1,050/month | $1.40/min |
| **Hybrid Enterprise** | 1,500 minutes | $1,950/month | $1.30/min |

**Features:**
- AI transcription with human review
- Higher accuracy guarantee (99%+)
- Quality assurance review
- Speaker detection and labeling
- Timestamped segments
- Export to PDF/DOCX
- Audio playback sync
- Priority processing
- Dedicated support
- **180-minute (3-hour) free trial** for new subscriptions
- No minute rollover (reset monthly)

---

### 3. Pay-As-You-Go (Credit-Based)

Legacy credit system maintained for flexibility and Human transcription:

**Credit Packages:**
- **Starter Pack**: 1,000 credits for $10 CAD
- **Professional Pack**: 5,000 credits for $45 CAD (10% savings)
- **Enterprise Pack**: 12,000 credits for $100 CAD (17% savings)

**Credit Costs by Transcription Mode:**
- **AI Mode**: 1 credit per minute
- **Hybrid Mode**: 2 credits per minute
- **Human Mode**: 3 credits per minute

**Use Cases:**
- One-time transcription needs
- Variable monthly usage
- Human transcription requirements
- Overage minutes beyond subscription limits
- Testing the service before subscribing

---

## System Architecture Changes

### Database Schema Updates

#### New Collections

**1. `subscriptions` Collection**
```typescript
{
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  planId: string; // 'ai-starter', 'ai-professional', 'ai-enterprise', etc.
  planType: 'ai' | 'hybrid';
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';
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

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  canceledAt?: Timestamp;
}
```

**2. `usage` Collection (Enhanced)**
```typescript
{
  id: string;
  userId: string;
  subscriptionId?: string;
  transcriptionId: string;

  // Usage details
  minutes: number;
  mode: 'ai' | 'hybrid' | 'human';

  // Billing tracking
  billingType: 'subscription' | 'credits';
  creditsUsed?: number;
  minutesFromSubscription?: number;

  // Metadata
  createdAt: Timestamp;
  recordingDate: Timestamp;
}
```

#### Updated Collections

**1. `users` Collection (Enhanced)**
```typescript
{
  // ... existing fields

  // Subscription info
  subscriptionPlan?: string;
  subscriptionStatus?: 'active' | 'past_due' | 'canceled' | 'none';
  subscriptionId?: string;
  stripeCustomerId?: string;

  // Credits (maintained for pay-as-you-go)
  credits: number;
  totalSpent: number;

  // Usage tracking
  currentPeriodMinutesUsed?: number;
  lifetimeMinutesUsed?: number;
}
```

**2. `transactions` Collection (Enhanced)**
```typescript
{
  // ... existing fields

  // New transaction types
  type: 'purchase' | 'consumption' | 'refund' | 'adjustment' | 'subscription' | 'overage';

  // Subscription-specific fields
  subscriptionId?: string;
  subscriptionPeriod?: {
    start: Timestamp;
    end: Timestamp;
  };

  // Enhanced tracking
  minutesUsed?: number;
  billingMode?: 'subscription' | 'credits';
}
```

---

## Implementation Phases

### Phase 1: Database & Schema Setup ✅
- [x] Create subscription data models
- [ ] Update Firestore security rules
- [ ] Create migration scripts for existing users
- [ ] Add subscription fields to user schema

### Phase 2: Stripe Integration 🔄
- [ ] Create Stripe Products for each plan
- [ ] Create Stripe Prices (monthly recurring)
- [ ] Set up subscription webhooks
- [ ] Implement subscription creation API
- [ ] Implement subscription management API (upgrade/downgrade/cancel)
- [ ] Handle payment method updates

### Phase 3: Backend API Development 🔄
- [ ] `/api/subscriptions/create` - Create new subscription
- [ ] `/api/subscriptions/manage` - Update/cancel subscription
- [ ] `/api/subscriptions/usage` - Get current usage
- [ ] `/api/subscriptions/preview` - Preview plan changes
- [ ] `/api/billing/webhook` - Handle Stripe webhooks (enhanced)
- [ ] Usage tracking middleware
- [ ] Minute allocation logic
- [ ] Overage handling (switch to credits)

### Phase 4: Frontend UI Updates 🔄
- [ ] New pricing page with subscription plans
- [ ] Subscription management dashboard
- [ ] Usage meter component
- [ ] Plan comparison table
- [ ] Upgrade/downgrade flow
- [ ] Billing history (combined subscriptions + credits)
- [ ] Update upload page to show subscription status

### Phase 5: Business Logic 🔄
- [ ] Subscription minute tracking
- [ ] Automatic renewal handling
- [ ] Overage detection and credit fallback
- [ ] Prorated upgrades/downgrades
- [ ] Cancellation and refund logic
- [ ] Usage analytics and reporting

### Phase 6: Testing & Migration 🔄
- [ ] Test subscription creation
- [ ] Test usage tracking
- [ ] Test overage scenarios
- [ ] Test webhook handling
- [ ] Migrate existing users (optional)
- [ ] Load testing

### Phase 7: Deployment 🔄
- [ ] Deploy Firestore security rules
- [ ] Deploy backend APIs
- [ ] Deploy frontend updates
- [ ] Configure Stripe webhooks in production
- [ ] Monitor subscription events
- [ ] Customer communication

---

## User Journey

### New User Sign-Up

1. **Choose Plan**
   - Browse pricing page
   - Compare AI vs Hybrid plans
   - Select plan tier (Starter/Professional/Enterprise)
   - Or choose Pay-As-You-Go

2. **Subscription Creation**
   - Enter payment details (Stripe)
   - Confirm subscription
   - Immediate access to minutes

3. **Start Transcribing**
   - Upload audio/video files
   - See remaining minutes in dashboard
   - Transcription deducts from monthly allowance

### Existing User Migration

1. **Notification**
   - Email about new subscription plans
   - Dashboard banner with benefits

2. **Optional Switch**
   - Keep using credits (no change)
   - Switch to subscription for savings
   - Maintain existing credit balance

3. **Hybrid Approach**
   - Use subscription for regular work
   - Use credits for overages or Human mode

### Monthly Billing Cycle

1. **Usage Tracking**
   - Real-time minute deduction
   - Progress bar showing usage
   - Alerts at 75%, 90%, 100%

2. **Overage Handling**
   - When subscription minutes exhausted
   - Automatic switch to credit usage
   - Clear notification to user

3. **Renewal**
   - Automatic monthly renewal
   - Minutes reset on renewal date
   - Payment processed via Stripe
   - Invoice sent to user

---

## Business Rules

### Subscription Policies

**Billing Cycle:**
- Monthly billing on subscription anniversary
- Prorated charges for mid-cycle upgrades
- Prorated credits for downgrades

**Minute Rollover:**
- **No rollover** (use-it-or-lose-it)
- Unused minutes reset to 0 at end of each billing cycle
- Simpler implementation and industry standard
- Encourages consistent monthly usage

**Overage:**
- When subscription minutes exhausted
- Automatically use available credits
- User receives notification
- Charge per-minute at credit rate if no credits available

**Cancellation:**
- Can cancel anytime
- Access continues until end of billing period
- No refunds for partial month
- Can reactivate before period ends

**Plan Changes:**
- Upgrade: Immediate, prorated charge
- Downgrade: Effective next billing cycle
- Change processed through Stripe

### Credit System Policies

**Coexistence:**
- Credits remain valid indefinitely
- Can purchase credits while on subscription
- Credits used for overages or Human mode
- Subscription minutes used first

**Human Transcription:**
- Only available via credits (3 credits/min)
- Not included in any subscription plan
- Clear communication in UI

---

## Technical Considerations

### Rate Limiting
- Same as existing system
- Track subscription API calls separately
- Prevent abuse of plan changes

### Webhooks
- Handle all Stripe subscription events
- Idempotent processing
- Retry logic for failures
- Logging and monitoring

### Analytics
- Track subscription conversion rates
- Monitor plan popularity
- Analyze upgrade/downgrade patterns
- Usage patterns per plan

### Error Handling
- Payment failures → retry, then suspend
- Webhook failures → queue for retry
- Usage tracking failures → alert admin
- Clear error messages to users

---

## Migration Strategy

### Existing Users

**Option 1: Keep Credit System**
- No action required
- Continue using credits as before
- Can opt-in to subscription anytime

**Option 2: Switch to Subscription**
- Analyze usage patterns
- Recommend appropriate plan
- Offer first month discount (optional)
- Maintain credit balance for overages

### Data Migration

**No Breaking Changes:**
- All existing data structures remain
- New fields added, not modified
- Backward compatible APIs
- Gradual rollout possible

---

## Success Metrics

### Business KPIs
- Subscription conversion rate
- Average revenue per user (ARPU)
- Monthly recurring revenue (MRR)
- Churn rate
- Upgrade rate

### Technical KPIs
- API response times
- Webhook success rate
- Payment success rate
- System uptime
- Error rates

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Database Setup | 1-2 days | None |
| Phase 2: Stripe Integration | 2-3 days | Phase 1 |
| Phase 3: Backend APIs | 3-4 days | Phase 2 |
| Phase 4: Frontend UI | 4-5 days | Phase 3 |
| Phase 5: Business Logic | 2-3 days | Phase 3, 4 |
| Phase 6: Testing | 3-4 days | All above |
| Phase 7: Deployment | 1-2 days | Phase 6 |

**Total: 16-23 days (3-4 weeks)**

---

## Risk Mitigation

### Technical Risks
- **Webhook delivery failures**: Implement retry queue
- **Concurrent usage tracking**: Use Firestore transactions
- **Stripe API downtime**: Graceful degradation
- **Data inconsistencies**: Regular reconciliation jobs

### Business Risks
- **User confusion**: Clear UI/UX and documentation
- **Revenue impact**: Monitor metrics closely
- **Churn increase**: Flexible cancellation, good support
- **Migration issues**: Thorough testing, gradual rollout

---

## Business Decisions - CONFIRMED ✅

1. **Minute rollover policy:**
   - ✅ **No rollover** - unused minutes reset to 0 each billing cycle
   - Industry standard, simpler implementation

2. **Free trial period:**
   - ✅ **180 minutes (3 hours) of AI transcription** for new subscriptions
   - Full access to AI features during trial
   - Payment method required upfront
   - Auto-converts to paid plan after trial expires

3. **Annual plans:**
   - ❌ Not implementing initially
   - Can add later if customer demand exists

4. **Enterprise custom plans:**
   - Handle via admin credits initially
   - Future: Custom subscription plans for enterprise

5. **Refund policy:**
   - Pro-rata refunds for downgrades only
   - No refunds for cancellations (access continues until period end)

---

## Next Steps

1. Review and approve pricing structure
2. Confirm business rules and policies
3. Begin Phase 1 implementation
4. Set up Stripe test products
5. Create detailed API specifications

---

**Document Version:** 2.0
**Last Updated:** 2025-10-03
**Status:** ✅ APPROVED - Ready for Implementation

**Confirmed Business Decisions:**
- ✅ No minute rollover (use-it-or-lose-it)
- ✅ 180-minute (3-hour) free trial for new subscriptions
- ✅ Payment method required for trial
- ✅ Auto-convert to paid after trial expires
