'use client';

import { useMemo } from 'react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Edit, Trash2, Filter } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, deleteDoc, doc } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useState } from 'react';
import { AddUserDialog } from '@/components/admin/AddUserDialog';
import { EditStudentDialog } from '@/components/admin/EditStudentDialog';
import { EditFacultyDialog } from '@/components/admin/EditFacultyDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ManageUsers() {
  const firestore = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editingFaculty, setEditingFaculty] = useState<any>(null);
  const [filters, setFilters] = useState({
    branch: 'all',
    year: 'all',
    semester: 'all',
    section: 'all',
  });
  const [studentSearch, setStudentSearch] = useState('');
  const [facultySearch, setFacultySearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [facultyPage, setFacultyPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  // Build filtered query for students
  const studentsCollection = useMemoFirebase(
    () => {
      if (!user || !firestore) return null;
      let baseQuery = collection(firestore, 'users');
      
      // Apply filters if they exist and are not 'all'
      const whereConditions = [];
      if (filters.branch && filters.branch !== 'all') whereConditions.push(where('branchId', '==', filters.branch));
      if (filters.year && filters.year !== 'all') whereConditions.push(where('year', '==', parseInt(filters.year)));
      if (filters.semester && filters.semester !== 'all') whereConditions.push(where('semester', '==', parseInt(filters.semester)));
      if (filters.section && filters.section !== 'all') whereConditions.push(where('section', '==', filters.section));
      
      return whereConditions.length > 0 
        ? query(baseQuery, ...whereConditions)
        : baseQuery;
    },
    [firestore, user, filters.branch, filters.year, filters.semester, filters.section]
  );
  const facultiesCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'faculties') : null),
    [firestore, user]
  );
  const branchesCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'branches') : null),
    [firestore, user]
  );

  const { data: students, isLoading: studentsLoading } = useCollection(studentsCollection);
  const { data: faculties, isLoading: facultiesLoading } = useCollection(facultiesCollection);
  const { data: branches, isLoading: branchesLoading } = useCollection(branchesCollection);

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student? This will remove them from the application database. Note: Users can still access the app if they know their login credentials.')) {
      return;
    }

    try {
      // Delete from Firestore
      await deleteDoc(doc(firestore, 'users', studentId));
      
      toast({
        title: 'Student Deleted',
        description: 'The student has been removed from the system.',
      });
    } catch (error) {
      console.error('Error deleting student:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete student. Please try again.',
      });
    }
  };

  const handleDeleteFaculty = async (facultyId: string) => {
    if (!confirm('Are you sure you want to delete this faculty? This will remove them from the application database. Note: Users can still access the app if they know their login credentials.')) {
      return;
    }

    try {
      await deleteDoc(doc(firestore, 'faculties', facultyId));
      toast({
        title: 'Faculty Deleted',
        description: 'The faculty has been removed from the system.',
      });
    } catch (error) {
      console.error('Error deleting faculty:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete faculty. Please try again.',
      });
    }
  };

  const clearFilters = () => {
    setFilters({ branch: 'all', year: 'all', semester: 'all', section: 'all' });
    setStudentSearch('');
    setFacultySearch('');
    setStudentPage(1);
    setFacultyPage(1);
  };

  // Filter and paginate students
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    
    return students.filter(student => {
      const searchLower = studentSearch.toLowerCase();
      const matchesSearch = !searchLower || 
        student.firstName?.toLowerCase().includes(searchLower) ||
        student.lastName?.toLowerCase().includes(searchLower) ||
        student.rollNumber?.toLowerCase().includes(searchLower) ||
        student.email?.toLowerCase().includes(searchLower);
      
      return matchesSearch;
    });
  }, [students, studentSearch]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (studentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, studentPage]);

  const totalStudentPages = Math.ceil(filteredStudents.length / itemsPerPage);

  // Filter and paginate faculty
  const filteredFaculty = useMemo(() => {
    if (!faculties) return [];
    
    return faculties.filter(faculty => {
      const searchLower = facultySearch.toLowerCase();
      const matchesSearch = !searchLower || 
        faculty.firstName?.toLowerCase().includes(searchLower) ||
        faculty.lastName?.toLowerCase().includes(searchLower) ||
        faculty.email?.toLowerCase().includes(searchLower) ||
        faculty.phone?.toLowerCase().includes(searchLower);
      
      return matchesSearch;
    });
  }, [faculties, facultySearch]);

  const paginatedFaculty = useMemo(() => {
    const startIndex = (facultyPage - 1) * itemsPerPage;
    return filteredFaculty.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredFaculty, facultyPage]);

  const totalFacultyPages = Math.ceil(filteredFaculty.length / itemsPerPage);

  const isLoading = isAuthLoading || studentsLoading || facultiesLoading || branchesLoading;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <AddUserDialog
        open={isUserDialogOpen}
        onOpenChange={setIsUserDialogOpen}
        branches={branches || []}
      />
      {editingStudent && (
        <EditStudentDialog
          open={!!editingStudent}
          onOpenChange={(open: boolean) => !open && setEditingStudent(null)}
          student={editingStudent}
          branches={branches || []}
        />
      )}
      {editingFaculty && (
        <EditFacultyDialog
          open={!!editingFaculty}
          onOpenChange={(open: boolean) => !open && setEditingFaculty(null)}
          faculty={editingFaculty}
          branches={branches || []}
        />
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl md:text-3xl font-bold font-headline">Manage Users</h1>
        <Button size="sm" onClick={() => setIsUserDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <Tabs defaultValue="students">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="faculties">Faculty</TabsTrigger>
        </TabsList>
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription>View and manage student accounts.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search and Filters */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5" />
                  <h3 className="font-semibold">Filter Students</h3>
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search by name, roll number, or email"
                        value={studentSearch}
                        onChange={(e) => {
                          setStudentSearch(e.target.value);
                          setStudentPage(1);
                        }}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={filters.branch} onValueChange={(value) => setFilters(prev => ({ ...prev, branch: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches?.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filters.year} onValueChange={(value) => setFilters(prev => ({ ...prev, year: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.semester} onValueChange={(value) => setFilters(prev => ({ ...prev, semester: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Semesters" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Semesters</SelectItem>
                      <SelectItem value="1">Semester 1</SelectItem>
                      <SelectItem value="2">Semester 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Select value={filters.section} onValueChange={(value) => setFilters(prev => ({ ...prev, section: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      <SelectItem value="A">Section A</SelectItem>
                      <SelectItem value="B">Section B</SelectItem>
                      <SelectItem value="C">Section C</SelectItem>
                      <SelectItem value="D">Section D</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-sm text-muted-foreground flex items-center">
                    Showing {paginatedStudents.length} of {filteredStudents.length} students
                  </div>
                </div>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Year/Sem</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents?.map((student: any) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.rollNumber}</TableCell>
                        <TableCell>
                          {student.firstName} {student.lastName}
                        </TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>
                          {branches?.find(b => b.id === student.branchId)?.name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {student.year} / {student.semester}
                        </TableCell>
                        <TableCell>{student.section || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingStudent(student)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteStudent(student.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedStudents?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          {studentSearch ? 'No students found matching your search.' : 'No students found matching the current filters.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
              {/* Pagination */}
              {totalStudentPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Page {studentPage} of {totalStudentPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStudentPage(prev => Math.max(1, prev - 1))}
                      disabled={studentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalStudentPages) }, (_, i) => {
                        let pageNum;
                        if (totalStudentPages <= 5) {
                          pageNum = i + 1;
                        } else if (studentPage <= 3) {
                          pageNum = i + 1;
                        } else if (studentPage >= totalStudentPages - 2) {
                          pageNum = totalStudentPages - 4 + i;
                        } else {
                          pageNum = studentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={studentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStudentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStudentPage(prev => Math.min(totalStudentPages, prev + 1))}
                      disabled={studentPage === totalStudentPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="faculties">
          <Card>
            <CardHeader>
              <CardTitle>Faculty</CardTitle>
              <CardDescription>View and manage faculty accounts.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="w-5 h-5" />
                  <h3 className="font-semibold">Search Faculty</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by name, email, or phone"
                      value={facultySearch}
                      onChange={(e) => {
                        setFacultySearch(e.target.value);
                        setFacultyPage(1);
                      }}
                      className="pl-10"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center">
                    Showing {paginatedFaculty.length} of {filteredFaculty.length} faculty
                  </div>
                </div>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Assigned Classes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFaculty?.map((faculty: any) => (
                      <TableRow key={faculty.id}>
                        <TableCell>
                          {faculty.firstName} {faculty.lastName}
                        </TableCell>
                        <TableCell>{faculty.email}</TableCell>
                        <TableCell>{faculty.phone || 'N/A'}</TableCell>
                        <TableCell>
                          {faculty.assignedClasses && faculty.assignedClasses.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {faculty.assignedClasses.map((classInfo: any, index: number) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {branches?.find(b => b.id === classInfo.branchId)?.name || classInfo.branchId} - {classInfo.year}/{classInfo.semester}{classInfo.section ? `-${classInfo.section}` : ''}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No classes assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingFaculty(faculty)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteFaculty(faculty.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedFaculty?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          {facultySearch ? 'No faculty found matching your search.' : 'No faculty found.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
              {/* Pagination */}
              {totalFacultyPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Page {facultyPage} of {totalFacultyPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFacultyPage(prev => Math.max(1, prev - 1))}
                      disabled={facultyPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalFacultyPages) }, (_, i) => {
                        let pageNum;
                        if (totalFacultyPages <= 5) {
                          pageNum = i + 1;
                        } else if (facultyPage <= 3) {
                          pageNum = i + 1;
                        } else if (facultyPage >= totalFacultyPages - 2) {
                          pageNum = totalFacultyPages - 4 + i;
                        } else {
                          pageNum = facultyPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={facultyPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFacultyPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFacultyPage(prev => Math.min(totalFacultyPages, prev + 1))}
                      disabled={facultyPage === totalFacultyPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
