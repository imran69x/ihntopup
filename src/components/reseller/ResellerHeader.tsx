'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ProfileSidebar from '@/components/layout/ProfileSidebar';
import { Loader2 } from 'lucide-react';
import { WalletIcon } from '@/components/icons';

const formatCurrency = (amount: number) => {
    return '৳' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

export default function ResellerHeader() {
    const { isLoggedIn, firebaseUser, appUser, loading } = useAuthContext();
    const pathname = usePathname();
    const [isClient, setIsClient] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const navItems = [
        { href: '/', label: 'Home' },
        { href: '/reseller', label: 'Reseller Home' },
        { href: '/reseller/myorders', label: 'My Orders' },
    ];

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm shadow-sm border-b border-primary/20">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-6">
                        <Link href="/reseller" className="flex items-center gap-2">
                            <Image src="https://i.imgur.com/bJH9BH5.png" alt="IHN TOPUP Reseller" width={48} height={48} />
                            <span className="font-bold text-lg hidden sm:block text-primary">Reseller Panel</span>
                        </Link>
                    </div>

                    <nav className="hidden md:flex flex-1 items-center justify-center gap-4">
                        {navItems.map(item => (
                            <Link
                                href={item.href}
                                key={item.href}
                                className={cn(
                                    'text-sm font-bold text-muted-foreground transition-colors hover:text-primary',
                                    pathname === item.href ? 'text-primary' : ''
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className='ml-auto flex items-center gap-2 sm:gap-4'>
                        {loading && isClient && (
                            <div className="flex items-center justify-center h-10 px-4">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        )}
                        {!loading && isClient && isLoggedIn && firebaseUser ? (
                            <>
                                <div className="flex items-center gap-2">
                                    {appUser?.isReseller && appUser?.resellerId && (
                                        <div className="hidden md:flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full">
                                            <span className="text-xs font-semibold text-primary">Reseller ID: {appUser.resellerId}</span>
                                        </div>
                                    )}
                                    <Link href="/reseller/wallet" className="flex items-center justify-center h-9 px-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-full shadow-md transition-colors gap-2">
                                        <WalletIcon className="h-5 w-5 text-white" />
                                        <span className='font-bold text-xs sm:text-sm text-white'>{formatCurrency(appUser?.resellerBalance ?? 0)}</span>
                                    </Link>
                                </div>

                                <Button variant="ghost" onClick={() => setIsSidebarOpen(true)} className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white shadow-md p-0">
                                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                                        {appUser?.photoURL && <AvatarImage src={appUser.photoURL} alt={appUser.name || 'User'} />}
                                        <AvatarFallback>{appUser?.name?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </>
                        ) : !loading && isClient ? (
                            <Button asChild>
                                <Link href="/login">Login</Link>
                            </Button>
                        ) : null}
                    </div>
                </div>
            </header>
            <ProfileSidebar open={isSidebarOpen} onOpenChange={setIsSidebarOpen} />
        </>
    );
}
