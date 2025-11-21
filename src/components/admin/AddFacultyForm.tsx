'use client';

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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth, useFirestore, useUser, WithId, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

const facultySchema = z.object({
  firstName: z.string().min(2, 'First name is too short'),
  lastName: z.string().min(2, 'Last name is too short'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  assignedClasses: z.array(z.object({
    branchId: z.string(),
    year: z.number(),
    semester: z.number(),
    section: z.string(),
    subjectIds: z.array(z.string()),
  })).min(1, 'Please assign at least one class'),
});

interface AddFacultyFormProps {
  onFinished: () => void;
  branches: WithId<{ name: string }>[];
}

export function AddFacultyForm({ onFinished, branches }: AddFacultyFormProps) {
  const { user: adminUser, isUserLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();

  // Fetch existing subjects
  const subjectsCollection = useMemoFirebase(
    () => firestore ? collection(firestore, 'subjects') : null,
    [firestore]
  );
  const { data: subjects, isLoading: subjectsLoading } = useCollection(subjectsCollection);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof facultySchema>>({
    resolver: zodResolver(facultySchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      assignedClasses: [],
    },
    mode: 'onChange',
  });

  const { formState } = form;

  // Constants for options
  const years = ['1', '2', '3', '4'];
  const semesters = ['1', '2'];
  const sections = ['A', 'B', 'C', 'D'];

  async function onSubmit(values: z.infer<typeof facultySchema>) {
    if (!adminUser) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to add a faculty member.',
      });
      return;
    }
    setIsSubmitting(true);
    
    // Store admin credentials to sign back in later
    const adminEmail = adminUser.email;
    // Note: We don't have access to the admin's password, so we'll need to handle this differently
    
    try {
      // This is not ideal as it uses the admin's auth instance temporarily.
      // A Cloud Function would be a more robust solution for user creation.
      const { user } = await createUserWithEmailAndPassword(auth, values.email, values.password);

      // Create all combinations of assigned classes
      const assignedClasses = [];
      for (const branchId of values.assignedBranchIds) {
        for (const year of values.assignedYears) {
          for (const semester of values.assignedSemesters) {
            for (const section of values.assignedSections) {
              assignedClasses.push({
                branchId,
                year: parseInt(year),
                semester: parseInt(semester),
                section,
              });
            }
          }
        }
      }

      const facultyData = {
        id: user.uid,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        assignedClasses,
        assignedSubjectIds: values.assignedSubjectIds,
      };

      const facultyDocRef = doc(firestore, 'faculties', user.uid);
      await setDoc(facultyDocRef, facultyData, { merge: false });

      // Sign out the newly created user and show a message
      await auth.signOut();
      
      toast({
        title: 'Success',
        description: 'Faculty account created successfully. Please log in again as admin.',
      });
      form.reset();
      onFinished();
      
      // Redirect to login page to force admin to log back in
      window.location.href = '/login';
      
    } catch (error: any) {
      console.error('Error creating faculty:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error.code === 'auth/email-already-in-use'
            ? 'This email is already registered.'
            : 'Failed to create faculty account.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = isUserLoading || isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="Jane" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Smith" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="jane.smith@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assignedSubjectIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned Subjects</FormLabel>
              <div className="space-y-2 mt-2">
                {subjectsLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-sm">Loading subjects...</span>
                  </div>
                ) : subjects && subjects.length > 0 ? (
                  subjects.map((subject: any) => (
                    <div key={subject.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`subject-${subject.id}`}
                        checked={field.value?.includes(subject.id) || false}
                        onCheckedChange={(checked) => {
                          return checked
                            ? field.onChange([...field.value, subject.id])
                            : field.onChange(field.value?.filter((value: string) => value !== subject.id))
                        }}
                      />
                      <Label htmlFor={`subject-${subject.id}`} className="text-sm font-normal">
                        {subject.name} ({subject.code})
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No subjects available. Please create subjects first.</p>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
                <FormField
          control={form.control}
          name="assignedBranchIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned Branches</FormLabel>
              <div className="space-y-2 mt-2">
                {branches.map((branch) => (
                  <div key={branch.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`branch-${branch.id}`}
                      checked={field.value?.includes(branch.id) || false}
                      onCheckedChange={(checked) => {
                        return checked
                          ? field.onChange([...field.value, branch.id])
                          : field.onChange(field.value?.filter((value: string) => value !== branch.id))
                      }}
                    />
                    <Label htmlFor={`branch-${branch.id}`} className="text-sm font-normal">
                      {branch.name}
                    </Label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assignedYears"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned Years</FormLabel>
              <div className="space-y-2 mt-2">
                {years.map((year) => (
                  <div key={year} className="flex items-center space-x-2">
                    <Checkbox
                      id={`year-${year}`}
                      checked={field.value?.includes(year) || false}
                      onCheckedChange={(checked) => {
                        return checked
                          ? field.onChange([...field.value, year])
                          : field.onChange(field.value?.filter((value: string) => value !== year))
                      }}
                    />
                    <Label htmlFor={`year-${year}`} className="text-sm font-normal">
                      {year}st Year
                    </Label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assignedSemesters"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned Semesters</FormLabel>
              <div className="space-y-2 mt-2">
                {semesters.map((semester) => (
                  <div key={semester} className="flex items-center space-x-2">
                    <Checkbox
                      id={`semester-${semester}`}
                      checked={field.value?.includes(semester) || false}
                      onCheckedChange={(checked) => {
                        return checked
                          ? field.onChange([...field.value, semester])
                          : field.onChange(field.value?.filter((value: string) => value !== semester))
                      }}
                    />
                    <Label htmlFor={`semester-${semester}`} className="text-sm font-normal">
                      Semester {semester}
                    </Label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assignedSections"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned Sections</FormLabel>
              <div className="space-y-2 mt-2">
                {sections.map((section) => (
                  <div key={section} className="flex items-center space-x-2">
                    <Checkbox
                      id={`section-${section}`}
                      checked={field.value?.includes(section) || false}
                      onCheckedChange={(checked) => {
                        return checked
                          ? field.onChange([...field.value, section])
                          : field.onChange(field.value?.filter((value: string) => value !== section))
                      }}
                    />
                    <Label htmlFor={`section-${section}`} className="text-sm font-normal">
                      Section {section}
                    </Label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onFinished}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !adminUser || !formState.isValid}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Faculty
          </Button>
        </div>
      </form>
    </Form>
  );
}
