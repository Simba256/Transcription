'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  AlertTriangle, 
  Info,
  Plus
} from 'lucide-react';
import { calculateCreditsNeeded, creditsToCad } from '@/lib/stripe';
import { CreditBalanceResponse } from '@/types/credits';
import { TranscriptionModeSelection } from '@/types/transcription-modes';

interface CreditCostEstimateProps {
  modeSelection: TranscriptionModeSelection;
  durationMinutes: number;
  userBalance?: CreditBalanceResponse | null;
  onPurchaseCredits?: () => void;
  showInsufficientWarning?: boolean;
}

export default function CreditCostEstimate({
  modeSelection,
  durationMinutes,
  userBalance,
  onPurchaseCredits,
  showInsufficientWarning = true
}: CreditCostEstimateProps) {
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [hasSufficientCredits, setHasSufficientCredits] = useState(true);

  useEffect(() => {
    if (durationMinutes > 0) {
      // Use Math.ceil to match the billing logic (minimum 1 minute charge)
      const billingMinutes = Math.ceil(durationMinutes);
      const cost = calculateCreditsNeeded(
        modeSelection.mode,
        modeSelection.qualityLevel,
        billingMinutes
      );
      setEstimatedCost(cost);
      
      if (userBalance) {
        setHasSufficientCredits(userBalance.balance >= cost);
      }
    }
  }, [modeSelection, durationMinutes, userBalance]);

  if (durationMinutes <= 0) {
    return null;
  }

  const costInCAD = creditsToCad(estimatedCost);
  const shortfall = userBalance ? Math.max(0, estimatedCost - userBalance.balance) : 0;

  return (
    <div className="space-y-3">
      {/* Cost Estimate Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Estimated Cost
              </span>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-blue-900">
                {estimatedCost} credits
              </p>
              <p className="text-sm text-blue-700">
                ≈ ${costInCAD.toFixed(2)} CAD
              </p>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-blue-800 space-y-1">
            <p>• Mode: {modeSelection.mode.toUpperCase()}</p>
            <p>• Quality: {modeSelection.qualityLevel}</p>
            <p>• Duration: {durationMinutes.toFixed(1)} minutes (billed as {Math.ceil(durationMinutes)} min)</p>
          </div>
        </CardContent>
      </Card>

      {/* Current Balance */}
      {userBalance && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  Current Balance
                </span>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${
                  hasSufficientCredits ? 'text-green-600' : 'text-red-600'
                }`}>
                  {userBalance.balance} credits
                </p>
                <p className="text-sm text-gray-600">
                  ≈ ${creditsToCad(userBalance.balance).toFixed(2)} CAD
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insufficient Credits Warning */}
      {showInsufficientWarning && !hasSufficientCredits && shortfall > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="space-y-2">
              <p className="font-medium">
                Insufficient Credits
              </p>
              <p className="text-sm">
                You need {shortfall} more credits to process this transcription.
                Your current balance is {userBalance?.balance || 0} credits, but {estimatedCost} credits are required.
              </p>
              {onPurchaseCredits && (
                <Button
                  size="sm"
                  onClick={onPurchaseCredits}
                  className="mt-2 bg-red-600 hover:bg-red-700"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Purchase Credits
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Indicator */}
      {hasSufficientCredits && userBalance && (
        <Alert className="border-green-200 bg-green-50">
          <Info className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <p className="text-sm font-medium">
              ✓ Sufficient credits available
            </p>
            <p className="text-sm">
              After this transcription, you'll have {userBalance.balance - estimatedCost} credits remaining.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}