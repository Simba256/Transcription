"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Package, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CreditDisplay } from '@/components/ui/CreditDisplay';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  originalPrice?: number;
  description: string;
  popular: boolean;
  active: boolean;
  features: string[];
}

export function PackageManager() {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [editingPackage, setEditingPackage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [packageCounter, setPackageCounter] = useState(4);

  // Package data - in a real application, this would come from Firestore
  const [packages, setPackages] = useState<CreditPackage[]>([
    {
      id: 'starter',
      name: 'Starter Pack',
      credits: 1000,
      price: 10,
      description: 'Perfect for individuals and small projects',
      popular: false,
      active: true,
      features: [
        '1,000 credits',
        'AI transcription',
        'Basic editing tools',
        'PDF/DOCX export',
        'Email support'
      ]
    },
    {
      id: 'professional',
      name: 'Professional Pack',
      credits: 5000,
      price: 45,
      originalPrice: 50,
      description: 'Most popular for businesses and professionals',
      popular: true,
      active: true,
      features: [
        '5,000 credits',
        'All transcription modes',
        'Advanced editing tools',
        'Priority processing',
        'Redaction tools',
        'Phone support'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise Pack',
      credits: 12000,
      price: 100,
      originalPrice: 120,
      description: 'Best value for high-volume users',
      popular: false,
      active: true,
      features: [
        '12,000 credits',
        'All transcription modes',
        'Bulk upload',
        'Custom formatting',
        'API access',
        'Dedicated support'
      ]
    }
  ]);

  const [newPackage, setNewPackage] = useState<Partial<CreditPackage>>({
    name: '',
    credits: 0,
    price: 0,
    description: '',
    popular: false,
    active: true,
    features: []
  });


  const handleCreatePackage = async () => {
    if (!newPackage.name || !newPackage.credits || !newPackage.price) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newId = `pkg_${packageCounter + 1}`;
      setPackageCounter(prev => prev + 1);

      const packageToAdd: CreditPackage = {
        id: newId,
        name: newPackage.name!,
        credits: newPackage.credits!,
        price: newPackage.price!,
        originalPrice: newPackage.originalPrice,
        description: newPackage.description!,
        popular: newPackage.popular!,
        active: newPackage.active!,
        features: newPackage.features || []
      };

      setPackages(prev => [...prev, packageToAdd]);
      setNewPackage({
        name: '',
        credits: 0,
        price: 0,
        description: '',
        popular: false,
        active: true,
        features: []
      });
      setIsCreating(false);

      toast({
        title: "Package created",
        description: "The new credit package has been created successfully.",
      });
    } catch (error) {
      console.error('Create package error:', error);
      toast({
        title: "Creation failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (packageId: string) => {
    setPackages(prev => prev.map(pkg => 
      pkg.id === packageId ? { ...pkg, active: !pkg.active } : pkg
    ));

    toast({
      title: "Package updated",
      description: "Package status has been updated.",
    });
  };

  const handleTogglePopular = async (packageId: string) => {
    setPackages(prev => prev.map(pkg => 
      pkg.id === packageId ? { ...pkg, popular: !pkg.popular } : pkg
    ));

    toast({
      title: "Package updated",
      description: "Package popularity status has been updated.",
    });
  };

  const handleEditPackage = (packageId: string) => {
    setEditingPackage(packageId);
    const pkg = packages.find(p => p.id === packageId);
    toast({
      title: "Edit Package",
      description: `Editing "${pkg?.name}" package. Edit functionality coming soon!`,
    });
  };

  const handleDeletePackage = async (packageId: string) => {
    if (confirm('Are you sure you want to delete this package?')) {
      setPackages(prev => prev.filter(pkg => pkg.id !== packageId));
      
      toast({
        title: "Package deleted",
        description: "The credit package has been deleted.",
      });
    }
  };



  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#003366] mb-2">
                Package Manager
              </h1>
              <p className="text-gray-600">
                Create and manage credit packages for your customers.
              </p>
            </div>
            <Button 
              onClick={() => setIsCreating(true)}
              className="bg-[#003366] hover:bg-[#002244] text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Package
            </Button>
          </div>
        </div>

        {/* Create New Package Form */}
        {isCreating && (
          <Card className="border-0 shadow-sm mb-8">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366]">
                Create New Package
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Package Name *</Label>
                  <Input
                    id="name"
                    value={newPackage.name}
                    onChange={(e) => setNewPackage(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Professional Pack"
                  />
                </div>

                <div>
                  <Label htmlFor="credits">Credits *</Label>
                  <Input
                    id="credits"
                    type="number"
                    value={newPackage.credits}
                    onChange={(e) => setNewPackage(prev => ({ ...prev, credits: parseInt(e.target.value) || 0 }))}
                    placeholder="e.g., 5000"
                  />
                </div>

                <div>
                  <Label htmlFor="price">Price (CAD) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={newPackage.price}
                    onChange={(e) => setNewPackage(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="e.g., 45.00"
                  />
                </div>

                <div>
                  <Label htmlFor="originalPrice">Original Price (CAD)</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    value={newPackage.originalPrice || ''}
                    onChange={(e) => setNewPackage(prev => ({ ...prev, originalPrice: parseFloat(e.target.value) || undefined }))}
                    placeholder="e.g., 50.00"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={newPackage.description}
                    onChange={(e) => setNewPackage(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the package benefits..."
                    rows={3}
                  />
                </div>


                <div className="flex items-center space-x-2">
                  <Switch
                    id="popular"
                    checked={newPackage.popular}
                    onCheckedChange={(checked) => setNewPackage(prev => ({ ...prev, popular: checked }))}
                  />
                  <Label htmlFor="popular">Mark as Popular</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={newPackage.active}
                    onCheckedChange={(checked) => setNewPackage(prev => ({ ...prev, active: checked }))}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePackage}
                  disabled={isSaving}
                  className="bg-[#003366] hover:bg-[#002244] text-white"
                >
                  {isSaving ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Package'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Packages */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <Card 
              key={pkg.id}
              className={`border-0 shadow-sm hover:shadow-md transition-shadow ${
                pkg.popular ? 'ring-2 ring-[#b29dd9]' : ''
              } ${!pkg.active ? 'opacity-60' : ''}`}
            >
              {pkg.popular && (
                <div className="bg-[#b29dd9] text-white text-center py-2 text-sm font-medium flex items-center justify-center">
                  <Star className="h-4 w-4 mr-1" />
                  Most Popular
                </div>
              )}
              
              <CardHeader className="text-center">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-xl font-bold text-[#003366]">
                    {pkg.name}
                  </CardTitle>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePopular(pkg.id)}
                      className={pkg.popular ? 'text-yellow-600' : 'text-gray-400'}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPackage(pkg.id)}
                      className="text-gray-600 hover:text-[#003366]"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePackage(pkg.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm">{pkg.description}</p>
                
                <div className="mt-4">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-3xl font-bold text-[#003366]">
                      ${pkg.price}
                    </span>
                    <span className="text-gray-600">CAD</span>
                    {pkg.originalPrice && (
                      <span className="text-lg text-gray-400 line-through">
                        ${pkg.originalPrice}
                      </span>
                    )}
                  </div>
                  {pkg.originalPrice && (
                    <div className="text-green-600 font-medium text-sm mt-1">
                      {Math.round((1 - pkg.price / pkg.originalPrice) * 100)}% savings
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="text-center mb-4">
                  <CreditDisplay amount={pkg.credits} size="md" className="justify-center" />
                </div>

                <div className="space-y-2 mb-6">
                  {pkg.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-600">
                      <Package className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={pkg.active}
                      onCheckedChange={() => handleToggleActive(pkg.id)}
                    />
                    <Label className="text-sm">
                      {pkg.active ? 'Active' : 'Inactive'}
                    </Label>
                  </div>
                  
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    pkg.active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {pkg.active ? 'Live' : 'Draft'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function AdminPackages() {
  return <PackageManager />;
}