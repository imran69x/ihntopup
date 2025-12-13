
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, WalletCards, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface AddMoneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isResellerBalance?: boolean; // Flag to indicate if adding to reseller balance
}

export default function AddMoneyDialog({ open, onOpenChange, isResellerBalance = false }: AddMoneyDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState<number | ''>('');

  const handleProceedToPayment = () => {
    if (!amount || amount < 10) {
      toast({
        variant: 'destructive',
        title: 'অবৈধ পরিমাণ',
        description: 'ন্যূনতম ১০ টাকা যোগ করতে হবে।'
      });
      return;
    }

    setIsSubmitting(true);

    const sessionId = crypto.randomUUID();
    sessionStorage.setItem('paymentSessionId', sessionId);

    const params = new URLSearchParams({
      type: isResellerBalance ? 'resellerBalanceTopUp' : 'walletTopUp',
      amount: amount.toString(),
      sessionId: sessionId,
    });

    setTimeout(() => {
      router.push(`/payment?${params.toString()}`);
      setIsSubmitting(false);
      onOpenChange(false);
      setAmount('');
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-3 rounded-lg">
              <WalletCards className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {isResellerBalance ? 'রিসেলার ব্যালেন্সে টাকা যোগ করুন' : 'ওয়ালেটে টাকা যোগ করুন'}
              </DialogTitle>
              <DialogDescription>
                {isResellerBalance
                  ? 'ম্যানুয়ালি পেমেন্ট করে আপনার রিসেলার ব্যালেন্স রিচার্জ করুন।'
                  : 'ম্যানুয়ালি পেমেন্ট করে আপনার ওয়ালেট রিচার্জ করুন।'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="p-6 pt-0">
          <div className="space-y-2">
            <Label htmlFor="amount">পরিমাণ (৳)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="কত টাকা যোগ করতে চান?"
              className="h-12 text-lg font-bold"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[50, 100, 500].map(val => (
              <Button key={val} variant="outline" onClick={() => setAmount(val)}>৳{val}</Button>
            ))}
          </div>

          <Button onClick={handleProceedToPayment} disabled={isSubmitting} className="w-full mt-6 h-12 text-base">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <>
                পেমেন্ট পেজে যান
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
