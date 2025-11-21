'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileText, CheckSquare, Users, Loader2, Eye, RefreshCw, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useCollection, useUser, useMemoFirebase, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';


const facultyActions = [
  {
    title: 'Create Assignment',
    description: 'Draft and publish a new assignment for your courses.',
    icon: <PlusCircle className="w-8 h-8 text-primary" />,
    link: '/faculty/create-assignment',
  },
  {
    title: 'View Submissions',
    description: 'Review and grade assignments submitted by students.',
    icon: <FileText className="w-8 h-8 text-primary" />,
    link: '/faculty/submissions',
  },
  {
    title: 'Gradebook',
    description: 'Access the gradebook to track student performance.',
    icon: <CheckSquare className="w-8 h-8 text-primary" />,
    link: '#', // Link to gradebook
  },
];


export default function FacultyDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [isStudentsDialogOpen, setIsStudentsDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Force refresh function
  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Get faculty document to see assigned classes
  const facultyDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'faculties', user.uid) : null),
    [user, firestore, refreshKey]
  );
  const { data: facultyDoc, isLoading: facultyLoading } = useDoc(facultyDocRef);

  // Debug: Log faculty document changes
  useEffect(() => {
    console.log('Faculty dashboard - Faculty doc updated:', facultyDoc);
    console.log('Faculty dashboard - Assigned classes:', facultyDoc?.assignedClasses);
    console.log('Faculty dashboard - Subject categories:', facultyDoc?.subjectCategories);
  }, [facultyDoc]);

  // Get branches for names
  const branchesCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'branches') : null),
    [firestore, user]
  );
  const { data: branches } = useCollection(branchesCollection);

  const assignmentsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'assignments'), where('facultyId', '==', user.uid));
  }, [firestore, user]);

  const { data: assignments, isLoading } = useCollection(assignmentsQuery);

  // Handle assignment deletion
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) return;
    
    try {
      await deleteDoc(doc(firestore, 'assignments', assignmentId));
      toast({
        title: 'Assignment deleted',
        description: 'The assignment has been successfully deleted.',
      });
      forceRefresh();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete the assignment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Get students for selected class
  const studentsQuery = useMemoFirebase(() => {
    if (!user || !firestore || !selectedClass) return null;
    
    let baseQuery = collection(firestore, 'users');
    const whereConditions = [];
    
    if (selectedClass.branchId) whereConditions.push(where('branchId', '==', selectedClass.branchId));
    if (selectedClass.year) whereConditions.push(where('year', '==', parseInt(selectedClass.year)));
    if (selectedClass.semester) whereConditions.push(where('semester', '==', parseInt(selectedClass.semester)));
    if (selectedClass.section) whereConditions.push(where('section', '==', selectedClass.section));
    
    return whereConditions.length > 0 
      ? query(baseQuery, ...whereConditions)
      : baseQuery;
  }, [firestore, user, selectedClass?.branchId, selectedClass?.year, selectedClass?.semester, selectedClass?.section]);
  
  const { data: students, isLoading: studentsLoading } = useCollection(studentsQuery);

  // Get branch name by ID
  const getBranchName = (branchId: string) => {
    return branches?.find(b => b.id === branchId)?.name || branchId;
  };

  // Generate assigned classes list
  const getAssignedClasses = () => {
    if (!facultyDoc) return [];
    
    const classes = [];
    
    // Check if faculty has the new assignedClasses structure
    if (facultyDoc.assignedClasses && Array.isArray(facultyDoc.assignedClasses)) {
      return facultyDoc.assignedClasses.map((cls: any, index: number) => ({
        id: `${cls.branchId}-${cls.year}-${cls.semester}-${cls.section}-${index}`,
        ...cls
      }));
    }
    
    // Fallback to old structure (assignedBranchIds, assignedYears, etc.)
    const { assignedBranchIds, assignedYears, assignedSemesters, assignedSections } = facultyDoc;
    
    if (!assignedBranchIds?.length && !assignedYears?.length && 
        !assignedSemesters?.length && !assignedSections?.length) {
      return [];
    }
    
    // Create combinations of assigned classes
    const branchIds = assignedBranchIds?.length ? assignedBranchIds : ['all'];
    const years = assignedYears?.length ? assignedYears : ['all'];
    const semesters = assignedSemesters?.length ? assignedSemesters : ['all'];
    const sections = assignedSections?.length ? assignedSections : ['all'];
    
    for (const branchId of branchIds) {
      for (const year of years) {
        for (const semester of semesters) {
          for (const section of sections) {
            classes.push({
              id: `${branchId}-${year}-${semester}-${section}`,
              branchId: branchId === 'all' ? null : branchId,
              year: year === 'all' ? null : year,
              semester: semester === 'all' ? null : semester,
              section: section === 'all' ? null : section,
            });
          }
        }
      }
    }
    
    return classes;
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold font-headline">Faculty Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={forceRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button asChild>
            <Link href="/faculty/create-assignment">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Assignment
            </Link>
          </Button>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Welcome, Faculty!</CardTitle>
          <CardDescription>
            Manage your courses, create assignments, and review student submissions.
          </CardDescription>
        </CardHeader>
      </Card>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {facultyActions.map((action) => (
          <Link href={action.link} key={action.title}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4">
                {action.icon}
                <div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-xl md:text-2xl font-semibold font-headline mb-4">My Assigned Classes</h2>
        {facultyLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="ml-2">Loading assigned classes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getAssignedClasses().map((classItem: any) => (
              <Card key={classItem.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>
                      {classItem.branchId ? getBranchName(classItem.branchId) : 'All Branches'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedClass(classItem);
                        setIsStudentsDialogOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Students
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {classItem.year && (
                      <Badge variant="secondary">{classItem.year}st Year</Badge>
                    )}
                    {classItem.semester && (
                      <Badge variant="secondary">Semester {classItem.semester}</Badge>
                    )}
                    {classItem.section && (
                      <Badge variant="secondary">Section {classItem.section}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!facultyLoading && getAssignedClasses().length === 0) && (
              <Card className="col-span-full text-center p-6 bg-secondary">
                <CardContent className="p-0">
                  <p className="text-muted-foreground">No classes assigned yet. Contact admin to get classes assigned.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Your Assignments</h2>
          <Button size="sm" variant="outline" onClick={forceRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <p>Loading assignments...</p>
          </div>
        ) : assignments?.length > 0 ? (
          <div className="grid gap-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{assignment.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {assignment.subjectId} • Due: {format(new Date(assignment.deadline), 'MMM d, yyyy')}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="h-8 w-8"
                      >
                        <Link href={`/faculty/create-assignment?edit=${assignment.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteAssignment(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {assignment.targetSemesters?.map((semester: string) => (
                      <Badge key={semester} variant="outline" className="text-xs">
                        Sem {semester}
                      </Badge>
                    ))}
                    {assignment.targetSections?.map((section: string) => (
                      <Badge key={section} variant="outline" className="text-xs">
                        Sec {section}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center p-6 bg-secondary">
            <CardContent className="p-0">
              <p className="text-muted-foreground">You haven't created any assignments yet.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Students Dialog */}
      <Dialog open={isStudentsDialogOpen} onOpenChange={setIsStudentsDialogOpen}>
        <DialogContent className="w-[90vw] max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Students in Class</DialogTitle>
            <DialogDescription>
              {selectedClass && (
                <span>
                  {selectedClass.branchId ? getBranchName(selectedClass.branchId) : 'All Branches'}
                  {selectedClass.year && ` - ${selectedClass.year}st Year`}
                  {selectedClass.semester && ` - Semester ${selectedClass.semester}`}
                  {selectedClass.section && ` - Section ${selectedClass.section}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {studentsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="ml-2">Loading students...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {students?.map((student) => (
                <Card key={student.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {student.rollNumber} • {student.email}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {student.year}st Year • Sem {student.semester} • Sec {student.section}
                    </Badge>
                  </div>
                </Card>
              ))}
              {(!students || students.length === 0) && (
                <Card className="text-center p-6 bg-secondary">
                  <CardContent className="p-0">
                    <p className="text-muted-foreground">No students found in this class.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
