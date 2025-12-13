'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthContext } from "@/contexts/AuthContext";
import { LogOut, ShoppingBag, User, Wallet, Headset, X, Store } from "lucide-react";
import Link from 'next/link';

interface ProfileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NavItem = ({ href, icon: Icon, label, onClick }: { href: string; icon: React.ElementType, label: string, onClick: () => void }) => (
  <Link href={href} onClick={onClick} className="flex items-center gap-4 p-3 rounded-lg text-foreground hover:bg-muted transition-colors">
    <Icon className="h-6 w-6 text-muted-foreground" />
    <span className="font-semibold">{label}</span>
  </Link>
);


export default function ProfileSidebar({ open, onOpenChange }: ProfileSidebarProps) {
  const { appUser, logout } = useAuthContext();

  const handleLogout = () => {
    onOpenChange(false);
    logout();
  }

  const handleLinkClick = () => {
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-sm p-0 flex flex-col z-50">
        <SheetHeader className="p-4 flex flex-row justify-between items-center border-b">
          <SheetTitle className="text-lg font-semibold">My Account</SheetTitle>
        </SheetHeader>

        <div className="p-6 flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {appUser?.photoURL && <AvatarImage src={appUser.photoURL} alt={appUser.name || 'User'} />}
            <AvatarFallback className="text-2xl">{appUser?.name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="overflow-hidden">
            <h3 className="font-bold text-lg truncate">{appUser?.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{appUser?.email}</p>
          </div>
        </div>

        <Separator />

        <nav className="flex-grow p-4 space-y-2">
          <NavItem href="/profile" icon={User} label="Profile" onClick={handleLinkClick} />
          <NavItem href="/wallet" icon={Wallet} label="Wallet" onClick={handleLinkClick} />
          <NavItem href="/orders" icon={ShoppingBag} label="My Orders" onClick={handleLinkClick} />
          {!appUser?.isReseller && (
            <NavItem href="/apply-reseller" icon={Store} label="রিসেলার হন" onClick={handleLinkClick} />
          )}
          {appUser?.isReseller && (
            <NavItem href="/reseller" icon={ShoppingBag} label="Reseller Panel" onClick={handleLinkClick} />
          )}
          <NavItem href="/support" icon={Headset} label="Support" onClick={handleLinkClick} />
        </nav>

        <div className="p-4 mt-auto border-t">
          <Button variant="destructive" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-5 w-5" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
