"use client";

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Building, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user, userData, updateUserData } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    bio: ''
  });

  // Initialize form data when user data loads
  useEffect(() => {
    if (user && userData) {
      setFormData({
        name: userData.name || user.displayName || '',
        email: user.email || '',
        phone: userData.phone || '',
        company: userData.company || '',
        address: userData.address || '',
        bio: userData.bio || ''
      });
    }
  }, [user, userData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdating(true);

    try {
      // Update user data in Firestore (excluding email as it's readonly)
      await updateUserData({
        name: formData.name,
        phone: formData.phone,
        company: formData.company,
        address: formData.address,
        bio: formData.bio
      });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Update failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportData = () => {
    toast({
      title: "Feature not available",
      description: "Data export will be available in a future update.",
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Feature not available", 
      description: "Account deletion will be available in a future update.",
      variant: "destructive",
    });
  };

  const handleEmailNotifications = () => {
    toast({
      title: "Feature not available",
      description: "Email notification settings will be available in a future update.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#003366] mb-2">
            Profile Settings
          </h1>
          <p className="text-gray-600">
            Manage your account information and preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Summary */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <div className="w-24 h-24 bg-[#b29dd9] rounded-full flex items-center justify-center mx-auto mb-6">
                  <User className="h-12 w-12 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-[#003366] mb-2">
                  {userData?.name || user?.displayName || 'User'}
                </h2>
                <p className="text-gray-600 mb-4">{user?.email}</p>
                <div className="text-sm text-gray-500">
                  <p>Member since {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'January 2024'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-[#003366]">
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                        Full Name *
                      </Label>
                      <div className="mt-1 relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="pl-10"
                          placeholder="Your full name"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email Address *
                      </Label>
                      <div className="mt-1 relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="pl-10"
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                        Phone Number
                      </Label>
                      <div className="mt-1 relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          className="pl-10"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="company" className="text-sm font-medium text-gray-700">
                        Company
                      </Label>
                      <div className="mt-1 relative">
                        <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="company"
                          name="company"
                          type="text"
                          value={formData.company}
                          onChange={handleChange}
                          className="pl-10"
                          placeholder="Your company name"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                      Address
                    </Label>
                    <div className="mt-1 relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="address"
                        name="address"
                        type="text"
                        value={formData.address}
                        onChange={handleChange}
                        className="pl-10"
                        placeholder="Your address"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio" className="text-sm font-medium text-gray-700">
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      rows={4}
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="Tell us a bit about yourself..."
                      className="mt-1"
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFormData({
                          name: userData?.name || user?.displayName || '',
                          email: user?.email || '',
                          phone: userData?.phone || '',
                          company: userData?.company || '',
                          address: userData?.address || '',
                          bio: userData?.bio || ''
                        });
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      type="submit"
                      disabled={isUpdating}
                      className="bg-[#003366] hover:bg-[#002244] text-white"
                    >
                      {isUpdating ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Account Settings */}
        <div className="mt-8">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-[#003366]">
                Account Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-[#003366]">Email Notifications</h3>
                    <p className="text-sm text-gray-600">
                      Receive email updates about your transcription jobs
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleEmailNotifications}>
                    Configure
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-[#003366]">Data Export</h3>
                    <p className="text-sm text-gray-600">
                      Download all your transcription data
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleExportData}>
                    Export Data
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <h3 className="font-medium text-red-800">Delete Account</h3>
                    <p className="text-sm text-red-600">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100" onClick={handleDeleteAccount}>
                    Delete Account
                  </Button>
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