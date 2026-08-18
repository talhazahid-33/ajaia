'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getUser() ? '/documents' : '/login');
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
      Loading…
    </div>
  );
}
