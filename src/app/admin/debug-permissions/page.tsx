'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DebugPermissionsPage() {
    const { appUser, firebaseUser } = useAuthContext();
    const firestore = useFirestore();
    const [testResult, setTestResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const testFirestoreAccess = async () => {
        if (!firestore) {
            setTestResult({ error: 'Firestore not initialized' });
            return;
        }

        setLoading(true);
        try {
            // Test reading config
            const configRef = doc(firestore, 'spinWheelConfig', 'default');
            const configSnap = await getDoc(configRef);

            setTestResult({
                success: true,
                configExists: configSnap.exists(),
                configData: configSnap.exists() ? configSnap.data() : null,
                userInfo: {
                    uid: firebaseUser?.uid,
                    isAdmin: appUser?.isAdmin,
                    email: appUser?.email,
                }
            });
        } catch (error: any) {
            setTestResult({
                error: error.message,
                code: error.code,
                userInfo: {
                    uid: firebaseUser?.uid,
                    isAdmin: appUser?.isAdmin,
                    email: appUser?.email,
                }
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle>Debug Firestore Permissions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="font-bold mb-2">Current User Info:</h3>
                        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                            {JSON.stringify({
                                uid: firebaseUser?.uid,
                                email: appUser?.email,
                                isAdmin: appUser?.isAdmin,
                                hasVerifiedBadge: appUser?.hasVerifiedBadge
                            }, null, 2)}
                        </pre>
                    </div>

                    <Button onClick={testFirestoreAccess} disabled={loading}>
                        {loading ? 'Testing...' : 'Test Firestore Access'}
                    </Button>

                    {testResult && (
                        <div>
                            <h3 className="font-bold mb-2">Test Result:</h3>
                            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                                {JSON.stringify(testResult, null, 2)}
                            </pre>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
