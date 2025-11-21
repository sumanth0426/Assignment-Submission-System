'use client';

import { useRole } from '@/hooks/useRole';
import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugPage() {
  const { role, isLoading, dashboardPath } = useRole();
  const { user, isUserLoading } = useUser();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Debug Information</h1>
      
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>Email:</strong> {user?.email || 'No user'}</p>
            <p><strong>UID:</strong> {user?.uid || 'No user'}</p>
            <p><strong>Loading:</strong> {isUserLoading ? 'Yes' : 'No'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>Role:</strong> {role}</p>
            <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
            <p><strong>Dashboard Path:</strong> {dashboardPath}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p>1. Login with your faculty account</p>
            <p>2. Come to this page (/debug)</p>
            <p>3. Check the information above</p>
            <p>4. Also check browser console (F12) for detailed logs</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
