"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  TranscriptionPackage,
  getAllPackages,
  getActivePackages,
  getPackagesByType,
  createPackage,
  updatePackage,
  deletePackage,
  togglePackageStatus,
  togglePackagePopular,
  subscribeToPackages,
  subscribeToActivePackages,
  initializeDefaultPackages
} from '@/lib/firebase/packages';

interface PackageContextType {
  packages: TranscriptionPackage[];
  activePackages: TranscriptionPackage[];
  loading: boolean;
  error: string | null;
  isAdmin: boolean;

  // Read operations
  getPackagesByType: (type: 'ai' | 'hybrid' | 'human', activeOnly?: boolean) => TranscriptionPackage[];
  getPackageById: (id: string) => TranscriptionPackage | undefined;

  // Admin operations
  createNewPackage: (packageData: Omit<TranscriptionPackage, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExistingPackage: (packageId: string, updates: Partial<TranscriptionPackage>) => Promise<void>;
  deleteExistingPackage: (packageId: string) => Promise<void>;
  toggleStatus: (packageId: string, active: boolean) => Promise<void>;
  togglePopular: (packageId: string, type: 'ai' | 'hybrid' | 'human', popular: boolean) => Promise<void>;

  // Utility
  refreshPackages: () => Promise<void>;
  initializeDefaults: () => Promise<void>;
}

const PackageContext = createContext<PackageContextType | undefined>(undefined);

export function usePackages() {
  const context = useContext(PackageContext);
  if (context === undefined) {
    throw new Error('usePackages must be used within a PackageProvider');
  }
  return context;
}

interface PackageProviderProps {
  children: ReactNode;
}

export function PackageProvider({ children }: PackageProviderProps) {
  const { user, userData } = useAuth();
  const [packages, setPackages] = useState<TranscriptionPackage[]>([]);
  const [activePackages, setActivePackages] = useState<TranscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = userData?.role === 'admin';

  // Load packages on mount
  useEffect(() => {
    const loadInitialPackages = async () => {
      setLoading(true);
      setError(null);
      try {
        const [allPackages, activeOnly] = await Promise.all([
          getAllPackages(),
          getActivePackages()
        ]);
        setPackages(allPackages);
        setActivePackages(activeOnly);
      } catch (err) {
        console.error('Error loading packages:', err);
        setError('Failed to load packages');
      } finally {
        setLoading(false);
      }
    };

    loadInitialPackages();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    // Subscribe to all packages if admin
    let unsubscribeAll: (() => void) | undefined;
    let unsubscribeActive: (() => void) | undefined;

    if (isAdmin) {
      unsubscribeAll = subscribeToPackages((updatedPackages) => {
        setPackages(updatedPackages);
      });
    }

    // Always subscribe to active packages for all users
    unsubscribeActive = subscribeToActivePackages((updatedPackages) => {
      setActivePackages(updatedPackages);
      // If not admin, set all packages to active packages only
      if (!isAdmin) {
        setPackages(updatedPackages);
      }
    });

    return () => {
      if (unsubscribeAll) unsubscribeAll();
      if (unsubscribeActive) unsubscribeActive();
    };
  }, [isAdmin]);

  // Get packages by type
  const getPackagesByTypeLocal = useCallback((type: 'ai' | 'hybrid' | 'human', activeOnly: boolean = true) => {
    const packagesToFilter = activeOnly ? activePackages : packages;
    return packagesToFilter.filter(pkg => pkg.type === type);
  }, [packages, activePackages]);

  // Get package by ID
  const getPackageById = useCallback((id: string) => {
    return packages.find(pkg => pkg.id === id);
  }, [packages]);

  // Create new package (Admin only)
  const createNewPackage = async (packageData: Omit<TranscriptionPackage, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    setError(null);
    try {
      await createPackage(packageData);
      // Real-time listener will update the state
    } catch (err) {
      console.error('Error creating package:', err);
      setError('Failed to create package');
      throw err;
    }
  };

  // Update package (Admin only)
  const updateExistingPackage = async (packageId: string, updates: Partial<TranscriptionPackage>) => {
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    setError(null);
    try {
      // Calculate new savings if price or minutes changed
      if (updates.price !== undefined || updates.minutes !== undefined) {
        const currentPackage = getPackageById(packageId);
        if (currentPackage) {
          const minutes = updates.minutes || currentPackage.minutes;
          const price = updates.price || currentPackage.price;
          const standardRate = currentPackage.standardRate;

          const perMinuteRate = price / minutes;
          const standardCost = standardRate * minutes;
          const savingsAmount = standardCost - price;
          const savingsPercentage = (savingsAmount / standardCost) * 100;

          updates.perMinuteRate = perMinuteRate;
          updates.savingsAmount = savingsAmount;
          updates.savingsPercentage = savingsPercentage;
        }
      }

      await updatePackage(packageId, updates);
      // Real-time listener will update the state
    } catch (err) {
      console.error('Error updating package:', err);
      setError('Failed to update package');
      throw err;
    }
  };

  // Delete package (Admin only)
  const deleteExistingPackage = async (packageId: string) => {
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    setError(null);
    try {
      await deletePackage(packageId);
      // Real-time listener will update the state
    } catch (err) {
      console.error('Error deleting package:', err);
      setError('Failed to delete package');
      throw err;
    }
  };

  // Toggle package status (Admin only)
  const toggleStatus = async (packageId: string, active: boolean) => {
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    setError(null);
    try {
      await togglePackageStatus(packageId, active);
      // Real-time listener will update the state
    } catch (err) {
      console.error('Error toggling package status:', err);
      setError('Failed to toggle package status');
      throw err;
    }
  };

  // Toggle package popular status (Admin only)
  const togglePopular = async (packageId: string, type: 'ai' | 'hybrid' | 'human', popular: boolean) => {
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    setError(null);
    try {
      await togglePackagePopular(packageId, type, popular);
      // Real-time listener will update the state
    } catch (err) {
      console.error('Error toggling package popular status:', err);
      setError('Failed to toggle package popular status');
      throw err;
    }
  };

  // Refresh packages manually
  const refreshPackages = async () => {
    setLoading(true);
    setError(null);
    try {
      const [allPackages, activeOnly] = await Promise.all([
        getAllPackages(),
        getActivePackages()
      ]);
      setPackages(allPackages);
      setActivePackages(activeOnly);
    } catch (err) {
      console.error('Error refreshing packages:', err);
      setError('Failed to refresh packages');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Initialize default packages (Admin only)
  const initializeDefaults = async () => {
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    setError(null);
    setLoading(true);
    try {
      await initializeDefaultPackages();
      await refreshPackages();
    } catch (err) {
      console.error('Error initializing default packages:', err);
      setError('Failed to initialize default packages');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value: PackageContextType = {
    packages,
    activePackages,
    loading,
    error,
    isAdmin,
    getPackagesByType: getPackagesByTypeLocal,
    getPackageById,
    createNewPackage,
    updateExistingPackage,
    deleteExistingPackage,
    toggleStatus,
    togglePopular,
    refreshPackages,
    initializeDefaults
  };

  return (
    <PackageContext.Provider value={value}>
      {children}
    </PackageContext.Provider>
  );
}