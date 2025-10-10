'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SecureCheckoutButtonProps {
  amount: number;
  type?: 'wallet' | 'package';
  packageData?: {
    type: string;
    name: string;
    minutes: number;
    rate: number;
    price: number;
  };
  className?: string;
  children?: React.ReactNode;
}

export default function SecureCheckoutButton({
  amount,
  type = 'wallet',
  packageData,
  className = '',
  children
}: SecureCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleCheckout = async () => {
    if (!user) {
      setError('Please login to make a payment');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get auth token
      const token = await user.getIdToken();

      // Create checkout session with userId always included
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount,
          type,
          packageData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Log for debugging
      console.log('Checkout session created with metadata:', data.metadata);

      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleCheckout}
        disabled={isLoading || !user}
        className={className || 'bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50'}
      >
        {isLoading ? (
          'Processing...'
        ) : children || (
          type === 'package' ? `Purchase Package - CA$${amount}` : `Add CA$${amount}`
        )}
      </button>

      {error && (
        <div className="mt-2 text-red-600 text-sm">
          {error}
        </div>
      )}
    </>
  );
}