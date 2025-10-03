"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, DollarSign } from 'lucide-react';
import { UserData } from '@/lib/firebase/auth';

interface SubscriptionAnalyticsProps {
  users: UserData[];
}

export function SubscriptionAnalytics({ users }: SubscriptionAnalyticsProps) {
  // Calculate plan distribution
  const planDistribution = users.reduce((acc, user) => {
    const plan = user.subscriptionPlan || 'none';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate subscription status distribution
  const statusDistribution = users.reduce((acc, user) => {
    if (user.subscriptionPlan && user.subscriptionPlan !== 'none') {
      const status = user.subscriptionStatus || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Calculate revenue metrics
  const totalUsers = users.length;
  const subscribedUsers = users.filter(u => u.subscriptionPlan && u.subscriptionPlan !== 'none');
  const activeSubscriptions = users.filter(u =>
    u.subscriptionPlan &&
    u.subscriptionPlan !== 'none' &&
    (u.subscriptionStatus === 'active' || u.subscriptionStatus === 'trialing')
  );

  const conversionRate = totalUsers > 0 ? (subscribedUsers.length / totalUsers) * 100 : 0;
  const churnedSubscriptions = users.filter(u =>
    u.subscriptionPlan &&
    u.subscriptionPlan !== 'none' &&
    u.subscriptionStatus === 'canceled'
  );
  const churnRate = subscribedUsers.length > 0 ? (churnedSubscriptions.length / subscribedUsers.length) * 100 : 0;

  // Plan tier grouping
  const planTiers = [
    { id: 'ai-starter', name: 'AI Starter', color: 'bg-blue-500' },
    { id: 'ai-professional', name: 'AI Professional', color: 'bg-[#b29dd9]' },
    { id: 'ai-enterprise', name: 'AI Enterprise', color: 'bg-purple-600' },
    { id: 'hybrid-starter', name: 'Hybrid Starter', color: 'bg-green-500' },
    { id: 'hybrid-professional', name: 'Hybrid Professional', color: 'bg-[#b29dd9]' },
    { id: 'hybrid-enterprise', name: 'Hybrid Enterprise', color: 'bg-purple-600' },
  ];

  const maxCount = Math.max(...Object.values(planDistribution), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-[#003366]">{conversionRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  {subscribedUsers.length} of {totalUsers} users
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Subscribers</p>
                <p className="text-2xl font-bold text-[#003366]">{activeSubscriptions.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {subscribedUsers.length} total
                </p>
              </div>
              <div className="w-12 h-12 bg-[#b29dd9] rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Churn Rate</p>
                <p className="text-2xl font-bold text-[#003366]">{churnRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  {churnedSubscriptions.length} canceled
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                churnRate > 10 ? 'bg-red-500' : churnRate > 5 ? 'bg-orange-500' : 'bg-green-500'
              }`}>
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#003366]">
            Plan Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {planTiers.map((tier) => {
              const count = planDistribution[tier.id] || 0;
              const percentage = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
              const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

              return (
                <div key={tier.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{tier.name}</span>
                    <span className="text-sm text-gray-600">
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${tier.color} transition-all duration-500`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {/* No subscription users */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">No Subscription</span>
                <span className="text-sm text-gray-600">
                  {planDistribution['none'] || 0} ({totalUsers > 0 ? (((planDistribution['none'] || 0) / totalUsers) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-400 transition-all duration-500"
                  style={{ width: `${maxCount > 0 ? ((planDistribution['none'] || 0) / maxCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Status Breakdown */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#003366]">
            Subscription Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(statusDistribution).length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No active subscriptions</p>
            ) : (
              Object.entries(statusDistribution).map(([status, count]) => {
                const percentage = subscribedUsers.length > 0 ? (count / subscribedUsers.length) * 100 : 0;
                const statusConfig = {
                  active: { label: 'Active', color: 'bg-green-500', icon: '✓' },
                  trialing: { label: 'Free Trial', color: 'bg-blue-500', icon: '🎁' },
                  past_due: { label: 'Past Due', color: 'bg-red-500', icon: '⚠️' },
                  canceled: { label: 'Canceled', color: 'bg-gray-500', icon: '✗' },
                  incomplete: { label: 'Incomplete', color: 'bg-yellow-500', icon: '⏳' },
                  unpaid: { label: 'Unpaid', color: 'bg-red-600', icon: '💳' },
                };

                const config = statusConfig[status as keyof typeof statusConfig] || {
                  label: status,
                  color: 'bg-gray-400',
                  icon: '?'
                };

                return (
                  <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${config.color} rounded-lg flex items-center justify-center text-white font-medium`}>
                        {config.icon}
                      </div>
                      <div>
                        <p className="font-medium text-[#003366]">{config.label}</p>
                        <p className="text-xs text-gray-500">{percentage.toFixed(1)}% of subscribers</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-[#003366]">{count}</span>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
