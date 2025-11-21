'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { WithId } from '@/firebase';
import { updateDoc, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

const facultySchema = z.object({
  firstName: z.string().min(2, 'First name is too short'),
  lastName: z.string().min(2, 'Last name is too short'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  assignedBranchIds: z.array(z.string()).min(1, 'Please select at least one branch'),
  assignedYears: z.array(z.string()).min(1, 'Please select at least one year'),
  assignedSemesters: z.array(z.string()).min(1, 'Please select at least one semester'),
  assignedSections: z.array(z.string()).min(1, 'Please select at least one section'),
  subjectCategories: z.array(z.object({
    name: z.string().min(1, 'Subject name is required'),
    assignedClasses: z.array(z.object({
      branchId: z.string(),
      year: z.number(),
      semester: z.number(),
      section: z.string(),
    })).min(1, 'Please assign at least one class for this subject'),
  })).optional(),
  assignedSubjectIds: z.array(z.string()).optional(),
});

type FacultyFormData = z.infer<typeof facultySchema>;

interface Faculty extends WithId<FacultyFormData> {}

interface EditFacultyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faculty: Faculty;
  branches: WithId<{ name: string }>[];
}

export function EditFacultyDialog({ open, onOpenChange, faculty, branches }: EditFacultyDialogProps) {
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FacultyFormData>({
    resolver: zodResolver(facultySchema),
    defaultValues: {
      firstName: faculty.firstName,
      lastName: faculty.lastName,
      email: faculty.email,
      phone: faculty.phone || '',
      assignedBranchIds: faculty.assignedBranchIds || [],
      assignedYears: faculty.assignedYears || [],
      assignedSemesters: faculty.assignedSemesters || [],
      assignedSections: faculty.assignedSections || [],
      subjectCategories: faculty.subjectCategories || [],
      assignedSubjectIds: faculty.assignedSubjectIds || [],
    },
  });

  const watchedBranchIds = watch('assignedBranchIds');
  const watchedYears = watch('assignedYears');
  const watchedSemesters = watch('assignedSemesters');
  const watchedSections = watch('assignedSections');

  const years = ['1', '2', '3', '4'];
  const semesters = ['1', '2'];
  const sections = ['A', 'B', 'C', 'D'];

  async function onSubmit(data: FacultyFormData) {
    if (!firestore) return;

    setIsSubmitting(true);
    try {
      const facultyRef = doc(firestore, 'faculties', faculty.id);
      await updateDoc(facultyRef, data);

      toast({
        title: 'Faculty Updated',
        description: 'Faculty information has been updated successfully.',
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating faculty:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update faculty. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[550px] rounded-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Faculty</DialogTitle>
          <DialogDescription>Update faculty information and assigned classes.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                {...register('firstName')}
                disabled={isSubmitting}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                {...register('lastName')}
                disabled={isSubmitting}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              {...register('phone')}
              disabled={isSubmitting}
            />
          </div>

          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Subject Categories</h3>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const currentCategories = faculty.subjectCategories || [];
                  setValue('subjectCategories', [
                    ...currentCategories,
                    { name: '', assignedClasses: [] }
                  ]);
                }}
              >
                Add Subject Category
              </Button>
            </div>

            <div className="space-y-4">
              {faculty.subjectCategories?.map((category, index) => (
                <div key={index} className="border rounded p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Subject Category {index + 1}</h4>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const currentCategories = faculty.subjectCategories || [];
                        setValue('subjectCategories', currentCategories.filter((_, i) => i !== index));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                  
                  <div>
                    <Label>Subject Name</Label>
                    <Input
                      placeholder="e.g., Mathematics, Physics, etc."
                      {...register(`subjectCategories.${index}.name` as const)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <Label>Assigned Classes for this Subject</Label>
                    <div className="mt-2 space-y-2">
                      {branches.map((branch) => (
                        <div key={branch.id} className="space-y-1">
                          <span className="font-medium">{branch.name}</span>
                          {years.map((year) => (
                            <div key={`${branch.id}-${year}`} className="ml-4 space-y-1">
                              <span className="text-sm">Year {year}</span>
                              {semesters.map((semester) => (
                                <div key={`${branch.id}-${year}-${semester}`} className="ml-4 space-y-1">
                                  <span className="text-sm">Semester {semester}</span>
                                  <div className="ml-4 flex gap-2">
                                    {sections.map((section) => {
                                      const isAssigned = category.assignedClasses?.some(
                                        cls => cls.branchId === branch.id && 
                                               cls.year === parseInt(year) && 
                                               cls.semester === parseInt(semester) && 
                                               cls.section === section
                                      );
                                      return (
                                        <div key={`${branch.id}-${year}-${semester}-${section}`} className="flex items-center space-x-1">
                                          <Checkbox
                                            id={`edit-subject-${index}-${branch.id}-${year}-${semester}-${section}`}
                                            checked={isAssigned}
                                            onCheckedChange={(checked) => {
                                              const currentCategories = faculty.subjectCategories || [];
                                              const classAssignment = {
                                                branchId: branch.id,
                                                year: parseInt(year),
                                                semester: parseInt(semester),
                                                section: section,
                                              };
                                              
                                              if (checked) {
                                                if (!currentCategories[index].assignedClasses) {
                                                  currentCategories[index].assignedClasses = [];
                                                }
                                                currentCategories[index].assignedClasses.push(classAssignment);
                                              } else {
                                                if (currentCategories[index].assignedClasses) {
                                                  currentCategories[index].assignedClasses = currentCategories[index].assignedClasses.filter(
                                                    cls => !(cls.branchId === branch.id && 
                                                            cls.year === parseInt(year) && 
                                                            cls.semester === parseInt(semester) && 
                                                            cls.section === section)
                                                  );
                                                }
                                              }
                                              
                                              setValue('subjectCategories', currentCategories);
                                            }}
                                          />
                                          <Label htmlFor={`edit-subject-${index}-${branch.id}-${year}-${semester}-${section}`} className="text-xs">
                                            {section}
                                          </Label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="branchId">Branch</Label>
            <Select onValueChange={(value) => setValue('assignedBranchIds', [value])} value={watchedBranchIds[0] || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assignedBranchIds && (
              <p className="text-sm text-red-500 mt-1">{errors.assignedBranchIds.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="year">Year</Label>
              <Select onValueChange={(value) => setValue('assignedYears', [value])} value={watchedYears[0] || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1st Year</SelectItem>
                  <SelectItem value="2">2nd Year</SelectItem>
                  <SelectItem value="3">3rd Year</SelectItem>
                  <SelectItem value="4">4th Year</SelectItem>
                </SelectContent>
              </Select>
              {errors.assignedYears && (
                <p className="text-sm text-red-500 mt-1">{errors.assignedYears.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="semester">Semester</Label>
              <Select onValueChange={(value) => setValue('assignedSemesters', [value])} value={watchedSemesters[0] || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Semester 1</SelectItem>
                  <SelectItem value="2">Semester 2</SelectItem>
                </SelectContent>
              </Select>
              {errors.assignedSemesters && (
                <p className="text-sm text-red-500 mt-1">{errors.assignedSemesters.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="section">Section</Label>
              <Select onValueChange={(value) => setValue('assignedSections', [value])} value={watchedSections[0] || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Section A</SelectItem>
                  <SelectItem value="B">Section B</SelectItem>
                  <SelectItem value="C">Section C</SelectItem>
                  <SelectItem value="D">Section D</SelectItem>
                </SelectContent>
              </Select>
              {errors.assignedSections && (
                <p className="text-sm text-red-500 mt-1">{errors.assignedSections.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Faculty'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
