'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  CreditCard,
  Gift,
  PanelLeft,
  ChevronDown,
  Dot,
  ImageIcon,
  Newspaper,
  Headset,
  ArrowLeftRight,
  Settings,
  Wallet,
  Bell,
  Home,
  BarChart,
  Gamepad2,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import Image from 'next/image';
import { useFirestore, setDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';


const OrderNotificationHandler = () => {
  const firestore = useFirestore();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error("Service Worker registration failed:", err);
      });
    }
  }, []);

  useEffect(() => {
    if (!firestore) return;

    // Listen for orders added in the last 2 minutes to avoid replaying sounds for old orders on page load
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const ordersQuery = query(
      collection(firestore, 'orders'),
      where('orderDate', '>=', twoMinutesAgo.toISOString())
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const newOrder = change.doc.data();
          console.log("New order detected:", newOrder);

          // Show notification
          if (Notification.permission === 'granted' && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(registration => {
              registration.showNotification('🛍️ New Order Received!', {
                body: `Product: ${newOrder.productName} for ৳${newOrder.totalAmount}`,
                icon: '/logo.png',
                badge: '/logo.png'
              });
            });
          }
        }
      });
    });

    return () => unsubscribe();
  }, [firestore]);


  // This component does not render anything.
  return null;
};


const NotificationSetup = () => {
  const [permission, setPermission] = useState('default');
  const { toast } = useToast();
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
      // Check for iOS
      const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIos(isIosDevice);

      // Check if running in standalone mode (PWA)
      if ('standalone' in window.navigator) {
        setIsStandalone((window.navigator as any).standalone);
      }
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({ variant: 'destructive', title: 'This browser does not support desktop notification' });
      return;
    }

    const currentPermission = await Notification.requestPermission();
    setPermission(currentPermission);

    if (currentPermission === 'granted') {
      toast({ title: 'Notifications Enabled!' });
      if (navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification('Great!', { body: 'You will now receive new order alerts.' });
        });
      }
    } else {
      toast({ variant: 'destructive', title: 'Notifications Denied', description: 'You will not receive alerts. You can change this in your browser settings.' });
    }
  };

  // Show instruction message only on iOS if it's NOT in standalone mode
  if (isIos && !isStandalone && permission !== 'granted') {
    return <p className="text-sm text-blue-600 flex items-center gap-2 p-2 bg-blue-100 rounded-md">To get notifications on iOS, please add this app to your Home Screen first.</p>
  }

  if (permission === 'granted') {
    return <p className="text-sm text-green-600 flex items-center gap-2"><Bell className="h-4 w-4" /> Order alerts are active.</p>;
  }

  return (
    <Button onClick={requestNotificationPermission} size="sm" variant="outline" className='gap-2'>
      <Bell className="h-4 w-4" />
      Enable Order Notifications
    </Button>
  )
}


const NavItem = ({ href, icon: Icon, children, pathname, onClick }: { href: string, icon: React.ElementType, children: React.ReactNode, pathname: string, onClick?: () => void }) => {
  const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
        isActive && "bg-muted text-primary"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
};

const CollapsibleNavItem = ({ icon: Icon, title, children, pathname, defaultOpen = false }: { icon: React.ElementType, title: string, children: React.ReactNode, pathname: string, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isActive = React.Children.toArray(children).some(child => {
    if (React.isValidElement(child) && typeof child.props.href === 'string') {
      const href = child.props.href;
      // This logic helps determine if the parent should be active.
      // It handles exact matches and prefix matches for nested routes.
      if (pathname === href) return true;
      if (pathname.startsWith(href) && href.split('?')[0] !== '/admin/orders') return true;
      if (href.includes('?') && pathname === href.split('?')[0]) return true;
      // Special case for orders to avoid matching all sub-routes incorrectly
      if (href === '/admin/orders' && pathname.startsWith('/admin/orders') && !pathname.includes('?')) return true;

    }
    return false;
  });

  useEffect(() => {
    const childIsActive = React.Children.toArray(children).some(child => {
      if (React.isValidElement(child) && typeof child.props.href === 'string') {
        const baseHref = child.props.href.split('?')[0];
        const currentBasePath = pathname.split('?')[0];
        return currentBasePath === baseHref;
      }
      return false;
    });
    if (childIsActive) {
      setIsOpen(true);
    }
  }, [pathname, children]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className={cn("flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary", isActive && "text-primary")}>
          <div className="flex items-center gap-3">
            <Icon className="h-4 w-4" />
            <span>{title}</span>
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-7 space-y-1 mt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const SubNavItem = ({ href, children, pathname, onClick }: { href: string, children: React.ReactNode, pathname: string, onClick?: () => void }) => {
  const currentPath = usePathname();
  const searchParams = new URLSearchParams(window.location.search);
  const currentUrl = `${currentPath}?${searchParams.toString()}`;

  const isActive = currentUrl === href || (currentPath === href.split('?')[0] && !searchParams.has('type') && !href.includes('?'));

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-primary",
        isActive ? "text-primary bg-muted" : ""
      )}
    >
      <Dot className="h-4 w-4 flex-shrink-0" />
      <span>{children}</span>
    </Link>
  );
};


