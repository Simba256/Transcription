"use client";

import React, { useState } from 'react';
import { CreditCard, Download, Clock, CheckCircle, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CreditDisplay } from '@/components/ui/CreditDisplay';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StripeProvider } from '@/components/stripe/StripeProvider';
import { StripePaymentForm } from '@/components/stripe/StripePaymentForm';
import { SubscriptionPlanSelector } from '@/components/billing/SubscriptionPlanSelector';
import { SubscriptionStatus } from '@/components/billing/SubscriptionStatus';
import { UsageMeter } from '@/components/billing/UsageMeter';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditContext';
import { secureApiClient } from '@/lib/secure-api-client';
import { SubscriptionPlanId, SubscriptionStatus as Status } from '@/types/subscription';
import { Timestamp } from 'firebase/firestore';

export default function BillingPage() {
  const { user, userData } = useAuth();
  const { transactions, purchaseCredits } = useCredits();
  const { toast } = useToast();
  const [purchasingPackage, setPurchasingPackage] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<{
    clientSecret: string;
    paymentIntentId: string;
    packageInfo: typeof packages[0];
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isProcessingSubscription, setIsProcessingSubscription] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const transactionsPerPage = 10;

  // Extract subscription data from userData
  const subscriptionPlan = (userData?.subscriptionPlan || 'none') as SubscriptionPlanId;
  const subscriptionStatus = (userData?.subscriptionStatus || 'canceled') as Status;
  const minutesUsed = userData?.minutesUsedThisMonth || 0;
  const minutesReserved = userData?.minutesReserved || 0;
  const includedMinutes = userData?.includedMinutesPerMonth || 0;
  const credits = userData?.credits || 0;
  const billingCycleEnd = userData?.billingCycleEnd
    ? new Date((userData.billingCycleEnd as Timestamp).toMillis())
    : null;
  const currentPeriodEnd = userData?.currentPeriodEnd
    ? new Date((userData.currentPeriodEnd as Timestamp).toMillis())
    : null;
  const trialEnd = userData?.trialEnd
    ? new Date((userData.trialEnd as Timestamp).toMillis())
    : null;
  const cancelAtPeriodEnd = userData?.cancelAtPeriodEnd || false;

  // Calculate pagination
  const totalPages = Math.ceil(transactions.length / transactionsPerPage);
  const startIndex = (currentPage - 1) * transactionsPerPage;
  const endIndex = startIndex + transactionsPerPage;
  const currentTransactions = transactions.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const packages = [
    {
      id: 'starter',
      name: 'Starter Pack',
      credits: 1000,
      price: 10,
      description: 'Perfect for individuals and small projects'
    },
    {
      id: 'professional',
      name: 'Professional Pack',
      credits: 5000,
      price: 45,
      originalPrice: 50,
      savings: '10% savings',
      popular: true,
      description: 'Most popular for businesses and professionals'
    },
    {
      id: 'enterprise',
      name: 'Enterprise Pack',
      credits: 12000,
      price: 100,
      originalPrice: 120,
      savings: '17% savings',
      description: 'Best value for high-volume users'
    }
  ];

  const handlePurchase = async (pkg: typeof packages[0]) => {
    // Check if Stripe is configured
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      toast({
        title: 'Payment system unavailable',
        description: 'Payment processing is not configured. Please contact support.',
        variant: 'destructive'
      });
      return;
    }

    setPurchasingPackage(pkg.id);
    try {
      // Create payment intent via backend
      const resp = await secureApiClient.post('/api/billing/create-payment-intent', {
        packageId: pkg.id,
        amount: pkg.price,
        credits: pkg.credits,
        currency: 'cad'
      });
      setPaymentData({
        clientSecret: resp.clientSecret!,
        paymentIntentId: resp.paymentIntentId!,
        packageInfo: pkg,
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast({ title: 'Failed to start payment', description: errorMessage, variant: 'destructive' });
    } finally {
      setPurchasingPackage(null);
    }
  };

  const handlePaymentSuccess = async (creditsAdded: number) => {
    if (!paymentData || !user) return;
    try {
      // For this demo, finalize by recording a purchase and updating credits
      await purchaseCredits(
        paymentData.packageInfo.id,
        creditsAdded,
        paymentData.packageInfo.price
      );
      // No need to call refreshCredits() since purchaseCredits already updates user data
      toast({
        title: 'Purchase successful!',
        description: `${creditsAdded} credits have been added to your account.`,
      });
      setPaymentData(null);
    } catch (error) {
      console.error('Payment confirmation error:', error);
      toast({
        title: 'Payment confirmation failed',
        description: 'Please contact support if credits were not added.',
        variant: 'destructive',
      });
    }
  };

  const handlePaymentCancel = () => {
    setPaymentData(null);
  };

  // Subscription management functions
  const handleSelectPlan = async (planId: SubscriptionPlanId) => {
    setIsProcessingSubscription(true);
    try {
      // TODO: Implement Stripe checkout session creation
      // For now, show placeholder
      toast({
        title: 'Subscription management',
        description: 'Subscription checkout will be implemented with Stripe checkout sessions.',
        variant: 'default'
      });
      setShowPlanSelector(false);
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: 'Subscription failed',
        description: error instanceof Error ? error.message : 'Failed to start subscription',
        variant: 'destructive'
      });
    } finally {
      setIsProcessingSubscription(false);
    }
  };

  const handleManageSubscription = () => {
    setShowPlanSelector(true);
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will still have access until the end of your billing period.')) {
      return;
    }

    try {
      await secureApiClient.post('/api/subscriptions/cancel', {
        immediate: false
      });

      toast({
        title: 'Subscription canceled',
        description: 'Your subscription will end at the end of the current billing period.',
      });

      // Refresh user data
      window.location.reload();
    } catch (error) {
      console.error('Cancel error:', error);
      toast({
        title: 'Cancellation failed',
        description: error instanceof Error ? error.message : 'Failed to cancel subscription',
        variant: 'destructive'
      });
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      await secureApiClient.post('/api/subscriptions/reactivate', {});

      toast({
        title: 'Subscription reactivated',
        description: 'Your subscription has been reactivated successfully.',
      });

      // Refresh user data
      window.location.reload();
    } catch (error) {
      console.error('Reactivate error:', error);
      toast({
        title: 'Reactivation failed',
        description: error instanceof Error ? error.message : 'Failed to reactivate subscription',
        variant: 'destructive'
      });
    }
  };

  const handleExportTransactions = () => {
    if (transactions.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no transactions to export.",
        variant: "destructive",
      });
      return;
    }

    // Prepare CSV data
    const headers = ['Date', 'Type', 'Description', 'Amount (Credits)', 'Job ID'];
    const csvData = transactions.map(transaction => [
      transaction.createdAt.toLocaleDateString(),
      transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
      transaction.description,
      transaction.amount.toString(),
      transaction.jobId || ''
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => 
        // Escape fields containing commas, quotes, or newlines
        /[",\n\r]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field
      ).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transaction_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: "Transaction history has been exported to CSV.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#003366] mb-2">
            Billing & Subscriptions
          </h1>
          <p className="text-gray-600">
            Manage your subscription, usage, and credit balance.
          </p>
        </div>

        {/* Plan Selector Modal */}
        {showPlanSelector && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#003366]">
                  Select a Subscription Plan
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowPlanSelector(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕ Close
                </Button>
              </div>
              <div className="p-6">
                <SubscriptionPlanSelector
                  currentPlan={subscriptionPlan}
                  onSelectPlan={handleSelectPlan}
                  isProcessing={isProcessingSubscription}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tabs for different sections */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="credits" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Buy Credits
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Subscription Status */}
            <SubscriptionStatus
              subscriptionPlan={subscriptionPlan}
              subscriptionStatus={subscriptionStatus}
              currentPeriodEnd={currentPeriodEnd}
              trialEnd={trialEnd}
              cancelAtPeriodEnd={cancelAtPeriodEnd}
              onManageSubscription={handleManageSubscription}
              onCancelSubscription={handleCancelSubscription}
              onReactivateSubscription={handleReactivateSubscription}
            />

            {/* Usage Meter */}
            <UsageMeter
              subscriptionPlan={subscriptionPlan}
              minutesUsed={minutesUsed}
              minutesReserved={minutesReserved}
              includedMinutes={includedMinutes}
              billingCycleEnd={billingCycleEnd}
              credits={credits}
            />
          </TabsContent>

          {/* Credits Tab */}
          <TabsContent value="credits" className="space-y-6">
            {/* Current Balance Card */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[#003366] mb-2">
                      Credit Balance
                    </h2>
                    <CreditDisplay amount={credits} size="lg" />
                    <p className="text-sm text-gray-600 mt-2">
                      Used for overages and non-subscription modes
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-[#b29dd9] rounded-full flex items-center justify-center">
                    <CreditCard className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Credit Packages */}
            <div>
              <h2 className="text-2xl font-bold text-[#003366] mb-6">
                Purchase Credits
              </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <Card 
                key={pkg.id}
                className={`border-0 shadow-sm hover:shadow-md transition-shadow ${
                  pkg.popular ? 'ring-2 ring-[#b29dd9]' : ''
                }`}
              >
                {pkg.popular && (
                  <div className="bg-[#b29dd9] text-white text-center py-2 text-sm font-medium">
                    Most Popular
                  </div>
                )}
                
                <CardHeader className={`text-center ${!pkg.popular ? 'pt-10' : ''}`}>
                  <CardTitle className="text-xl font-bold text-[#003366]">
                    {pkg.name}
                  </CardTitle>
                  <p className="text-gray-600 text-sm">{pkg.description}</p>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-3xl font-bold text-[#003366]">
                        CA${pkg.price}
                      </span>
                      {pkg.originalPrice && (
                        <span className="text-lg text-gray-400 line-through">
                          CA${pkg.originalPrice}
                        </span>
                      )}
                    </div>
                    {pkg.savings && (
                      <div className="text-green-600 font-medium text-sm mt-1">
                        {pkg.savings}
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className={`text-center ${!pkg.popular ? 'pb-10' : 'pb-6'}`}>
                  <CreditDisplay amount={pkg.credits} size="md" className="justify-center mb-6" />
                  
                  <Button
                    onClick={() => handlePurchase(pkg)}
                    disabled={purchasingPackage === pkg.id}
                    className={`w-full ${
                      pkg.popular
                        ? 'bg-[#b29dd9] hover:bg-[#9d87c7]'
                        : 'bg-[#003366] hover:bg-[#002244]'
                    } text-white`}
                  >
                    {purchasingPackage === pkg.id ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Setting up payment...
                      </>
                    ) : (
                      'Purchase'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
            </div>
            </div>
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="history">
            <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold text-[#003366]">
              Transaction History
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleExportTransactions}
              className="text-[#b29dd9] hover:text-[#9d87c7]"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <>
                <div className="space-y-4">
                  {currentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.type === 'purchase' ? 'bg-green-100' :
                        transaction.type === 'consumption' ? 'bg-blue-100' :
                        transaction.type === 'refund' ? 'bg-yellow-100' :
                        'bg-gray-100'
                      }`}>
                        {transaction.type === 'purchase' && (
                          <CreditCard className="h-5 w-5 text-green-600" />
                        )}
                        {transaction.type === 'consumption' && (
                          <Clock className="h-5 w-5 text-blue-600" />
                        )}
                        {transaction.type === 'refund' && (
                          <CheckCircle className="h-5 w-5 text-yellow-600" />
                        )}
                        {transaction.type === 'adjustment' && (
                          <CreditCard className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      
                      <div>
                        <p className="font-medium text-[#003366]">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-gray-600">
                          {transaction.createdAt.toLocaleDateString()} at {transaction.createdAt.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className={`font-medium ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount} credits
                    </div>
                  </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      Showing {startIndex + 1} to {Math.min(endIndex, transactions.length)} of {transactions.length} transactions
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>

                      <div className="flex items-center space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(page)}
                            className={`w-8 h-8 p-0 ${
                              currentPage === page
                                ? 'bg-[#b29dd9] hover:bg-[#9d87c7] text-white'
                                : 'text-[#003366] hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex items-center"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No transactions yet
                </h3>
                <p className="text-gray-600">
                  Your credit purchases and usage will appear here.
                </p>
              </div>
            )}
          </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Stripe Payment Modal */}
      {paymentData && (
        <StripeProvider clientSecret={paymentData.clientSecret}>
          <StripePaymentForm
            clientSecret={paymentData.clientSecret}
            packageInfo={paymentData.packageInfo}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        </StripeProvider>
      )}

      <Footer />
    </div>
  );
}