'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function ClearCachePage() {
    const router = useRouter();

    const clearAllCache = async () => {
        try {
            // Clear localStorage
            localStorage.clear();

            // Clear sessionStorage
            sessionStorage.clear();

            // Clear IndexedDB (Firestore cache)
            const databases = await indexedDB.databases();
            for (const db of databases) {
                if (db.name) {
                    indexedDB.deleteDatabase(db.name);
                }
            }

            alert('✅ Cache cleared! Page reload হচ্ছে...');

            // Reload page
            window.location.href = '/admin/dashboard';
        } catch (error) {
            console.error('Error clearing cache:', error);
            alert('Cache clear করতে সমস্যা হয়েছে। Manually browser cache clear করুন।');
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Clear Firestore Cache</CardTitle>
                    <CardDescription>
                        Permission error fix করার জন্য browser cache clear করুন
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <p className="text-sm text-yellow-800 font-medium">
                            এই button click করলে:
                        </p>
                        <ul className="list-disc list-inside text-sm text-yellow-800 mt-2 space-y-1">
                            <li>Browser localStorage clear হবে</li>
                            <li>Firestore IndexedDB cache clear হবে</li>
                            <li>Page automatically reload হবে</li>
                        </ul>
                    </div>

                    <Button onClick={clearAllCache} size="lg" className="w-full" variant="destructive">
                        Clear Cache & Reload
                    </Button>

                    <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-2">এটা কাজ না করলে manually করুন:</p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Browser DevTools খুলুন (F12)</li>
                            <li>Application tab এ যান</li>
                            <li>Storage section থেকে "Clear site data" click করুন</li>
                            <li>Page refresh করুন</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
