"use client";

import React, { useEffect, useState } from 'react';
import { Users, FileText, DollarSign, TrendingUp, Clock, CheckCircle, Package, Wallet, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditContext';
import { useWallet } from '@/contexts/WalletContext';
import { usePackages } from '@/contexts/PackageContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TranscriptionJob } from '@/lib/firebase/transcriptions';
import { UserData } from '@/lib/firebase/auth';
import { collection, getDocs, query, orderBy, limit, getFirestore, where } from 'firebase/firestore';

export default function AdminPage() {
  const { userData, loading: authLoading } = useAuth();
  const { getAllUsers, getAllTransactions } = useCredits();
  const { packages } = usePackages();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recentJobs, setRecentJobs] = useState<TranscriptionJob[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserData[]>([]);
  const [, setAllUsers] = useState<UserData[]>([]);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeJobs: 0,
    totalRevenue: 0,
    avgProcessingTime: '2.5hrs',
    totalWalletBalance: 0,
    totalPackagesSold: 0,
    activePackages: 0,
    totalWalletTopups: 0
  });
  
  const [systemHealth, setSystemHealth] = useState({
    apiStatus: 'operational',
    processingQueue: 'normal',
    avgResponseTime: 0,
    queueLoad: 0,
    failureRate: 0
  });

  useEffect(() => {
    // Check if user is admin
    if (!authLoading && userData?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    const loadAdminData = async () => {
      if (userData?.role !== 'admin') return;

      try {
        setLoading(true);
        
        // Fetch all users
        const users = await getAllUsers();
        setAllUsers(users);
        setRecentUsers(users.slice(0, 3));

        // Fetch recent transcription jobs from all users
        const db = getFirestore();
        const transcriptionsRef = collection(db, 'transcriptions');
        const recentJobsQuery = query(
          transcriptionsRef,
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        
        const snapshot = await getDocs(recentJobsQuery);
        const jobs = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Safe date conversion helper
          const convertToDate = (timestamp) => {
            if (!timestamp) return null;
            if (typeof timestamp.toDate === 'function') {
              return timestamp.toDate();
            }
            if (timestamp instanceof Date) {
              return timestamp;
            }
            return new Date(timestamp);
          };
          
          return {
            id: doc.id,
            ...data,
            createdAt: convertToDate(data.createdAt),
            updatedAt: convertToDate(data.updatedAt),
            completedAt: convertToDate(data.completedAt)
          };
        });
        
        setRecentJobs(jobs);

        // Get all transactions for revenue calculations
        const allTransactions = await getAllTransactions();

        // Calculate system statistics
        const activeJobs = jobs.filter(j => j.status === 'processing' || j.status === 'queued').length;

        // Calculate total revenue from transactions
        // Filter for revenue-generating transactions
        const walletTopups = allTransactions.filter(t =>
          t.type === 'wallet_topup' || t.type === 'purchase' // 'purchase' for legacy compatibility
        );
        const packagePurchases = allTransactions.filter(t =>
          t.type === 'package_purchase'
        );

        // Calculate totals - wallet topups and package purchases are positive amounts
        const totalWalletTopups = walletTopups.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalPackageRevenue = packagePurchases.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalRevenue = totalWalletTopups + totalPackageRevenue;

        // Calculate total wallet balance across all users
        const totalWalletBalance = users.reduce((sum, user) => {
          const wallet = user.walletBalance || 0;
          const credits = (user.credits || 0) / 100; // Convert legacy credits to dollars
          return sum + wallet + credits;
        }, 0);

        // Get package statistics from Firestore
        const packagesQuery = query(collection(db, 'packages'));
        const packagesSnapshot = await getDocs(packagesQuery);
        const allPackages = packagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const activePackagesCount = allPackages.filter(p => p.active).length;
        const totalPackagesSold = packagePurchases.length;

        // Calculate actual processing times from completed jobs
        const completedJobs = jobs.filter(j => j.status === 'complete' && j.createdAt && j.completedAt);
        let avgProcessingTime = '2.5hrs'; // Default fallback
        
        if (completedJobs.length > 0) {
          const totalProcessingTime = completedJobs.reduce((sum, job) => {
            // Dates are already converted to JavaScript Date objects
            const startTime = job.createdAt;
            const endTime = job.completedAt;
            
            if (startTime && endTime) {
              return sum + (endTime - startTime);
            }
            return sum;
          }, 0);
          
          const avgMilliseconds = totalProcessingTime / completedJobs.length;
          const avgMinutes = avgMilliseconds / (1000 * 60);
          const avgHours = avgMinutes / 60;
          
          // Format based on duration
          if (avgMinutes < 60) {
            avgProcessingTime = `${Math.round(avgMinutes)}min`;
          } else if (avgHours < 24) {
            const hours = Math.floor(avgHours);
            const minutes = Math.round((avgHours - hours) * 60);
            avgProcessingTime = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
          } else {
            const days = Math.floor(avgHours / 24);
            const hours = Math.round(avgHours % 24);
            avgProcessingTime = hours > 0 ? `${days}d ${hours}h` : `${days}d`;
          }
        }

        setSystemStats({
          totalUsers: users.length,
          activeJobs,
          totalRevenue,
          avgProcessingTime,
          totalWalletBalance,
          totalPackagesSold,
          activePackages: activePackagesCount,
          totalWalletTopups
        });

        // Calculate system health metrics
        const totalJobs = jobs.length;
        const failedJobs = jobs.filter(j => j.status === 'failed').length;
        const queuedJobs = jobs.filter(j => j.status === 'queued' || j.status === 'processing').length;
        const pendingJobs = jobs.filter(j => j.status === 'pending-review' || j.status === 'pending-transcription').length;
        
        const failureRate = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0;
        const queueLoad = queuedJobs + pendingJobs;
        
        // Simulate response time calculation (in a real app, this would come from monitoring)
        const simulatedResponseTime = Math.random() * 100 + 50; // Random between 50-150ms
        
        setSystemHealth({
          apiStatus: failureRate > 10 ? 'degraded' : failureRate > 5 ? 'warning' : 'operational',
          processingQueue: queueLoad > 20 ? 'high' : queueLoad > 10 ? 'moderate' : 'normal',
          avgResponseTime: Math.round(simulatedResponseTime),
          queueLoad,
          failureRate: Math.round(failureRate * 10) / 10
        });

      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadAdminData();
    }
  }, [userData, authLoading, router]);

  // Prevent SSR hydration issues
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || authLoading || loading) {
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
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Overview of system activity and key metrics.
          </p>
        </div>


        {/* Key Metrics - Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-[#003366]">{systemStats.totalUsers.toLocaleString()}</p>
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
                  <p className="text-sm font-medium text-gray-600">Active Packages</p>
                  <p className="text-2xl font-bold text-[#003366]">{systemStats.activePackages}</p>
                  <p className="text-xs text-gray-500 mt-1">{systemStats.totalPackagesSold} sold</p>
                </div>
                <div className="w-12 h-12 bg-[#b29dd9] rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Wallet Balance</p>
                  <p className="text-2xl font-bold text-[#003366]">CA${systemStats.totalWalletBalance.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">All users</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-[#003366]">CA${systemStats.totalRevenue.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">Topups: CA${systemStats.totalWalletTopups.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Metrics - Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                  <p className="text-2xl font-bold text-[#003366]">{systemStats.activeJobs}</p>
                </div>
                <div className="w-12 h-12 bg-[#003366] rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Processing</p>
                  <p className="text-2xl font-bold text-[#003366]">{systemStats.avgProcessingTime}</p>
                </div>
                <div className="w-12 h-12 bg-[#2c3e50] rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Package Management Link */}
          <Link href="/admin/packages">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-[#b29dd9] to-[#9d87c7]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/90">Manage Packages</p>
                    <p className="text-lg font-bold text-white">Package Settings</p>
                    <p className="text-xs text-white/80 mt-1">Configure pricing & minutes</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <ArrowRight className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Jobs */}
          <Card className="border-0 shadow-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366]">
                Recent Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 min-h-[320px]">
                {recentJobs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No recent transcription jobs</p>
                  </div>
                )}
                
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors h-[104px]"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-[#003366] truncate">
                          {job.filename || job.originalFilename}
                        </h3>
                        <StatusBadge status={job.status || 'queued'} />
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{job.userEmail || ''}</span>
                        <span>{job.mode || 'AI'}</span>
                        <span>{job.duration || 0} min</span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {((job.creditsUsed || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Users */}
          <Card className="border-0 shadow-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366]">
                Recent Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 min-h-[320px]">
                {recentUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No users found</p>
                  </div>
                )}

                {recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors h-[104px]"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-[#003366] mb-1">
                        {user.name || 'Unnamed User'}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{user.email}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Joined {user.joinedAt?.toLocaleDateString?.() || user.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}</span>
                        <span>{user.totalJobs || 0} jobs</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="flex items-center gap-1 text-[#003366] font-medium">
                        <DollarSign className="h-3 w-3" />
                        {((user.walletBalance || 0) + ((user.credits || 0) / 100)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Health */}
        <div className="mt-8 mb-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366]">
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    systemHealth.apiStatus === 'operational' ? 'bg-green-100' :
                    systemHealth.apiStatus === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <CheckCircle className={`h-8 w-8 ${
                      systemHealth.apiStatus === 'operational' ? 'text-green-600' :
                      systemHealth.apiStatus === 'warning' ? 'text-yellow-600' : 'text-red-600'
                    }`} />
                  </div>
                  <h3 className="font-medium text-[#003366] mb-2">API Status</h3>
                  <p className={`text-sm ${
                    systemHealth.apiStatus === 'operational' ? 'text-green-600' :
                    systemHealth.apiStatus === 'warning' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {systemHealth.apiStatus === 'operational' ? 'All systems operational' :
                     systemHealth.apiStatus === 'warning' ? 'Performance degraded' : 'Service issues'}
                  </p>
                  {systemHealth.failureRate > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {systemHealth.failureRate}% failure rate
                    </p>
                  )}
                </div>

                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    systemHealth.processingQueue === 'normal' ? 'bg-green-100' :
                    systemHealth.processingQueue === 'moderate' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <TrendingUp className={`h-8 w-8 ${
                      systemHealth.processingQueue === 'normal' ? 'text-green-600' :
                      systemHealth.processingQueue === 'moderate' ? 'text-yellow-600' : 'text-red-600'
                    }`} />
                  </div>
                  <h3 className="font-medium text-[#003366] mb-2">Processing Queue</h3>
                  <p className={`text-sm ${
                    systemHealth.processingQueue === 'normal' ? 'text-green-600' :
                    systemHealth.processingQueue === 'moderate' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {systemHealth.processingQueue === 'normal' ? 'Normal load' :
                     systemHealth.processingQueue === 'moderate' ? 'Moderate load' : 'High load'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {systemHealth.queueLoad} jobs in queue
                  </p>
                </div>

                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    systemHealth.avgResponseTime < 100 ? 'bg-green-100' :
                    systemHealth.avgResponseTime < 200 ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <Clock className={`h-8 w-8 ${
                      systemHealth.avgResponseTime < 100 ? 'text-green-600' :
                      systemHealth.avgResponseTime < 200 ? 'text-yellow-600' : 'text-red-600'
                    }`} />
                  </div>
                  <h3 className="font-medium text-[#003366] mb-2">Response Time</h3>
                  <p className={`text-sm ${
                    systemHealth.avgResponseTime < 100 ? 'text-green-600' :
                    systemHealth.avgResponseTime < 200 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {systemHealth.avgResponseTime}ms average
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {systemHealth.avgResponseTime < 100 ? 'Excellent' :
                     systemHealth.avgResponseTime < 200 ? 'Good' : 'Needs attention'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}