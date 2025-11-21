'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AddBranchDialog } from '@/components/admin/AddBranchDialog';
import { AddSubjectDialog } from '@/components/admin/AddSubjectDialog';
import { useState } from 'react';

export default function AcademicSettings() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);

  const branchesCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'branches') : null),
    [firestore, user]
  );
  const subjectsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'subjects') : null),
    [firestore, user]
  );

  const { data: branches, isLoading: branchesLoading } = useCollection(branchesCollection);
  const { data: subjects, isLoading: subjectsLoading } = useCollection(subjectsCollection);

  const isLoading = isAuthLoading || branchesLoading || subjectsLoading;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <AddBranchDialog open={isBranchDialogOpen} onOpenChange={setIsBranchDialogOpen} />
      <AddSubjectDialog
        open={isSubjectDialogOpen}
        onOpenChange={setIsSubjectDialogOpen}
        branches={branches || []}
      />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl md:text-3xl font-bold font-headline">Academic Settings</h1>
      </div>

      <Tabs defaultValue="branches">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
        </TabsList>
        <TabsContent value="branches">
          <Card>
            <CardHeader>
              <CardTitle>Branches</CardTitle>
              <CardDescription>Manage academic branches.</CardDescription>
              <Button
                size="sm"
                className="w-fit ml-auto -mt-12"
                onClick={() => setIsBranchDialogOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Branch
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches?.map(branch => (
                      <TableRow key={branch.id}>
                        <TableCell>{branch.name}</TableCell>
                      </TableRow>
                    ))}
                    {branches?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={1} className="text-center text-muted-foreground">
                          No branches found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle>Subjects</CardTitle>
              <CardDescription>Manage subjects for different branches.</CardDescription>
              <Button
                size="sm"
                className="w-fit ml-auto -mt-12"
                onClick={() => setIsSubjectDialogOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Subject
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject Name</TableHead>
                      <TableHead>Branch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjects?.map(subject => (
                      <TableRow key={subject.id}>
                        <TableCell>{subject.name}</TableCell>
                        <TableCell>
                          {branches?.find(b => b.id === subject.branchId)?.name || subject.branchId}
                        </TableCell>
                      </TableRow>
                    ))}
                    {subjects?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No subjects found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
