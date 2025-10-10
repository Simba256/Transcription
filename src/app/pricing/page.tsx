'use client';

import dynamic from 'next/dynamic';

// Dynamically import PricingPage with SSR disabled to prevent build-time errors
// The pricing page needs PackageProvider which is only available on client-side
const PricingPage = dynamic(
  () => import('@/components/pages/PricingPage').then(mod => mod.PricingPage),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading pricing...</div>
      </div>
    )
  }
);

export default function Pricing() {
  return <PricingPage />;
}