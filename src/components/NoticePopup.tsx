'use client';

import { useState, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { Notice } from '@/lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Megaphone, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function NoticePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null);
  
  const firestore = useFirestore();
  const noticeQuery = useMemoFirebase(
    () => firestore 
      ? query(
          collection(firestore, 'notices'), 
          where('status', '==', 'Active'), 
          where('type', '==', 'Popup'),
          limit(1)
        ) 
      : null,
    [firestore]
  );
  
  const { data: notices, isLoading } = useCollection<Notice>(noticeQuery);

  useEffect(() => {
    if (!isLoading && notices && notices.length > 0) {
      const noticeId = notices[0].id;
      const sessionKey = `notice_dismissed_${noticeId}`;
      const hasBeenDismissed = sessionStorage.getItem(sessionKey);

      if (hasBeenDismissed !== 'true') {
        setActiveNotice(notices[0]);
        setIsOpen(true);
      }
    }
  }, [notices, isLoading]);

  const handleDismiss = () => {
    if (activeNotice) {
      const sessionKey = `notice_dismissed_${activeNotice.id}`;
      sessionStorage.setItem(sessionKey, 'true');
    }
    setIsOpen(false);
  };

  if (!isOpen || !activeNotice) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDismiss}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden" hideCloseButton>
         <DialogClose asChild>
            <button className="absolute right-3 top-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white z-10">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </button>
        </DialogClose>

        <DialogHeader className="sr-only">
          <DialogTitle>{activeNotice.title}</DialogTitle>
        </DialogHeader>

        {activeNotice.image?.src && (
           <div className="relative w-full aspect-video">
                <Image
                    src={activeNotice.image.src}
                    alt={activeNotice.title || 'Notice Image'}
                    layout="fill"
                    objectFit="cover"
                />
            </div>
        )}
        <div className="p-6 space-y-4 text-center">
            <p className="text-muted-foreground font-bold text-foreground">{activeNotice.content}</p>
             
            {activeNotice.linkUrl ? (
                <a href={activeNotice.linkUrl} target="_blank" rel="noopener noreferrer" onClick={handleDismiss} className="inline-block">
                    <Button>
                        Click Here
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </a>
            ) : (
                <Button onClick={handleDismiss}>
                    <X className="mr-2 h-4 w-4" />
                    বন্ধ করুন
                </Button>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
