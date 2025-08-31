"use client";

import React, { useEffect, useState } from 'react';
import { Search, Filter, MoreHorizontal, Mail, Ban } from 'lucide-react';
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
import { CreditDisplay } from '@/components/ui/CreditDisplay';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAllUsers } from '@/lib/firebase/firestore';

export default function UserManagementPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [users, setUsers] = useState<any[]>([]);

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

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <SelectTrigger className="w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Credits</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Jobs</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Joined</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Last Active</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  )}
                  
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-[#003366]">{user.name || 'Unnamed User'}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <CreditDisplay amount={user.credits || 0} size="sm" />
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-[#003366] font-medium">{user.totalJobs || 0}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-600 text-sm">
                          {user.createdAt?.toDate?.()?.toLocaleDateString() || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-600 text-sm">—</span>
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
                              toast({
                                title: "Feature not available",
                                description: "Credit editing will be available in a future update.",
                              });
                            }}>
                              Edit Credits
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
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}