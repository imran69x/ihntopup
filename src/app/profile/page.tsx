'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDoc, useFirestore, useMemoFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase';
import { Check, Copy, ShieldCheck, User, Wallet, ShoppingBag, Trophy, Pencil, Send, LogOut, ChevronRight, Share2, KeyRound, Headset, Gamepad2, Info, Loader2, Ticket, LayoutDashboard, DollarSign, Store } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import SavedUidsCard from '@/components/SavedUidsCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, collection, query, updateDoc, where, orderBy, getDoc } from 'firebase/firestore';
import type { User as UserData, Order, SavedUid } from '@/lib/data';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { updateProfile } from 'firebase/auth';

const ActionButton = ({ icon, title, description, href, onClick }: { icon: React.ElementType, title: string, description: string, href?: string, onClick?: () => void }) => {
    const Icon = icon;
    const content = (
        <Card className="shadow-sm hover:bg-muted/50 transition-colors cursor-pointer" onClick={onClick}>
            <CardContent className="p-4 flex items-center gap-4">
                <div className="bg-muted p-3 rounded-lg">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-grow">
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
        </Card>
    );

    if (href) {
        return <Link href={href}>{content}</Link>;
    }

    return content;
};

const DialogActionButton = ({ icon, title, description, dialogTitle, children, onOpenChange }: { icon: React.ElementType, title: string, description: string, dialogTitle: string, children: React.ReactNode, onOpenChange?: (open: boolean) => void }) => {
    const Icon = icon;
    return (
        <Dialog onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Card className="shadow-sm hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="bg-muted p-3 rounded-lg">
                            <Icon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-grow">
                            <h3 className="font-semibold">{title}</h3>
                            <p className="text-sm text-muted-foreground">{description}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl bg-card border-4 border-green-500 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-center text-2xl font-bold">{dialogTitle}</DialogTitle>
                </DialogHeader>
                {children}
            </DialogContent>
        </Dialog>
    );
};


