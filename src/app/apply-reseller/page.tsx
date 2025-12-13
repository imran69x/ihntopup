'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthContext } from '@/contexts/AuthContext';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { CheckCircle, Clock, Loader2, Store, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ResellerApplication } from '@/lib/data';

export default function ApplyResellerPage() {
    const { appUser, firebaseUser, loading } = useAuthContext();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingApplication, setExistingApplication] = useState<ResellerApplication | null>(null);
    const [loadingApplication, setLoadingApplication] = useState(true);

    // Form state
    const [phone, setPhone] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [telegram, setTelegram] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [businessType, setBusinessType] = useState('');
    const [experience, setExperience] = useState('');
    const [expectedVolume, setExpectedVolume] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (!firebaseUser || !firestore) return;

        const checkExistingApplication = async () => {
            try {
                const q = query(
                    collection(firestore, 'reseller_applications'),
                    where('userId', '==', firebaseUser.uid)
                );
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const app = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ResellerApplication;
                    setExistingApplication(app);
                }
            } catch (error) {
                console.error('Error checking application:', error);
            } finally {
                setLoadingApplication(false);
            }
        };

        checkExistingApplication();
    }, [firebaseUser, firestore]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!firebaseUser || !appUser || !firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please login first' });
            return;
        }

        if (!phone || !whatsapp || !businessName || !businessType || !experience || !expectedVolume || !reason) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill all required fields' });
            return;
        }

        setIsSubmitting(true);

        try {
            const applicationData: Omit<ResellerApplication, 'id'> = {
                userId: firebaseUser.uid,
                userName: appUser.name,
                userEmail: appUser.email,
                phone,
                whatsapp,
                telegram: telegram || undefined,
                businessName,
                businessType,
                experience,
                expectedMonthlyVolume: expectedVolume,
                reason,
                status: 'pending',
                appliedAt: new Date().toISOString(),
            };

            await addDoc(collection(firestore, 'reseller_applications'), applicationData);

            toast({
                title: 'Success!',
                description: 'Your reseller application has been submitted successfully',
            });

            // Refresh to show pending status
            window.location.reload();
        } catch (error) {
            console.error('Error submitting application:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to submit application. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || loadingApplication) {
        return (
            <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!firebaseUser) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card>
                    <CardContent className="p-8 text-center">
                        <p className="mb-4">Please login to apply for reseller account</p>
                        <Button onClick={() => router.push('/login')}>Login</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (appUser?.isReseller) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card>
                    <CardContent className="p-8 text-center">
                        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">You are already a Reseller!</h2>
                        <p className="text-muted-foreground mb-4">Access your reseller panel</p>
                        <Button onClick={() => router.push('/reseller')}>Go to Reseller Panel</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show existing application status
    if (existingApplication) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <Card className="border-2">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4">
                            {existingApplication.status === 'pending' && <Clock className="h-16 w-16 text-yellow-600" />}
                            {existingApplication.status === 'approved' && <CheckCircle className="h-16 w-16 text-green-600" />}
                            {existingApplication.status === 'rejected' && <XCircle className="h-16 w-16 text-red-600" />}
                        </div>
                        <CardTitle className="text-2xl">
                            {existingApplication.status === 'pending' && 'Application Pending'}
                            {existingApplication.status === 'approved' && 'Application Approved!'}
                            {existingApplication.status === 'rejected' && 'Application Rejected'}
                        </CardTitle>
                        <CardDescription>
                            {existingApplication.status === 'pending' && 'Your application is under review'}
                            {existingApplication.status === 'approved' && 'Congratulations! You are now a reseller'}
                            {existingApplication.status === 'rejected' && 'Your application was not approved'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Applied on:</span>
                                <span className="font-medium">
                                    {new Date(existingApplication.appliedAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Business Name:</span>
                                <span className="font-medium">{existingApplication.businessName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Status:</span>
                                <span className={`font-medium ${existingApplication.status === 'pending' ? 'text-yellow-600' :
                                        existingApplication.status === 'approved' ? 'text-green-600' :
                                            'text-red-600'
                                    }`}>
                                    {existingApplication.status.toUpperCase()}
                                </span>
                            </div>
                            {existingApplication.rejectionReason && (
                                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
                                    <p className="text-sm text-red-800">
                                        <strong>Reason:</strong> {existingApplication.rejectionReason}
                                    </p>
                                </div>
                            )}
                            {existingApplication.status === 'approved' && (
                                <Button className="w-full mt-4" onClick={() => router.push('/reseller')}>
                                    Go to Reseller Panel
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show application form
    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Store className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle className="text-2xl">Apply for Reseller Account</CardTitle>
                            <CardDescription>Fill out the form below to become a reseller</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Contact Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Contact Information</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="phone">Phone Number *</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="01XXXXXXXXX"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="whatsapp">WhatsApp Number *</Label>
                                    <Input
                                        id="whatsapp"
                                        type="tel"
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                        placeholder="01XXXXXXXXX"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="telegram">Telegram Username (Optional)</Label>
                                <Input
                                    id="telegram"
                                    value={telegram}
                                    onChange={(e) => setTelegram(e.target.value)}
                                    placeholder="@username"
                                />
                            </div>
                        </div>

                        {/* Business Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Business Information</h3>

                            <div>
                                <Label htmlFor="businessName">Business/Company Name *</Label>
                                <Input
                                    id="businessName"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    placeholder="Your business name"
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="businessType">Business Type *</Label>
                                <Select value={businessType} onValueChange={setBusinessType} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select business type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="online">Online Only</SelectItem>
                                        <SelectItem value="offline">Offline Only</SelectItem>
                                        <SelectItem value="both">Both Online & Offline</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="experience">Previous Experience *</Label>
                                <Select value={experience} onValueChange={setExperience} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select experience level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No previous experience</SelectItem>
                                        <SelectItem value="beginner">Less than 1 year</SelectItem>
                                        <SelectItem value="intermediate">1-3 years</SelectItem>
                                        <SelectItem value="expert">More than 3 years</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="expectedVolume">Expected Monthly Volume *</Label>
                                <Select value={expectedVolume} onValueChange={setExpectedVolume} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select expected volume" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1000-5000">৳1,000 - ৳5,000</SelectItem>
                                        <SelectItem value="5000-10000">৳5,000 - ৳10,000</SelectItem>
                                        <SelectItem value="10000-50000">৳10,000 - ৳50,000</SelectItem>
                                        <SelectItem value="50000+">৳50,000+</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="reason">Why do you want to become a reseller? *</Label>
                                <Textarea
                                    id="reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Tell us about your motivation and plans..."
                                    rows={4}
                                    required
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Application'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
