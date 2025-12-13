'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, CheckCircle, Clock, Loader2, Plus, Wallet, XCircle } from 'lucide-react';
import Image from 'next/image';
import type { WalletTopUpRequest } from '@/lib/data';
import { useAuthContext } from '@/contexts/AuthContext';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import TransactionDetailDialog from '@/components/TransactionDetailDialog';
import AddMoneyDialog from '@/components/AddMoneyDialog';

const getStatusInfo = (status: WalletTopUpRequest['status']) => {
    switch (status) {
        case 'Approved':
            return {
                variant: 'secondary',
                className: 'bg-green-100 text-green-800 border-green-300',
                icon: CheckCircle,
            };
        case 'Pending':
            return {
                variant: 'secondary',
                className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                icon: Clock,
            };
        case 'Rejected':
            return {
                variant: 'secondary',
                className: 'bg-red-100 text-red-800 border-red-300',
                icon: XCircle,
            };
        default:
            return {
                variant: 'secondary',
                className: 'bg-muted text-muted-foreground',
                icon: Clock,
            };
    }
};

const RequestItem = ({ request, onViewDetails }: { request: WalletTopUpRequest, onViewDetails: (request: WalletTopUpRequest) => void }) => {
    const statusInfo = getStatusInfo(request.status);
    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewDetails(request)}>
            <CardContent className="p-4 grid grid-cols-[auto_1fr_auto] items-center gap-4">
                <div className="bg-muted p-3 rounded-lg">
                    <statusInfo.icon className={cn("h-6 w-6", statusInfo.className.replace(/bg-([a-z]+)-100/, 'text-$1-500'))} />
                </div>
                <div className="flex-grow">
                    <p className="font-bold text-sm">Reseller Balance Top-up via {request.method}</p>
                    <p className="text-xs text-muted-foreground">{new Date(request.requestDate).toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <p className="font-bold text-base text-primary">৳{request.amount.toFixed(2)}</p>
                    <Badge variant="secondary" className={cn("text-xs border rounded-full", statusInfo.className)}>{request.status}</Badge>
                </div>
            </CardContent>
        </Card>
    );
};


export default function ResellerWalletPage() {
    const { firebaseUser, appUser, loading } = useAuthContext();
    const firestore = useFirestore();
    const [selectedRequest, setSelectedRequest] = useState<WalletTopUpRequest | null>(null);
    const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);

    const [userTopUpRequests, setUserTopUpRequests] = useState<WalletTopUpRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch reseller balance top-up requests (marked with isResellerBalance flag)
    useEffect(() => {
        if (!firestore || !firebaseUser?.uid) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const requestsQuery = query(
            collection(firestore, 'wallet_top_up_requests'),
            where('userId', '==', firebaseUser.uid),
            where('isResellerBalance', '==', true), // Only reseller balance requests
            orderBy('requestDate', 'desc')
        );

        const unsubscribe = onSnapshot(requestsQuery, (querySnapshot) => {
            const requests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletTopUpRequest));
            setUserTopUpRequests(requests);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching reseller wallet requests:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, firebaseUser?.uid]);

    const recentRequests = useMemo(() => {
        return userTopUpRequests.slice(0, 5);
    }, [userTopUpRequests]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6 space-y-6">
            <h1 className="text-3xl font-bold">Reseller Wallet</h1>

            {/* Balance Card */}
            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl">
                <CardContent className="p-6">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <Wallet className="h-6 w-6" />
                            <p className="text-sm text-green-100">Reseller Balance</p>
                        </div>
                        <p className="text-4xl font-bold tracking-tighter">৳{appUser?.resellerBalance?.toFixed(2) ?? '0.00'}</p>
                        <Button
                            onClick={() => setIsAddMoneyOpen(true)}
                            className="mt-4 bg-white text-green-600 hover:bg-green-50"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Money
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Requests */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ArrowRight className="h-5 w-5 text-primary" />
                        Recent Top-up Requests
                    </CardTitle>
                    <CardDescription>Your recent reseller balance top-up requests</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : recentRequests.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No top-up requests yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {recentRequests.map((request) => (
                                <RequestItem
                                    key={request.id}
                                    request={request}
                                    onViewDetails={setSelectedRequest}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialogs */}
            <AddMoneyDialog
                open={isAddMoneyOpen}
                onOpenChange={setIsAddMoneyOpen}
                isResellerBalance={true}
            />
            <TransactionDetailDialog
                open={!!selectedRequest}
                onOpenChange={(open) => !open && setSelectedRequest(null)}
                transaction={selectedRequest}
            />
        </div>
    );
}
