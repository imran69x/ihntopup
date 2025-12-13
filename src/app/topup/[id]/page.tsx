'use client';

import TopUpDetailClient from '@/components/TopUpDetailClient';
import { notFound, useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import React from 'react';
import type { TopUpCardData } from '@/lib/data';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';


export default function TopUpDetailPage() {
  const router = useRouter();
  const params = useParams();
  const firestore = useFirestore();
  
  const cardId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const cardRef = useMemoFirebase(() => {
    if (!firestore || !cardId) return null;
    return doc(firestore, 'top_up_cards', cardId);
  }, [firestore, cardId]);

  const { data: card, isLoading } = useDoc<TopUpCardData>(cardRef);

  if (isLoading) {
    return <div className="container mx-auto px-4 py-6 text-center flex justify-center items-center h-96">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>;
  }
  
  if (!card) {
    notFound();
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 fade-in">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <TopUpDetailClient card={card} />
    </div>
  );
}
