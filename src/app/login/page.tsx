'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { useRole } from '@/hooks/useRole';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { role, isLoading: isRoleLoading, dashboardPath } = useRole();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    console.log('Login page - Role:', role, 'Loading:', isRoleLoading, 'Dashboard path:', dashboardPath);
    
    // If a logged-in user lands here, redirect them to their dashboard.
    // This runs after the initial role check is complete.
    if (!isRoleLoading && role !== 'guest') {
      console.log('Login page - Redirecting to dashboard:', dashboardPath);
      router.push(dashboardPath);
    }
  }, [role, isRoleLoading, dashboardPath, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The `useRole` hook will detect the auth change,
      // and the `useEffect` above will handle the redirection.
      toast({
        title: 'Login Successful',
        description: 'Redirecting to your dashboard...',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'Please check your credentials and try again.',
      });
      console.error(error);
      setIsLoggingIn(false);
    }
  };

  const isLoading = isRoleLoading || isLoggingIn;

  // Show a loading spinner if we are checking the role or in the middle of logging in.
  if (isRoleLoading || (role !== 'guest' && !isLoggingIn)) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-gradient-to-br from-blue-50 via-background to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Login</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoggingIn ? 'Verifying...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
