'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Gift
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CreditBalanceResponse, CreditTransactionResponse } from '@/types/credits';
import { CREDIT_PACKAGES, creditsToCad } from '@/lib/stripe';
import { getStripe } from '@/lib/stripe';
import { secureApiClient } from '@/lib/secure-api-client';

interface CreditsDashboardProps {
  onPurchaseClick?: () => void;
}

export default function CreditsDashboard({ onPurchaseClick }: CreditsDashboardProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<CreditBalanceResponse | null>(null);
  const [transactions, setTransactions] = useState<CreditTransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCreditData();
    }
  }, [user]);

  const loadCreditData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load balance and transactions in parallel
      const [balanceData, transactionsData] = await Promise.all([
        secureApiClient.get('/api/credits/balance'),
        secureApiClient.get('/api/credits/transactions?limit=10')
      ]);

      setBalance(balanceData.balance);
      setTransactions(transactionsData.transactions);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credit data');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'deduction':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'refund':
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case 'bonus':
        return <Gift className="w-4 h-4 text-purple-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) return 'text-green-600';
    if (amount < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadCreditData} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balance?.balance || 0} credits</div>
            <p className="text-xs text-muted-foreground">
              ≈ ${creditsToCad(balance?.balance || 0).toFixed(2)} CAD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balance?.totalPurchased || 0} credits</div>
            <p className="text-xs text-muted-foreground">
              ≈ ${creditsToCad(balance?.totalPurchased || 0).toFixed(2)} CAD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Used</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balance?.totalSpent || 0} credits</div>
            <p className="text-xs text-muted-foreground">
              ≈ ${creditsToCad(balance?.totalSpent || 0).toFixed(2)} CAD
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onPurchaseClick} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Buy Credits
            </Button>
            <Button variant="outline" onClick={loadCreditData}>
              Refresh Balance
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <p className="text-sm font-medium">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getTransactionColor(transaction.type, transaction.amount)}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount} credits
                    </p>
                    <Badge variant={transaction.type === 'purchase' ? 'default' : 'secondary'}>
                      {transaction.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Low Balance Warning */}
      {balance && balance.balance < 100 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800">
                  Low Credit Balance
                </p>
                <p className="text-sm text-orange-600">
                  You have {balance.balance} credits remaining. Consider purchasing more to continue using transcription services.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}