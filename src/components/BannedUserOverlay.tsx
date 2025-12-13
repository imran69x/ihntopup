'use client';

import { AlertTriangle, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useEffect } from 'react';

interface BannedUserOverlayProps {
    telegramLink?: string;
}

export default function BannedUserOverlay({ telegramLink = 'https://t.me/your_support_channel' }: BannedUserOverlayProps) {
    useEffect(() => {
        // Prevent scrolling when banned
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Blur backdrop */}
            <div className="absolute inset-0 backdrop-blur-xl bg-black/30" />

            {/* Popup */}
            <div className="relative z-10 max-w-md w-full mx-4 bg-white rounded-2xl shadow-2xl border-4 border-red-500 overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 text-white">
                    <div className="flex items-center justify-center mb-4">
                        <div className="bg-white/20 p-4 rounded-full">
                            <AlertTriangle className="h-12 w-12" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center">Account Banned</h2>
                    <p className="text-center text-red-100 mt-2">আপনার অ্যাকাউন্ট নিষিদ্ধ করা হয়েছে</p>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-gray-700 text-center leading-relaxed">
                            আপনার অ্যাকাউন্ট নিষিদ্ধ করা হয়েছে। আরও তথ্যের জন্য অনুগ্রহ করে আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন।
                        </p>
                    </div>

                    <Button
                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                        onClick={() => window.open(telegramLink, '_blank')}
                    >
                        <MessageCircle className="mr-2 h-5 w-5" />
                        Contact Our Support
                    </Button>

                    <p className="text-xs text-center text-gray-500">
                        If you believe this is a mistake, please reach out to our support team via Telegram.
                    </p>
                </div>
            </div>
        </div>
    );
}
