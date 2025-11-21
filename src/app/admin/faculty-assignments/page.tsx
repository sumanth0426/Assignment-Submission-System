'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';

export default function FacultyAssignments() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [currentAssignments, setCurrentAssignments] = useState<any>(null);
  
  // Collections
  const facultiesCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'faculties') : null),
    [firestore, user]
  );
  const subjectsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'subjects') : null),
    [firestore, user]
  );
  const branchesCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'branches') : null),
    [firestore, user]
  );
  
  const { data: faculties, isLoading: facultiesLoading } = useCollection(facultiesCollection);
  const { data: subjects, isLoading: subjectsLoading } = useCollection(subjectsCollection);
  const { data: branches, isLoading: branchesLoading } = useCollection(branchesCollection);

  // Generate class options based on branches
  const classOptions = branches?.flatMap(branch => [
    `${branch.name}-1-1-A`, `${branch.name}-1-1-B`, `${branch.name}-1-2-A`, `${branch.name}-1-2-B`,
    `${branch.name}-2-1-A`, `${branch.name}-2-1-B`, `${branch.name}-2-2-A`, `${branch.name}-2-2-B`,
    `${branch.name}-3-1-A`, `${branch.name}-3-1-B`, `${branch.name}-3-2-A`, `${branch.name}-3-2-B`,
    `${branch.name}-4-1-A`, `${branch.name}-4-1-B`, `${branch.name}-4-2-A`, `${branch.name}-4-2-B`,
  ]) || [];

  const handleFacultySelect = (facultyId: string) => {
    setSelectedFaculty(facultyId);
    
    // Load current assignments for selected faculty
    const faculty = faculties?.find(f => f.id === facultyId);
    if (faculty) {
      setCurrentAssignments(faculty);
      setSelectedSubjects(faculty.subjects || []);
      setSelectedClasses(faculty.classes || []);
    } else {
      setCurrentAssignments(null);
      setSelectedSubjects([]);
      setSelectedClasses([]);
    }
  };

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleClassToggle = (className: string) => {
    setSelectedClasses(prev => 
      prev.includes(className) 
        ? prev.filter(c => c !== className)
        : [...prev, className]
    );
  };

  const handleSaveAssignments = async () => {
    if (!selectedFaculty) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a faculty member.',
      });
      return;
    }

    setIsLoading(true);

    try {
      await updateDoc(doc(firestore, 'faculties', selectedFaculty), {
        subjects: selectedSubjects,
        classes: selectedClasses,
        updatedAt: new Date(),
      });

      toast({
        title: 'Assignments Updated',
        description: 'Faculty assignments have been updated successfully.',
      });

      // Update current assignments
      const faculty = faculties?.find(f => f.id === selectedFaculty);
      if (faculty) {
        setCurrentAssignments({
          ...faculty,
          subjects: selectedSubjects,
          classes: selectedClasses,
        });
      }

    } catch (error) {
      console.error('Error updating assignments:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update assignments. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isLoadingData = isAuthLoading || facultiesLoading || subjectsLoading || branchesLoading;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-xl md:text-3xl font-bold font-headline">Faculty Assignments</h1>
      </div>

      <div className="space-y-6">
        {/* Faculty Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Faculty</CardTitle>
            <CardDescription>Choose a faculty member to view and edit their assignments.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <Select value={selectedFaculty} onValueChange={handleFacultySelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a faculty member" />
                </SelectTrigger>
                <SelectContent>
                  {faculties?.map(faculty => (
                    <SelectItem key={faculty.id} value={faculty.id}>
                      {faculty.firstName} {faculty.lastName} - {faculty.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {selectedFaculty && currentAssignments && (
          <>
            {/* Subject Assignments */}
            <Card>
              <CardHeader>
                <CardTitle>Subject Assignments</CardTitle>
                <CardDescription>
                  Select subjects that {currentAssignments.firstName} {currentAssignments.lastName} can teach.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {subjects?.map(subject => (
                      <div key={subject.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`subject-${subject.id}`}
                          checked={selectedSubjects.includes(subject.id)}
                          onCheckedChange={() => handleSubjectToggle(subject.id)}
                        />
                        <Label htmlFor={`subject-${subject.id}`} className="text-sm">
                          {subject.name} ({branches?.find(b => b.id === subject.branchId)?.name})
                        </Label>
                      </div>
                    ))}
                    {subjects?.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        No subjects found. Please add subjects first.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Class Assignments */}
            <Card>
              <CardHeader>
                <CardTitle>Class Assignments</CardTitle>
                <CardDescription>
                  Select classes that {currentAssignments.firstName} {currentAssignments.lastName} will teach.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {branches?.map(branch => (
                      <div key={branch.id} className="space-y-2">
                        <h4 className="font-semibold text-sm">{branch.name}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[
                            { year: 1, sem: 1, section: 'A' },
                            { year: 1, sem: 1, section: 'B' },
                            { year: 1, sem: 2, section: 'A' },
                            { year: 1, sem: 2, section: 'B' },
                            { year: 2, sem: 1, section: 'A' },
                            { year: 2, sem: 1, section: 'B' },
                            { year: 2, sem: 2, section: 'A' },
                            { year: 2, sem: 2, section: 'B' },
                            { year: 3, sem: 1, section: 'A' },
                            { year: 3, sem: 1, section: 'B' },
                            { year: 3, sem: 2, section: 'A' },
                            { year: 3, sem: 2, section: 'B' },
                            { year: 4, sem: 1, section: 'A' },
                            { year: 4, sem: 1, section: 'B' },
                            { year: 4, sem: 2, section: 'A' },
                            { year: 4, sem: 2, section: 'B' },
                          ].map(({ year, sem, section }) => {
                            const className = `${branch.name}-${year}-${sem}-${section}`;
                            return (
                              <div key={className} className="flex items-center space-x-2">
                                <Checkbox
                                  id={className}
                                  checked={selectedClasses.includes(className)}
                                  onCheckedChange={() => handleClassToggle(className)}
                                />
                                <Label htmlFor={className} className="text-xs">
                                  {year}-{sem}-{section}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {branches?.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        No branches found. Please add branches first.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSaveAssignments} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Assignments
              </Button>
            </div>
          </>
        )}

        {!selectedFaculty && !isLoadingData && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                Select a faculty member to view and manage their assignments.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
