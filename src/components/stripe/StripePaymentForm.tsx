"use client";

import React, { useState, useEffect } from 'react';
import { X, CreditCard, Lock, AlertCircle } from 'lucide-react';
import { 
  useStripe, 
  useElements, 
  PaymentElement,
  AddressElement 
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CreditDisplay } from '@/components/ui/CreditDisplay';
import { secureApiClient } from '@/lib/secure-api-client';

interface StripePaymentFormProps {
  clientSecret: string;
  packageInfo: {
    id: string;
    name: string;
    credits: number;
    price: number;
    description: string;
  };
  onSuccess: (creditsAdded: number) => void;
  onCancel: () => void;
}

export function StripePaymentForm({ 
  clientSecret, 
  packageInfo, 
  onSuccess, 
  onCancel 
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [emailRequired, setEmailRequired] = useState(true);

  useEffect(() => {
    if (!stripe || !clientSecret) {
      return;
    }

    // Retrieve the PaymentIntent to check if email is required
    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (paymentIntent && (paymentIntent as any).metadata?.userEmail) {
        setEmailRequired(false);
      }
    });
  }, [stripe, clientSecret]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Stripe not loaded",
        description: "Please wait for the payment form to load completely.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      // Validate form completeness before submitting
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast({
          title: "Form incomplete",
          description: submitError.message || "Please fill in all required payment information.",
          variant: "destructive",
        });
        return;
      }

      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        
        // Handle empty error objects or missing message
        let errorMessage = "There was an error processing your payment. Please try again.";
        
        if (error.message) {
          errorMessage = error.message;
        } else if (error.type === 'validation_error') {
          errorMessage = "Please fill in all required payment information.";
        } else if (error.code === 'incomplete_payment_method') {
          errorMessage = "Please complete all payment details before submitting.";
        }
        
        toast({
          title: "Payment failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment on our backend
        try {
          const response = await secureApiClient.post('/api/billing/confirm-payment', {
            paymentIntentId: paymentIntent.id
          });

          if (response.success) {
            toast({
              title: 'Payment successful!',
              description: `${response.creditsAdded} credits have been added to your account.`,
            });
            onSuccess(response.creditsAdded || packageInfo.credits);
          } else {
            throw new Error('Payment confirmation failed');
          }
        } catch (backendError) {
          console.error('Backend confirmation error:', backendError);
          toast({
            title: "Payment confirmation failed",
            description: "Your payment was processed but there was an issue adding credits. Please contact support.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Payment incomplete",
          description: "Your payment was not completed. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment failed",
        description: "There was an unexpected error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#003366]">
            Complete Your Purchase
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={processing}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6">
          {/* Order Summary */}
          <Card className="border-0 bg-gray-50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-[#003366]">{packageInfo.name}</h3>
                <span className="text-2xl font-bold text-[#003366]">
                  CA${packageInfo.price}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Credits included:</span>
                <CreditDisplay amount={packageInfo.credits} size="sm" />
              </div>
              <p className="text-sm text-gray-600">{packageInfo.description}</p>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Payment Element */}
            <div>
              <h3 className="text-lg font-medium text-[#003366] mb-4 flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Payment Information
              </h3>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <PaymentElement 
                  options={{
                    layout: 'tabs'
                  }}
                />
              </div>
            </div>

            {/* Billing Address */}
            <div>
              <h3 className="text-lg font-medium text-[#003366] mb-4">
                Billing Address
              </h3>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <AddressElement 
                  options={{
                    mode: 'billing',
                    allowedCountries: ['CA', 'US'],
                  }}
                />
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Lock className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">
                    Secure Payment
                  </h4>
                  <p className="text-sm text-blue-700">
                    Your payment information is encrypted and secure. We use industry-standard SSL encryption and Stripe's secure payment processing.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={processing}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={processing || !stripe || !elements}
                className="flex-1 bg-[#b29dd9] hover:bg-[#9d87c7] text-white"
              >
                {processing ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  `Pay CA$${packageInfo.price}`
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}