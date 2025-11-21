"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Loader2, X } from "lucide-react";
import { useCollection } from "@/firebase/firestore/use-collection";
import { where, query, collection } from "firebase/firestore";
import { useMemo } from "react";
import { useFirestore, useMemoFirebase } from "@/firebase";

interface AddClassToFacultyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facultyId: string;
  facultyName: string;
  onAssignClass: (classAssignments: any[]) => Promise<void>;
}

interface ClassAssignment {
  branchId: string;
  branchName: string;
  year: number;
  semester: number;
  subjects: string[];
}

export function AddClassToFacultyDialog({
  open,
  onOpenChange,
  facultyId,
  facultyName,
  onAssignClass
}: AddClassToFacultyDialogProps) {
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [classAssignments, setClassAssignments] = useState<ClassAssignment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();

  // Fetch branches
  const branchesRef = useMemoFirebase(() => collection(firestore, "branches"), [firestore]);
  const { data: branches } = useCollection(branchesRef);

  // Fetch subjects based on selection
  const subjectsQuery = useMemoFirebase(() => {
    if (!selectedBranch || !selectedYear || !selectedSemester) return null;
    return query(
      collection(firestore, "subjects"),
      where("branchId", "==", selectedBranch),
      where("year", "==", parseInt(selectedYear)),
      where("semester", "==", parseInt(selectedSemester))
    );
  }, [selectedBranch, selectedYear, selectedSemester, firestore]);

  const { data: subjects, isLoading: subjectsLoading } = useCollection(subjectsQuery);

  const handleAddClass = () => {
    if (!selectedBranch || !selectedYear || !selectedSemester) {
      return;
    }

    const branch = branches?.find(b => b.id === selectedBranch);
    if (!branch) return;

    const newAssignment: ClassAssignment = {
      branchId: selectedBranch,
      branchName: branch.name,
      year: parseInt(selectedYear),
      semester: parseInt(selectedSemester),
      subjects: (subjects ?? []).map(subject => subject.id)
    };

    // Check if this class assignment already exists
    const exists = classAssignments.some(
      assignment => 
        assignment.branchId === selectedBranch &&
        assignment.year === parseInt(selectedYear) &&
        assignment.semester === parseInt(selectedSemester)
    );

    if (!exists) {
      setClassAssignments([...classAssignments, newAssignment]);
    }

    // Reset selections
    setSelectedBranch("");
    setSelectedYear("");
    setSelectedSemester("");
  };

  const handleRemoveClass = (index: number) => {
    setClassAssignments(classAssignments.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (classAssignments.length === 0) return;

    setIsSubmitting(true);
    try {
      await onAssignClass(classAssignments);
      setClassAssignments([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Error assigning classes:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAddButtonDisabled = !selectedBranch || !selectedYear || !selectedSemester || subjectsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Classes to {facultyName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Class Selection Section */}
          <Card>
            <CardHeader>
              <CardTitle>Select Class</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="branch">Branch</Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map((branch: any) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="year">Year</Label>
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
                  <Label htmlFor="semester">Semester</Label>
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

              {/* Subjects Display */}
              {selectedBranch && selectedYear && selectedSemester && (
                <div className="mt-4">
                  <Label>Subjects for this class</Label>
                  {subjectsLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                      {(subjects && subjects.length > 0) ? (
                        <div className="flex flex-wrap gap-2">
                          {subjects.map((subject: any) => (
                            <Badge key={subject.id} variant="secondary">
                              {subject.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No subjects found for this class</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleAddClass}
                disabled={isAddButtonDisabled}
                className="w-full"
              >
                {subjectsLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add Class
              </Button>
            </CardContent>
          </Card>

          {/* Assigned Classes Section */}
          {classAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Classes to Assign</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {classAssignments.map((assignment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">
                          {assignment.branchName} - {assignment.year} Year, Semester {assignment.semester}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {assignment.subjects.length} subjects
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveClass(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={classAssignments.length === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning Classes...
                </>
              ) : (
                `Assign ${classAssignments.length} Class${classAssignments.length !== 1 ? 'es' : ''}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
