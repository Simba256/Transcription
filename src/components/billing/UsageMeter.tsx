"use client";

import React from 'react';
import { Clock, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SubscriptionPlanId } from '@/types/subscription';
import { getPlanById } from '@/lib/subscriptions/plans';

interface UsageMeterProps {
  subscriptionPlan: SubscriptionPlanId;
  minutesUsed: number;
  minutesReserved: number;
  includedMinutes: number;
  billingCycleEnd: Date | null;
  credits: number;
}

export function UsageMeter({
  subscriptionPlan,
  minutesUsed,
  minutesReserved,
  includedMinutes,
  billingCycleEnd,
  credits
}: UsageMeterProps) {
  const plan = getPlanById(subscriptionPlan);
  const hasSubscription = subscriptionPlan !== 'none' && plan !== null;

  // Calculate usage metrics
  const totalUsed = minutesUsed + minutesReserved;
  const remainingMinutes = Math.max(0, includedMinutes - totalUsed);
  const usagePercentage = hasSubscription
    ? Math.min(100, (totalUsed / includedMinutes) * 100)
    : 0;

  // Determine status
  const isNearLimit = usagePercentage >= 80 && usagePercentage < 100;
  const isOverLimit = usagePercentage >= 100;
  const isHealthy = usagePercentage < 80;

  // Calculate days until reset
  const daysUntilReset = billingCycleEnd
    ? Math.max(0, Math.ceil((billingCycleEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Format minutes to hours if large
  const formatMinutes = (mins: number) => {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0
        ? `${hours}h ${remainingMins}m`
        : `${hours}h`;
    }
    return `${mins}m`;
  };

  // Status badge
  const StatusBadge = () => {
    if (!hasSubscription) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <AlertTriangle className="h-4 w-4" />
          <span>No Active Subscription</span>
        </div>
      );
    }

    if (isOverLimit) {
      return (
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <span>Over Limit (using credits)</span>
        </div>
      );
    }

    if (isNearLimit) {
      return (
        <div className="flex items-center gap-2 text-sm text-orange-600">
          <AlertTriangle className="h-4 w-4" />
          <span>Approaching Limit</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span>Healthy Usage</span>
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-[#003366]">
            Usage This Month
          </CardTitle>
          <StatusBadge />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {hasSubscription ? (
          <>
            {/* Usage Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">
                  {formatMinutes(totalUsed)} of {formatMinutes(includedMinutes)} used
                </span>
                <span className={`font-semibold ${
                  isOverLimit ? 'text-red-600' :
                  isNearLimit ? 'text-orange-600' :
                  'text-green-600'
                }`}>
                  {usagePercentage.toFixed(0)}%
                </span>
              </div>

              <Progress
                value={usagePercentage}
                className={`h-3 ${
                  isOverLimit ? '[&>div]:bg-red-500' :
                  isNearLimit ? '[&>div]:bg-orange-500' :
                  '[&>div]:bg-green-500'
                }`}
              />
            </div>

            {/* Usage Breakdown */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-[#003366]">
                  {formatMinutes(minutesUsed)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Used</div>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-[#b29dd9]">
                  {formatMinutes(minutesReserved)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Reserved</div>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatMinutes(remainingMinutes)}
                </div>
                <div className="text-xs text-gray-600 mt-1">Available</div>
              </div>
            </div>

            {/* Billing Cycle Info */}
            {billingCycleEnd && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium text-blue-900">
                      Resets in {daysUntilReset} {daysUntilReset === 1 ? 'day' : 'days'}
                    </div>
                    <div className="text-xs text-blue-700">
                      {billingCycleEnd.toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            )}

            {/* Overage Warning */}
            {isOverLimit && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-900 mb-1">
                      Subscription Limit Exceeded
                    </h4>
                    <p className="text-xs text-amber-800">
                      You've used {formatMinutes(totalUsed - includedMinutes)} over your limit.
                      Additional usage is being charged from your credit balance ({credits} credits remaining).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Near Limit Warning */}
            {isNearLimit && !isOverLimit && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-orange-900 mb-1">
                      Approaching Limit
                    </h4>
                    <p className="text-xs text-orange-800">
                      You're approaching your monthly limit. Consider upgrading to avoid using credits for overage.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* No Subscription - Credits Only Mode */
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#003366] mb-2">
              No Active Subscription
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              You're currently using credits for all transcriptions.
            </p>
            <div className="text-2xl font-bold text-[#b29dd9] mb-1">
              {credits} credits
            </div>
            <div className="text-xs text-gray-500">Available balance</div>
          </div>
        )}

        {/* Credit Balance (always shown) */}
        {hasSubscription && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Credit Balance</span>
              <span className="text-lg font-semibold text-[#b29dd9]">
                {credits} credits
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Used automatically for overages and non-subscription modes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
