'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, UserCircle } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRole } from '@/hooks/useRole';

export default function Header() {
  const { user, isUserLoading } = useUser();
  const { dashboardPath, role, isLoading: isRoleLoading } = useRole();
  const auth = useAuth();
  const router = useRouter();

  console.log('Header - User email:', user?.email);
  console.log('Header - Role:', role);
  console.log('Header - Dashboard path:', dashboardPath);
  console.log('Header - Role loading:', isRoleLoading);

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <header className="bg-card shadow-sm sticky top-0 z-40">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <img src="/logo.png" alt="JBIET Logo" className="h-7 w-7" />
          <span className="font-headline">JBIET-Assignment Submission System</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="text-foreground/80 hover:text-primary transition-colors">
            Home
          </Link>
          <Link href="/about" className="text-foreground/80 hover:text-primary transition-colors">
            About
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          {!isUserLoading && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || ''} alt={user.email || ''} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Logged In</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={dashboardPath}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            !isUserLoading && (
              <Button asChild>
                <Link href="/login">Login</Link>
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
