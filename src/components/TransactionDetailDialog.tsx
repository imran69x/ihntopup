'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { WalletTopUpRequest } from "@/lib/data";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowLeftRight, Calendar, CheckCircle, Clock, CreditCard, DollarSign, Hash, Info, Tag, User, XCircle } from "lucide-react";
import { Badge } from "./ui/badge";

interface TransactionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: WalletTopUpRequest | null;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'BDT',
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('BDT', '৳');
};

const DetailRow = ({ icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => {
  const Icon = icon;
  return (
    <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg border">
      <Icon className="h-5 w-5 text-green-500 mt-1" />
      <div className="flex-grow">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="font-semibold text-foreground break-all">{value}</div>
      </div>
    </div>
  );
};


const getStatusInfo = (status: WalletTopUpRequest['status']) => {
  switch (status) {
    case 'Approved':
      return { icon: CheckCircle, className: 'text-green-600', badgeClass: 'bg-green-100 text-green-800' };
    case 'Pending':
      return { icon: Clock, className: 'text-yellow-600', badgeClass: 'bg-yellow-100 text-yellow-800' };
    case 'Rejected':
      return { icon: XCircle, className: 'text-red-600', badgeClass: 'bg-red-100 text-red-800' };
    default:
      return { icon: Clock, className: 'text-muted-foreground', badgeClass: 'bg-muted' };
  }
};

export default function TransactionDetailDialog({ open, onOpenChange, transaction }: TransactionDetailDialogProps) {
  // Prevent error if transaction is null
  if (!transaction) return null;

  const statusInfo = getStatusInfo(transaction.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl bg-card border-4 border-green-500 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">Request Details</DialogTitle>
          <DialogDescription className="text-center font-mono text-xs">{transaction.id}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl my-4 border border-green-200">
          <p className={cn("text-4xl font-extrabold tracking-tight text-primary")}>
            {formatCurrency(transaction.amount)}
          </p>
          <p className="text-sm font-medium capitalize text-muted-foreground">Top-up request via {transaction.method}</p>
        </div>

        <Separator />

        <div className="grid gap-3 py-4 text-sm max-h-[50vh] overflow-y-auto pr-2">
          <DetailRow icon={statusInfo.icon} label="Status" value={
            <Badge className={cn('text-xs', statusInfo.badgeClass)}>{transaction.status}</Badge>
          } />
          <DetailRow icon={Calendar} label="Date" value={new Date(transaction.requestDate).toLocaleString()} />
          <DetailRow icon={CreditCard} label="Payment Method" value={transaction.method} />
          <DetailRow icon={User} label="Sender Phone" value={<span className="font-mono">{transaction.senderPhone}</span>} />
          {transaction.transactionId && <DetailRow icon={Hash} label="Transaction ID" value={<span className="font-mono">{transaction.transactionId}</span>} />}
          {transaction.status === 'Rejected' && transaction.rejectionReason && (
            <div className="flex items-start gap-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
              <div className="flex-grow">
                <p className="text-sm text-red-700">Rejection Reason</p>
                <p className="font-semibold text-red-900">{transaction.rejectionReason}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

