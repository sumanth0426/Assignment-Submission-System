import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Book, Settings, UserPlus, BookOpen, GraduationCap } from 'lucide-react';
import Link from 'next/link';

const adminActions = [
  {
    title: 'Manage Users',
    description: 'Add, edit, or remove student and faculty accounts.',
    icon: <Users className="w-8 h-8 text-primary" />,
    link: '/admin/manage-users',
  },
  {
    title: 'Create Faculty',
    description: 'Add new faculty members and assign subjects & classes.',
    icon: <UserPlus className="w-8 h-8 text-primary" />,
    link: '/admin/create-faculty',
  },
  {
    title: 'Manage Subjects',
    description: 'Create and manage subjects for different branches.',
    icon: <BookOpen className="w-8 h-8 text-primary" />,
    link: '/admin/manage-subjects',
  },
  {
    title: 'Academic Settings',
    description: 'Configure branches and academic settings.',
    icon: <Book className="w-8 h-8 text-primary" />,
    link: '/admin/academic-settings',
  },
  {
    title: 'Faculty Assignments',
    description: 'Assign subjects and classes to faculty members.',
    icon: <GraduationCap className="w-8 h-8 text-primary" />,
    link: '/admin/faculty-assignments',
  },
  {
    title: 'System Configuration',
    description: 'Adjust system-wide settings and preferences.',
    icon: <Settings className="w-8 h-8 text-primary" />,
    link: '#',
  },
];

export default function AdminDashboard() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 font-headline">Admin Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Welcome, Admin!</CardTitle>
          <CardDescription>
            This is your control center. Manage users, academic details, and system settings from here.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {adminActions.map((action) => (
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
    </div>
  );
}
