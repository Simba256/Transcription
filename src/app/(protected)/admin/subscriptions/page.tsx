"use client";

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SubscriptionAnalytics } from '@/components/admin/SubscriptionAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAllUsers } from '@/lib/firebase/firestore';
import { UserData } from '@/lib/firebase/auth';

export default function AdminSubscriptionsPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);

  useEffect(() => {
    // Check if user is admin
    if (!authLoading && userData?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    const loadUsers = async () => {
      if (userData?.role !== 'admin') return;

      try {
        setLoading(true);
        const allUsers = await getAllUsers();
        setUsers(allUsers);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadUsers();
    }
  }, [userData, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (userData?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#003366] mb-2">
            Subscription Analytics
          </h1>
          <p className="text-gray-600">
            Monitor subscription plans, revenue metrics, and customer trends.
          </p>
        </div>

        <SubscriptionAnalytics users={users} />
      </div>

      <Footer />
    </div>
  );
}
