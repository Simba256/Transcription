'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/shared/header';
import Footer from '@/components/shared/footer';
import CreditsDashboard from '@/components/credits/CreditsDashboard';
import CreditPurchase from '@/components/credits/CreditPurchase';

export default function CreditsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handlePurchaseClick = () => {
    setActiveTab('purchase');
  };

  const handlePurchaseSuccess = () => {
    setActiveTab('dashboard');
    // Could add a success notification here
  };

  return (
    <>
      <Header />
      
      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Credits Management</h1>
            <p className="text-gray-600">
              Manage your transcription credits, view usage history, and purchase additional credits
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="purchase">Purchase Credits</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <CreditsDashboard onPurchaseClick={handlePurchaseClick} />
            </TabsContent>

            <TabsContent value="purchase" className="mt-6">
              <CreditPurchase onPurchaseSuccess={handlePurchaseSuccess} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </>
  );
}