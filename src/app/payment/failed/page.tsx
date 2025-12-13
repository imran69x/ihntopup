'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

function FailedPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const title = reason === 'timeout' ? 'পেমেন্টের সময় শেষ!' : 'পেমেন্ট ব্যর্থ বা অবৈধ';
  const description = reason === 'timeout'
    ? 'আপনার পেমেন্ট সেশনটির মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
    : 'এই পেমেন্ট লিঙ্কটি অবৈধ বা এর মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে একটি নতুন অর্ডার শুরু করুন।';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-4 py-12">
      <div className="max-w-md w-full">
        <Card className="bg-destructive text-destructive-foreground mb-6">
          <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
            <AlertCircle className="h-6 w-6" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p>{description}</p>
          </CardContent>
        </Card>

        <div className="relative w-full max-w-xs mx-auto">
          <Image
            src="https://i.imgur.com/I1469U9.png"
            alt="Sad character illustration"
            width={300}
            height={300}
            className="object-contain"
          />
        </div>

        <Button asChild size="lg" className="mt-8 w-full shadow-lg">
          <Link href="/">
            <Home className="mr-2 h-5 w-5" />
            হোমপেজে ফিরে যান
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        }>
            <FailedPageContent />
        </Suspense>
    );
}
