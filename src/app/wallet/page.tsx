'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowRight, CheckCircle, Clock, Loader2, Plus, Search, XCircle, Wallet, Send, Inbox, History } from 'lucide-react';
import Image from 'next/image';
import type { WalletTopUpRequest } from '@/lib/data';
import { useAuthContext } from '@/contexts/AuthContext';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import TransactionDetailDialog from '@/components/TransactionDetailDialog';
import AddMoneyDialog from '@/components/AddMoneyDialog';
import BalanceTransferDialog from '@/components/BalanceTransferDialog';

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
    <Card className="shadow-sm hover:shadow-md transition-shadow" onClick={() => onViewDetails(request)}>
      <CardContent className="p-4 grid grid-cols-[auto_1fr_auto] items-center gap-4">
        <div className="bg-muted p-3 rounded-lg">
          <statusInfo.icon className={cn("h-6 w-6", statusInfo.className.replace(/bg-([a-z]+)-100/, 'text-$1-500'))} />
        </div>
        <div className="flex-grow">
          <p className="font-bold text-sm">Wallet Top-up via {request.method}</p>
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


export default function WalletPage() {
  const { firebaseUser, appUser, loading } = useAuthContext();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<WalletTopUpRequest | null>(null);
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const [userTopUpRequests, setUserTopUpRequests] = useState<WalletTopUpRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !firebaseUser?.uid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const requestsQuery = query(
      collection(firestore, 'wallet_top_up_requests'),
      where('userId', '==', firebaseUser.uid),
      orderBy('requestDate', 'desc')
    );

    const unsubscribe = onSnapshot(requestsQuery, (querySnapshot) => {
      const requests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletTopUpRequest));
      setUserTopUpRequests(requests);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching wallet requests: ", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, firebaseUser?.uid]);


  const filteredRequests = useMemo(() => {
    if (!userTopUpRequests) return [];

    let filtered = userTopUpRequests;

    if (activeTab !== 'All') {
      filtered = filtered.filter(req => req.status === activeTab);
    }

    if (searchTerm) {
      filtered = filtered.filter(req =>
        req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.senderPhone.includes(searchTerm)
      );
    }

    return filtered;
  }, [userTopUpRequests, searchTerm, activeTab]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!firebaseUser && !isLoading) {
    return <div className="container mx-auto p-4 flex justify-center items-center min-h-[calc(100vh-8rem)]">
      <div className='text-center'>
        <p className='mb-4'>Please log in to view your wallet.</p>
        <Button asChild><a href="/login">Login</a></Button>
      </div>
    </div>;
  }

  return (
    <>
      <div className="container mx-auto px-4 py-6 fade-in space-y-6">
        <div className="flex items-center gap-2">
          <Wallet className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold font-headline">My Wallet</h1>
        </div>

        <Card className="shadow-xl rounded-2xl bg-gradient-to-br from-green-500 to-green-700 text-white overflow-hidden">
          <CardContent className="p-6 relative">
            <div className="absolute top-0 right-0 h-32 w-32 bg-white/10 rounded-bl-full"></div>
            <div className="absolute -bottom-8 -left-8 h-32 w-32 bg-white/10 rounded-full"></div>

            <div className="relative z-10">
              <p className="text-sm text-green-200">Total Balance</p>
              <p className="text-4xl font-bold tracking-tighter">৳{appUser?.walletBalance?.toFixed(2) ?? '0.00'}</p>
            </div>
            <div className="relative z-10 grid grid-cols-2 gap-4 mt-6">
              <Button
                onClick={() => setIsAddMoneyOpen(true)}
                className="bg-white text-green-600 hover:bg-green-100 h-12 shadow-lg text-base font-bold"
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Money
              </Button>
              <Button
                onClick={() => setIsTransferOpen(true)}
                variant="secondary"
                className="bg-white/20 text-white hover:bg-white/30 h-12 shadow-lg text-base font-bold"
              >
                <Send className="mr-2 h-5 w-5" />
                Transfer Balance
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white overflow-hidden">
          <CardContent className="p-6 relative">
            <div className="absolute top-0 right-0 h-32 w-32 bg-white/10 rounded-bl-full"></div>
            <div className="absolute -bottom-8 -left-8 h-32 w-32 bg-white/10 rounded-full"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Image src="/coin-icon.png" alt="Coin" width={24} height={24} className="w-6 h-6" />
                <p className="text-sm text-orange-200">Coin Fund</p>
              </div>
              <p className="text-4xl font-bold tracking-tighter">{appUser?.coinFund?.toFixed(0) ?? '0'}</p>
              <p className="text-xs text-orange-100 mt-2">Earn 10% of every completed order!</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Top-up History</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="All">All</TabsTrigger>
                <TabsTrigger value="Pending">Pending</TabsTrigger>
                <TabsTrigger value="Approved">Approved</TabsTrigger>
                <TabsTrigger value="Rejected">Rejected</TabsTrigger>
              </TabsList>
              <div className="relative my-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by Sender Phone or Txn ID..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <TabsContent value={activeTab}>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRequests.length > 0 ? (
                      filteredRequests.map((req) => (
                        <RequestItem key={req.id} request={req} onViewDetails={setSelectedRequest} />
                      ))
                    ) : (
                      <div className="text-center py-10">
                        <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground mt-4">No requests found in this category.</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {selectedRequest && (
        <TransactionDetailDialog
          transaction={selectedRequest}
          open={!!selectedRequest}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedRequest(null);
            }
          }}
        />
      )}

      <AddMoneyDialog open={isAddMoneyOpen} onOpenChange={setIsAddMoneyOpen} />
      <BalanceTransferDialog open={isTransferOpen} onOpenChange={setIsTransferOpen} />
    </>
  );
}
