'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddStudentForm } from './AddStudentForm';
import { AddFacultyForm } from './AddFacultyForm';
import { WithId } from '@/firebase';

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: WithId<{ name: string }>[];
}

export function AddUserDialog({ open, onOpenChange, branches }: AddUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[600px] rounded-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>Select the user role and fill in the details.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="student" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="student">Student</TabsTrigger>
            <TabsTrigger value="faculty">Faculty</TabsTrigger>
          </TabsList>
          <TabsContent value="student" className="max-h-[80vh] overflow-y-auto">
            <AddStudentForm branches={branches} onFinished={() => onOpenChange(false)} />
          </TabsContent>
          <TabsContent value="faculty" className="max-h-[80vh] overflow-y-auto">
            <AddFacultyForm branches={branches} onFinished={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
