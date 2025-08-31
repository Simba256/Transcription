"use client";

import React, { useState } from 'react';
import { X, CreditCard, Lock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from './LoadingSpinner';
import { CreditDisplay } from './CreditDisplay';

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
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    email: '',
    billingAddress: {
      line1: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'CA'
    }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, '').length < 13) {
      newErrors.cardNumber = 'Please enter a valid card number';
    }

    if (!formData.expiryDate || !/^\d{2}\/\d{2}$/.test(formData.expiryDate)) {
      newErrors.expiryDate = 'Please enter a valid expiry date (MM/YY)';
    }

    if (!formData.cvv || formData.cvv.length < 3) {
      newErrors.cvv = 'Please enter a valid CVV';
    }

    if (!formData.cardholderName.trim()) {
      newErrors.cardholderName = 'Please enter the cardholder name';
    }

    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.billingAddress.line1.trim()) {
      newErrors.billingAddress = 'Please enter your billing address';
    }

    if (!formData.billingAddress.city.trim()) {
      newErrors.city = 'Please enter your city';
    }

    if (!formData.billingAddress.state.trim()) {
      newErrors.state = 'Please enter your province/state';
    }

    if (!formData.billingAddress.postalCode.trim()) {
      newErrors.postalCode = 'Please enter your postal code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'cardNumber') {
      value = formatCardNumber(value);
    } else if (field === 'expiryDate') {
      value = formatExpiryDate(value);
    } else if (field === 'cvv') {
      value = value.replace(/[^0-9]/g, '').substring(0, 4);
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBillingAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      billingAddress: {
        ...prev.billingAddress,
        [field]: value
      }
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Please fix the errors",
        description: "Check the form for any validation errors.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
  // Simulate card entry processing delay (no Stripe Elements in this demo)
  await new Promise(resolve => setTimeout(resolve, 1200));
  // In a real integration you'd confirm the payment with Stripe.js here.
  // Defer to parent onSuccess which calls backend confirm endpoint.
  onSuccess(packageInfo.credits);
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getCardType = (number: string) => {
    const cleanNumber = number.replace(/\s/g, '');
    if (cleanNumber.startsWith('4')) return 'Visa';
    if (cleanNumber.startsWith('5') || cleanNumber.startsWith('2')) return 'Mastercard';
    if (cleanNumber.startsWith('3')) return 'American Express';
    return 'Card';
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
                  ${packageInfo.price} CAD
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
            {/* Payment Information */}
            <div>
              <h3 className="text-lg font-medium text-[#003366] mb-4 flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Payment Information
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <div className="relative">
                    <Input
                      id="cardNumber"
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={formData.cardNumber}
                      onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                      className={`pl-10 ${errors.cardNumber ? 'border-red-500' : ''}`}
                      maxLength={19}
                    />
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    {formData.cardNumber && (
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                        {getCardType(formData.cardNumber)}
                      </span>
                    )}
                  </div>
                  {errors.cardNumber && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.cardNumber}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      type="text"
                      placeholder="MM/YY"
                      value={formData.expiryDate}
                      onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                      className={errors.expiryDate ? 'border-red-500' : ''}
                      maxLength={5}
                    />
                    {errors.expiryDate && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.expiryDate}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      type="text"
                      placeholder="123"
                      value={formData.cvv}
                      onChange={(e) => handleInputChange('cvv', e.target.value)}
                      className={errors.cvv ? 'border-red-500' : ''}
                      maxLength={4}
                    />
                    {errors.cvv && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.cvv}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="cardholderName">Cardholder Name</Label>
                  <Input
                    id="cardholderName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.cardholderName}
                    onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                    className={errors.cardholderName ? 'border-red-500' : ''}
                  />
                  {errors.cardholderName && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.cardholderName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div>
              <h3 className="text-lg font-medium text-[#003366] mb-4">
                Billing Address
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    type="text"
                    placeholder="123 Main Street"
                    value={formData.billingAddress.line1}
                    onChange={(e) => handleBillingAddressChange('line1', e.target.value)}
                    className={errors.billingAddress ? 'border-red-500' : ''}
                  />
                  {errors.billingAddress && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.billingAddress}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      type="text"
                      placeholder="Toronto"
                      value={formData.billingAddress.city}
                      onChange={(e) => handleBillingAddressChange('city', e.target.value)}
                      className={errors.city ? 'border-red-500' : ''}
                    />
                    {errors.city && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.city}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="state">Province/State</Label>
                    <Input
                      id="state"
                      type="text"
                      placeholder="ON"
                      value={formData.billingAddress.state}
                      onChange={(e) => handleBillingAddressChange('state', e.target.value)}
                      className={errors.state ? 'border-red-500' : ''}
                    />
                    {errors.state && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.state}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      type="text"
                      placeholder="M5V 3A8"
                      value={formData.billingAddress.postalCode}
                      onChange={(e) => handleBillingAddressChange('postalCode', e.target.value)}
                      className={errors.postalCode ? 'border-red-500' : ''}
                    />
                    {errors.postalCode && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.postalCode}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <select
                      id="country"
                      value={formData.billingAddress.country}
                      onChange={(e) => handleBillingAddressChange('country', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="CA">Canada</option>
                      <option value="US">United States</option>
                    </select>
                  </div>
                </div>
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
                    Your payment information is encrypted and secure. We use industry-standard SSL encryption to protect your data.
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
                disabled={processing}
                className="flex-1 bg-[#b29dd9] hover:bg-[#9d87c7] text-white"
              >
                {processing ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  `Pay $${packageInfo.price} CAD`
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}