import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-card shadow-inner mt-auto">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between p-6 text-sm text-muted-foreground">
        <p>Developed by @Prasanna Gundaveni</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <Link href="/about" className="hover:text-primary transition-colors">
            About Author
          </Link>
        </div>
      </div>
    </footer>
  );
}
