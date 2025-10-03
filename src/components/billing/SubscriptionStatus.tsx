"use client";

import React from 'react';
import { CreditCard, Calendar, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SubscriptionPlanId, SubscriptionStatus as Status } from '@/types/subscription';
import { getPlanById } from '@/lib/subscriptions/plans';

interface SubscriptionStatusProps {
  subscriptionPlan: SubscriptionPlanId;
  subscriptionStatus: Status;
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  onManageSubscription?: () => void;
  onCancelSubscription?: () => void;
  onReactivateSubscription?: () => void;
}

export function SubscriptionStatus({
  subscriptionPlan,
  subscriptionStatus,
  currentPeriodEnd,
  trialEnd,
  cancelAtPeriodEnd,
  onManageSubscription,
  onCancelSubscription,
  onReactivateSubscription
}: SubscriptionStatusProps) {
  const plan = getPlanById(subscriptionPlan);
  const hasSubscription = subscriptionPlan !== 'none' && plan !== null;

  // Calculate days until renewal/cancellation
  const daysUntilRenewal = currentPeriodEnd
    ? Math.max(0, Math.ceil((currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const daysUntilTrialEnd = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Status badge component
  const StatusBadge = () => {
    const badges: Record<Status, { icon: React.ReactNode; text: string; color: string }> = {
      active: {
        icon: <CheckCircle2 className="h-4 w-4" />,
        text: 'Active',
        color: 'bg-green-100 text-green-700'
      },
      trialing: {
        icon: <Clock className="h-4 w-4" />,
        text: 'Free Trial',
        color: 'bg-blue-100 text-blue-700'
      },
      past_due: {
        icon: <AlertCircle className="h-4 w-4" />,
        text: 'Payment Due',
        color: 'bg-red-100 text-red-700'
      },
      canceled: {
        icon: <XCircle className="h-4 w-4" />,
        text: 'Canceled',
        color: 'bg-gray-100 text-gray-700'
      },
      incomplete: {
        icon: <AlertCircle className="h-4 w-4" />,
        text: 'Incomplete',
        color: 'bg-yellow-100 text-yellow-700'
      },
      incomplete_expired: {
        icon: <XCircle className="h-4 w-4" />,
        text: 'Expired',
        color: 'bg-gray-100 text-gray-700'
      },
      unpaid: {
        icon: <AlertCircle className="h-4 w-4" />,
        text: 'Unpaid',
        color: 'bg-red-100 text-red-700'
      }
    };

    const badge = badges[subscriptionStatus];

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        {badge.icon}
        <span>{badge.text}</span>
      </div>
    );
  };

  // No subscription view
  if (!hasSubscription) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-[#003366] mb-2">
            No Active Subscription
          </h3>
          <p className="text-gray-600 mb-6">
            Subscribe to a plan to get monthly transcription minutes and save on costs.
          </p>
          {onManageSubscription && (
            <Button
              onClick={onManageSubscription}
              className="bg-[#b29dd9] hover:bg-[#9d87c7] text-white"
            >
              Browse Plans
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-[#003366]">
            Subscription Details
          </CardTitle>
          <StatusBadge />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Plan Information */}
        <div className="flex items-start justify-between p-4 bg-gradient-to-r from-[#b29dd9]/10 to-[#003366]/5 rounded-lg">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-[#003366]">{plan.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-2xl font-bold text-[#003366]">
                ${plan.price}
              </span>
              <span className="text-gray-600">/month</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Included Minutes</div>
            <div className="text-2xl font-bold text-[#b29dd9]">
              {plan.includedMinutes}
            </div>
          </div>
        </div>

        {/* Trial Period Info */}
        {subscriptionStatus === 'trialing' && trialEnd && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  Free Trial Active
                </h4>
                <p className="text-xs text-blue-800 mb-2">
                  Your trial ends in {daysUntilTrialEnd} {daysUntilTrialEnd === 1 ? 'day' : 'days'}
                  ({trialEnd.toLocaleDateString()}).
                  You'll be charged ${plan.price} when the trial ends.
                </p>
                <p className="text-xs text-blue-700">
                  💡 Cancel anytime before {trialEnd.toLocaleDateString()} to avoid charges
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Notice */}
        {cancelAtPeriodEnd && currentPeriodEnd && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-900 mb-1">
                  Subscription Ending
                </h4>
                <p className="text-xs text-amber-800 mb-2">
                  Your subscription will end on {currentPeriodEnd.toLocaleDateString()}.
                  You'll still have access until then.
                </p>
                <p className="text-xs text-amber-700">
                  Changed your mind? You can reactivate your subscription.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Issue */}
        {(subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid') && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-900 mb-1">
                  Payment Required
                </h4>
                <p className="text-xs text-red-800">
                  There was an issue processing your payment. Please update your payment method
                  to continue your subscription.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Renewal Information */}
        {subscriptionStatus === 'active' && !cancelAtPeriodEnd && currentPeriodEnd && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-600" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Next Billing Date
                </div>
                <div className="text-xs text-gray-600">
                  {currentPeriodEnd.toLocaleDateString()} ({daysUntilRenewal} days)
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-[#003366]">
                ${plan.price}
              </div>
              <div className="text-xs text-gray-600">CAD</div>
            </div>
          </div>
        )}

        {/* Plan Features */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Plan Features
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {plan.features.slice(0, 4).map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          {onManageSubscription && (
            <Button
              onClick={onManageSubscription}
              variant="outline"
              className="flex-1 border-[#b29dd9] text-[#b29dd9] hover:bg-[#b29dd9] hover:text-white"
            >
              Change Plan
            </Button>
          )}

          {cancelAtPeriodEnd && onReactivateSubscription ? (
            <Button
              onClick={onReactivateSubscription}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Reactivate Subscription
            </Button>
          ) : (
            onCancelSubscription && subscriptionStatus === 'active' && (
              <Button
                onClick={onCancelSubscription}
                variant="outline"
                className="flex-1 border-red-500 text-red-600 hover:bg-red-50"
              >
                Cancel Subscription
              </Button>
            )
          )}
        </div>

        {/* Additional Info */}
        <div className="text-xs text-gray-500 text-center pt-2">
          Questions about your subscription? Contact{' '}
          <a href="mailto:support@example.com" className="text-[#b29dd9] hover:underline">
            support@example.com
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
