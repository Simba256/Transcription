'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function SignOutButton() {
  const { signOut, loading } = useAuth();

  return (
    <button
      onClick={signOut}
      disabled={loading}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
    >
      Sign Out
    </button>
  );
}