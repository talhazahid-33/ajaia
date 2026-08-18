'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/auth';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, ready } = useCurrentUser();

  useEffect(() => {
    if (ready && !user) {
      router.replace('/login');
    }
  }, [ready, router, user]);

  if (!ready || !user) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  return children;
}
