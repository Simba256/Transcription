/**
 * Stripe Client Configuration
 * Server-side Stripe instance for subscription management
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
});

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  // Search for existing customer by metadata
  const existingCustomers = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name: name || email,
    metadata: {
      userId,
    },
  });

  return customer;
}

/**
 * Create a subscription for a user
 */
export async function createStripeSubscription(
  customerId: string,
  priceId: string,
  trialPeriodDays?: number
): Promise<Stripe.Subscription> {
  const subscriptionParams: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    items: [{ price: priceId }],
    expand: ['latest_invoice.payment_intent', 'customer'],
  };

  // If no trial period, require payment method
  if (!trialPeriodDays) {
    subscriptionParams.payment_behavior = 'default_incomplete';
    subscriptionParams.payment_settings = {
      save_default_payment_method: 'on_subscription',
    };
  } else {
    // With trial, allow incomplete payment (no payment method required yet)
    subscriptionParams.trial_period_days = trialPeriodDays;
    subscriptionParams.payment_behavior = 'allow_incomplete';
    subscriptionParams.collection_method = 'charge_automatically';
  }

  const subscription = await stripe.subscriptions.create(subscriptionParams);

  console.log('[createStripeSubscription] Created subscription:', {
    id: subscription.id,
    status: subscription.status,
    current_period_start: subscription.current_period_start,
    current_period_end: subscription.current_period_end,
    trial_start: subscription.trial_start,
    trial_end: subscription.trial_end,
    collection_method: subscription.collection_method,
  });

  return subscription;
}

/**
 * Update a subscription (change plan)
 */
export async function updateStripeSubscription(
  subscriptionId: string,
  newPriceId: string,
  prorate: boolean = true
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: prorate ? 'create_prorations' : 'none',
  });

  return updatedSubscription;
}

/**
 * Cancel a subscription
 */
export async function cancelStripeSubscription(
  subscriptionId: string,
  immediate: boolean = false
): Promise<Stripe.Subscription> {
  if (immediate) {
    // Cancel immediately
    return await stripe.subscriptions.cancel(subscriptionId);
  } else {
    // Cancel at period end
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
}

/**
 * Reactivate a canceled subscription (if still in current period)
 */
export async function reactivateStripeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Get subscription details
 */
export async function getStripeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['customer', 'default_payment_method'],
  });
}

/**
 * Update payment method
 */
export async function updatePaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  // Attach payment method to customer
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  // Set as default payment method
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  return await stripe.paymentMethods.retrieve(paymentMethodId);
}

/**
 * Create a setup intent for collecting payment method
 */
export async function createSetupIntent(
  customerId: string
): Promise<Stripe.SetupIntent> {
  return await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
  });
}

/**
 * Get upcoming invoice preview for plan change
 */
export async function getUpcomingInvoice(
  subscriptionId: string,
  newPriceId?: string
): Promise<Stripe.UpcomingInvoice> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const params: Stripe.InvoiceRetrieveUpcomingParams = {
    customer: subscription.customer as string,
    subscription: subscriptionId,
  };

  if (newPriceId) {
    params.subscription_items = [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ];
  }

  return await stripe.invoices.retrieveUpcoming(params);
}
