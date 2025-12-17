'use client';

import * as React from 'react';
import {
  MoreHorizontal,
  File,
  ListFilter,
  Search,
  Loader2,
  Eye,
  Edit
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { User as UserData } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';


const DetailRow = ({ label, value, isMono = false }: { label: string, value: React.ReactNode, isMono?: boolean }) => (
  <div className="flex justify-between items-center py-2 px-3 rounded-md bg-muted/50">
    <p className="text-sm text-muted-foreground">{label}</p>
    <div className={`text-sm font-semibold ${isMono ? 'font-mono' : ''}`}>{value}</div>
  </div>
);


export default function UsersPage() {
  const [selectedUser, setSelectedUser] = React.useState<UserData | null>(null); // For editing
  const [viewingUser, setViewingUser] = React.useState<UserData | null>(null); // For viewing details
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  // State for the edit form
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [walletBalance, setWalletBalance] = React.useState<number | string>('');
  const [resellerBalance, setResellerBalance] = React.useState<number | string>(''); // Add reseller balance
  const [coinFund, setCoinFund] = React.useState<number | string>('');
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [telegramUserId, setTelegramUserId] = React.useState(''); // Add Telegram User ID
  const [isBanned, setIsBanned] = React.useState(false);
  const [isReseller, setIsReseller] = React.useState(false);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  const firestore = useFirestore();
  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const { data: users, isLoading } = useCollection<UserData>(usersQuery);
  const { toast } = useToast();

  // Opens the view details dialog
  const handleViewDetails = (user: UserData) => {
    setViewingUser(user);
    setIsDetailsOpen(true);
  };

  // Opens the edit dialog, pre-filling the form
  const handleEdit = (user: UserData) => {
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setWalletBalance(user.walletBalance ?? 0);
    setResellerBalance(user.resellerBalance ?? 0); // Load reseller balance
    setCoinFund(user.coinFund ?? 0);
    setIsAdmin(user.isAdmin ?? false);
    setTelegramUserId(user.telegramUserId ?? ''); // Load Telegram User ID
    setIsBanned(user.isBanned ?? false);
    setIsReseller(user.isReseller ?? false);
    setIsEditOpen(true);
    // Close the details dialog if it's open
    setIsDetailsOpen(false);
  };

  const handleSaveChanges = () => {
    if (!selectedUser || !firestore) return;
    const userRef = doc(firestore, 'users', selectedUser.id);

    const balanceAsNumber = Number(walletBalance);
    if (isNaN(balanceAsNumber)) {
      toast({ variant: 'destructive', title: "অবৈধ ব্যালেন্স", description: "ওয়ালেট ব্যালেন্স অবশ্যই একটি সংখ্যা হতে হবে।" });
      return;
    }

    const coinFundAsNumber = Number(coinFund);
    if (isNaN(coinFundAsNumber)) {
      toast({ variant: 'destructive', title: "অবৈধ কয়েন ফান্ড", description: "কয়েন ফান্ড অবশ্যই একটি সংখ্যা হতে হবে।" });
      return;
    }

    const resellerBalanceAsNumber = Number(resellerBalance);
    if (isNaN(resellerBalanceAsNumber)) {
      toast({ variant: 'destructive', title: "অবৈধ রিসেলার ব্যালেন্স", description: "রিসেলার ব্যালেন্স অবশ্যই একটি সংখ্যা হতে হবে।" });
      return;
    }

    updateDocumentNonBlocking(userRef, {
      name,
      email,
      walletBalance: balanceAsNumber,
      resellerBalance: resellerBalanceAsNumber, // Save reseller balance
      coinFund: coinFundAsNumber,
      isAdmin,
      telegramUserId: telegramUserId.trim() || null, // Save Telegram User ID (null if empty)
      isBanned,
      isReseller
    });
    toast({ title: "ব্যবহারকারী আপডেট করা হয়েছে", description: `${name}-এর প্রোফাইল আপডেট করা হয়েছে।` });
    setIsEditOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = () => {
    // In a real app, you'd probably soft delete or have a confirmation
    if (!userToDelete) return;
    console.log("Deleting user", userToDelete);
    toast({ variant: 'destructive', title: "ব্যবহারকারী মুছে ফেলা হয়েছে", description: `ব্যবহারকারী আইডি ${userToDelete} মুছে ফেলা হয়েছে।` });
    setUserToDelete(null);
    setIsDeleteAlertOpen(false);
  }

  const filteredUsers = React.useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users;
    return users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <>
      <Tabs defaultValue="all">
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">সব</TabsTrigger>
            <TabsTrigger value="verified">ভেরিফাইড</TabsTrigger>
            <TabsTrigger value="unverified">আনভেরিফাইড</TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    ফিল্টার
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>ফিল্টার করুন</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked>
                  ভেরিফাইড
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>আনভেরিফাইড</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" className="h-8 gap-1">
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                এক্সপোর্ট
              </span>
            </Button>
          </div>
        </div>
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>ব্যবহারকারীগণ</CardTitle>
              <CardDescription>
                আপনার ব্যবহারকারীদের ম্যানেজ করুন এবং তাদের বিস্তারিত দেখুন।
              </CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="নাম বা ইমেইল দিয়ে খুঁজুন..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ব্যবহারকারী</TableHead>
                    <TableHead className="hidden md:table-cell">
                      ওয়ালেট
                    </TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead>
                      <span className="sr-only">একশন</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.photoURL || ''} alt={user.name} />
                            <AvatarFallback>
                              {user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        ৳{user.walletBalance?.toFixed(2) ?? '0.00'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={user.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                        >
                          {user.isVerified ? 'ভেরিফাইড' : 'আনভেরিফাইড'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">মেনু</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>একশন</DropdownMenuLabel>
                            <DropdownMenuItem
                              onSelect={() => handleViewDetails(user)}
                            >
                              <Eye className='mr-2 h-4 w-4' />
                              বিস্তারিত দেখুন
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => handleEdit(user)}
                            >
                              <Edit className='mr-2 h-4 w-4' />
                              এডিট
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteClick(user.id)} className="text-red-500 focus:text-red-500 focus:bg-red-50">মুছে ফেলুন</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className='flex items-center gap-3 mb-4'>
              <Avatar className="h-14 w-14 border-2 border-primary">
                <AvatarImage src={viewingUser?.photoURL || ''} alt={viewingUser?.name} />
                <AvatarFallback className="text-xl">
                  {viewingUser?.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>{viewingUser?.name}</DialogTitle>
                <DialogDescription>{viewingUser?.email}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <Separator />
          <div className="grid gap-2 py-4">
            <DetailRow label="Wallet Balance" value={`৳${viewingUser?.walletBalance?.toFixed(2) ?? '0.00'}`} />
            <DetailRow label="Coin Fund" value={`৳${viewingUser?.coinFund?.toFixed(2) ?? '0.00'}`} />
            <DetailRow label="Unique ID" value={viewingUser?.uniqueId} isMono={true} />
            <DetailRow label="User ID" value={viewingUser?.id} isMono={true} />
            <DetailRow label="Status" value={<Badge variant={viewingUser?.isVerified ? "default" : "destructive"}>{viewingUser?.isVerified ? "Verified" : "Unverified"}</Badge>} />
            <DetailRow label="Admin" value={<Badge variant={viewingUser?.isAdmin ? "default" : "secondary"}>{viewingUser?.isAdmin ? "Yes" : "No"}</Badge>} />
            {viewingUser?.isAdmin && viewingUser?.telegramUserId && (
              <DetailRow label="Telegram User ID" value={viewingUser.telegramUserId} isMono={true} />
            )}
            <DetailRow label="Banned" value={<Badge variant={viewingUser?.isBanned ? "destructive" : "secondary"}>{viewingUser?.isBanned ? "Yes" : "No"}</Badge>} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>বন্ধ করুন</Button>
            <Button type="button" onClick={() => viewingUser && handleEdit(viewingUser)}>এডিট করুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ব্যবহারকারী এডিট করুন</DialogTitle>
            <DialogDescription>
              {selectedUser?.name}-এর প্রোফাইলে পরিবর্তন করুন।
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                নাম
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                ইমেইল
              </Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="walletBalance" className="text-right">
                ওয়ালেট (৳)
              </Label>
              <Input
                id="walletBalance"
                type="number"
                value={walletBalance}
                onChange={(e) => setWalletBalance(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="resellerBalance" className="text-right">
                রিসেলার ফান্ড (৳)
              </Label>
              <Input
                id="resellerBalance"
                type="number"
                value={resellerBalance}
                onChange={(e) => setResellerBalance(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="coinFund" className="text-right">
                কয়েন ফান্ড (৳)
              </Label>
              <Input
                id="coinFund"
                type="number"
                value={coinFund}
                onChange={(e) => setCoinFund(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isAdmin" className="text-right">
                Admin Role
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="isAdmin"
                  checked={isAdmin}
                  onCheckedChange={setIsAdmin}
                />
                <Label htmlFor="isAdmin" className="cursor-pointer">
                  {isAdmin ? "Yes" : "No"}
                </Label>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isBanned" className="text-right">
                Ban User
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="isBanned"
                  checked={isBanned}
                  onCheckedChange={setIsBanned}
                />
                <Label htmlFor="isBanned" className="cursor-pointer">
                  {isBanned ? "Banned" : "Active"}
                </Label>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isReseller" className="text-right">
                Reseller Role
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="isReseller"
                  checked={isReseller}
                  onCheckedChange={setIsReseller}
                />
                <Label htmlFor="isReseller" className="cursor-pointer">
                  {isReseller ? "Yes" : "No"}
                </Label>
              </div>
            </div>
            {isAdmin && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="telegramUserId" className="text-right">
                  Telegram User ID
                </Label>
                <Input
                  id="telegramUserId"
                  value={telegramUserId}
                  onChange={(e) => setTelegramUserId(e.target.value)}
                  className="col-span-3"
                  placeholder="Enter Telegram user ID for order management"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>বাতিল</Button>
            <Button type="submit" onClick={handleSaveChanges}>পরিবর্তন সংরক্ষণ করুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteAlertOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
