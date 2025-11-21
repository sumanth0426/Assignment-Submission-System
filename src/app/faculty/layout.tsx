'use client';

import { useRole } from '@/hooks/useRole';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const { role, isLoading } = useRole();
  const router = useRouter();

  useEffect(() => {
    console.log('Faculty layout - Role:', role, 'Loading:', isLoading);
    
    // Wait until the role check is complete before acting.
    if (isLoading) {
      return;
    }

    // If loading is done and the user is not faculty, redirect them.
    if (role !== 'faculty') {
      console.log('Faculty layout - Redirecting non-faculty user. Role:', role);
      // If user is admin, redirect to admin dashboard
      if (role === 'admin') {
        router.push('/admin/dashboard');
      } else if (role === 'student') {
        router.push('/student/dashboard');
      } else {
        // Guest or other roles, redirect to home
        router.push('/');
      }
    }
  }, [role, isLoading, router]);

  // While checking the role, show a loading screen.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2">Verifying faculty access...</p>
      </div>
    );
  }

  // If loading is complete and the user is a verified faculty, show the content.
  if (role === 'faculty') {
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
