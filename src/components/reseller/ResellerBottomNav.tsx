'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { HomeIcon, OrderIcon } from '@/components/icons'; // Check if OrderIcon exists
import { Globe } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ResellerBottomNav() {
    const pathname = usePathname();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) return null;

    const navItems = [
        { href: '/', label: 'Home', icon: Globe },
        { href: '/reseller', label: 'Reseller Home', icon: HomeIcon },
        { href: '/reseller/myorders', label: 'My Orders', icon: OrderIcon },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm md:hidden">
            <div className="container mx-auto grid h-20 grid-cols-3 items-center justify-items-center gap-1 px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && item.href !== '/reseller') || (item.href === '/reseller' && pathname === '/reseller');
                    // Simple matching:
                    // If item.href is '/', exact match only (back to website) - but wait, / is main site.
                    // If we are on /reseller, active logic applies differently.

                    const isItemActive = item.href === '/' ? false : pathname === item.href;

                    return (
                        <Link
                            href={item.href}
                            key={item.href}
                            className={cn(
                                'relative flex flex-col items-center justify-center gap-1 rounded-lg p-2 text-muted-foreground transition-colors hover:text-primary w-full',
                                isItemActive && 'text-primary'
                            )}
                        >
                            <item.icon className={cn("h-7 w-7", isItemActive ? "text-primary" : "text-gray-500")} />
                            <span className={cn("text-xs font-medium", isItemActive ? "text-primary" : "text-gray-500")}>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
