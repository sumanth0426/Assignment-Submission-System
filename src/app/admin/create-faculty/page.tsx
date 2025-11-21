'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCollection, useFirestore, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Plus, X } from 'lucide-react';
import Link from 'next/link';

export default function CreateFaculty() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    facultyId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    department: '',
  });

  const [selectedClasses, setSelectedClasses] = useState<any[]>([]);

  // Class selection state
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedClassSubjects, setSelectedClassSubjects] = useState<string[]>([]);
  const auth = useAuth();
  
  // Collections
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

  // Subjects for the currently selected class (branch/year/semester)
  const classSubjectsQuery = useMemoFirebase(() => {
    if (!user || !selectedBranch || !selectedYear || !selectedSemester) return null;
    // We reuse subjectsCollection and filter client-side below
    return subjectsCollection;
  }, [subjectsCollection, user, selectedBranch, selectedYear, selectedSemester]);

  const { data: allSubjectsForClass } = useCollection(classSubjectsQuery);
  
  // Generate class options based on branches (used for the older checkbox UI if needed)
  const classOptions = branches?.flatMap(branch => [
    `${branch.name}-1-1-A`, `${branch.name}-1-1-B`, `${branch.name}-1-2-A`, `${branch.name}-1-2-B`,
    `${branch.name}-2-1-A`, `${branch.name}-2-1-B`, `${branch.name}-2-2-A`, `${branch.name}-2-2-B`,
    `${branch.name}-3-1-A`, `${branch.name}-3-1-B`, `${branch.name}-3-2-A`, `${branch.name}-3-2-B`,
    `${branch.name}-4-1-A`, `${branch.name}-4-1-B`, `${branch.name}-4-2-A`, `${branch.name}-4-2-B`,
  ]) || [];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClassToggle = (className: string) => {
    setSelectedClasses(prev => 
      prev.includes(className) 
        ? prev.filter(c => c !== className)
        : [...prev, className]
    );
  };

  const toggleClassSubject = (subjectId: string) => {
    setSelectedClassSubjects(prev => 
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleAddClassAssignment = () => {
    if (!selectedBranch || !selectedYear || !selectedSemester) {
      toast({ variant: 'destructive', title: 'Missing selection', description: 'Please select branch, year and semester.' });
      return;
    }

    const branchObj = branches?.find(b => b.id === selectedBranch);
    const assignment = {
      branchId: selectedBranch,
      branchName: branchObj?.name || selectedBranch,
      year: parseInt(selectedYear),
      semester: parseInt(selectedSemester),
      subjects: selectedClassSubjects,
    };

    // avoid duplicates
    const exists = selectedClasses.some(a =>
      a.branchId === assignment.branchId && a.year === assignment.year && a.semester === assignment.semester
    );
    if (!exists) {
      setSelectedClasses(prev => [...prev, assignment]);
    }

    // reset selection
    setSelectedBranch('');
    setSelectedYear('');
    setSelectedSemester('');
    setSelectedClassSubjects([]);
  };

  const handleRemoveClassAssignment = (index: number) => {
    setSelectedClasses(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.facultyId || !formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in all required fields (including Faculty ID and password).',
      });
      return;
    }

    if (selectedClasses.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please add at least one class assignment for this faculty.',
      });
      return;
    }

    if (!auth) {
      toast({ variant: 'destructive', title: 'Auth unavailable', description: 'Authentication service is not available.' });
      return;
    }

    setIsLoading(true);
    try {
      // Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const createdUid = userCredential.user.uid;

      // Create faculty document
      await addDoc(collection(firestore, 'faculties'), {
        uid: createdUid,
        facultyId: formData.facultyId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        classes: selectedClasses,
        createdAt: new Date(),
        isActive: true,
      });

      toast({
        title: 'Faculty Created',
        description: `${formData.firstName} ${formData.lastName} has been added successfully.`,
      });

      // Reset form
      setFormData({ facultyId: '', firstName: '', lastName: '', email: '', phone: '', password: '', department: '' });
      setSelectedClasses([]);
    } catch (err: any) {
      console.error('Error creating faculty:', err);
      toast({ variant: 'destructive', title: 'Error', description: err?.message || 'Failed to create faculty. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const isLoadingData = isAuthLoading || branchesLoading || subjectsLoading;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-xl md:text-3xl font-bold font-headline">Create Faculty</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the faculty member's basic details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="facultyId">Faculty ID *</Label>
                <Input
                  id="facultyId"
                  value={formData.facultyId}
                  onChange={(e) => handleInputChange('facultyId', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder="e.g., Computer Science, Electronics"
              />
            </div>
          </CardContent>
        </Card>

        {/* Class Assignment (per-class subjects) */}
        <Card>
          <CardHeader>
            <CardTitle>Class Assignment</CardTitle>
            <CardDescription>Select classes this faculty member will teach and choose subjects per class.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Branch</Label>
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches?.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                        <SelectItem value="4">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Semester</Label>
                    <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Semester 1</SelectItem>
                        <SelectItem value="2">Semester 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Subjects for chosen class */}
                {selectedBranch && selectedYear && selectedSemester && (
                  <div>
                    <Label>Subjects for selected class</Label>
                    <div className="mt-2 p-4 border rounded-lg bg-gray-50 max-h-48 overflow-y-auto">
                      {allSubjectsForClass && allSubjectsForClass.filter((s: any) =>
                        s.branchId === selectedBranch && s.year === parseInt(selectedYear) && s.semester === parseInt(selectedSemester)
                      ).length > 0 ? (
                        allSubjectsForClass.filter((s: any) =>
                          s.branchId === selectedBranch && s.year === parseInt(selectedYear) && s.semester === parseInt(selectedSemester)
                        ).map((subject: any) => (
                          <div key={subject.id} className="flex items-center space-x-2">
                            <Checkbox id={`cs-${subject.id}`} checked={selectedClassSubjects.includes(subject.id)} onCheckedChange={() => toggleClassSubject(subject.id)} />
                            <Label htmlFor={`cs-${subject.id}`}>{subject.name}</Label>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground">No subjects found for this class</p>
                      )}
                    </div>
                    <div className="mt-3">
                      <Button onClick={handleAddClassAssignment} className="w-full">
                        <Plus className="mr-2 h-4 w-4" /> Add Class
                      </Button>
                    </div>
                  </div>
                )}

                {/* Added class assignments list */}
                {selectedClasses.length > 0 && (
                  <div className="space-y-2">
                    {selectedClasses.map((a, idx) => (
                      <div key={`${a.branchId}-${a.year}-${a.semester}-${idx}`} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{a.branchName} - Year {a.year}, Sem {a.semester}</div>
                          <div className="text-sm text-muted-foreground">{(a.subjects || []).length} subjects</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleRemoveClassAssignment(idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Class Assignment */}
        <Card>
          <CardHeader>
            <CardTitle>Class Assignment</CardTitle>
            <CardDescription>Select classes this faculty member will teach (category-wise).</CardDescription>
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

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Link href="/admin/dashboard">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Faculty
          </Button>
        </div>
      </form>
    </div>
  );
}
