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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth, useFirestore, WithId, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

const studentSchema = z.object({
  rollNumber: z.string().regex(/^[a-zA-Z0-9]+$/, 'Invalid roll number format'),
  firstName: z.string().min(2, 'First name is too short'),
  lastName: z.string().min(2, 'Last name is too short'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  branchId: z.string().min(1, 'Please select a branch'),
  year: z.coerce.number().min(1).max(4),
  semester: z.coerce.number().min(1).max(2),
  section: z.string().length(1, 'Section must be a single character').toUpperCase(),
});

interface AddStudentFormProps {
  branches: WithId<{ name: string }>[];
  onFinished: () => void;
}

export function AddStudentForm({ branches, onFinished }: AddStudentFormProps) {
  const { user: adminUser, isUserLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof studentSchema>>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      rollNumber: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      branchId: '',
      year: 1,
      semester: 1,
      section: 'A',
    },
    mode: 'onChange',
  });

  const { formState } = form;

  async function onSubmit(values: z.infer<typeof studentSchema>) {
    if (!adminUser || !firestore || !auth) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to add a student.',
      });
      return;
    }
    setIsSubmitting(true);
    
    // Store admin credentials to sign back in later
    const adminEmail = adminUser.email;
    // Note: We don't have access to the admin's password, so we'll need to handle this differently
    
    try {
      // We cannot create a user with the admin's auth instance directly in the client.
      // This is a security risk. The robust way is with a Cloud Function.
      // For this prototype, we'll create the user and accept the risks.
      const { user } = await createUserWithEmailAndPassword(auth, values.email, values.password);

      const studentData = {
        id: user.uid,
        rollNumber: values.rollNumber,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        branchId: values.branchId,
        year: values.year,
        semester: values.semester,
        section: values.section,
      };

      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, studentData, { merge: false });

      // Sign out the newly created user and show a message
      await auth.signOut();
      
      toast({
        title: 'Success',
        description: 'Student account created successfully. Please log in again as admin.',
      });
      form.reset();
      onFinished();
      
      // Redirect to login page to force admin to log back in
      window.location.href = '/login';
      
    } catch (error: any) {
      console.error('Error creating student:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error.code === 'auth/email-already-in-use'
            ? 'This email is already registered.'
            : 'Failed to create student account.',
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
                  <Input placeholder="John" {...field} />
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
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="rollNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Roll Number</FormLabel>
              <FormControl>
                <Input placeholder="23671A6624" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john.doe@jbiet.edu.in" {...field} />
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
          name="branchId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Branch</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {branches.map(branch => (
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
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <FormControl>
                  <Input type="number" min="1" max="4" {...field} />
                </FormControl>
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
                <FormControl>
                  <Input type="number" min="1" max="2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="section"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Section</FormLabel>
                <FormControl>
                  <Input maxLength={1} placeholder="A" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onFinished}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !adminUser || !formState.isValid}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Student
          </Button>
        </div>
      </form>
    </Form>
  );
}
