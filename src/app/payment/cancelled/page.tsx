
'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Loader2, XCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';


function CancelledPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // If essential params are missing, redirect to home.
    if (!searchParams.has('type') || !searchParams.has('amount')) {
      router.replace('/');
    }
  }, [searchParams, router]);

  // If redirection is going to happen, we can show a loader or nothing.
  if (!searchParams.has('type') || !searchParams.has('amount')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-4 py-12">
      <div className="max-w-md w-full">
        <Card className="bg-destructive text-destructive-foreground mb-6">
          <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
            <XCircle className="h-6 w-6" />
            <CardTitle className="text-lg">পেমেন্ট বাতিল!</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p>আপনি পেমেন্ট বাতিল করেছেন।</p>
          </CardContent>
        </Card>

        <div className="relative w-full max-w-xs mx-auto">
           <div className="absolute top-0 right-0 -mr-8 -mt-4 bg-red-100 text-red-600 font-bold px-3 py-1 rounded-full text-sm transform -rotate-12">Oops!</div>
          <Image
            src="https://i.imgur.com/I1469U9.png"
            alt="Man looking sad"
            width={300}
            height={300}
            className="object-contain"
          />
        </div>

        <Button asChild size="lg" className="mt-8 w-full shadow-lg">
          <Link href="/">
            <Home className="mr-2 h-5 w-5" />
            ওয়েবসাইটে ফিরে যান!
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function PaymentCancelledPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        }>
            <CancelledPageContent />
        </Suspense>
    );
}
