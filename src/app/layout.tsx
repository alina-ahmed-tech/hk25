import type { Metadata } from 'next';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'DIALOGUE',
  description: 'AI-powered strategic co-counsel for lawyers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background relative">
        {/* Grainy texture overlay */}
        <div className="fixed inset-0 w-full h-full bg-grainy opacity-[0.03] pointer-events-none -z-20"></div>
        {/* This div creates the atmospheric, liquid gradient background */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-background via-black/20 to-background bg-200% animate-liquid-flow -z-10"></div>
        {/* This div adds some subtle floating light shapes */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_10%_20%,_hsl(var(--primary))_0%,_rgba(255,255,255,0)_25%),radial-gradient(circle_at_80%_90%,_hsl(var(--accent))_0%,_rgba(255,255,255,0)_20%)] opacity-10 -z-10"></div>
        
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
