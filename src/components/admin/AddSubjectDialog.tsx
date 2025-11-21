'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useFirestore, WithId, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection } from 'firebase/firestore';
import { useState } from 'react';

const subjectSchema = z.object({
  name: z.string().min(2, 'Subject name must be at least 2 characters.'),
  branchId: z.string().min(1, 'Please select a branch.'),
  code: z.string().optional(),
  credits: z.string().optional(),
  description: z.string().optional(),
});

interface AddSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: WithId<{ name: string }>[];
}

export function AddSubjectDialog({ open, onOpenChange, branches }: AddSubjectDialogProps) {
  const { user, isUserLoading } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  // Single subject form
  const form = useForm<z.infer<typeof subjectSchema>>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: '',
      branchId: '',
      code: '',
      credits: '',
      description: '',
    },
    mode: 'onChange',
  });

  // Batch form state
  const [batchFormData, setBatchFormData] = useState({
    branchId: '',
    year: '',
    semester: '',
    subjectInputs: [''], // Start with one empty subject input
  });

  // Ensure subjectInputs is always an array
  const subjectInputs = batchFormData.subjectInputs || [''];

  const { formState } = form;

  async function onSubmit(values: z.infer<typeof subjectSchema>) {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to add a subject.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const subjectsCollection = collection(firestore, 'subjects');
      await addDoc(subjectsCollection, values);

      toast({
        title: 'Success',
        description: 'Subject added successfully.',
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding subject:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add subject. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleBatchInputChange = (field: string, value: string) => {
    setBatchFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSubjectInput = () => {
    setBatchFormData(prev => ({
      ...prev,
      subjectInputs: [...(prev.subjectInputs || ['']), '']
    }));
  };

  const removeSubjectInput = (index: number) => {
    setBatchFormData(prev => ({
      ...prev,
      subjectInputs: (prev.subjectInputs || ['']).filter((_, i) => i !== index)
    }));
  };

  const updateSubjectInput = (index: number, value: string) => {
    setBatchFormData(prev => ({
      ...prev,
      subjectInputs: (prev.subjectInputs || ['']).map((input, i) => i === index ? value : input)
    }));
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!batchFormData.branchId || !batchFormData.year || !batchFormData.semester) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select branch, year, and semester.',
      });
      return;
    }

    // Filter out empty subject inputs
    const validSubjects = (batchFormData.subjectInputs || ['']).filter(subject => subject.trim() !== '');
    
    if (validSubjects.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter at least one subject name.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const branch = branches?.find(b => b.id === batchFormData.branchId);
      const branchName = branch?.name || 'Unknown';
      
      // Create subjects in batch
      const subjectPromises = validSubjects.map((subjectName, index) => 
        addDoc(collection(firestore, 'subjects'), {
          name: subjectName.trim(),
          branchId: batchFormData.branchId,
          code: `${branchName.substring(0, 2).toUpperCase()}${batchFormData.year}${batchFormData.semester}${index + 1}`,
          credits: 3, // Default credits
          description: `${subjectName} for ${branchName} Year ${batchFormData.year} Semester ${batchFormData.semester}`,
          year: parseInt(batchFormData.year),
          semester: parseInt(batchFormData.semester),
          createdAt: new Date(),
          isActive: true,
        })
      );

      await Promise.all(subjectPromises);
      
      toast({
        title: 'Subjects Created',
        description: `${validSubjects.length} subjects have been added successfully.`,
      });

      // Reset form
      setBatchFormData({
        branchId: '',
        year: '',
        semester: '',
        subjectInputs: [''],
      });
      onOpenChange(false);

    } catch (error) {
      console.error('Error creating subjects:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create subjects. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadingState = isUserLoading || isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Subject</DialogTitle>
          <DialogDescription>
            Add a single subject or multiple subjects for a semester.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Add Single Subject</TabsTrigger>
            <TabsTrigger value="multiple">Add Multiple Subjects</TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Data Structures" {...field} />
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
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Code (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., CS101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="credits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credits (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 3" {...field} />
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
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of the subject" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loadingState || !user || !formState.isValid}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Subject
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="multiple">
            <form onSubmit={handleBatchSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="batch-branch">Branch *</Label>
                  <Select value={batchFormData.branchId} onValueChange={(value) => handleBatchInputChange('branchId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="batch-year">Year *</Label>
                  <Select value={batchFormData.year} onValueChange={(value) => handleBatchInputChange('year', value)}>
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
                  <Label htmlFor="batch-semester">Semester *</Label>
                  <Select value={batchFormData.semester} onValueChange={(value) => handleBatchInputChange('semester', value)}>
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

              <div>
                <Label>Subjects for {batchFormData.year ? `${batchFormData.year} Year` : 'Selected Year'} {batchFormData.semester ? `Semester ${batchFormData.semester}` : 'Selected Semester'}</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Enter subject names below. Click the + button to add more subjects.
                </p>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {subjectInputs.map((subject, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={subject}
                        onChange={(e) => updateSubjectInput(index, e.target.value)}
                        placeholder={`Subject ${index + 1} name`}
                        className="flex-1"
                      />
                      {subjectInputs.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeSubjectInput(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSubjectInput}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subject
                </Button>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create {subjectInputs.filter(s => s.trim() !== '').length} Subjects
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
