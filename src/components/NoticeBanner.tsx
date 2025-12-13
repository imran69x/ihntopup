'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Megaphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Notice } from '@/lib/data';

export default function NoticeBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null);

  const firestore = useFirestore();
  const noticeQuery = useMemoFirebase(
    () => firestore 
      ? query(
          collection(firestore, 'notices'), 
          where('status', '==', 'Active'),
          where('type', '==', 'Info') // Assuming 'Info' is for the banner
        ) 
      : null,
    [firestore]
  );
  
  const { data: notices, isLoading } = useCollection<Notice>(noticeQuery);

  useEffect(() => {
    if (!isLoading && notices && notices.length > 0) {
      const notice = notices[0];
      const hasBeenDismissed = sessionStorage.getItem(`noticeBannerDismissed_${notice.id}`);
      if (hasBeenDismissed !== 'true') {
        setActiveNotice(notice);
        setIsVisible(true);
      }
    } else if (!isLoading) {
      setIsVisible(false);
    }
  }, [notices, isLoading]);

  const handleDismiss = () => {
    if (!activeNotice) return;
    setIsClosing(true);
    setTimeout(() => {
        sessionStorage.setItem(`noticeBannerDismissed_${activeNotice.id}`, 'true');
        setIsVisible(false);
        setIsClosing(false);
    }, 300);
  };

  if (!isVisible || !activeNotice) {
    return null;
  }

  return (
    <div className={cn("p-4 transition-opacity duration-300", isClosing ? "opacity-0" : "opacity-100")}>
        <Alert className="bg-primary text-primary-foreground border-green-700 relative">
            <div className='flex items-start gap-3'>
                <Megaphone className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                    <AlertTitle className="font-bold text-lg">{activeNotice.title}</AlertTitle>
                    <AlertDescription className="text-green-100">
                        {activeNotice.content}
                    </AlertDescription>
                </div>
            </div>
            <button 
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Dismiss notice"
            >
                <X className="h-4 w-4" />
            </button>
        </Alert>
    </div>
  );
}
