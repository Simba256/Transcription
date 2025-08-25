import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import {
  CreditBalance,
  CreditTransaction,
  CreditPurchase,
  CreditBalanceResponse,
  CreditTransactionResponse
} from '@/types/credits';

export class CreditService {
  
  /**
   * Get user's current credit balance
   */
  async getCreditBalance(userId: string): Promise<CreditBalanceResponse> {
    const balanceDoc = doc(db, 'credit_balances', userId);
    const balanceSnap = await getDoc(balanceDoc);
    
    if (balanceSnap.exists()) {
      const data = balanceSnap.data() as CreditBalance;
      return {
        balance: data.balance || 0,
        totalPurchased: data.totalPurchased || 0,
        totalSpent: data.totalSpent || 0
      };
    }
    
    // Initialize balance if doesn't exist
    await this.initializeCreditBalance(userId);
    return { balance: 0, totalPurchased: 0, totalSpent: 0 };
  }
  
  /**
   * Initialize credit balance for new user
   */
  private async initializeCreditBalance(userId: string): Promise<void> {
    const balanceDoc = doc(db, 'credit_balances', userId);
    await setDoc(balanceDoc, {
      userId,
      balance: 0,
      totalPurchased: 0,
      totalSpent: 0,
      lastUpdated: serverTimestamp(),
      createdAt: serverTimestamp()
    });
  }
  
  /**
   * Add credits to user balance (for purchases)
   */
  async addCredits(
    userId: string,
    amount: number,
    description: string,
    stripePaymentIntentId?: string,
    packageId?: string
  ): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const balanceRef = doc(db, 'credit_balances', userId);
      const balanceDoc = await transaction.get(balanceRef);
      
      let currentBalance = 0;
      let totalPurchased = 0;
      
      if (balanceDoc.exists()) {
        const data = balanceDoc.data() as CreditBalance;
        currentBalance = data.balance || 0;
        totalPurchased = data.totalPurchased || 0;
      }
      
      // Update balance
      transaction.set(balanceRef, {
        userId,
        balance: currentBalance + amount,
        totalPurchased: totalPurchased + amount,
        totalSpent: balanceDoc.exists() ? (balanceDoc.data() as CreditBalance).totalSpent || 0 : 0,
        lastUpdated: serverTimestamp(),
        createdAt: balanceDoc.exists() ? (balanceDoc.data() as CreditBalance).createdAt : serverTimestamp()
      });
      
      // Record transaction
      const transactionRef = doc(collection(db, 'credit_transactions'));
      const transactionData: any = {
        userId,
        type: 'purchase',
        amount,
        description,
        createdAt: serverTimestamp()
      };
      
      if (stripePaymentIntentId) {
        transactionData.stripePaymentIntentId = stripePaymentIntentId;
      }
      
      if (packageId) {
        transactionData.metadata = { packageId };
      }
      
