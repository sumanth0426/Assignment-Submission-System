'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Book, Upload, Star, Loader2, FileText, XCircle, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc, updateDoc, getDoc, addDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  fileUrl: string;
  fileName: string;
  submittedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  feedback?: string;
  fileData?: string; // Base64 file data
  assignmentTitle?: string;
  subjectId?: string;
  assignmentDeadline?: string;
  assignmentDescription?: string;
}

export default function StudentDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'rejected'>('pending');

  // Get student's profile data
  const studentProfileQuery = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: studentProfile, isLoading: profileLoading } = useDoc(studentProfileQuery);

  // Get student's submissions
  const submissionsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'users', user.uid, 'submissions'),
      orderBy('submittedAt', 'desc')
    );
  }, [firestore, user]);

  // Get assignments for this student's branch, year, semester, and section
  const assignmentsQuery = useMemoFirebase(() => {
    if (!user || !firestore || !studentProfile) return null;
    
    const conditions = [
      where('targetBranches', 'array-contains', studentProfile.branchId || ''),
      where('targetYears', 'array-contains', studentProfile.year?.toString() || ''),
      where('targetSemesters', 'array-contains', studentProfile.semester?.toString() || '')
    ];
    
    if (studentProfile.section) {
      conditions.push(where('targetSections', 'array-contains', studentProfile.section));
    }
    
    return query(
      collection(firestore, 'assignments'),
      ...conditions,
      where('deadline', '>=', new Date().toISOString())
    );
  }, [firestore, user, studentProfile]);

  const { data: assignments, isLoading: assignmentsLoading } = useCollection(assignmentsQuery);
  const { data: submissions, isLoading: submissionsLoading } = useCollection<Submission>(submissionsQuery);
  
  const isLoading = profileLoading || assignmentsLoading || submissionsLoading;
  
  // Combine assignments with submission status
  const assignmentsWithSubmissions = useMemo(() => {
    const result: any[] = [];
    
    // Add assignments with their submission status
    assignments?.forEach(assignment => {
      const submission = submissions?.find(s => s.assignmentId === assignment.id);
      
      result.push({
        ...assignment,
        submissionId: submission?.id,
        status: submission?.status || 'not_submitted',
        statusText: submission?.status === 'pending' ? 'Pending for Verification' :
                   submission?.status === 'verified' ? 'Verified' :
                   submission?.status === 'rejected' ? 'Rejected' : 'Not Submitted',
        submittedAt: submission?.submittedAt,
        feedback: submission?.feedback
      });
    });
    
    // Add submitted assignments that might not be in current assignments (e.g., past assignments)
    submissions?.forEach(submission => {
      if (!assignments?.some(a => a.id === submission.assignmentId)) {
        result.push({
          ...submission,
          id: submission.assignmentId,
          title: submission.assignmentTitle || 'Assignment',
          subjectId: submission.subjectId || 'Unknown',
          deadline: submission.assignmentDeadline || new Date().toISOString(),
          description: submission.assignmentDescription || 'No description available',
          status: submission.status,
          statusText: submission.status === 'pending' ? 'Pending for Verification' :
                     submission.status === 'verified' ? 'Verified' : 'Rejected',
          isArchived: true // Mark as archived since it's not in current assignments
        });
      }
    });
    
    return result;
  }, [assignments, submissions]);
  
  // Categorize assignments
  const pendingSubmissions = useMemo(() => 
    assignmentsWithSubmissions.filter((s) => s.status === 'pending'),
    [assignmentsWithSubmissions]
  );
  
  const verifiedSubmissions = useMemo(() => 
    assignmentsWithSubmissions.filter((s) => s.status === 'verified'),
    [assignmentsWithSubmissions]
  );
  
  const rejectedSubmissions = useMemo(() => 
    assignmentsWithSubmissions.filter((s) => s.status === 'rejected'),
    [assignmentsWithSubmissions]
  );
  
  // For the pending assignments tab, show assignments that are not verified
  const pendingAssignments = useMemo(() => 
    assignmentsWithSubmissions.filter((s) => s.status !== 'verified' && !s.isArchived),
    [assignmentsWithSubmissions]
  );
  
  const getAssignmentById = (assignmentId: string) => {
    return assignmentsWithSubmissions.find((a: any) => a.assignmentId === assignmentId);
  };

  const getStatusBadge = (status: string, statusText?: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800">{statusText || 'Pending'}</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Maximum file size is 10MB',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!selectedFile || !selectedAssignment || !user || !firestore) return;

    setIsSubmitting(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      
      reader.onload = async () => {
        const base64Data = reader.result as string;
        
        // Get the current user's submissions to check for existing submission
        const submissionsRef = collection(firestore, 'users', user.uid, 'submissions');
        const q = query(submissionsRef, where('assignmentId', '==', selectedAssignment.id));
        const querySnapshot = await getDocs(q);
        
        const existingSubmission = !querySnapshot.empty ? {
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data()
        } : null;
        
        const submissionData = {
          assignmentId: selectedAssignment.id,
          studentId: user.uid,
          fileUrl: '',
          fileName: selectedFile.name,
          fileData: base64Data,
          submittedAt: new Date().toISOString(),
          status: 'pending' as const,
          feedback: '',
          // Include assignment details for display
          assignmentTitle: selectedAssignment.title,
          subjectId: selectedAssignment.subjectId,
          assignmentDeadline: selectedAssignment.deadline,
          assignmentDescription: selectedAssignment.description
        };

        if (existingSubmission) {
          // Update existing submission
          const submissionRef = doc(firestore, 'users', user.uid, 'submissions', existingSubmission.id);
          await updateDoc(submissionRef, {
            ...submissionData,
            status: 'pending', // Reset status to pending for re-submission
            resubmittedAt: new Date().toISOString()
          });
        } else {
          // Create new submission under the user's document
          await addDoc(collection(firestore, 'users', user.uid, 'submissions'), submissionData);
        }

        toast({
          title: 'Assignment Submitted',
          description: 'Your assignment has been submitted successfully.',
        });

        setIsSubmitDialogOpen(false);
        setSelectedFile(null);
        setSelectedAssignment(null);
      };
    } catch (error) {
      console.error('Error submitting assignment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit assignment. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAssignmentCard = (assignment: any, submission?: Submission & { statusText?: string }) => {
    const isRejected = submission?.status === 'rejected';
    const isVerified = submission?.status === 'verified';
    const isPending = submission?.status === 'pending';
    const notSubmitted = !submission;

    return (
      <Card key={assignment.id} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{assignment.title}</CardTitle>
              <CardDescription className="mt-1">
                {assignment.subjectId} • Due: {format(new Date(assignment.deadline), 'MMM d, yyyy')}
              </CardDescription>
            </div>
            {submission && getStatusBadge(submission.status, submission.statusText)}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {assignment.description}
          </p>
          
          {submission && (
            <div className="text-sm space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>{submission.fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Submitted: {format(new Date(submission.submittedAt), 'MMM d, yyyy h:mm a')}</span>
              </div>
              {isRejected && submission.feedback && (
                <div className="mt-2 p-3 bg-red-50 rounded-md text-sm text-red-700">
                  <div className="font-medium flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Feedback
                  </div>
                  <p className="mt-1">{submission.feedback}</p>
                </div>
              )}
              {isVerified && (
                <div className="mt-2 p-3 bg-green-50 rounded-md text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Your submission has been verified</span>
                </div>
              )}
            </div>
          )}

          {(notSubmitted || isRejected) && (
            <Button
              size="sm"
              onClick={() => {
                setSelectedAssignment(assignment);
                setIsSubmitDialogOpen(true);
              }}
              disabled={isSubmitting}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isRejected ? 'Re-submit' : 'Submit'}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold font-headline">Student Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/student/assignments">
              <Book className="mr-2 h-4 w-4" /> All Assignments
            </Link>
          </Button>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Welcome back!</CardTitle>
          <CardDescription>
            View your assignments, submit your work, and track your submission status.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-semibold font-headline">
              {activeTab === 'pending' ? 'Pending Submissions' : 
               activeTab === 'verified' ? 'Verified Submissions' : 'Rejected Submissions'}
            </h2>
            <div className="flex space-x-1 p-1 bg-muted rounded-lg">
              <Button
                variant={activeTab === 'pending' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('pending')}
                className="text-xs"
              >
                Pending
              </Button>
              <Button
                variant={activeTab === 'verified' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('verified')}
                className="text-xs"
              >
                Verified
              </Button>
              <Button
                variant={activeTab === 'rejected' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('rejected')}
                className="text-xs"
              >
                Rejected
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'pending' ? 'Assignments that need your attention' : 
             activeTab === 'verified' ? 'Your successfully verified submissions' : 
             'Assignments that need to be resubmitted'}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="ml-2">Loading assignments...</p>
          </div>
        ) : (
          <>
            {activeTab === 'pending' && (
              <>
                {pendingAssignments.length > 0 ? (
                  pendingAssignments.map(assignment => renderAssignmentCard(assignment))
                ) : (
                  <Card className="text-center p-8 bg-secondary">
                    <CardContent className="p-0">
                      <p className="text-muted-foreground">No pending assignments. You're all caught up!</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {activeTab === 'verified' && (
              <>
                {verifiedSubmissions.length > 0 ? (
                  verifiedSubmissions.map(submission => {
                    const assignment = getAssignmentById(submission.assignmentId);
                    return assignment ? renderAssignmentCard(assignment, submission) : null;
                  })
                ) : (
                  <Card className="text-center p-8 bg-secondary">
                    <CardContent className="p-0">
                      <p className="text-muted-foreground">No verified submissions yet.</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {activeTab === 'rejected' && (
              <>
                {rejectedSubmissions.length > 0 ? (
                  rejectedSubmissions.map(submission => {
                    const assignment = getAssignmentById(submission.assignmentId);
                    return assignment ? renderAssignmentCard(assignment, submission) : null;
                  })
                ) : (
                  <Card className="text-center p-8 bg-secondary">
                    <CardContent className="p-0">
                      <p className="text-muted-foreground">No rejected submissions. Keep up the good work!</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Submit Assignment Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
            <DialogDescription>
              {selectedAssignment?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Select File (PDF, DOC, DOCX, TXT, JPG, PNG)</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum file size: 10MB
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
            
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsSubmitDialogOpen(false);
                  setSelectedFile(null);
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
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
