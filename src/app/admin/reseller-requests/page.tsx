'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { ResellerApplication } from '@/lib/data';
import { collection, onSnapshot, orderBy, query, doc, updateDoc } from 'firebase/firestore';
import { CheckCircle, Clock, Eye, Loader2, Store, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AdminResellerRequestsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [applications, setApplications] = useState<ResellerApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState<ResellerApplication | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectDialog, setShowRejectDialog] = useState(false);

    useEffect(() => {
        if (!firestore) return;

        const q = query(
            collection(firestore, 'reseller_applications'),
            orderBy('appliedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const apps = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ResellerApplication));
            setApplications(apps);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    const handleApprove = async (application: ResellerApplication) => {
        if (!firestore) return;

        setIsProcessing(true);
        try {
            // Update application status
            await updateDoc(doc(firestore, 'reseller_applications', application.id), {
                status: 'approved',
                reviewedAt: new Date().toISOString()
            });

            // Update user to reseller
            await updateDoc(doc(firestore, 'users', application.userId), {
                isReseller: true
            });

            toast({
                title: 'Application Approved',
                description: `${application.userName} is now a reseller!`,
            });

            setSelectedApp(null);
        } catch (error) {
            console.error('Error approving:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to approve application',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!firestore || !selectedApp) return;

        if (!rejectionReason.trim()) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please provide a rejection reason',
            });
            return;
        }

        setIsProcessing(true);
        try {
            await updateDoc(doc(firestore, 'reseller_applications', selectedApp.id), {
                status: 'rejected',
                reviewedAt: new Date().toISOString(),
                rejectionReason
            });

            toast({
                title: 'Application Rejected',
                description: 'Applicant will be notified',
            });

            setShowRejectDialog(false);
            setSelectedApp(null);
            setRejectionReason('');
        } catch (error) {
            console.error('Error rejecting:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to reject application',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
            case 'approved':
                return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
            case 'rejected':
                return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center gap-3">
                <Store className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold">Reseller Applications</h1>
                    <p className="text-muted-foreground">Review and manage reseller requests</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-yellow-600">
                            {applications.filter(a => a.status === 'pending').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">
                            {applications.filter(a => a.status === 'approved').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">
                            {applications.filter(a => a.status === 'rejected').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Applications List */}
            <Card>
                <CardHeader>
                    <CardTitle>All Applications</CardTitle>
                    <CardDescription>Total: {applications.length}</CardDescription>
                </CardHeader>
                <CardContent>
                    {applications.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No applications yet
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {applications.map((app) => (
                                <div
                                    key={app.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold">{app.userName}</h3>
                                            {getStatusBadge(app.status)}
                                        </div>
                                        <div className="text-sm text-muted-foreground space-y-1">
                                            <p>Business: {app.businessName}</p>
                                            <p>Applied: {new Date(app.appliedAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedApp(app)}
                                    >
                                        <Eye className="w-4 h-4 mr-1" />
                                        View Details
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Details Dialog */}
            <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Application Details</DialogTitle>
                        <DialogDescription>
                            Review the applicant's information
                        </DialogDescription>
                    </DialogHeader>

                    {selectedApp && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                <div>
                                    <h3 className="font-semibold text-lg">{selectedApp.userName}</h3>
                                    <p className="text-sm text-muted-foreground">{selectedApp.userEmail}</p>
                                </div>
                                {getStatusBadge(selectedApp.status)}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Phone</Label>
                                    <p className="font-medium">{selectedApp.phone}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">WhatsApp</Label>
                                    <p className="font-medium">{selectedApp.whatsapp}</p>
                                </div>
                                {selectedApp.telegram && (
                                    <div>
                                        <Label className="text-muted-foreground">Telegram</Label>
                                        <p className="font-medium">{selectedApp.telegram}</p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label className="text-muted-foreground">Business Name</Label>
                                <p className="font-medium">{selectedApp.businessName}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Business Type</Label>
                                    <p className="font-medium capitalize">{selectedApp.businessType}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Experience</Label>
                                    <p className="font-medium capitalize">{selectedApp.experience}</p>
                                </div>
                            </div>

                            <div>
                                <Label className="text-muted-foreground">Expected Monthly Volume</Label>
                                <p className="font-medium">{selectedApp.expectedMonthlyVolume}</p>
                            </div>

                            <div>
                                <Label className="text-muted-foreground">Reason for Apply</Label>
                                <p className="font-medium whitespace-pre-wrap">{selectedApp.reason}</p>
                            </div>

                            <div>
                                <Label className="text-muted-foreground">Applied On</Label>
                                <p className="font-medium">
                                    {new Date(selectedApp.appliedAt).toLocaleString()}
                                </p>
                            </div>

                            {selectedApp.rejectionReason && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded">
                                    <Label className="text-red-800">Rejection Reason</Label>
                                    <p className="text-red-700 mt-1">{selectedApp.rejectionReason}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {selectedApp?.status === 'pending' && (
                        <DialogFooter className="gap-2">
                            <Button
                                variant="destructive"
                                onClick={() => setShowRejectDialog(true)}
                                disabled={isProcessing}
                            >
                                Reject
                            </Button>
                            <Button
                                onClick={() => handleApprove(selectedApp)}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                                ) : (
                                    <><CheckCircle className="w-4 h-4 mr-2" />Approve</>
                                )}
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Application</DialogTitle>
                        <DialogDescription>
                            Provide a reason for rejection
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label htmlFor="reason">Rejection Reason</Label>
                        <Textarea
                            id="reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter the reason for rejection..."
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Rejecting...</>
                            ) : (
                                'Confirm Reject'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
