'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { CreditProvider } from '@/contexts/CreditContext';
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
          {children}
          <Toaster />
        </CreditProvider>
      </AuthProvider>
    </NoSSR>
  );
}