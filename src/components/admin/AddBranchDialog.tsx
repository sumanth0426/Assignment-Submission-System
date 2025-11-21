'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

const branchSchema = z.object({
  name: z.string().min(2, 'Branch name must be at least 2 characters.'),
});

interface AddBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBranchDialog({ open, onOpenChange }: AddBranchDialogProps) {
  const { user, isUserLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof branchSchema>>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: '',
    },
    mode: 'onChange', // Validate on change
  });

  const { formState } = form;

  async function onSubmit(values: z.infer<typeof branchSchema>) {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to add a branch.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const branchesCollection = collection(firestore, 'branches');
      await addDoc(branchesCollection, { name: values.name });

      toast({
        title: 'Success',
        description: 'Branch added successfully.',
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding branch:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add branch. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = isUserLoading || isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[425px] rounded-lg">
        <DialogHeader>
          <DialogTitle>Add New Branch</DialogTitle>
          <DialogDescription>Enter the name of the new academic branch.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Computer Science and Engineering" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !user || !formState.isValid}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Branch
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