      transaction.set(transactionRef, transactionData);
    });
  }
  
  /**
   * Deduct credits from user balance (for transcriptions)
   */
  async deductCredits(
    userId: string,
    amount: number,
    description: string,
    relatedJobId?: string,
    metadata?: {
      transcriptionMode?: 'ai' | 'human' | 'hybrid';
      qualityLevel?: 'standard' | 'premium';
      durationMinutes?: number;
    }
  ): Promise<{ success: boolean; newBalance: number }> {
    
    return await runTransaction(db, async (transaction) => {
      const balanceRef = doc(db, 'credit_balances', userId);
      const balanceDoc = await transaction.get(balanceRef);
      
      if (!balanceDoc.exists()) {
        await this.initializeCreditBalance(userId);
        return { success: false, newBalance: 0 };
      }
      
      const currentData = balanceDoc.data() as CreditBalance;
      const currentBalance = currentData.balance || 0;
      
      // Check if user has sufficient credits
      if (currentBalance < amount) {
        return { success: false, newBalance: currentBalance };
      }
      
      const newBalance = currentBalance - amount;
      const totalSpent = (currentData.totalSpent || 0) + amount;
      
      // Update balance
      transaction.update(balanceRef, {
        balance: newBalance,
        totalSpent,
        lastUpdated: serverTimestamp()
      });
      
      // Record transaction
      const transactionRef = doc(collection(db, 'credit_transactions'));
      const transactionData: any = {
        userId,
        type: 'deduction',
        amount: -amount, // Negative for deductions
        description,
        createdAt: serverTimestamp()
      };
      
      if (relatedJobId) {
        transactionData.relatedJobId = relatedJobId;
      }
      
      if (metadata) {
        transactionData.metadata = metadata;
      }
      
      transaction.set(transactionRef, transactionData);
      
      return { success: true, newBalance };
    });
  }
  
  /**
   * Get user's credit transaction history
   */
  async getCreditTransactions(
    userId: string, 
    limitCount: number = 20
  ): Promise<CreditTransactionResponse[]> {
    const transactionsQuery = query(
      collection(db, 'credit_transactions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(transactionsQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data() as CreditTransaction;
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate().toISOString()
      };
    });
  }
  
  /**
   * Record a credit purchase
   */
  async recordCreditPurchase(purchase: Omit<CreditPurchase, 'id' | 'createdAt'>): Promise<string> {
    const purchaseRef = await addDoc(collection(db, 'credit_purchases'), {
      ...purchase,
      createdAt: serverTimestamp()
    });
    
    return purchaseRef.id;
  }
  
  /**
   * Update credit purchase status
   */
  async updateCreditPurchaseStatus(
    purchaseId: string, 
    status: CreditPurchase['status'],
    stripePaymentIntentId?: string
  ): Promise<void> {
    const purchaseRef = doc(db, 'credit_purchases', purchaseId);
    const updateData: any = {
      status,
      lastUpdated: serverTimestamp()
    };
    
    if (status === 'completed') {
      updateData.completedAt = serverTimestamp();
    }
    
    if (stripePaymentIntentId) {
      updateData.stripePaymentIntentId = stripePaymentIntentId;
    }
    
    await updateDoc(purchaseRef, updateData);
  }
  
  /**
   * Get credit purchase by Stripe session ID
   */
  async getCreditPurchaseBySessionId(sessionId: string): Promise<CreditPurchase | null> {
    const purchasesQuery = query(
      collection(db, 'credit_purchases'),
      where('stripeSessionId', '==', sessionId),
      limit(1)
    );
    
    const snapshot = await getDocs(purchasesQuery);
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as CreditPurchase;
  }
  
  /**
   * Check if user has sufficient credits for a transcription
   */
  async checkSufficientCredits(
    userId: string,
    requiredCredits: number
  ): Promise<{ sufficient: boolean; currentBalance: number; shortfall: number }> {
    const balance = await this.getCreditBalance(userId);
    const sufficient = balance.balance >= requiredCredits;
    const shortfall = sufficient ? 0 : requiredCredits - balance.balance;
    
    return {
      sufficient,
      currentBalance: balance.balance,
      shortfall
    };
  }
  
  /**
   * Refund credits (for failed transcriptions)
   */
  async refundCredits(
    userId: string,
    amount: number,
    description: string,
    relatedJobId?: string
  ): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const balanceRef = doc(db, 'credit_balances', userId);
      const balanceDoc = await transaction.get(balanceRef);
      
      if (!balanceDoc.exists()) {
        throw new Error('User balance not found');
      }
      
      const currentData = balanceDoc.data() as CreditBalance;
      const newBalance = (currentData.balance || 0) + amount;
      const totalSpent = Math.max(0, (currentData.totalSpent || 0) - amount);
      
      // Update balance
      transaction.update(balanceRef, {
        balance: newBalance,
        totalSpent,
        lastUpdated: serverTimestamp()
      });
      
      // Record refund transaction
      const transactionRef = doc(collection(db, 'credit_transactions'));
      const transactionData: any = {
        userId,
        type: 'refund',
        amount, // Positive for refunds
        description,
        createdAt: serverTimestamp()
      };
      
      if (relatedJobId) {
        transactionData.relatedJobId = relatedJobId;
      }
      
      transaction.set(transactionRef, transactionData);
    });
  }
}

export const creditService = new CreditService();