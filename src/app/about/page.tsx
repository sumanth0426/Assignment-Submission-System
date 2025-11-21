import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Github, Linkedin, Mail } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12 sm:py-16">
      <Card className="max-w-2xl mx-auto shadow-lg overflow-hidden">
        <CardHeader className="text-center p-8 bg-gradient-to-br from-primary to-accent rounded-t-lg">
          <CardTitle className="text-3xl font-headline text-primary-foreground mt-4">Prasanna Gundaveni</CardTitle>
          <p className="text-primary-foreground/80">Creator of JBIET-Assignment Submission System</p>
        </CardHeader>
        <CardContent className="p-8 space-y-4">
          <p className="text-lg text-center text-muted-foreground">
            "I am a passionate developer and a 3rd-year CSM-A student at JBIET, with roll number 23671A6624. I
            specialize in building modern, scalable web applications with a focus on great user experience. JBIET-Assignment Submission System is a
            project born from the desire to simplify academic workflows for both students and faculty."
          </p>
          <div className="flex justify-center items-center gap-6 pt-4">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Github className="w-6 h-6" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Linkedin className="w-6 h-6" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Mail className="w-6 h-6" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
