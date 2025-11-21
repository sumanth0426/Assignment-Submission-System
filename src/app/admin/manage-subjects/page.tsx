'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Edit, Trash2, PlusCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ManageSubjects() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    branchId: '',
    code: '',
    credits: '',
    description: '',
  });
  
  const [batchFormData, setBatchFormData] = useState({
    branchId: '',
    year: '',
    semester: '',
    subjectInputs: [''], // Start with one empty subject input
  });

  // Ensure subjectInputs is always an array
  const subjectInputs = batchFormData.subjectInputs || [''];
  
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
      setIsDialogOpen(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.branchId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in subject name and select a branch.',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (editingSubject) {
        // Update existing subject
        await updateDoc(doc(firestore, 'subjects', editingSubject.id), {
          name: formData.name,
          branchId: formData.branchId,
          code: formData.code,
          credits: formData.credits ? parseInt(formData.credits) : null,
          description: formData.description,
          updatedAt: new Date(),
        });
        
        toast({
          title: 'Subject Updated',
          description: 'Subject has been updated successfully.',
        });
      } else {
        // Create new subject
        await addDoc(collection(firestore, 'subjects'), {
          name: formData.name,
          branchId: formData.branchId,
          code: formData.code,
          credits: formData.credits ? parseInt(formData.credits) : null,
          description: formData.description,
          createdAt: new Date(),
          isActive: true,
        });
        
        toast({
          title: 'Subject Created',
          description: 'Subject has been added successfully.',
        });
      }

      // Reset form and close dialog
      setFormData({
        name: '',
        branchId: '',
        code: '',
        credits: '',
        description: '',
      });
      setEditingSubject(null);
      setIsDialogOpen(false);

    } catch (error) {
      console.error('Error saving subject:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save subject. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (subject: any) => {
    setFormData({
      name: subject.name,
      branchId: subject.branchId,
      code: subject.code || '',
      credits: subject.credits?.toString() || '',
      description: subject.description || '',
    });
    setEditingSubject(subject);
    setIsDialogOpen(true);
  };

  const handleDelete = async (subjectId: string) => {
    if (!confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(firestore, 'subjects', subjectId));
      toast({
        title: 'Subject Deleted',
        description: 'The subject has been removed from the system.',
      });
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete subject. Please try again.',
      });
    }
  };

  const openCreateDialog = () => {
    setFormData({
      name: '',
      branchId: '',
      code: '',
      credits: '',
      description: '',
    });
    setEditingSubject(null);
    setIsDialogOpen(true);
  };

  const isLoadingData = isAuthLoading || branchesLoading || subjectsLoading;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-xl md:text-3xl font-bold font-headline">Manage Subjects</h1>
        </div>
        <Button onClick={openCreateDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Subject
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subjects</CardTitle>
          <CardDescription>Manage subjects for different branches.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects?.map(subject => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>{subject.code || '-'}</TableCell>
                    <TableCell>
                      {branches?.find(b => b.id === subject.branchId)?.name || subject.branchId}
                    </TableCell>
                    <TableCell>{subject.credits || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {subject.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(subject)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(subject.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {subjects?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No subjects found. Click "Add Subject" to create your first subject.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Subject Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSubject ? 'Edit Subject' : 'Add Subject'}
            </DialogTitle>
          </DialogHeader>
          
          {!editingSubject && (
            <Tabs defaultValue="single" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single">Add Single Subject</TabsTrigger>
                <TabsTrigger value="multiple">Add Multiple Subjects</TabsTrigger>
              </TabsList>
              
              <TabsContent value="single">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Subject Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g., Data Structures"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="branchId">Branch *</Label>
                    <Select value={formData.branchId} onValueChange={(value) => handleInputChange('branchId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a branch" />
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="code">Subject Code</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => handleInputChange('code', e.target.value)}
                        placeholder="e.g., CS201"
                      />
                    </div>
                    <div>
                      <Label htmlFor="credits">Credits</Label>
                      <Input
                        id="credits"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.credits}
                        onChange={(e) => handleInputChange('credits', e.target.value)}
                        placeholder="e.g., 3"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Brief description of the subject"
                    />
                  </div>

                  <div className="flex justify-end gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Subject
                    </Button>
                  </div>
                </form>
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
                      onClick={() => setIsDialogOpen(false)}
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
          )}

          {editingSubject && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Subject Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Data Structures"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="branchId">Branch *</Label>
                <Select value={formData.branchId} onValueChange={(value) => handleInputChange('branchId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a branch" />
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Subject Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                    placeholder="e.g., CS201"
                  />
                </div>
                <div>
                  <Label htmlFor="credits">Credits</Label>
                  <Input
                    id="credits"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.credits}
                    onChange={(e) => handleInputChange('credits', e.target.value)}
                    placeholder="e.g., 3"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the subject"
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Subject
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
