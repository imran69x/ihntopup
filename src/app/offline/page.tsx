'use client';

import { Button } from '@/components/ui/button';
import { WifiOff } from 'lucide-react';
import Image from 'next/image';

export default function OfflinePage() {

    const handleRetry = () => {
        window.location.href = '/';
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-4">
            <div className="p-4 bg-white rounded-3xl shadow-lg mb-6">
                <Image src="https://i.imgur.com/bJH9BH5.png" alt="IHN TOPUP Logo" width={64} height={64} />
            </div>
            
            <WifiOff className="h-16 w-16 text-destructive mb-4" />
            
            <h1 className="text-3xl font-bold font-headline text-gray-800">You are Offline</h1>
            <p className="text-muted-foreground mt-2 max-w-sm">
                It seems you are not connected to the internet. Please check your connection and try again.
            </p>
            
            <Button onClick={handleRetry} className="mt-8 text-lg" size="lg">
                Retry
            </Button>

            <div className="mt-12 text-xs text-gray-400">
                <p>Some features may not be available offline.</p>
            </div>
        </div>
    );
}
