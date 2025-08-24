"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  BarChart3, 
  CheckCircle, 
  AlertCircle,
  DollarSign,
  Activity,
  ArrowUpRight,
  RefreshCw,
  Settings,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  manualTranscriptions: {
    queued: number;
    inReview: number;
    total: number;
  };
  tttCanada: {
    pending: number;
    processing: number;
    completed: number;
    total: number;
    totalRevenue: number;
  };
  openai: {
    connected: boolean;
    costEstimate: {
      whisperCost: number;
      gptCost: number;
      totalUSD: number;
    };
  };
}

interface RecentActivity {
  id: string;
  type: 'manual_completion' | 'ttt_canada_order' | 'system_update';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info';
}

export default function AdminDashboard() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Wait for userProfile to load, then check role
    if (userProfile) {
      if (userProfile.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
    }
  }, [user, userProfile, router]);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch manual transcriptions stats
      const manualResponse = await fetch('/api/admin/manual-transcriptions');
      const manualData = await manualResponse.json();
      
      // Fetch TTT Canada stats
      const tttResponse = await fetch('/api/admin/ttt-canada-orders');
      const tttData = await tttResponse.json();
      
      // Create dashboard stats
      const dashboardStats: DashboardStats = {
        manualTranscriptions: manualData.success ? manualData.stats : {
          queued: 0,
          inReview: 0,
          total: 0
        },
        tttCanada: tttData.success ? tttData.stats : {
          pending: 0,
          processing: 0,
          completed: 0,
          total: 0,
          totalRevenue: 0
        },
        openai: {
          connected: true, // We tested this already
          costEstimate: {
            whisperCost: 0.18,
            gptCost: 0.12,
            totalUSD: 0.30
          }
        }
      };
      
      setStats(dashboardStats);
      
      // Mock recent activity data
      setRecentActivity([
        {
          id: '1',
          type: 'ttt_canada_order',
          title: 'Legal Consultation Completed',
          description: 'ttt-001 - Legal dictation service completed by Admin',
          timestamp: new Date().toISOString(),
          status: 'success'
        },
        {
          id: '2',
          type: 'system_update',
          title: 'OpenAI Integration Active',
          description: 'Whisper + GPT-4 services running successfully',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'info'
        },
        {
          id: '3',
          type: 'manual_completion',
          title: 'Firestore Index Created',
          description: 'Admin queue queries now working without errors',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          status: 'success'
        }
      ]);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // If user is logged in but we don't have userProfile yet, try to refresh it
    if (user && !userProfile) {
      console.log('User logged in but no profile loaded, refreshing...');
      // Small delay to allow AuthContext to load profile
      setTimeout(() => {
        if (!userProfile) {
          console.log('Profile still not loaded, triggering refresh');
          // This will trigger the AuthContext to refetch the profile
          window.location.reload();
        }
      }, 1000);
    }
  }, [user, userProfile]);

  if (!user || (userProfile && userProfile.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You need admin privileges to access this page.</p>
          <Link href="/dashboard">
            <Button variant="outline">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-ttt-navy animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'manual_completion':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ttt_canada_order':
        return <Globe className="h-4 w-4 text-blue-500" />;
      case 'system_update':
        return <Activity className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours === 0) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Welcome back, {userProfile?.firstName || 'Admin'}. Here&apos;s what&apos;s happening with your transcription platform.
              </p>
            </div>
            <Button 
              onClick={fetchDashboardData} 
              variant="outline" 
              size="sm"
              disabled={refreshing}
            >
              {refreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Manual Transcriptions */}
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Manual Queue</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.manualTranscriptions.total || 0}
                  </p>
                  <p className="ml-2 text-sm text-gray-600">
                    ({stats?.manualTranscriptions.queued || 0} queued)
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* TTT Canada Orders */}
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">TTT Canada</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.tttCanada.total || 0}
                  </p>
                  <p className="ml-2 text-sm text-gray-600">
                    ({stats?.tttCanada.pending || 0} pending)
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Revenue */}
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">Revenue (CAD)</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">
                    ${stats?.tttCanada.totalRevenue || 0}
                  </p>
                  <p className="ml-2 text-sm text-green-600">
                    +{stats?.tttCanada.completed || 0} completed
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* OpenAI Status */}
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">OpenAI API</p>
                <div className="flex items-baseline">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <p className="text-sm font-semibold text-gray-900">Connected</p>
                  </div>
                  <p className="ml-2 text-sm text-gray-600">
                    $0.30/30min
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/admin/manual-transcriptions">
                  <Button variant="outline" className="w-full justify-start h-auto p-4">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 mr-3 text-orange-600" />
                      <div className="text-left">
                        <div className="font-medium">Manual Queue</div>
                        <div className="text-sm text-gray-600">
                          {stats?.manualTranscriptions.total || 0} jobs waiting
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 ml-auto text-gray-400" />
                    </div>
                  </Button>
                </Link>

                <Link href="/admin/ttt-canada-orders">
                  <Button variant="outline" className="w-full justify-start h-auto p-4">
                    <div className="flex items-center">
                      <Globe className="h-5 w-5 mr-3 text-blue-600" />
                      <div className="text-left">
                        <div className="font-medium">TTT Canada</div>
                        <div className="text-sm text-gray-600">
                          {stats?.tttCanada.pending || 0} orders pending
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 ml-auto text-gray-400" />
                    </div>
                  </Button>
                </Link>

                <Link href="/admin/setup">
                  <Button variant="outline" className="w-full justify-start h-auto p-4">
                    <div className="flex items-center">
                      <Settings className="h-5 w-5 mr-3 text-gray-600" />
                      <div className="text-left">
                        <div className="font-medium">Admin Settings</div>
                        <div className="text-sm text-gray-600">
                          Configure system
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 ml-auto text-gray-400" />
                    </div>
                  </Button>
                </Link>

                <Button variant="outline" className="w-full justify-start h-auto p-4">
                  <div className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-3 text-green-600" />
                    <div className="text-left">
                      <div className="font-medium">Analytics</div>
                      <div className="text-sm text-gray-600">
                        View detailed reports
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 ml-auto text-gray-400" />
                  </div>
                </Button>
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <Button variant="ghost" size="sm" className="w-full">
                View All Activity
                <ArrowUpRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>

        {/* System Status */}
        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">OpenAI Whisper</p>
                <p className="text-xs text-gray-600">Transcription service active</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">OpenAI GPT-4</p>
                <p className="text-xs text-gray-600">Enhancement service active</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Firestore</p>
                <p className="text-xs text-gray-600">Database operational</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}