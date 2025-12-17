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
    <>
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
    </>
  );
}