export default function ProfilePage() {
    const { firebaseUser, appUser, logout, loading, isLoggedIn } = useAuthContext();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();

    const userDocRef = useMemoFirebase(() => {
        if (!firebaseUser?.uid || !firestore) return null;
        return doc(firestore, 'users', firebaseUser.uid);
    }, [firebaseUser?.uid, firestore]);

    const ordersQuery = useMemoFirebase(() => {
        if (!firebaseUser?.uid || !firestore) return null;
        return query(collection(firestore, `orders`), where('userId', '==', firebaseUser.uid), orderBy('orderDate', 'desc'));
    }, [firebaseUser?.uid, firestore]);

    const { data: orders } = useCollection<Order>(ordersQuery);
    const orderCount = useMemo(() => orders?.length ?? 0, [orders]);

    const totalSpent = useMemo(() => {
        if (!orders) return 0;
        return orders.reduce((sum, order) => {
            return order.status === 'Completed' ? sum + order.totalAmount : sum;
        }, 0);
    }, [orders]);


    // State for the edit dialog
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        if (!loading && !isLoggedIn) {
            router.push('/login');
        }
    }, [loading, isLoggedIn, router]);

    useEffect(() => {
        if (appUser) {
            setName(appUser.name || '');
            setPhone(appUser.phone || '');
        }
    }, [appUser]);

    const handleProfileUpdate = async () => {
        if (!userDocRef || !firebaseUser) return;

        const dataToUpdate: Partial<UserData> = { name, phone };

        try {
            if (firebaseUser.displayName !== name) {
                await updateProfile(firebaseUser, { displayName: name });
            }
            updateDocumentNonBlocking(userDocRef, dataToUpdate);

            toast({
                title: "প্রোফাইল আপডেট হয়েছে",
                description: "আপনার ব্যক্তিগত তথ্য সংরক্ষণ করা হয়েছে।",
            });
        } catch (error: any) {
            console.error("Error updating profile:", error);
            toast({
                variant: "destructive",
                title: "আপডেট ব্যর্থ হয়েছে",
                description: error.message || "আপনার প্রোফাইল আপডেট করা যায়নি।",
            });
        }
    };

    const handleUidsUpdate = async (newUids: SavedUid[]) => {
        if (!userDocRef) return;
        try {
            updateDocumentNonBlocking(userDocRef, { savedGameUids: newUids });
            toast({
                title: "গেম আইডি আপডেট হয়েছে",
                description: "আপনার সংরক্ষিত আইডি তালিকা আপডেট করা হয়েছে।",
            });
        } catch (error: any) {
            console.error("Error updating UIDs:", error);
            toast({
                variant: "destructive",
                title: "আপডেট ব্যর্থ হয়েছে",
                description: "আপনার সংরক্ষিত আইডি আপডেট করা যায়নি।",
            });
        }
    };

    const handleCopyUserId = () => {
        if (!appUser?.uniqueId) return;
        navigator.clipboard.writeText(appUser.uniqueId);
        toast({ title: 'ইউনিক আইডি কপি করা হয়েছে' });
    };

    const isLoadingPage = loading;

    if (isLoadingPage || !isLoggedIn || !appUser || !firebaseUser) {
        return (
            <div className="container mx-auto px-4 py-6 text-center flex items-center justify-center min-h-[calc(100vh-8rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    const user = { ...firebaseUser, ...appUser };


    return (
        <>
            <div className="container mx-auto px-4 py-6 fade-in space-y-6">
                <div className='flex items-center gap-2'>
                    <h1 className="text-3xl font-bold font-headline">আমার প্রোফাইল</h1>
                    <User className="h-7 w-7 text-blue-500" />
                </div>

                <Card className="overflow-hidden shadow-lg rounded-2xl">
                    <div className="h-32 bg-gradient-to-r from-green-400 to-green-600 relative">
                        <div className='absolute -bottom-12 left-1/2 -translate-x-1/2'>
                            <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                                {user.photoURL && <AvatarImage asChild src={user.photoURL}><Image src={user.photoURL} alt={user.name || 'User'} width={96} height={96} /></AvatarImage>}
                                <AvatarFallback className="text-4xl bg-muted text-primary">{user.name ? user.name.charAt(0) : 'U'}</AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                    <CardContent className="pt-16 pb-6 text-center">
                        <h2 className="text-2xl font-bold">{user.name}</h2>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="mt-2 flex justify-center items-center gap-2">
                            <p className="text-xs text-muted-foreground">ID:</p>
                            <p className="text-xs font-mono text-muted-foreground">{user.uniqueId}</p>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyUserId}>
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                            <Link href="/wallet">
                                <Card className="shadow-md border-l-4 border-green-500 h-full">
                                    <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
                                        <Wallet className="h-6 w-6 text-green-500" />
                                        <p className="text-xs text-muted-foreground">ওয়ালেট</p>
                                        <p className="text-md font-bold">৳{user.walletBalance?.toLocaleString() ?? '0'}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                            <Card className="shadow-md border-l-4 border-orange-500 h-full">
                                <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
                                    <Image src="/coin-icon.png" alt="Coin" width={24} height={24} className="w-6 h-6" />
                                    <p className="text-xs text-muted-foreground">কয়েন ফান্ড</p>
                                    <p className="text-md font-bold">{user.coinFund?.toLocaleString() ?? '0'}</p>
                                </CardContent>
                            </Card>
                            <Link href="/orders">
                                <Card className="shadow-md border-l-4 border-purple-500 h-full">
                                    <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
                                        <ShoppingBag className="h-6 w-6 text-purple-500" />
                                        <p className="text-xs text-muted-foreground">অর্ডার</p>
                                        <p className="text-md font-bold">{orderCount}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                            <Card className="shadow-md border-l-4 border-blue-500 h-full">
                                <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
                                    <DollarSign className="h-6 w-6 text-blue-500" />
                                    <p className="text-xs text-muted-foreground">মোট খরচ</p>
                                    <p className="text-md font-bold">৳{totalSpent.toLocaleString()}</p>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-3">
                    {appUser.isAdmin && (
                        <ActionButton
                            icon={LayoutDashboard}
                            title="অ্যাডমিন প্যানেল"
                            description="সাইট ম্যানেজ করতে অ্যাডমিন প্যানেলে যান"
                            href="/admin"
                        />
                    )}
                    {!appUser.isReseller && (
                        <ActionButton
                            icon={Store}
                            title="রিসেলার হন"
                            description="রিসেলার অ্যাকাউন্টের জন্য আবেদন করুন"
                            href="/apply-reseller"
                        />
                    )}
                    {appUser.isReseller && (
                        <ActionButton
                            icon={ShoppingBag}
                            title="Reseller Panel"
                            description="Access your reseller dashboard and manage sales"
                            href="/reseller"
                        />
                    )}
                    <DialogActionButton
                        icon={Info}
                        title="ব্যক্তিগত তথ্য"
                        description="আপনার ব্যক্তিগত তথ্য দেখুন এবং সম্পাদনা করুন"
                        dialogTitle="ব্যক্তিগত তথ্য সম্পাদনা করুন"
                        onOpenChange={(isOpen) => {
                            if (isOpen && appUser) {
                                setName(appUser.name || '');
                                setPhone(appUser.phone || '');
                            }
                        }}
                    >
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <label htmlFor="name" className='text-sm font-medium'>সম্পূর্ণ নাম</label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="email" className='text-sm font-medium'>ইমেইল ঠিকানা</label>
                                <Input id="email" type="email" value={user.email || ''} readOnly />
                                <p className='text-xs text-muted-foreground'>ইমেইল পরিবর্তন করা যাবে না</p>
                            </div>
                            <div className="space-y-2 relative">
                                <label htmlFor="phone" className='text-sm font-medium'>ফোন নম্বর</label>
                                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="pr-10" />
                                <Button variant="ghost" size="icon" className="absolute right-1 bottom-1 h-8 w-8 bg-green-500 hover:bg-green-600 rounded-full">
                                    <Send className="h-4 w-4 text-white" />
                                </Button>
                            </div>
                            <Button className="w-full" onClick={handleProfileUpdate}>সংরক্ষণ করুন</Button>
                        </div>
                    </DialogActionButton>

                    <DialogActionButton
                        icon={Gamepad2}
                        title="সংরক্ষিত গেম আইডি"
                        description="আপনার গেম আইডি ম্যানেজ করুন"
                        dialogTitle="সংরক্ষিত গেম আইডি"
                    >
                        <SavedUidsCard
                            savedUids={appUser.savedGameUids || []}
                            onUidsChange={handleUidsUpdate}
                        />
                    </DialogActionButton>

                    <ActionButton
                        icon={Headset}
                        title="সাপোর্ট"
                        description="আমাদের টিম থেকে সাহায্য নিন"
                        href="/support"
                    />
                </div>

                <Button variant="destructive" className="w-full text-lg py-6 bg-red-600 hover:bg-red-700" onClick={logout}>
                    <LogOut className="mr-2 h-5 w-5" />
                    লগআউট
                </Button>

            </div>
        </>
    );
}
