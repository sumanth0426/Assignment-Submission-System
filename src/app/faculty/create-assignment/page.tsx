'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, query, where } from 'firebase/firestore';
import { CalendarIcon, Loader2, FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';

const assignmentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  year: z.string().min(1, 'Please select a year.'),
  semester: z.string().min(1, 'Please select a semester.'),
  branchId: z.string().min(1, 'Please select a branch.'),
  subjectId: z.string().min(1, 'Please select a subject.'),
  deadline: z.date({
    required_error: 'A deadline is required.',
  }),
  targetBranches: z.array(z.string()).optional(),
  targetYears: z.array(z.string()).optional(),
  targetSemesters: z.array(z.string()).optional(),
  targetSections: z.array(z.string()).optional(),
});

export default function CreateAssignmentPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get faculty document to check assigned classes
  const facultyDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'faculties', user.uid) : null),
    [user, firestore]
  );
  const { data: facultyDoc, isLoading: facultyLoading } = useDoc(facultyDocRef);

  // Get all subjects for filtering
  const allSubjectsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'subjects') : null),
    [firestore, user]
  );
  const { data: allSubjects, isLoading: subjectsLoading } = useCollection(allSubjectsCollection);

  // Get branches for filtering options
  const branchesCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'branches') : null),
    [firestore, user]
  );
  const { data: branches, isLoading: branchesLoading } = useCollection(branchesCollection);

  const form = useForm<z.infer<typeof assignmentSchema>>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      title: '',
      description: '',
      year: '',
      semester: '',
      branchId: '',
      subjectId: '',
      deadline: new Date(), // Set current date as default
      targetBranches: [],
      targetYears: [],
      targetSemesters: [],
      targetSections: [],
    },
    mode: 'onChange',
  });

  // Watch form values for year, semester, and branch
  const selectedYear = form.watch('year');
  const selectedSemester = form.watch('semester');
  const selectedBranchId = form.watch('branchId');

  // Filter subjects based on selected year, semester, and branch
  const filteredSubjects = useMemo(() => {
    if (!allSubjects || !selectedYear || !selectedSemester || !selectedBranchId) {
      return [];
    }

    const filtered = allSubjects.filter((subject: any) => {
      // Check if subject matches the selected branch, year, and semester
      const matchesBranch = subject.branchId === selectedBranchId;
      const matchesYear = subject.year === parseInt(selectedYear);
      const matchesSemester = subject.semester === parseInt(selectedSemester);

      return matchesBranch && matchesYear && matchesSemester;
    });

    // If no subjects found for the exact combination, return all subjects for the branch
    if (filtered.length === 0) {
      return allSubjects.filter((subject: any) => {
        return subject.branchId === selectedBranchId;
      });
    }

    return filtered;
  }, [allSubjects, selectedYear, selectedSemester, selectedBranchId]);

  const { formState } = form;

  async function onSubmit(values: z.infer<typeof assignmentSchema>) {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to create an assignment.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const assignmentData = {
        title: values.title,
        description: values.description,
        year: parseInt(values.year),
        semester: parseInt(values.semester),
        branchId: values.branchId,
        subjectId: values.subjectId,
        facultyId: user.uid,
        deadline: new Date(values.deadline).toISOString(),
        createdAt: new Date().toISOString(),
        targetBranches: values.targetBranches || [],
        targetYears: values.targetYears || [],
        targetSemesters: values.targetSemesters || [],
        targetSections: values.targetSections || [],
        submissions: [],
      };

      await addDoc(collection(firestore, 'assignments'), assignmentData);

      toast({
        title: 'Assignment Created',
        description: 'The assignment has been created successfully.',
      });

      router.push('/faculty/dashboard');
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create assignment. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = facultyLoading || subjectsLoading || branchesLoading || isSubmitting;

  // Show loading overlay while initial data is loading
  if (facultyLoading || branchesLoading || subjectsLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Card className="max-w-3xl mx-auto">
          <CardContent className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading assignment form...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Create New Assignment</CardTitle>
          <CardDescription>
            Fill out the details below to create a new assignment for your students.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Chapter 5 Problem Set" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide detailed instructions for the assignment..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Academic Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Academic Details</h3>
                <p className="text-sm text-muted-foreground">
                  Select the year, semester, and branch to automatically show available subjects.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          // Reset subject when year changes
                          form.setValue('subjectId', '');
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {['1', '2', '3', '4'].map(year => (
                              <SelectItem key={year} value={year}>
                                {year}st Year
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="semester"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Semester</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          // Reset subject when semester changes
                          form.setValue('subjectId', '');
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select semester" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {['1', '2'].map(semester => (
                              <SelectItem key={semester} value={semester}>
                                Semester {semester}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="branchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          // Reset subject when branch changes
                          form.setValue('subjectId', '');
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {branches?.map(branch => (
                              <SelectItem key={branch.id} value={branch.id}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedYear || !selectedSemester || !selectedBranchId}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !selectedYear || !selectedSemester || !selectedBranchId
                                ? 'Please select year, semester, and branch first'
                                : filteredSubjects.length === 0
                                ? 'No subjects found for this branch'
                                : 'Select a subject'
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredSubjects.map((subject: any) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {selectedYear && selectedSemester && selectedBranchId && filteredSubjects.length === 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          No subjects found for this branch. Please add subjects first or contact admin.
                        </p>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Deadline</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Class Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Target Classes</h3>
                <p className="text-sm text-muted-foreground">
                  Select which classes should receive this assignment. Only your assigned classes are available.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetBranches"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branches</FormLabel>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {branches?.map(branch => (
                            <div key={branch.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`branch-${branch.id}`}
                                checked={field.value?.includes(branch.id) || false}
                                onChange={(e) => {
                                  const updated = e.target.checked
                                    ? [...(field.value || []), branch.id]
                                    : (field.value || []).filter(b => b !== branch.id);
                                  field.onChange(updated);
                                }}
                              />
                              <label htmlFor={`branch-${branch.id}`} className="text-sm">
                                {branch.name}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="targetYears"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Years</FormLabel>
                        <div className="space-y-2">
                          {['1', '2', '3', '4'].map(year => (
                            <div key={year} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`year-${year}`}
                                checked={field.value?.includes(year) || false}
                                onChange={(e) => {
                                  const updated = e.target.checked
                                    ? [...(field.value || []), year]
                                    : (field.value || []).filter(y => y !== year);
                                  field.onChange(updated);
                                }}
                              />
                              <label htmlFor={`year-${year}`} className="text-sm">
                                {year}st Year
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="targetSemesters"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Semesters</FormLabel>
                        <div className="space-y-2">
                          {['1', '2'].map(semester => (
                            <div key={semester} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`semester-${semester}`}
                                checked={field.value?.includes(semester) || false}
                                onChange={(e) => {
                                  const updated = e.target.checked
                                    ? [...(field.value || []), semester]
                                    : (field.value || []).filter(s => s !== semester);
                                  field.onChange(updated);
                                }}
                              />
                              <label htmlFor={`semester-${semester}`} className="text-sm">
                                Semester {semester}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="targetSections"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sections</FormLabel>
                        <div className="space-y-2">
                          {['A', 'B', 'C', 'D', 'E', 'F'].map(section => (
                            <div key={section} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`section-${section}`}
                                checked={field.value?.includes(section) || false}
                                onChange={(e) => {
                                  const updated = e.target.checked
                                    ? [...(field.value || []), section]
                                    : (field.value || []).filter(s => s !== section);
                                  field.onChange(updated);
                                }}
                              />
                              <label htmlFor={`section-${section}`} className="text-sm">
                                Section {section}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Assignment
                  </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
