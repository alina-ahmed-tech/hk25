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
        {/* This div creates the atmospheric, liquid gradient background */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-background via-slate-900 to-black bg-200% animate-liquid-flow -z-10"></div>
        {/* This div adds some subtle floating shapes */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_10%_20%,_rgba(255,255,255,0.05)_0%,_rgba(255,255,255,0)_25%),radial-gradient(circle_at_80%_90%,_rgba(255,255,255,0.05)_0%,_rgba(255,255,255,0)_25%)] -z-10"></div>
        
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
