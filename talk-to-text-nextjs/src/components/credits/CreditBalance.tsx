'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Plus, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CreditBalanceResponse } from '@/types/credits';
import { creditsToCad } from '@/lib/stripe';
import { secureApiClient } from '@/lib/secure-api-client';

interface CreditBalanceProps {
  onPurchaseClick?: () => void;
  showPurchaseButton?: boolean;
  refreshInterval?: number; // in milliseconds
}

export default function CreditBalance({ 
  onPurchaseClick, 
  showPurchaseButton = true,
  refreshInterval = 30000 // 30 seconds
}: CreditBalanceProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<CreditBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBalance = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await secureApiClient.get('/api/credits/balance');
      setBalance(data.balance);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadBalance();

      // Set up refresh interval
      const interval = setInterval(() => {
        loadBalance(true);
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [user, refreshInterval]);

  const handleRefresh = () => {
    loadBalance(true);
  };

  const isLowBalance = balance && balance.balance < 100;

  if (!user || loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <span className="text-sm text-red-600">Error loading balance</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-2">
        <CreditCard className="w-4 h-4 text-gray-600" />
        <div className="flex flex-col items-start">
          <div className="flex items-center space-x-1">
            <span className={`text-sm font-medium ${
              isLowBalance ? 'text-red-600' : 'text-gray-900'
            }`}>
              {balance?.balance || 0} credits
            </span>
            {isLowBalance && (
              <Badge variant="destructive" className="text-xs px-1 py-0">
                Low
              </Badge>
            )}
          </div>
          <span className="text-xs text-gray-500">
            ≈ ${creditsToCad(balance?.balance || 0).toFixed(2)}
          </span>
        </div>
      </div>

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleRefresh}
        disabled={refreshing}
        className="p-1"
      >
        <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
      </Button>

      {showPurchaseButton && (
        <Button 
          size="sm" 
          onClick={onPurchaseClick}
          className="flex items-center space-x-1"
          variant={isLowBalance ? "default" : "outline"}
        >
          <Plus className="w-3 h-3" />
          <span>Buy</span>
        </Button>
      )}
    </div>
  );
}