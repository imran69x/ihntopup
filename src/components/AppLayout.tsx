'use client';

import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { cn } from '@/lib/utils';
import Footer from '@/components/layout/Footer';
import InstallAppPrompt from '@/components/InstallAppPrompt';
import { FirebaseProvider } from '@/firebase';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { initializeFirebase } from '@/firebase/index';
import NoticePopup from './NoticePopup';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');
  const isPaymentPage = pathname.startsWith('/payment');
  const isResellerPage = pathname.startsWith('/reseller');
  const [isClient, setIsClient] = useState(false);
  const firebaseServices = initializeFirebase();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const showFullLayout = !isAdminPage && !isPaymentPage && !isResellerPage;

  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Righteous&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4CAF50" />
      </head>
      <body
        className={cn(
          'font-body antialiased',
          'min-h-screen bg-background'
        )}
      >
        <FirebaseProvider {...firebaseServices}>
          <AuthProvider>
            {showFullLayout ? (
              <div className="relative flex min-h-screen flex-col">
                <Header />
                <main className="flex-1 pb-24 pt-16">{children}</main>
                <Footer />
                <NoticePopup />
              </div>
            ) : (
              <main>{children}</main>
            )}

            {isClient && showFullLayout && <BottomNav />}
            {showFullLayout && <InstallAppPrompt />}

            <Toaster />
          </AuthProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
