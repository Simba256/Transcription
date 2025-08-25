'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Star, 
  Check,
  Loader2
} from 'lucide-react';
import { CREDIT_PACKAGES, creditsToCad } from '@/lib/stripe';
import { getStripe } from '@/lib/stripe';
import { secureApiClient } from '@/lib/secure-api-client';

interface CreditPurchaseProps {
  onPurchaseSuccess?: () => void;
}

export default function CreditPurchase({ onPurchaseSuccess }: CreditPurchaseProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    try {
      setLoading(packageId);
      setError(null);

      const data = await secureApiClient.post('/api/credits/purchase', {
        packageId,
        successUrl: `${window.location.origin}/dashboard?purchase=success`,
        cancelUrl: `${window.location.origin}/dashboard?purchase=cancelled`,
      });

      // Redirect to Stripe checkout
      const stripe = await getStripe();
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });

        if (error) {
          throw new Error(error.message);
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Purchase Credits</h2>
        <p className="text-gray-600">
          Choose a credit package to continue using transcription services
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CREDIT_PACKAGES.map((pkg) => (
          <Card
            key={pkg.id}
            className={`relative ${
              pkg.popular
                ? 'border-ttt-navy bg-gradient-to-br from-ttt-lavender-light to-white'
                : 'border-gray-200'
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-ttt-navy text-white px-3 py-1 flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Most Popular
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-bold">{pkg.name}</CardTitle>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-ttt-navy">
                  {pkg.credits} credits
                </p>
                <p className="text-lg font-semibold">
                  ${pkg.priceCAD.toFixed(2)} CAD
                </p>
                <p className="text-sm text-gray-600">
                  ≈ {creditsToCad(pkg.credits).toFixed(2)} CAD value
                </p>
                {pkg.priceCAD < pkg.credits / 100 && (
                  <Badge variant="outline" className="text-green-600">
                    {Math.round((1 - pkg.priceCAD / (pkg.credits / 100)) * 100)}% savings
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Secure payment with Stripe</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Instant credit top-up</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>No expiry date</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="text-xs text-gray-600 mb-3 space-y-1">
                  <p><strong>AI Transcription:</strong> ~{Math.floor(pkg.credits / 100)} minutes</p>
                  <p><strong>Human Review:</strong> ~{Math.floor(pkg.credits / 300)} minutes</p>
                  <p><strong>Hybrid Mode:</strong> ~{Math.floor(pkg.credits / 175)} minutes</p>
                </div>
              </div>

              <Button
                onClick={() => handlePurchase(pkg.id)}
                disabled={loading !== null}
                className={`w-full ${
                  pkg.popular
                    ? 'bg-ttt-navy hover:bg-ttt-navy-dark text-white'
                    : ''
                }`}
              >
                {loading === pkg.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Purchase Credits
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <CreditCard className="w-5 h-5 text-gray-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">
                Secure Payment Processing
              </p>
              <p className="text-xs text-gray-600">
                All payments are processed securely through Stripe. We don't store your payment information.
                Credits are added instantly to your account after successful payment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}