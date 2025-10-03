/**
 * Stripe Product and Price Setup Script
 *
 * Creates all subscription products and prices in Stripe
 * Run with: npx tsx scripts/setup-stripe-products.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import Stripe from 'stripe';
import { SUBSCRIPTION_PLANS } from '../src/lib/plans';
import { PlanId } from '../src/lib/types/subscription';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

interface StripeProductResult {
  planId: PlanId;
  productId: string;
  priceId: string;
  name: string;
  amount: number;
}

async function createOrUpdateProduct(planId: PlanId): Promise<StripeProductResult> {
  const plan = SUBSCRIPTION_PLANS[planId];

  console.log(`\n📦 Creating/updating product for: ${plan.name}`);

  // Create or update product
  let product: Stripe.Product;

  // Search for existing product by metadata
  const existingProducts = await stripe.products.search({
    query: `metadata['planId']:'${planId}'`,
  });

  if (existingProducts.data.length > 0) {
    console.log(`  ✓ Found existing product: ${existingProducts.data[0].id}`);
    product = existingProducts.data[0];

    // Update product details
    product = await stripe.products.update(product.id, {
      name: plan.name,
      description: `${plan.name} - ${plan.minutesIncluded} minutes per month`,
      metadata: {
        planId: plan.id,
        type: plan.type,
        minutesIncluded: plan.minutesIncluded.toString(),
        trialMinutes: plan.trialMinutes?.toString() || '0',
      },
    });
    console.log(`  ✓ Updated product details`);
  } else {
    // Create new product
    product = await stripe.products.create({
      name: plan.name,
      description: `${plan.name} - ${plan.minutesIncluded} minutes per month`,
      metadata: {
        planId: plan.id,
        type: plan.type,
        minutesIncluded: plan.minutesIncluded.toString(),
        trialMinutes: plan.trialMinutes?.toString() || '0',
      },
    });
    console.log(`  ✓ Created new product: ${product.id}`);
  }

  // Create or update price
  let price: Stripe.Price;

  // Search for existing price for this product
  const existingPrices = await stripe.prices.list({
    product: product.id,
    active: true,
  });

  const amountInCents = Math.round(plan.priceMonthly * 100);

  if (existingPrices.data.length > 0) {
    const existingPrice = existingPrices.data[0];

    // Check if price matches
    if (existingPrice.unit_amount === amountInCents && existingPrice.currency === plan.currency.toLowerCase()) {
      console.log(`  ✓ Using existing price: ${existingPrice.id}`);
      price = existingPrice;
    } else {
      // Deactivate old price and create new one
      await stripe.prices.update(existingPrice.id, { active: false });
      console.log(`  ✓ Deactivated old price: ${existingPrice.id}`);

      price = await stripe.prices.create({
        product: product.id,
        unit_amount: amountInCents,
        currency: plan.currency.toLowerCase(),
        recurring: {
          interval: 'month',
          trial_period_days: 30, // 30-day trial
        },
        metadata: {
          planId: plan.id,
        },
      });
      console.log(`  ✓ Created new price: ${price.id}`);
    }
  } else {
    // Create new price
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: amountInCents,
      currency: plan.currency.toLowerCase(),
      recurring: {
        interval: 'month',
        trial_period_days: 30, // 30-day trial (180 minutes free trial tracked separately)
      },
      metadata: {
        planId: plan.id,
      },
    });
    console.log(`  ✓ Created new price: ${price.id}`);
  }

  return {
    planId,
    productId: product.id,
    priceId: price.id,
    name: plan.name,
    amount: plan.priceMonthly,
  };
}

async function main() {
  console.log('🚀 Setting up Stripe Products and Prices for Subscription Plans\n');
  console.log('================================================');

  const results: StripeProductResult[] = [];

  // Create all subscription plan products
  const planIds: PlanId[] = [
    'ai-starter',
    'ai-professional',
    'ai-enterprise',
    'hybrid-starter',
    'hybrid-professional',
    'hybrid-enterprise',
  ];

  for (const planId of planIds) {
    try {
      const result = await createOrUpdateProduct(planId);
      results.push(result);
    } catch (error) {
      console.error(`❌ Error creating product for ${planId}:`, error);
    }
  }

  console.log('\n\n================================================');
  console.log('✅ Setup Complete! Add these to your .env.local:\n');

  // Generate environment variable lines
  for (const result of results) {
    const planIdUpper = result.planId.toUpperCase().replace(/-/g, '_');
    console.log(`NEXT_PUBLIC_STRIPE_${planIdUpper}_PRODUCT_ID=${result.productId}`);
    console.log(`NEXT_PUBLIC_STRIPE_${planIdUpper}_PRICE_ID=${result.priceId}`);
  }

  console.log('\n================================================');
  console.log('📊 Summary:\n');

  for (const result of results) {
    console.log(`${result.name}:`);
    console.log(`  Product ID: ${result.productId}`);
    console.log(`  Price ID: ${result.priceId}`);
    console.log(`  Amount: $${result.amount} CAD/month\n`);
  }
}

main().catch(console.error);
