"use client";

import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionPlan, SubscriptionPlanId } from '@/types/subscription';
import { SUBSCRIPTION_PLANS } from '@/lib/subscriptions/plans';

interface SubscriptionPlanSelectorProps {
  currentPlan?: SubscriptionPlanId;
  onSelectPlan: (planId: SubscriptionPlanId) => void;
  isProcessing?: boolean;
  showTrialBadge?: boolean;
}

export function SubscriptionPlanSelector({
  currentPlan = 'none',
  onSelectPlan,
  isProcessing = false,
  showTrialBadge = true
}: SubscriptionPlanSelectorProps) {
  // Filter out 'none' plan and organize by type
  const aiPlans = Object.values(SUBSCRIPTION_PLANS).filter(
    (plan): plan is SubscriptionPlan => plan !== null && plan.type === 'ai'
  );

  const hybridPlans = Object.values(SUBSCRIPTION_PLANS).filter(
    (plan): plan is SubscriptionPlan => plan !== null && plan.type === 'hybrid'
  );

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrentPlan = currentPlan === plan.id;
    const isProfessional = plan.tier === 'professional';

    return (
      <Card
        key={plan.id}
        className={`relative border-2 transition-all ${
          isCurrentPlan
            ? 'border-[#b29dd9] shadow-lg'
            : isProfessional
            ? 'border-[#b29dd9]/50 shadow-md'
            : 'border-gray-200 hover:border-[#b29dd9]/30 shadow-sm hover:shadow-md'
        }`}
      >
        {/* Popular Badge */}
        {isProfessional && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="bg-[#b29dd9] text-white px-4 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              MOST POPULAR
            </div>
          </div>
        )}

        {/* Current Plan Badge */}
        {isCurrentPlan && (
          <div className="absolute top-3 right-3">
            <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
              Current Plan
            </div>
          </div>
        )}

        <CardHeader className={`text-center ${isProfessional ? 'pt-8' : 'pt-6'}`}>
          <CardTitle className="text-2xl font-bold text-[#003366]">
            {plan.name}
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">{plan.description}</p>

          {/* Pricing */}
          <div className="mt-6">
            <div className="flex items-baseline justify-center">
              <span className="text-4xl font-bold text-[#003366]">
                ${plan.price}
              </span>
              <span className="text-gray-600 ml-2">/month</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {plan.includedMinutes} minutes included
            </div>
          </div>

          {/* Trial Badge */}
          {showTrialBadge && !isCurrentPlan && (
            <div className="mt-3 text-sm text-[#b29dd9] font-medium">
              🎁 3 hours free trial included
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Features List */}
          <div className="space-y-3">
            {plan.features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Button
            onClick={() => onSelectPlan(plan.id)}
            disabled={isCurrentPlan || isProcessing}
            className={`w-full mt-4 ${
              isProfessional
                ? 'bg-[#b29dd9] hover:bg-[#9d87c7]'
                : 'bg-[#003366] hover:bg-[#002244]'
            } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isCurrentPlan
              ? 'Current Plan'
              : isProcessing
              ? 'Processing...'
              : 'Select Plan'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-12">
      {/* AI Plans Section */}
      <div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-[#003366] mb-2">
            AI Transcription Plans
          </h2>
          <p className="text-gray-600">
            Fully automated AI-powered transcription with high accuracy
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {aiPlans.map(renderPlanCard)}
        </div>
      </div>

      {/* Hybrid Plans Section */}
      <div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-[#003366] mb-2">
            Hybrid Transcription Plans
          </h2>
          <p className="text-gray-600">
            AI + Human review for maximum accuracy and quality
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {hybridPlans.map(renderPlanCard)}
        </div>
      </div>

      {/* Plan Comparison Footer */}
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-[#003366] mb-2">
          Not sure which plan is right for you?
        </h3>
        <p className="text-gray-600 mb-4">
          All plans include a 3-hour free trial. No commitment required.
        </p>
        <div className="text-sm text-gray-500">
          ℹ️ Minutes reset monthly • No rollover • Credit fallback for overages
        </div>
      </div>
    </div>
  );
}
