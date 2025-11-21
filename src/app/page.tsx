'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ShieldCheck,
  GraduationCap,
  Users,
  BookOpenCheck,
  BrainCircuit,
  FileClock,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase';

const features = [
  {
    title: 'Centralized Dashboards',
    description:
      'Dedicated, intuitive dashboards for Admins, Faculty, and Students for seamless navigation and management.',
    icon: <BookOpenCheck className="w-7 h-7 text-accent" />,
  },
  {
    title: 'Secure Authentication',
    description: 'Robust and secure login system for all user roles, powered by Firebase Authentication.',
    icon: <ShieldCheck className="w-7 h-7 text-accent" />,
  },
  {
    title: 'Effortless Assignment Management',
    description: 'Faculty can easily create, distribute, and set deadlines for assignments across various courses.',
    icon: <FileClock className="w-7 h-7 text-accent" />,
  },
  {
    title: 'AI-Powered Feedback',
    description:
      'An intelligent assistant for faculty to provide more effective, consistent, and constructive feedback on submissions.',
    icon: <BrainCircuit className="w-7 h-7 text-accent" />,
  },
];

export default function Home() {
  const { user, isUserLoading } = useUser();

  return (
    <div className="flex flex-col">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full pt-20 pb-20 md:pt-32 md:pb-32 bg-gradient-to-br from-blue-50 via-background to-purple-50">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl md:text-5xl font-headline">
              JBIET College of Engineering
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-base md:text-xl text-foreground/80">
              Welcome to <span className="font-semibold text-primary">JBIET-Assignment Submission System</span>, the official online assignment
              submission system. Streamlining the way we learn, teach, and manage academic work.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              {!user && !isUserLoading && (
                 <Button asChild size="lg">
                    <Link href="/login">Get Started</Link>
                </Button>
              )}
              <Button asChild variant="outline" size="lg">
                <Link href="/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Login Role Selection Section - Only show if user is not logged in */}
        {!isUserLoading && !user && (
          <section id="login" className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight font-headline">Access Your Account</h2>
                <p className="mt-2 text-base md:text-lg text-muted-foreground">Log in to access your dashboard and manage your academic work.</p>
                 <div className="mt-6">
                  <Button asChild size="lg">
                      <Link href="/login">
                          Login
                      </Link>
                  </Button>
                 </div>
              </div>
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight font-headline">System Features</h2>
              <p className="mt-2 text-base md:text-lg text-muted-foreground">Everything you need for efficient assignment handling.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {features.map((feature) => (
                <div key={feature.title} className="flex items-start gap-4">
                  <div className="flex-shrink-0 bg-accent/10 p-3 rounded-full">{feature.icon}</div>
                  <div>
                    <h3 className="font-semibold text-base md:text-lg">{feature.title}</h3>
                    <p className="mt-1 text-sm md:text-base text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
