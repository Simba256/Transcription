"use client";

import React, { useState } from 'react';
import { CreditCard, Plus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

interface PaymentMethodManagerProps {
  paymentMethods?: PaymentMethod[];
  onAddPaymentMethod?: () => void;
  onRemovePaymentMethod?: (methodId: string) => void;
  onSetDefaultPaymentMethod?: (methodId: string) => void;
  isLoading?: boolean;
}

export function PaymentMethodManager({
  paymentMethods = [],
  onAddPaymentMethod,
  onRemovePaymentMethod,
  onSetDefaultPaymentMethod,
  isLoading = false
}: PaymentMethodManagerProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (methodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    setRemovingId(methodId);
    try {
      await onRemovePaymentMethod?.(methodId);
    } finally {
      setRemovingId(null);
    }
  };

  const getBrandIcon = (brand: string) => {
    const brandLower = brand.toLowerCase();
    if (brandLower.includes('visa')) return '💳';
    if (brandLower.includes('mastercard')) return '💳';
    if (brandLower.includes('amex')) return '💳';
    if (brandLower.includes('discover')) return '💳';
    return '💳';
  };

  const getBrandColor = (brand: string) => {
    const brandLower = brand.toLowerCase();
    if (brandLower.includes('visa')) return 'bg-blue-100 text-blue-700';
    if (brandLower.includes('mastercard')) return 'bg-orange-100 text-orange-700';
    if (brandLower.includes('amex')) return 'bg-green-100 text-green-700';
    if (brandLower.includes('discover')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-[#003366]">
            Payment Methods
          </CardTitle>
          {onAddPaymentMethod && (
            <Button
              onClick={onAddPaymentMethod}
              size="sm"
              className="bg-[#b29dd9] hover:bg-[#9d87c7] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-[#b29dd9] border-t-transparent rounded-full mx-auto"></div>
            <p className="text-sm text-gray-600 mt-4">Loading payment methods...</p>
          </div>
        ) : paymentMethods.length > 0 ? (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                  method.isDefault
                    ? 'border-[#b29dd9] bg-[#b29dd9]/5'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Card Icon */}
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${getBrandColor(method.brand)}`}>
                    {getBrandIcon(method.brand)}
                  </div>

                  {/* Card Details */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#003366] capitalize">
                        {method.brand}
                      </span>
                      <span className="text-gray-600">
                        •••• {method.last4}
                      </span>
                      {method.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <Check className="h-3 w-3" />
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!method.isDefault && onSetDefaultPaymentMethod && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSetDefaultPaymentMethod(method.id)}
                      className="text-[#b29dd9] border-[#b29dd9] hover:bg-[#b29dd9] hover:text-white"
                    >
                      Set Default
                    </Button>
                  )}

                  {!method.isDefault && onRemovePaymentMethod && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemove(method.id)}
                      disabled={removingId === method.id}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      {removingId === method.id ? (
                        <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Payment Methods
            </h3>
            <p className="text-gray-600 mb-4">
              Add a payment method to subscribe to a plan.
            </p>
            {onAddPaymentMethod && (
              <Button
                onClick={onAddPaymentMethod}
                className="bg-[#b29dd9] hover:bg-[#9d87c7] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            )}
          </div>
        )}

        {/* Information Footer */}
        {paymentMethods.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              🔒 Your payment information is securely processed by Stripe.
              We never store your full card details.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
