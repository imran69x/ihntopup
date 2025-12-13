'use client';

import * as React from 'react';
import {
    Search,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    Hash,
    Wallet,
    Calendar,
    CreditCard,
    DollarSign
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle as DialogHeaderTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { WalletTopUpRequest, User as AppUser } from '@/lib/data';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, runTransaction, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const getStatusBadgeVariant = (status: WalletTopUpRequest['status']) => {
    switch (status) {
        case 'Approved':
            return 'bg-green-100 text-green-800';
        case 'Pending':
            return 'bg-yellow-100 text-yellow-800';
        case 'Rejected':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const getStatusIcon = (status: WalletTopUpRequest['status']) => {
    switch (status) {
        case 'Approved': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
        case 'Pending': return <Clock className="h-4 w-4 text-yellow-600" />;
        case 'Rejected': return <XCircle className="h-4 w-4 text-red-600" />;
        default: return <Clock className="h-4 w-4" />;
    }
}

export default function WalletRequestsPage() {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [selectedRequest, setSelectedRequest] = React.useState<WalletTopUpRequest | null>(null);
    const [amountToApprove, setAmountToApprove] = React.useState<number>(0);
    const [rejectionReason, setRejectionReason] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');


    const { toast } = useToast();
    const firestore = useFirestore();

    const requestsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'wallet_top_up_requests'), orderBy('requestDate', 'desc')) : null, [firestore]);
    const { data: requests, isLoading } = useCollection<WalletTopUpRequest>(requestsQuery);

    const filteredRequests = (status: WalletTopUpRequest['status']) => {
        const baseFiltered = requests?.filter(r => r.status === status) || [];
        if (!searchTerm) {
            return baseFiltered;
        }
        return baseFiltered.filter(r =>
            r.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.senderPhone.includes(searchTerm)
        );
    }

    const handleProcessRequest = (request: WalletTopUpRequest) => {
        setSelectedRequest(request);
        setAmountToApprove(request.amount);
        setRejectionReason('');
        setIsDialogOpen(true);
    }

    const handleStatusUpdate = async (action: 'approve' | 'reject') => {
        if (!selectedRequest || !firestore) return;

        if (selectedRequest.status !== 'Pending') {
            toast({
                variant: 'destructive',
                title: 'ইতিমধ্যে প্রসেস করা হয়েছে',
                description: 'এই অনুরোধটি ইতিমধ্যে প্রসেস করা হয়ে গেছে।',
            });
            return;
        }

        if (action === 'approve' && (amountToApprove <= 0 || isNaN(amountToApprove))) {
            toast({
                variant: 'destructive',
                title: 'অবৈধ পরিমাণ',
                description: 'অনুমোদিত পরিমাণ অবশ্যই একটি ধনাত্মক সংখ্যা হতে হবে।',
            });
            return;
        }

        if (action === 'reject' && !rejectionReason.trim()) {
            toast({
                variant: 'destructive',
                title: 'কারণ আবশ্যক',
                description: 'অনুরোধ বাতিল করার জন্য অনুগ্রহ করে একটি কারণ লিখুন।',
            });
            return;
        }

        setIsSubmitting(true);
        const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
        const requestDocRef = doc(firestore, 'wallet_top_up_requests', selectedRequest.id);
        const userDocRef = doc(firestore, 'users', selectedRequest.userId);

        try {
            if (action === 'approve') {
                await runTransaction(firestore, async (transaction) => {
                    const requestDoc = await transaction.get(requestDocRef);
                    if (requestDoc.exists() && requestDoc.data().status !== 'Pending') {
                        throw new Error("এই অনুরোধটি ইতিমধ্যে অন্য কোনো অ্যাডমিন প্রসেস করে দিয়েছেন।");
                    }

                    const userDoc = await transaction.get(userDocRef);
                    if (!userDoc.exists()) {
                        throw new Error("ব্যবহারকারীকে খুঁজে পাওয়া যায়নি।");
                    }

                    const userData = userDoc.data() as AppUser;
                    const isResellerBalance = selectedRequest.isResellerBalance === true;

                    if (isResellerBalance) {
                        // Reseller balance - NO coins
                        const newResellerBalance = (userData.resellerBalance || 0) + amountToApprove;
                        transaction.update(userDocRef, { resellerBalance: newResellerBalance });
                    } else {
                        // Regular wallet - with coins
                        const newBalance = (userData.walletBalance || 0) + amountToApprove;
                        const currentCoinFund = userData.coinFund || 0;
                        const coinReward = Math.floor(amountToApprove * 0.10); // 10% coins
                        const newCoinFund = currentCoinFund + coinReward;

                        transaction.update(userDocRef, {
                            walletBalance: newBalance,
                            coinFund: newCoinFund
                        });
                    }

                    transaction.update(requestDocRef, { status: newStatus, approvedAmount: amountToApprove });
                });
            } else {
                await updateDoc(requestDocRef, { status: newStatus, rejectionReason: rejectionReason.trim() });
            }

            toast({
                title: 'স্ট্যাটাস আপডেট হয়েছে',
                description: `অনুরোধটি সফলভাবে ${newStatus === 'Approved' ? 'অনুমোদিত' : 'বাতিল'} করা হয়েছে।`,
            });

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "অপারেশন ব্যর্থ হয়েছে",
                description: error.message || "স্ট্যাটাস আপডেট করার সময় একটি ত্রুটি ঘটেছে।"
            });
        } finally {
            setIsSubmitting(false);
            setIsDialogOpen(false);
        }
    }

    const renderTable = (data: WalletTopUpRequest[]) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className='w-[100px]'>তারিখ</TableHead>
                    <TableHead>ব্যবহারকারী</TableHead>
                    <TableHead>পরিমাণ</TableHead>
                    <TableHead className="hidden md:table-cell">প্রেরকের নম্বর</TableHead>
                    <TableHead className="hidden sm:table-cell">পেমেন্ট মেথড</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="text-right">একশন</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((request) => (
                    <TableRow key={request.id}>
                        <TableCell>{new Date(request.requestDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                            <div className="font-medium">{request.userEmail}</div>
                            <div className="text-xs text-muted-foreground font-mono">{request.userId}</div>
                        </TableCell>
                        <TableCell className="font-semibold">৳{request.amount}</TableCell>
                        <TableCell className="hidden md:table-cell font-mono">{request.senderPhone}</TableCell>
                        <TableCell className="hidden sm:table-cell">{request.method}</TableCell>
                        <TableCell>
                            <div className="flex gap-2">
                                <Badge className={getStatusBadgeVariant(request.status)} variant="outline">
                                    <span className='mr-1'>{getStatusIcon(request.status)}</span> {request.status}
                                </Badge>
                                {request.isResellerBalance && (
                                    <Badge className="bg-purple-100 text-purple-800" variant="outline">
                                        Reseller Fund
                                    </Badge>
                                )}
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button
                                variant={'outline'}
                                size="sm"
                                onClick={() => handleProcessRequest(request)}
                            >
                                বিস্তারিত
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
                {data.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                            এই ট্যাবে কোনো অনুরোধ পাওয়া যায়নি।
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )

    const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
        <div className="flex items-start gap-3">
            <Icon className="h-4 w-4 text-muted-foreground mt-1" />
            <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <div className="font-semibold">{value}</div>
            </div>
        </div>
    );

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">ওয়ালেট টপ-আপ অনুরোধ</h1>
            </div>

            <Tabs defaultValue="pending">
                <TabsList>
                    <TabsTrigger value="pending">পেন্ডিং ({filteredRequests('Pending').length})</TabsTrigger>
                    <TabsTrigger value="approved">অনুমোদিত ({filteredRequests('Approved').length})</TabsTrigger>
                    <TabsTrigger value="rejected">বাতিল ({filteredRequests('Rejected').length})</TabsTrigger>
                </TabsList>
                <Card className='mt-4'>
                    <CardHeader>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="ব্যবহারকারীর ইমেইল বা ফোন নম্বর দিয়ে খুঁজুন..." className="pl-8 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                        ) : (
                            <>
                                <TabsContent value="pending">{renderTable(filteredRequests('Pending'))}</TabsContent>
                                <TabsContent value="approved">{renderTable(filteredRequests('Approved'))}</TabsContent>
                                <TabsContent value="rejected">{renderTable(filteredRequests('Rejected'))}</TabsContent>
                            </>
                        )}
                    </CardContent>
                </Card>
            </Tabs>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogHeaderTitle>অনুরোধের বিস্তারিত</DialogHeaderTitle>
                        <DialogDescription>
                            অনুরোধ আইডি: <span className='font-mono'>{selectedRequest?.id}</span>
                        </DialogDescription>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
                            <Card>
                                <CardHeader className='pb-4'>
                                    <CardTitle className='text-base flex items-center gap-2'><User className='h-4 w-4' /> ব্যবহারকারীর তথ্য</CardTitle>
                                </CardHeader>
                                <CardContent className='space-y-3 text-sm'>
                                    <DetailRow icon={User} label="ইমেইল" value={selectedRequest.userEmail} />
                                    <DetailRow icon={Hash} label="ব্যবহারকারী আইডি" value={<span className='font-mono'>{selectedRequest.userId}</span>} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className='pb-4'>
                                    <CardTitle className='text-base flex items-center gap-2'><CreditCard className='h-4 w-4' /> পেমেন্টের বিবরণ</CardTitle>
                                </CardHeader>
                                <CardContent className='space-y-3 text-sm'>
                                    <DetailRow icon={DollarSign} label="অনুরোধ করা পরিমাণ" value={`৳${selectedRequest.amount}`} />
                                    <DetailRow icon={CreditCard} label="পেমেন্ট মেথড" value={selectedRequest.method} />
                                    <DetailRow icon={Hash} label="প্রেরকের নম্বর" value={<span className='font-mono'>{selectedRequest.senderPhone}</span>} />
                                    {selectedRequest.transactionId && <DetailRow icon={Hash} label="লেনদেন আইডি" value={<span className='font-mono'>{selectedRequest.transactionId}</span>} />}
                                    <DetailRow icon={Calendar} label="অনুরোধের সময়" value={new Date(selectedRequest.requestDate).toLocaleString()} />
                                </CardContent>
                            </Card>

                            {selectedRequest.status === 'Pending' && (
                                <div className='pt-4 space-y-4'>
                                    <div className="space-y-2">
                                        <Label htmlFor="approveAmount">অনুমোদিত পরিমাণ (৳)</Label>
                                        <Input
                                            id="approveAmount"
                                            type="number"
                                            value={amountToApprove}
                                            onChange={(e) => setAmountToApprove(Number(e.target.value))}
                                            className="font-bold text-lg"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="rejectionReason">বাতিলের কারণ (যদি বাতিল করা হয়)</Label>
                                        <Textarea
                                            id="rejectionReason"
                                            placeholder="অনুরোধটি কেন বাতিল করা হচ্ছে তা ব্যাখ্যা করুন..."
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedRequest.status !== 'Pending' && (
                                <Card>
                                    <CardHeader className='pb-4'>
                                        <CardTitle className='text-base flex items-center gap-2'><CheckCircle2 className='h-4 w-4' /> স্ট্যাটাস</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedRequest.status === 'Approved' && (
                                            <DetailRow icon={DollarSign} label="অনুমোদিত পরিমাণ" value={`৳${selectedRequest.approvedAmount || selectedRequest.amount}`} />
                                        )}
                                        {selectedRequest.status === 'Rejected' && selectedRequest.rejectionReason && (
                                            <DetailRow icon={XCircle} label="বাতিলের কারণ" value={selectedRequest.rejectionReason} />
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                    <DialogFooter className='grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4'>
                        <Button variant="destructive" onClick={() => handleStatusUpdate('reject')} disabled={isSubmitting || selectedRequest?.status !== 'Pending'}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                            বাতিল করুন
                        </Button>
                        <Button onClick={() => handleStatusUpdate('approve')} disabled={isSubmitting || selectedRequest?.status !== 'Pending'}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            অনুমোদন করুন
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