function SidebarNav({ isMobile = false, onLinkClick }: { isMobile?: boolean, onLinkClick?: () => void }) {
  const pathname = usePathname();

  const handleLinkClick = () => {
    if (isMobile && onLinkClick) {
      onLinkClick();
    }
  };

  return (
    <nav className="grid items-start gap-2 text-sm font-medium">
      <NavItem href="/admin" icon={LayoutDashboard} pathname={pathname} onClick={handleLinkClick}>Dashboard</NavItem>

      <CollapsibleNavItem icon={ShoppingBag} title="Orders" pathname={pathname} defaultOpen={pathname.startsWith('/admin/orders')}>
        <SubNavItem href="/admin/orders" pathname={pathname} onClick={handleLinkClick}>All Orders</SubNavItem>
        <SubNavItem href="/admin/orders?type=Game" pathname={pathname} onClick={handleLinkClick}>Game Orders</SubNavItem>
        <SubNavItem href="/admin/orders?type=eFootball" pathname={pathname} onClick={handleLinkClick}>eFootball Orders</SubNavItem>
        <SubNavItem href="/admin/orders?type=Others" pathname={pathname} onClick={handleLinkClick}>Others Orders</SubNavItem>
      </CollapsibleNavItem>

      <NavItem href="/admin/users" icon={Users} pathname={pathname} onClick={handleLinkClick}>Users</NavItem>

      <CollapsibleNavItem icon={BarChart} title="Reports" pathname={pathname} defaultOpen={pathname.startsWith('/admin/reports')}>
        <SubNavItem href="/admin/reports/monthly" pathname={pathname} onClick={handleLinkClick}>Monthly Reports</SubNavItem>
      </CollapsibleNavItem>

      <CollapsibleNavItem icon={CreditCard} title="Top-Up" pathname={pathname} defaultOpen={pathname.startsWith('/admin/topup')}>
        <SubNavItem href="/admin/topup/categories" pathname={pathname} onClick={handleLinkClick}>Categories</SubNavItem>
        <SubNavItem href="/admin/topup/cards" pathname={pathname} onClick={handleLinkClick}>Cards</SubNavItem>
      </CollapsibleNavItem>

      <NavItem href="/admin/reseller-cards" icon={Package} pathname={pathname} onClick={handleLinkClick}>Reseller Cards</NavItem>
      <NavItem href="/admin/reseller-requests" icon={Users} pathname={pathname} onClick={handleLinkClick}>Reseller Requests</NavItem>

      <CollapsibleNavItem icon={ArrowLeftRight} title="Transactions" pathname={pathname} defaultOpen={pathname.startsWith('/admin/transactions')}>
        <SubNavItem href="/admin/transactions/orders" pathname={pathname} onClick={handleLinkClick}>Order Transactions</SubNavItem>
        <SubNavItem href="/admin/transactions/wallet" pathname={pathname} onClick={handleLinkClick}>Wallet Transactions</SubNavItem>
        <SubNavItem href="/admin/transactions/wallet-requests" pathname={pathname} onClick={handleLinkClick}>Wallet Requests</SubNavItem>
        <SubNavItem href="/admin/transactions/balance-transfers" pathname={pathname} onClick={handleLinkClick}>Balance Transfers</SubNavItem>
      </CollapsibleNavItem>

      <NavItem href="/admin/payment-methods" icon={Settings} pathname={pathname} onClick={handleLinkClick}>Payment Methods</NavItem>

      <NavItem href="/admin/banners" icon={ImageIcon} pathname={pathname} onClick={handleLinkClick}>Banners</NavItem>
      <NavItem href="/admin/notices" icon={Newspaper} pathname={pathname} onClick={handleLinkClick}>Notices</NavItem>
    </nav>
  );
}


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const { appUser, loading, logout } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!appUser || !appUser.isAdmin)) {
      router.push('/');
    }
  }, [appUser, loading, router]);


  if (loading || !appUser || !appUser.isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <OrderNotificationHandler />
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
              <Image src="https://i.imgur.com/bJH9BH5.png" alt="IHN TOPUP Logo" width={40} height={40} />
              <span className='font-logo text-2xl font-bold'>IHN</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <SidebarNav />
          </div>
          <div className="mt-auto p-4 border-t">
            <Link href="/">
              <Button variant="ghost" className="w-full justify-start">
                <Home className="mr-2 h-4 w-4" />
                Back to Website
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Link href="/admin" className="flex items-center gap-2 font-semibold" onClick={() => setIsMobileSheetOpen(false)}>
                  <Image src="https://i.imgur.com/bJH9BH5.png" alt="IHN TOPUP Logo" width={40} height={40} />
                  <span className='font-logo text-2xl font-bold'>IHN</span>
                </Link>
              </SheetHeader>
              <div className="overflow-auto p-4">
                <SidebarNav isMobile={true} onLinkClick={() => setIsMobileSheetOpen(false)} />
              </div>
              <div className="mt-auto p-4 border-t">
                <Link href="/">
                  <Button variant="ghost" className="w-full justify-start">
                    <Home className="mr-2 h-4 w-4" />
                    Back to Website
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          <div className="w-full flex-1" >
            <NotificationSetup />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={appUser?.photoURL || ''} alt="@shadcn" />
                  <AvatarFallback>{appUser?.name?.charAt(0) || 'A'}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-gray-50/50">
          {children}
        </main>
      </div>
    </div>
  );
}
