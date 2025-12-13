
'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the interface for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      const dismissedInSession = sessionStorage.getItem('installPromptDismissed');
      if (dismissedInSession === 'true') {
        return;
      }
      
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show the install prompt
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = () => {
    setIsClosing(true);
    sessionStorage.setItem('installPromptDismissed', 'true');
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
      setDeferredPrompt(null);
    }, 300); // Corresponds to animation duration
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    await deferredPrompt.userChoice;
    // We've used the prompt, and can't use it again, so clear it
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible || !deferredPrompt) {
    return null;
  }

  return (
    <div className={cn(
        "fixed bottom-[90px] left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] max-w-md z-50 md:hidden",
        "transition-all duration-300 ease-in-out",
        isClosing ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0",
        isVisible ? "animate-in slide-in-from-bottom-4" : "animate-out slide-out-to-bottom-4"
        )}>
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
            <Download className="h-6 w-6 flex-shrink-0" />
            <span className="text-sm font-semibold">Install App</span>
        </div>
        <div className='flex items-center gap-2'>
            <Button size="sm" onClick={handleInstall} className="bg-white text-primary hover:bg-green-100 h-8">
                Install
            </Button>
            <button onClick={handleDismiss} className="p-1.5 rounded-full bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-white">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </button>
        </div>
      </div>
    </div>
  );
}
