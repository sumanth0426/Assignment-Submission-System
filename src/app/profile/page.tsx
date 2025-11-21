'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { doc } from 'firebase/firestore';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Determine the document to fetch based on role checks
  const adminDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'roles_admin', user.uid) : null),
    [user, firestore]
  );
  const { data: adminDoc, isLoading: isAdminLoading } = useDoc(adminDocRef);

  const facultyDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'faculties', user.uid) : null),
    [user, firestore]
  );
  const { data: facultyDoc, isLoading: isFacultyLoading } = useDoc(facultyDocRef);

  const studentDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: studentDoc, isLoading: isStudentLoading } = useDoc(studentDocRef);

  const isLoading = isUserLoading || isAdminLoading || isFacultyLoading || isStudentLoading;

  let profileData: any = null;
  let role = 'User';
  let specificData: any = null;

  if (adminDoc) {
    profileData = adminDoc;
    role = 'Admin';
    specificData = adminDoc;
  } else if (facultyDoc) {
    profileData = facultyDoc;
    role = 'Faculty';
    specificData = facultyDoc;
  } else if (studentDoc) {
    profileData = studentDoc;
    role = 'Student';
    specificData = studentDoc;
  }

  const getUserInitials = () => {
    if (profileData?.firstName) {
      return profileData.firstName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2">Loading profile...</p>
      </div>
    );
  }

  if (!user || !profileData) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <p>Could not load user profile.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 font-headline">My Profile</h1>
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={user.photoURL || undefined} alt="User avatar" />
            <AvatarFallback className="text-3xl">{getUserInitials()}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">
            {profileData.firstName} {profileData.lastName}
          </CardTitle>
          <CardDescription>{role}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{profileData.email}</span>
            </div>
            {role === 'Student' && specificData && (
              <>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Roll Number</span>
                  <span className="font-medium">{specificData.rollNumber}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Branch</span>
                  <span className="font-medium">{specificData.branchId}</span>
                </div>
                 <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Year / Semester</span>
                  <span className="font-medium">{specificData.year} / {specificData.semester}</span>
                </div>
                 <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Section</span>
                  <span className="font-medium">{specificData.section}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-medium">
                {role === 'Student' ? specificData?.rollNumber || 'N/A' : profileData.email || 'N/A'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
