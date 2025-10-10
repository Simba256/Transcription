"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  doc,
  getDoc,
  updateDoc,
  runTransaction,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { TranscriptionMode } from '@/lib/firebase/transcriptions';

// Package types
interface Package {
  id: string;
  type: 'ai' | 'hybrid' | 'human';
  name: string;
  minutesTotal: number;
  minutesUsed: number;
  minutesRemaining: number;
  rate: number; // Cost per minute in CAD
  purchasedAt: Date;
  expiresAt: Date;
  active: boolean;
}

// Transaction types
interface WalletTransaction {
  id: string;
  type: 'package_purchase' | 'wallet_topup' | 'transcription' | 'refund' | 'adjustment';
  amount: number; // Positive for additions, negative for deductions
  description: string;
  createdAt: Date;
  jobId?: string;
  packageId?: string;
  minutesUsed?: number;
}

// Context type
interface WalletContextType {
  walletBalance: number;
  packages: Package[];
  transactions: WalletTransaction[];
  loading: boolean;
  refreshWallet: () => Promise<void>;
  deductForTranscription: (
    mode: TranscriptionMode,
    minutes: number,
    jobId: string
  ) => Promise<{
    success: boolean;
    costDeducted: number;
    packageMinutesUsed: number;
    walletUsed: number;
    error?: string
  }>;
  addPackage: (packageData: Omit<Package, 'id' | 'minutesUsed' | 'minutesRemaining' | 'active'>) => Promise<void>;
  addToWallet: (amount: number, description: string) => Promise<void>;
  checkSufficientBalance: (mode: TranscriptionMode, minutes: number) => {
    sufficient: boolean;
    totalCost: number;
    packageMinutes: number;
    walletNeeded: number;
    hasPackage: boolean;
  };
  refundTransaction: (jobId: string, amount: number, minutes: number) => Promise<void>;
  getActivePackageForMode: (mode: TranscriptionMode) => Package | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

interface WalletProviderProps {
  children: ReactNode;
}

// Mode pricing configuration (standard rates)
const MODE_PRICING = {
  ai: { standardRate: 1.20, name: 'AI Transcription' },
  hybrid: { standardRate: 1.50, name: 'Hybrid Review' },
  human: { standardRate: 2.50, name: 'Human Transcription' }
};

export function WalletProvider({ children }: WalletProviderProps) {
  const { user, userData, updateUserData } = useAuth();
  const [walletBalance, setWalletBalance] = useState(0);
  const [packages, setPackages] = useState<Package[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Load wallet data
  const loadWalletData = useCallback(async () => {
    if (!user) {
      setWalletBalance(0);
      setPackages([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get user document
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();

        // Combine legacy credits with wallet balance (1 credit = $0.01)
        const legacyCredits = (data.credits || 0) / 100;
        const wallet = data.walletBalance || 0;
        setWalletBalance(wallet + legacyCredits);

        // Load packages
        if (data.packages && Array.isArray(data.packages)) {
          const now = new Date();
          const activePackages = data.packages
            .map((pkg: any) => ({
              ...pkg,
              purchasedAt: pkg.purchasedAt?.toDate() || new Date(),
              expiresAt: pkg.expiresAt?.toDate() || new Date(),
              active: pkg.active && new Date(pkg.expiresAt?.toDate() || 0) > now
            }))
            .filter((pkg: Package) => pkg.active);
          setPackages(activePackages);
        }
      }

      // Load recent transactions
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const transactionsSnapshot = await getDocs(transactionsQuery);
      const loadedTransactions: WalletTransaction[] = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as WalletTransaction[];

      setTransactions(loadedTransactions);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  // Get active package for a specific mode
  const getActivePackageForMode = (mode: TranscriptionMode): Package | null => {
    const now = new Date();

    // Find packages that match the mode and have minutes remaining
    const eligiblePackages = packages.filter(pkg =>
      pkg.type === mode &&
      pkg.active &&
      pkg.minutesRemaining > 0 &&
      new Date(pkg.expiresAt) > now
    );

    // Return package with best rate (lowest)
    if (eligiblePackages.length > 0) {
      return eligiblePackages.reduce((best, current) =>
        current.rate < best.rate ? current : best
      );
    }

    return null;
  };

  // Check if user has sufficient balance
  const checkSufficientBalance = (mode: TranscriptionMode, minutes: number) => {
    const activePackage = getActivePackageForMode(mode);
    const standardRate = MODE_PRICING[mode].standardRate;

    let packageMinutes = 0;
    let walletNeeded = 0;
    let totalCost = 0;

    if (activePackage) {
      // Use package minutes first
      packageMinutes = Math.min(minutes, activePackage.minutesRemaining);
      const remainingMinutes = minutes - packageMinutes;

      // Calculate cost for package minutes (for tracking purposes)
      const packageCost = packageMinutes * activePackage.rate;

      // Calculate wallet needed for remaining minutes
      walletNeeded = remainingMinutes * standardRate;
      totalCost = packageCost + walletNeeded;
    } else {
      // No package, use wallet at standard rate
      walletNeeded = minutes * standardRate;
      totalCost = walletNeeded;
    }

    return {
      sufficient: walletBalance >= walletNeeded,
      totalCost,
      packageMinutes,
      walletNeeded,
      hasPackage: !!activePackage
    };
  };

  // Deduct for transcription
  const deductForTranscription = async (
    mode: TranscriptionMode,
    minutes: number,
    jobId: string
  ): Promise<{ success: boolean; costDeducted: number; packageMinutesUsed: number; walletUsed: number; error?: string }> => {
    if (!user) {
      return { success: false, costDeducted: 0, packageMinutesUsed: 0, walletUsed: 0, error: 'User not authenticated' };
    }

    try {
      return await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          throw new Error('User document not found');
        }

        const userData = userDoc.data();
        const currentWallet = (userData.walletBalance || 0) + ((userData.credits || 0) / 100);
        const currentPackages = userData.packages || [];
        const now = new Date();

        // Find best package for this mode
        const eligiblePackages = currentPackages.filter((pkg: any) =>
          pkg.type === mode &&
          pkg.active &&
          pkg.minutesRemaining > 0 &&
          new Date(pkg.expiresAt?.toDate() || 0) > now
        ).sort((a: any, b: any) => a.rate - b.rate); // Sort by best rate

        let remainingMinutes = minutes;
        let totalCostDeducted = 0;
        let packageMinutesUsed = 0;
        let walletUsed = 0;
        const updatedPackages = [...currentPackages];

        // Use package minutes first (FIFO by purchase date)
        for (const pkg of eligiblePackages) {
          if (remainingMinutes <= 0) break;

          const pkgIndex = updatedPackages.findIndex((p: any) => p.id === pkg.id);
          const minutesToUse = Math.min(remainingMinutes, pkg.minutesRemaining);

          updatedPackages[pkgIndex] = {
            ...pkg,
            minutesUsed: pkg.minutesUsed + minutesToUse,
            minutesRemaining: pkg.minutesRemaining - minutesToUse
          };

          packageMinutesUsed += minutesToUse;
          totalCostDeducted += minutesToUse * pkg.rate;
          remainingMinutes -= minutesToUse;
        }

        // Use wallet for remaining minutes
        if (remainingMinutes > 0) {
          const standardRate = MODE_PRICING[mode].standardRate;
          const walletCost = remainingMinutes * standardRate;

          if (currentWallet < walletCost) {
            throw new Error(`Insufficient wallet balance. Need CA$${walletCost.toFixed(2)} but only have CA$${currentWallet.toFixed(2)}`);
          }

          walletUsed = walletCost;
          totalCostDeducted += walletCost;
        }

        // Update user document
        const newWalletBalance = currentWallet - walletUsed;
        transaction.update(userRef, {
          walletBalance: newWalletBalance,
          credits: 0, // Clear legacy credits after combining
          packages: updatedPackages,
          updatedAt: serverTimestamp()
        });

        // Record transaction
        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          userId: user.uid,
          type: 'transcription',
          amount: -totalCostDeducted,
          description: `${MODE_PRICING[mode].name}: ${minutes} minutes`,
          jobId,
          packageMinutesUsed,
          walletUsed,
          minutesUsed: minutes,
          createdAt: serverTimestamp()
        });

        return {
          success: true,
          costDeducted: totalCostDeducted,
          packageMinutesUsed,
          walletUsed,
          error: undefined
        };
      });
    } catch (error: any) {
      console.error('Error deducting for transcription:', error);
      return {
        success: false,
        costDeducted: 0,
        packageMinutesUsed: 0,
        walletUsed: 0,
        error: error.message || 'Failed to process payment'
      };
    }
  };

  // Add package (called by webhook)
  const addPackage = async (packageData: Omit<Package, 'id' | 'minutesUsed' | 'minutesRemaining' | 'active'>) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const packageId = `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newPackage = {
        ...packageData,
        id: packageId,
        minutesUsed: 0,
        minutesRemaining: packageData.minutesTotal,
        active: true
      };

      await updateDoc(userRef, {
        packages: [...packages, newPackage],
        updatedAt: serverTimestamp()
      });

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'package_purchase',
        amount: packageData.minutesTotal * packageData.rate, // Total value
        description: `${packageData.name}: ${packageData.minutesTotal} minutes`,
        packageId,
        createdAt: serverTimestamp()
      });

      await loadWalletData();
    } catch (error) {
      console.error('Error adding package:', error);
      throw error;
    }
  };

  // Add to wallet (called by webhook)
  const addToWallet = async (amount: number, description: string) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('User not found');

        const currentBalance = userDoc.data().walletBalance || 0;

        transaction.update(userRef, {
          walletBalance: currentBalance + amount,
          credits: 0, // Clear legacy credits
          updatedAt: serverTimestamp()
        });

        // Record transaction
        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          userId: user.uid,
          type: 'wallet_topup',
          amount: amount,
          description,
          createdAt: serverTimestamp()
        });
      });

      await loadWalletData();
    } catch (error) {
      console.error('Error adding to wallet:', error);
      throw error;
    }
  };

  // Refund transaction
  const refundTransaction = async (jobId: string, amount: number, minutes: number) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('User not found');

        const currentBalance = userDoc.data().walletBalance || 0;

        transaction.update(userRef, {
          walletBalance: currentBalance + amount,
          updatedAt: serverTimestamp()
        });

        // Record refund transaction
        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          userId: user.uid,
          type: 'refund',
          amount: amount,
          description: `Refund for cancelled transcription (${minutes} minutes)`,
          jobId,
          createdAt: serverTimestamp()
        });
      });

      await loadWalletData();
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  };

  const refreshWallet = async () => {
    await loadWalletData();
  };

  const value: WalletContextType = {
    walletBalance,
    packages,
    transactions,
    loading,
    refreshWallet,
    deductForTranscription,
    addPackage,
    addToWallet,
    checkSufficientBalance,
    refundTransaction,
    getActivePackageForMode
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}