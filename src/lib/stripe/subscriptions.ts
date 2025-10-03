import Stripe from 'stripe';
import { SubscriptionPlanId, SubscriptionCreateRequest, SubscriptionChangeRequest } from '@/types/subscription';
import { getPlanById } from '../subscriptions/plans';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia'
});

/**
 * Create or retrieve a Stripe customer for a user
 */
export async function createOrGetCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  try {
    // Search for existing customer by metadata
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId
      }
    });

    return customer;
  } catch (error) {
    console.error('Error creating/getting Stripe customer:', error);
    throw error;
  }
}

/**
 * Create a subscription for a user
 */
export async function createSubscription(
  request: SubscriptionCreateRequest
): Promise<Stripe.Subscription> {
  const { userId, planId, paymentMethodId, trialEnabled = true } = request;

  try {
    const plan = getPlanById(planId);
    if (!plan) {
      throw new Error(`Invalid plan ID: ${planId}`);
    }

    if (!plan.stripePriceId) {
      throw new Error(`Stripe Price ID not configured for plan: ${planId}`);
    }

    // Get or create customer (will need email from user data)
    // This assumes you have the user's email available
    const customer = await createOrGetCustomer(userId, 'user-email@example.com'); // TODO: Pass actual email

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id
    });

    // Set as default payment method
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    // Create subscription with trial if enabled
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customer.id,
      items: [
        {
          price: plan.stripePriceId
        }
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId,
        planId
      }
    };

    // Add trial period if enabled (30 days with 180 free minutes)
    if (trialEnabled) {
      subscriptionParams.trial_period_days = 30;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}

/**
 * Update subscription (upgrade/downgrade)
 */
export async function updateSubscription(
  request: SubscriptionChangeRequest
): Promise<Stripe.Subscription> {
  const { userId, newPlanId, prorationBehavior = 'create_prorations' } = request;

  try {
    const newPlan = getPlanById(newPlanId);
    if (!newPlan) {
      throw new Error(`Invalid plan ID: ${newPlanId}`);
    }

    if (!newPlan.stripePriceId) {
      throw new Error(`Stripe Price ID not configured for plan: ${newPlanId}`);
    }

    // Get customer's current subscription (assumes one subscription per customer)
    const customers = await stripe.customers.list({
      limit: 1,
      expand: ['data.subscriptions']
    });

    // TODO: Better customer lookup by userId in metadata
    const customer = customers.data[0];
    if (!customer || !customer.subscriptions?.data.length) {
      throw new Error('No active subscription found');
    }

    const currentSubscription = customer.subscriptions.data[0];

    // Update subscription to new plan
    const updatedSubscription = await stripe.subscriptions.update(
      currentSubscription.id,
      {
        items: [
          {
            id: currentSubscription.items.data[0].id,
            price: newPlan.stripePriceId
          }
        ],
        proration_behavior: prorationBehavior,
        metadata: {
          userId,
          planId: newPlanId
        }
      }
    );

    return updatedSubscription;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediate: boolean = false
): Promise<Stripe.Subscription> {
  try {
    if (immediate) {
      // Cancel immediately
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    } else {
      // Cancel at period end
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
      return subscription;
    }
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Reactivate a canceled subscription (before period end)
 */
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    });

    return subscription;
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    throw error;
  }
}

/**
 * Get subscription details
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice', 'customer']
    });

    return subscription;
  } catch (error) {
    console.error('Error getting subscription:', error);
    throw error;
  }
}

/**
 * Get customer's payment methods
 */
export async function getPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });

    return paymentMethods.data;
  } catch (error) {
    console.error('Error getting payment methods:', error);
    throw error;
  }
}

/**
 * Update default payment method
 */
export async function updateDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer> {
  try {
    // Attach payment method if not already attached
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId
    }).catch(() => {
      // Already attached, ignore error
    });

    // Set as default
    const customer = await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    return customer;
  } catch (error) {
    console.error('Error updating payment method:', error);
    throw error;
  }
}

/**
 * Create a setup intent for adding payment method
 */
export async function createSetupIntent(
  customerId: string
): Promise<Stripe.SetupIntent> {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card']
    });

    return setupIntent;
  } catch (error) {
    console.error('Error creating setup intent:', error);
    throw error;
  }
}

/**
 * Get upcoming invoice (for plan change preview)
 */
export async function getUpcomingInvoice(
  customerId: string,
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.UpcomingInvoice> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const invoice = await stripe.invoices.retrieveUpcoming({
      customer: customerId,
      subscription: subscriptionId,
      subscription_items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId
        }
      ],
      subscription_proration_behavior: 'create_prorations'
    });

    return invoice;
  } catch (error) {
    console.error('Error getting upcoming invoice:', error);
    throw error;
  }
}

/**
 * List all invoices for a customer
 */
export async function getCustomerInvoices(
  customerId: string,
  limit: number = 12
): Promise<Stripe.Invoice[]> {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit
    });

    return invoices.data;
  } catch (error) {
    console.error('Error getting invoices:', error);
    throw error;
  }
}

/**
 * Get subscription portal URL for customer self-service
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });

    return session.url;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
}

export { stripe };
