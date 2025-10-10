'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { CreditProvider } from '@/contexts/CreditContext';
import { WalletProvider } from '@/contexts/WalletContext';
import NoSSR from '@/components/NoSSR';
import { Toaster } from '@/components/ui/toaster';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NoSSR fallback={
      <div suppressHydrationWarning>
        {children}
      </div>
    }>
      <AuthProvider>
        <CreditProvider>
          <WalletProvider>
            {children}
            <Toaster />
          </WalletProvider>
        </CreditProvider>
      </AuthProvider>
    </NoSSR>
  );
}