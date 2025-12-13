'use client';

import * as React from 'react';
import {
  File,
  Search,
  Loader2,
  ArrowRight,
  User as UserIcon,
  MoreHorizontal,
  DollarSign,
  Calendar,
  Hash,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { BalanceTransfer, User } from '@/lib/data';
import { collection, query, orderBy } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-2">
        <Icon className="h-4 w-4 text-muted-foreground mt-1" />
        <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="font-semibold">{value}</div>
        </div>
    </div>
);


export default function BalanceTransfersPage() {
  const firestore = useFirestore();
  const transfersQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'balance_transfers'), orderBy('transferDate', 'desc')) : null, 
    [firestore]
  );
  const usersQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'users')) : null, 
    [firestore]
  );

  const { data: transfers, isLoading: isLoadingTransfers } = useCollection<BalanceTransfer>(transfersQuery);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedTransfer, setSelectedTransfer] = React.useState<BalanceTransfer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const userMap = React.useMemo(() => {
    if (!users) return new Map<string, User>();
    return new Map(users.map(u => [u.id, u]));
  }, [users]);


  const filteredTransfers = React.useMemo(() => {
    if (!transfers) return [];
    
    if (!searchTerm) {
      return transfers;
    }

    const lowercasedSearchTerm = searchTerm.toLowerCase();
    
    return transfers.filter(tx => {
      const sender = userMap.get(tx.senderId);
      const recipient = userMap.get(tx.recipientId);
      
      const senderName = sender?.name.toLowerCase() || '';
      const senderEmail = sender?.email.toLowerCase() || '';
      const recipientName = recipient?.name.toLowerCase() || '';
      const recipientEmail = recipient?.email.toLowerCase() || '';
      
      return (
        senderName.includes(lowercasedSearchTerm) ||
        senderEmail.includes(lowercasedSearchTerm) ||
        recipientName.includes(lowercasedSearchTerm) ||
        recipientEmail.includes(lowercasedSearchTerm) ||
        tx.senderId.toLowerCase().includes(lowercasedSearchTerm) ||
        tx.recipientId.toLowerCase().includes(lowercasedSearchTerm) ||
        (tx.senderUniqueId && tx.senderUniqueId.toLowerCase().includes(lowercasedSearchTerm)) ||
        (tx.recipientUniqueId && tx.recipientUniqueId.toLowerCase().includes(lowercasedSearchTerm))
      );
    });
  }, [transfers, searchTerm, userMap]);

  const isLoading = isLoadingTransfers || isLoadingUsers;

  const handleViewDetails = (transfer: BalanceTransfer) => {
    setSelectedTransfer(transfer);
    setIsDialogOpen(true);
  };

  const UserCell = ({ userId }: { userId: string }) => {
    const user = userMap.get(userId);
    return (
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
            <AvatarImage src={user?.photoURL || ''} alt={user?.name}/>
            <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{user?.name || 'Unknown User'}</div>
          <div className="text-xs text-muted-foreground">{user?.email}</div>
        </div>
      </div>
    );
  };
  
  const UserCard = ({ userId, title }: { userId: string, title: string }) => {
    const user = userMap.get(userId);
    return (
        <div>
            <h3 className="font-semibold mb-2">{title}</h3>
                <Card>
                <CardContent className="p-4">
                     <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                             <AvatarImage src={user?.photoURL || ''} alt={user?.name}/>
                            <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-medium">{user?.name || 'Unknown User'}</div>
                            <div className="text-xs text-muted-foreground font-mono">{user?.uniqueId}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
  }


  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }

  return (
    <>
        <div className="flex items-center mb-4">
          <h1 className="text-2xl font-bold">Balance Transfers</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1">
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Export
              </span>
            </Button>
          </div>
        </div>
        <Card>
            <CardHeader>
              <CardTitle>All Transfers</CardTitle>
              <CardDescription>
                A log of all balance transfers between users.
              </CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by name, email, or ID..." 
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sender</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>
                        <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.map((tx) => (
                    <TableRow key={tx.id}>
                        <TableCell>
                           <UserCell userId={tx.senderId} />
                        </TableCell>
                        <TableCell className="text-right">
                            <div className='font-semibold text-red-600'>-৳{tx.amountSent.toFixed(2)}</div>
                            <div className='text-xs text-muted-foreground'>{new Date(tx.transferDate).toLocaleDateString()}</div>
                        </TableCell>
                        <TableCell className="text-right">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button
                                    aria-haspopup="true"
                                    size="icon"
                                    variant="ghost"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => handleViewDetails(tx)}>View Details</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                  ))}
                   {filteredTransfers.length === 0 && !isLoading && (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            No transfers found.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Transfer Details</DialogTitle>
                    <DialogDescription>
                       A detailed summary of the balance transfer.
                    </DialogDescription>
                </DialogHeader>
                {selectedTransfer && (
                    <div className="space-y-4 py-4">
                        <UserCard userId={selectedTransfer.senderId} title="Sender" />
                        
                        <div className="flex justify-center">
                            <ArrowRight className="h-6 w-6 text-muted-foreground" />
                        </div>
                         
                        <UserCard userId={selectedTransfer.recipientId} title="Recipient" />
                       
                        <Separator className="my-4" />
                        <div className="space-y-2">
                             <DetailRow icon={DollarSign} label="Amount Sent" value={`-৳${selectedTransfer.amountSent.toFixed(2)}`} />
                             <DetailRow icon={DollarSign} label="Transaction Fee" value={`৳${selectedTransfer.fee.toFixed(2)}`} />
                             <DetailRow icon={DollarSign} label="Amount Received" value={`+৳${selectedTransfer.amountReceived.toFixed(2)}`} />
                             <DetailRow icon={Calendar} label="Transfer Date" value={new Date(selectedTransfer.transferDate).toLocaleString()} />
                             <DetailRow icon={Hash} label="Transaction ID" value={<span className='font-mono'>{selectedTransfer.id}</span>} />
                        </div>
                    </div>
                )}
              </DialogContent>
          </Dialog>

    </>
  );
}
