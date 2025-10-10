"use client";

import React, { useEffect, useState } from 'react';
import { Search, Filter, MoreHorizontal, Mail, Ban, Repeat, Coins, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAllUsers } from '@/lib/firebase/firestore';
import { UserData } from '@/lib/firebase/auth';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign } from 'lucide-react';

export default function UserManagementPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterSubscription, setFilterSubscription] = useState('all');
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [walletAmount, setWalletAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [updating, setUpdating] = useState(false);

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
        toast({
          title: "Error loading users",
          description: "Please try again or contact support.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadUsers();
    }
  }, [userData, authLoading, router, toast]);

  const handleUpdateWalletBalance = async () => {
    if (!selectedUser?.id) return;

    const amount = parseFloat(walletAmount);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid wallet amount.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`/api/admin/users/${selectedUser.id}/wallet`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          walletBalance: amount,
          reason: adjustmentReason.trim() || `Admin updated wallet balance to CA$${amount.toFixed(2)}`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update wallet balance');
      }

      const result = await response.json();

      // Update the user in the local state
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === selectedUser.id ? { ...u, walletBalance: amount } : u
        )
      );

      toast({
        title: "Wallet balance updated",
        description: result.message,
      });

      // Close modal and reset form
      setSelectedUser(null);
      setWalletAmount('');
      setAdjustmentReason('');
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update wallet balance',
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesSubscription = filterSubscription === 'all' ||
      (filterSubscription === 'subscribed' && user.subscriptionPlan && user.subscriptionPlan !== 'none') ||
      (filterSubscription === 'none' && (!user.subscriptionPlan || user.subscriptionPlan === 'none'));
    return matchesSearch && matchesRole && matchesSubscription;
  });


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
          <div>
            <h1 className="text-3xl font-bold text-[#003366] mb-2">
              User Management
            </h1>
            <p className="text-gray-600">
              Manage user accounts, credits, and permissions.
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSubscription} onValueChange={setFilterSubscription}>
                <SelectTrigger className="w-full sm:w-52">
                  <Repeat className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by subscription" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subscriptions</SelectItem>
                  <SelectItem value="subscribed">Subscribed</SelectItem>
                  <SelectItem value="none">No Subscription</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#003366]">
              Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Subscription</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Usage</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Wallet</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 hidden lg:table-cell">Jobs</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 hidden lg:table-cell">Joined</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  )}
                  
                  {filteredUsers.map((user) => {
                    const hasPlan = user.subscriptionPlan && user.subscriptionPlan !== 'none';
                    const planName = hasPlan
                      ? user.subscriptionPlan?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
                      : 'None';
                    const usagePercent = hasPlan && user.includedMinutesPerMonth
                      ? Math.min(100, ((user.minutesUsedThisMonth || 0) / user.includedMinutesPerMonth) * 100)
                      : 0;

                    return (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="min-w-[150px]">
                            <p className="font-medium text-[#003366] truncate">{user.name || 'Unnamed User'}</p>
                            <p className="text-sm text-gray-600 truncate max-w-[200px]" title={user.email}>{user.email}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {hasPlan ? (
                            <div className="min-w-[100px]">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#b29dd9]/10 text-[#b29dd9] whitespace-nowrap">
                                {planName}
                              </span>
                              {user.subscriptionStatus && (
                                <div className="text-xs text-gray-500 mt-1 whitespace-nowrap">
                                  {user.subscriptionStatus === 'active' && '✓ Active'}
                                  {user.subscriptionStatus === 'trialing' && '🎁 Trial'}
                                  {user.subscriptionStatus === 'past_due' && '⚠️ Past Due'}
                                  {user.subscriptionStatus === 'canceled' && '✗ Canceled'}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4 hidden md:table-cell">
                          {hasPlan ? (
                            <div className="min-w-[120px]">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden w-20">
                                  <div
                                    className={`h-full transition-all ${
                                      usagePercent >= 100 ? 'bg-red-500' :
                                      usagePercent >= 80 ? 'bg-orange-500' :
                                      'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(100, usagePercent)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-600 whitespace-nowrap">{Math.round(usagePercent)}%</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1 whitespace-nowrap">
                                {user.minutesUsedThisMonth || 0}/{user.includedMinutesPerMonth || 0} min
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1 text-[#003366] font-medium">
                            <DollarSign className="h-3 w-3" />
                            <span>{((user.walletBalance || 0) + ((user.credits || 0) / 100)).toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 hidden lg:table-cell">
                          <span className="text-[#003366] font-medium">{user.totalJobs || 0}</span>
                        </td>
                        <td className="py-4 px-4 hidden lg:table-cell">
                          <span className="text-gray-600 text-sm whitespace-nowrap">
                            {user.createdAt?.toDate?.()?.toLocaleDateString() || '—'}
                          </span>
                        </td>
                      <td className="py-4 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              toast({
                                title: "Feature not available",
                                description: "Email functionality will be available in a future update.",
                              });
                            }}>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedUser(user);
                              const currentBalance = (user.walletBalance || 0) + ((user.credits || 0) / 100);
                              setWalletAmount(currentBalance.toFixed(2));
                              setAdjustmentReason('');
                            }}>
                              <DollarSign className="mr-2 h-4 w-4" />
                              Edit Wallet Balance
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              toast({
                                title: "Feature not available",
                                description: "Activity view will be available in a future update.",
                              });
                            }}>
                              View Activity
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => {
                              toast({
                                title: "Feature not available",
                                description: "User suspension will be available in a future update.",
                              });
                            }}>
                              <Ban className="mr-2 h-4 w-4" />
                              Suspend User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Balance Edit Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#003366]">
                  Edit Wallet Balance
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedUser(null);
                    setWalletAmount('');
                    setAdjustmentReason('');
                  }}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>

              <div className="mb-4 space-y-2 p-3 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">
                  <strong>User:</strong> {selectedUser.name || 'Unnamed User'}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Email:</strong> {selectedUser.email}
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <strong>Current Balance:</strong>
                  <div className="flex items-center gap-1 text-[#003366] font-medium">
                    <DollarSign className="h-3 w-3" />
                    <span>{((selectedUser.walletBalance || 0) + ((selectedUser.credits || 0) / 100)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="walletAmount" className="text-sm font-medium text-gray-700">
                    New Wallet Balance (CA$)
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="walletAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={walletAmount}
                      onChange={(e) => setWalletAmount(e.target.value)}
                      placeholder="Enter wallet balance"
                      className="mt-1 pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {(() => {
                      const currentBalance = (selectedUser.walletBalance || 0) + ((selectedUser.credits || 0) / 100);
                      const newBalance = parseFloat(walletAmount) || 0;
                      const change = newBalance - currentBalance;
                      return (
                        <>
                          Current: CA${currentBalance.toFixed(2)}
                          {walletAmount && !isNaN(parseFloat(walletAmount)) && (
                            <span className="ml-2">
                              → Change: {change >= 0 ? '+' : ''}CA${change.toFixed(2)}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </p>
                </div>

                <div>
                  <Label htmlFor="adjustmentReason" className="text-sm font-medium text-gray-700">
                    Reason (Optional)
                  </Label>
                  <Textarea
                    id="adjustmentReason"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="Enter reason for wallet balance adjustment..."
                    rows={3}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be recorded in the transaction history.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(null);
                    setWalletAmount('');
                    setAdjustmentReason('');
                  }}
                  disabled={updating}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateWalletBalance}
                  disabled={updating || !walletAmount || isNaN(parseFloat(walletAmount)) || parseFloat(walletAmount) < 0}
                  className="flex-1 bg-[#003366] hover:bg-[#004080]"
                >
                  {updating ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update Balance'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}