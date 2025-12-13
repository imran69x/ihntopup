'use client';

import * as React from 'react';
import {
  File,
  ListFilter,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
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
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { WalletTransaction } from '@/lib/data';
import { collection, query, orderBy, getDocs, collectionGroup } from 'firebase/firestore';

const getStatusBadgeVariant = (status: WalletTransaction['status']) => {
  switch (status) {
    case 'Completed':
      return 'bg-green-100 text-green-800';
    case 'Pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'Failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const TypeIndicator = ({type}: {type: WalletTransaction['type']}) => {
    if (type === 'credit') {
        return <ArrowUpCircle className="h-5 w-5 text-green-500" />;
    }
    return <ArrowDownCircle className="h-5 w-5 text-red-500" />;
}

export default function WalletTransactionsPage() {
  const firestore = useFirestore();
  const transactionsQuery = useMemoFirebase(() => 
    firestore ? query(collectionGroup(firestore, 'transactions'), orderBy('transactionDate', 'desc')) : null, 
    [firestore]
  );
  const { data: transactions, isLoading } = useCollection<WalletTransaction>(transactionsQuery);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }

  return (
    <>
        <div className="flex items-center mb-4">
          <h1 className="text-2xl font-bold">Wallet Transactions</h1>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Filter
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked>Credit</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Debit</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              <CardTitle>All Transactions</CardTitle>
              <CardDescription>
                A log of all wallet deposits and withdrawals.
              </CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by user or description..." className="pl-8 w-full" />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[40px]'>
                        <span className="sr-only">Type</span>
                    </TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell><TypeIndicator type={tx.type} /></TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeVariant(tx.status)} variant="outline">
                          {tx.status}
                        </Badge>
                      </TableCell>
                       <TableCell>{new Date(tx.transactionDate).toLocaleDateString()}</TableCell>
                       <TableCell className={cn(
                           "text-right font-semibold",
                           tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                           )}>
                           {tx.type === 'credit' ? '+' : '-'}৳{tx.amount.toFixed(2)}
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
    </>
  );
}
