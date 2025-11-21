'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, Calendar, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useCollection, useUser, useMemoFirebase, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc, addDoc, updateDoc } from 'firebase/firestore';
import { format, isAfter } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

interface Assignment {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  facultyId: string;
  deadline: string;
  createdAt: string;
  targetBranches: string[];
  targetYears: string[];
  targetSemesters: string[];
  targetSections: string[];
}

interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  fileUrl: string;
  fileName: string;
  submittedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  feedback?: string;
}

export default function StudentAssignmentsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Get student document
  const studentDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: studentDoc, isLoading: studentLoading } = useDoc(studentDocRef);

  // Get assignments for this student
  const assignmentsQuery = useMemoFirebase(() => {
    if (!user || !firestore || !studentDoc) return null;
    
    // Start with base query
    let q = query(
      collection(firestore, 'assignments'),
      orderBy('deadline', 'desc')
    );

    // Add filters only if the fields exist in studentDoc
    if (studentDoc.branchId) {
      q = query(q, where('targetBranches', 'array-contains', studentDoc.branchId));
    }
    if (studentDoc.year) {
      q = query(q, where('targetYears', 'array-contains', studentDoc.year.toString()));
    }
    if (studentDoc.semester) {
      q = query(q, where('targetSemesters', 'array-contains', studentDoc.semester.toString()));
    }
    if (studentDoc.section) {
      q = query(q, where('targetSections', 'array-contains', studentDoc.section));
    }

    return q;
  }, [firestore, user, studentDoc]);

  const { data: assignments, isLoading: assignmentsLoading } = useCollection(assignmentsQuery);

  // Filter out overdue assignments (handles both ISO strings and Firestore Timestamps)
  const activeAssignments = useMemo(() => {
    if (!assignments) return [];
    const now = new Date();
    return assignments.filter(assignment => {
      // Handle different possible deadline shapes (ISO string, Firestore Timestamp, JS Date)
      const raw = (assignment as any).deadline;
      let d: Date;
      if (!raw) return false;
      if (typeof raw === 'string') {
        d = new Date(raw);
      } else if (raw.toDate && typeof raw.toDate === 'function') {
        d = raw.toDate();
      } else if (typeof raw === 'object' && 'seconds' in raw) {
        d = new Date(raw.seconds * 1000);
      } else {
        d = new Date(raw);
      }
      return d >= now;
    });
  }, [assignments]);
  
  // Get student's submissions
  const submissionsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'submissions'),
      where('studentId', '==', user.uid),
      orderBy('submittedAt', 'desc')
    );
  }, [firestore, user]);

  const { data: submissions, isLoading: submissionsLoading } = useCollection(submissionsQuery);

  // Get subjects for names
  const subjectsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'subjects') : null),
    [firestore, user]
  );
  const { data: subjects } = useCollection(subjectsCollection);

  const getSubjectName = (subjectId: string) => {
    return subjects?.find(s => s.id === subjectId)?.name || 'Unknown Subject';
  };

  const getSubmissionStatus = (assignmentId: string) => {
    const submission = submissions?.find((s: Submission) => s.assignmentId === assignmentId);
    return submission;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  const isOverdue = (deadline: string | any) => {
    if (!deadline) return false;
    const raw: any = deadline;
    let d: Date;
    if (typeof raw === 'string') {
      d = new Date(raw);
    } else if (raw.toDate && typeof raw.toDate === 'function') {
      d = raw.toDate();
    } else if (typeof raw === 'object' && 'seconds' in raw) {
      d = new Date(raw.seconds * 1000);
    } else {
      d = new Date(raw);
    }
    return isAfter(new Date(), d);
  };

  async function handleSubmitAssignment() {
    if (!selectedAssignment || !selectedFile || !user || !firestore) return;

    // Validate file type and size (match UI: multiple formats, max 10MB)
    const allowed = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
    const fileName = selectedFile.name.toLowerCase();
    const hasValidExt = allowed.some(ext => fileName.endsWith(ext));
    if (!hasValidExt) {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please upload a file of one of the allowed types: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG.',
      });
      return;
    }

    // Check file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File Too Large',
        description: 'Please upload a file smaller than 10MB.',
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Create a storage reference
      const storage = getStorage();
      const fileRef = ref(storage, `submissions/${user.uid}/${selectedAssignment.id}/${Date.now()}_${selectedFile.name}`);
      
      // Upload file
      const uploadTask = uploadBytesResumable(fileRef, selectedFile);
      
      uploadTask.on('state_changed', 
        (snapshot: any) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error: any) => {
          console.error('Upload error:', error);
          toast({
            variant: 'destructive',
            title: 'Upload Error',
            description: 'Failed to upload file. Please try again.',
          });
          setIsSubmitting(false);
        },
        async () => {
          // Get download URL
          const downloadUrl = await getDownloadURL(fileRef);
          
          // Create submission document
          const submissionData = {
            assignmentId: selectedAssignment.id,
            studentId: user.uid,
            studentName: studentDoc?.firstName + ' ' + studentDoc?.lastName,
            studentEmail: studentDoc?.email,
            rollNumber: studentDoc?.rollNumber,
            fileUrl: downloadUrl,
            fileName: selectedFile.name,
            submittedAt: new Date().toISOString(),
            status: 'pending',
            facultyId: selectedAssignment.facultyId
          };

          await addDoc(collection(firestore, 'submissions'), submissionData);

          toast({
            title: 'Assignment Submitted',
            description: 'Your assignment has been submitted successfully.',
          });

          setIsSubmitDialogOpen(false);
          setSelectedFile(null);
          setUploadProgress(0);
          setIsSubmitting(false);
        }
      );
    } catch (error: any) {
      console.error('Error submitting assignment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit assignment. Please try again.',
      });
      setIsSubmitting(false);
    }
  }

  if (studentLoading || assignmentsLoading || submissionsLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="ml-2">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold font-headline">My Assignments</h1>
      </div>

      <div className="space-y-4">
  {activeAssignments.map((assignment: Assignment) => {
          const submission = getSubmissionStatus(assignment.id);
          const overdue = isOverdue(assignment.deadline) && !submission;
          
          return (
            <Card key={assignment.id} className={`p-4 ${overdue ? 'border-red-200 bg-red-50' : ''}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-lg">{assignment.title}</h3>
                    {submission ? getStatusBadge(submission.status) : (
                      overdue ? (
                        <Badge className="bg-red-100 text-red-800">Overdue</Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800">Pending Submission</Badge>
                      )
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    Subject: {getSubjectName(assignment.subjectId)}
                  </p>
                  
                  <p className="text-sm mb-3 line-clamp-2">{assignment.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Deadline: {format(new Date(assignment.deadline), 'PPP p')}
                    </span>
                    {submission && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Submitted: {format(new Date(submission.submittedAt), 'PPP p')}
                      </span>
                    )}
                  </div>
                  
                  {submission?.fileName && (
                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground">File: </span>
                      <span className="font-medium">{submission.fileName}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 ml-4">
                  {!submission && !overdue && (
                    <Button
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setIsSubmitDialogOpen(true);
                      }}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Submit
                    </Button>
                  )}
                  
                  {submission && (
                    <Button variant="outline" size="sm">
                      <FileText className="w-4 h-4 mr-1" />
                      View Submission
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        
  {(activeAssignments.length === 0) && (
          <Card className="text-center p-8 bg-secondary">
            <CardContent className="p-0">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No assignments assigned to you yet.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Submit Assignment Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="w-[90vw] max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
            <DialogDescription>
              {selectedAssignment && (
                <span>{selectedAssignment.title}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Accepted formats: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG (Max 10MB)
              </p>
            </div>
            
            {selectedFile && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Selected file:</p>
                <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
            
            {isSubmitting && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsSubmitDialogOpen(false);
                  setSelectedFile(null);
                  setUploadProgress(0);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAssignment}
                disabled={!selectedFile || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Assignment'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
