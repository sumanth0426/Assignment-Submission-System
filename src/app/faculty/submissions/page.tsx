'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Eye, CheckCircle, XCircle, Calendar, FileText, Download } from 'lucide-react';
import { useCollection, useUser, useMemoFirebase, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { format, startOfDay, endOfDay } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  rollNumber: string;
  fileUrl: string;
  fileName: string;
  submittedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  feedback?: string;
}

export default function SubmissionsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedAssignment, setSelectedAssignment] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Get faculty assignments
  const assignmentsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'assignments'),
      where('facultyId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: assignments, isLoading: assignmentsLoading } = useCollection(assignmentsQuery);

  // Get submissions
  const submissionsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    
    let baseQuery = collection(firestore, 'submissions');
    const whereConditions = [where('facultyId', '==', user.uid)];
    
    if (selectedAssignment !== 'all') {
      whereConditions.push(where('assignmentId', '==', selectedAssignment));
    }
    
    if (statusFilter !== 'all') {
      whereConditions.push(where('status', '==', statusFilter));
    }
    
    return query(baseQuery, ...whereConditions, orderBy('submittedAt', 'desc'));
  }, [firestore, user, selectedAssignment, statusFilter]);

  const { data: submissions, isLoading: submissionsLoading } = useCollection(submissionsQuery);

  // Filter submissions by date range
  const filteredSubmissions = useMemo(() => {
    if (!submissions) return [];
    
    return submissions.filter((submission: Submission) => {
      const submissionDate = new Date(submission.submittedAt);
      
      if (startDate) {
        const start = startOfDay(new Date(startDate));
        if (submissionDate < start) return false;
      }
      
      if (endDate) {
        const end = endOfDay(new Date(endDate));
        if (submissionDate > end) return false;
      }
      
      return true;
    });
  }, [submissions, startDate, endDate]);

  const getAssignmentTitle = (assignmentId: string) => {
    return assignments?.find(a => a.id === assignmentId)?.title || 'Unknown Assignment';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  async function updateSubmissionStatus(submissionId: string, status: 'verified' | 'rejected') {
    if (!user || !firestore) return;
    
    setIsUpdating(true);
    try {
      const submissionRef = doc(firestore, 'submissions', submissionId);
      await updateDoc(submissionRef, {
        status,
        reviewedAt: new Date().toISOString(),
        reviewedBy: user.uid
      });

      toast({
        title: 'Status Updated',
        description: `Submission marked as ${status}.`,
      });
    } catch (error: any) {
      console.error('Error updating submission:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update submission status.',
      });
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold font-headline">Submission Review</h1>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="assignment">Assignment</Label>
              <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignments</SelectItem>
                  {assignments?.map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {assignment.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="startDate">From Date</Label>
              <Input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="endDate">To Date</Label>
              <Input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Submissions ({filteredSubmissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissionsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="ml-2">Loading submissions...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((submission: Submission) => (
                <Card key={submission.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{submission.studentName}</h3>
                        <span className="text-sm text-muted-foreground">({submission.rollNumber})</span>
                        {getStatusBadge(submission.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{submission.studentEmail}</p>
                      <p className="text-sm font-medium mb-1">
                        {getAssignmentTitle(submission.assignmentId)}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(submission.submittedAt), 'PPP p')}
                        </span>
                        <span>File: {submission.fileName}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setIsPreviewOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      
                      {submission.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => updateSubmissionStatus(submission.id, 'verified')}
                            disabled={isUpdating}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => updateSubmissionStatus(submission.id, 'rejected')}
                            disabled={isUpdating}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              
              {filteredSubmissions.length === 0 && (
                <div className="text-center p-8">
                  <p className="text-muted-foreground">No submissions found matching your criteria.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="w-[90vw] max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Preview</DialogTitle>
            <DialogDescription>
              {selectedSubmission && (
                <span>
                  {selectedSubmission.studentName} - {selectedSubmission.fileName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-sm"><strong>Student:</strong> {selectedSubmission.studentName}</p>
                  <p className="text-sm"><strong>Roll Number:</strong> {selectedSubmission.rollNumber}</p>
                  <p className="text-sm"><strong>Email:</strong> {selectedSubmission.studentEmail}</p>
                  <p className="text-sm"><strong>Assignment:</strong> {getAssignmentTitle(selectedSubmission.assignmentId)}</p>
                  <p className="text-sm"><strong>Submitted:</strong> {format(new Date(selectedSubmission.submittedAt), 'PPP p')}</p>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(selectedSubmission.status)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(selectedSubmission.fileUrl, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
              
              {selectedSubmission.fileUrl.endsWith('.pdf') ? (
                <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                  <iframe
                    src={selectedSubmission.fileUrl}
                    className="w-full h-full"
                    title="PDF Preview"
                  />
                </div>
              ) : (
                <div className="text-center p-8 border rounded-lg">
                  <p className="text-muted-foreground mb-4">Preview not available for this file type.</p>
                  <Button onClick={() => window.open(selectedSubmission.fileUrl, '_blank')}>
                    <Download className="w-4 h-4 mr-1" />
                    Download File
                  </Button>
                </div>
              )}
              
              {selectedSubmission.status === 'pending' && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="text-green-600 hover:text-green-700"
                    onClick={() => {
                      updateSubmissionStatus(selectedSubmission.id, 'verified');
                      setIsPreviewOpen(false);
                    }}
                    disabled={isUpdating}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Mark as Verified
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      updateSubmissionStatus(selectedSubmission.id, 'rejected');
                      setIsPreviewOpen(false);
                    }}
                    disabled={isUpdating}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Mark as Rejected
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
