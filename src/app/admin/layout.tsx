'use client';

import { useRole } from '@/hooks/useRole';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, isLoading } = useRole();
  const router = useRouter();

  useEffect(() => {
    // Wait until the role check is complete before acting.
    if (isLoading) {
      return;
    }

    // If loading is done and the user is not an admin, redirect them.
    if (role !== 'admin') {
      router.push('/');
    }
  }, [role, isLoading, router]);

  // While checking the role, show a loading screen.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2">Verifying admin access...</p>
      </div>
    );
  }

  // If loading is complete and the user is a verified admin, show the content.
  if (role === 'admin') {
    return <>{children}</>;
  }

  // Fallback loader to prevent flashing content before redirect.
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="ml-2">Redirecting...</p>
    </div>
  );
}
