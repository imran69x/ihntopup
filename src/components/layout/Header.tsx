'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CreditCard, Loader2, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { UserIcon, WalletIcon } from '@/components/icons';
import { Button } from '../ui/button';
import { useEffect, useState, useMemo } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import ProfileSidebar from './ProfileSidebar';

const formatCurrency = (amount: number) => {
  return '৳' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};


export default function Header() {
  const { isLoggedIn, firebaseUser, appUser, loading } = useAuthContext();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const navItems = useMemo(() => {
    const baseNavItems = [
      { href: '/', label: 'Home' },
      { href: '/topup', label: 'Top-Up' },
    ];

    const loggedInNavItems = [
      ...baseNavItems,
      { href: '/orders', label: 'My Orders' },
      { href: '/support', label: 'Support' },
    ];

    // Add reseller links if user is a reseller
    const resellerNavItems = appUser?.isReseller ? [
      { href: '/reseller', label: 'Reseller Products' },
      { href: '/reseller/myorders', label: 'Reseller Orders' },
    ] : [];

    const loggedOutNavItems = [
      ...baseNavItems,
      { href: '/support', label: 'Support' },
    ];

    if (!isClient) {
      // On the server, or before client has mounted, return the logged out state
      return loggedOutNavItems;
    }

    return isLoggedIn ? [...loggedInNavItems, ...resellerNavItems] : loggedOutNavItems;
  }, [isLoggedIn, isClient, appUser?.isReseller]);


  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Image src="https://i.imgur.com/bJH9BH5.png" alt="IHN TOPUP Logo" width={48} height={48} />
            </Link>
          </div>

          <nav className="hidden md:flex flex-1 items-center justify-center gap-4">
            {navItems.map(item => (
              <Link
                href={item.href}
                key={item.href}
                className={cn(
                  'text-sm font-bold text-muted-foreground transition-colors hover:text-primary',
                  (pathname.startsWith(item.href) && item.href !== '/') || pathname === item.href ? 'text-primary' : ''
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
                {appUser?.isReseller && appUser?.resellerId && (
                  <div className="hidden lg:flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full">
                    <span className="text-xs font-semibold text-primary">Reseller ID: {appUser.resellerId}</span>
                  </div>
                )}
                <Link href="/wallet" className="flex items-center justify-center h-9 px-3 bg-white hover:bg-gray-50 rounded-full shadow-md transition-colors gap-2">
                  <WalletIcon className="h-5 w-5 text-green-500" />
                  <span className='font-bold text-xs sm:text-sm text-gray-800'>{formatCurrency(appUser?.walletBalance ?? 0)}</span>
                </Link>
                <div className="flex items-center justify-center h-9 px-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full shadow-md gap-2">
                  <Image src="/coin-icon.png" alt="Coin" width={16} height={16} className="w-4 h-4" />
                  <span className='font-bold text-xs sm:text-sm text-white'>{(appUser?.coinFund ?? 0).toFixed(0)}</span>
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
