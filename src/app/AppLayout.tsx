'use client';

import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuthContext } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { cn } from '@/lib/utils';
import Footer from '@/components/layout/Footer';
import InstallAppPrompt from '@/components/InstallAppPrompt';
import { FirebaseProvider } from '@/firebase';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { initializeFirebase } from '@/firebase/index';
import NoticePopup from '@/components/NoticePopup';
import BannedUserOverlay from '@/components/BannedUserOverlay';
import FloatingSupportButton from '@/components/FloatingSupportButton';
import './animated-background.css';

function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');
  const isPaymentPage = pathname.startsWith('/payment');
  const [isClient, setIsClient] = useState(false);
  const { appUser, isLoggedIn } = useAuthContext();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const showFullLayout = !isAdminPage && !isPaymentPage;

  // Debug logging
  useEffect(() => {
    if (isClient && appUser) {
      console.log('🔍 USER DATA:', {
        isLoggedIn,
        userId: appUser.id,
        isActive: appUser.isActive,
        appUserKeys: Object.keys(appUser)
      });
    }
  }, [isClient, appUser, isLoggedIn]);

  return (
    <>
      {showFullLayout ? (
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 pb-24 pt-16">{children}</main>
          <Footer />
        </div>
      ) : (
        <main>{children}</main>
      )}

      {isClient && showFullLayout && <BottomNav />}

      {isClient && showFullLayout && (
        <>
          <InstallAppPrompt />
          <NoticePopup />
        </>
      )}

      {/* Support Button - Show on all pages except admin */}
      {isClient && !isAdminPage && <FloatingSupportButton />}



      <Toaster />
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const firebaseServices = initializeFirebase();

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
        className="font-body antialiased min-h-screen"
        style={{ backgroundColor: 'transparent' }}
      >
        <div className="animated-green-background">
          <div className="background-particle"></div>
          <div className="background-particle"></div>
          <div className="background-particle"></div>
          <div className="background-particle"></div>
          <div className="background-particle"></div>
          <div className="background-particle"></div>
        </div>
        <FirebaseProvider {...firebaseServices}>
          <AuthProvider>
            <AppContent>{children}</AppContent>
          </AuthProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
