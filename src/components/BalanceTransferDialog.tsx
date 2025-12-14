
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2, Send, Wallet, Users, ArrowRight } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from './ui/alert';
import { useFirestore } from '@/firebase';
import { runTransaction, doc, collection, addDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { Separator } from './ui/separator';
import { ProcessingLoader } from './ui/processing-loader';
import SuccessPopup from './ui/success-popup';


interface BalanceTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BalanceTransferDialog({
  open,
  onOpenChange,
}: BalanceTransferDialogProps) {
  const { toast } = useToast();
  const { firebaseUser, appUser } = useAuthContext();
  const firestore = useFirestore();
  const [recipientUniqueId, setRecipientUniqueId] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transferredAmount, setTransferredAmount] = useState(0);


  const transferAmount = Number(amount) || 0;

  const fee = 0;
  // Previously calculated fees:
  // if (transferAmount <= 50) fee = transferAmount * 0.02;
  // else if (transferAmount <= 100) fee = transferAmount * 0.01;
  // else fee = transferAmount * 0.005;

  const amountToReceive = transferAmount - fee;
  const totalDeducted = transferAmount;


  const handleTransfer = async () => {
    if (!firebaseUser || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to transfer balance.' });
      return;
    }

    // BAN CHECK - Prevent banned users from transferring balance
    if (appUser?.isBanned === true) {
      toast({
        variant: 'destructive',
        title: 'অ্যাকাউন্ট নিষিদ্ধ',
        description: 'আপনার অ্যাকাউন্ট নিষিদ্ধ করা হয়েছে। কোনো লেনদেন করা সম্ভব নয়।',
      });
      return;
    }

    if (!recipientUniqueId || !amount || Number(amount) < 1) {
      toast({ variant: 'destructive', title: 'অবৈধ তথ্য', description: 'অনুগ্রহ করে সঠিক প্রাপকের ইউনিক আইডি এবং টাকার পরিমাণ লিখুন।' });
      return;
    }

    if (appUser?.uniqueId === recipientUniqueId) {
      toast({ variant: 'destructive', title: 'অবৈধ অপারেশন', description: 'আপনি নিজেকে ব্যালেন্স ট্রান্সফার করতে পারবেন না।' });
      return;
    }

    if ((appUser?.walletBalance || 0) < totalDeducted) {
      toast({ variant: 'destructive', title: 'অপর্যাপ্ত ব্যালেন্স', description: 'এই ট্রান্সফারের জন্য আপনার ওয়ালেটে যথেষ্ট ব্যালেন্স নেই।' });
      return;
    }

    setIsProcessing(true);
    setIsSubmitting(true);

    try {
      await runTransaction(firestore, async (transaction) => {
        const senderRef = doc(firestore, 'users', firebaseUser.uid);

        // Search by both uniqueId and resellerId
        const usersRef = collection(firestore, 'users');
        let recipientQuerySnap = await getDocs(query(usersRef, where('uniqueId', '==', recipientUniqueId), limit(1)));

        // If not found by uniqueId, try resellerId
        let isResellerTransfer = false;
        if (recipientQuerySnap.empty) {
          recipientQuerySnap = await getDocs(query(usersRef, where('resellerId', '==', recipientUniqueId), limit(1)));
          isResellerTransfer = true;
        }

        if (recipientQuerySnap.empty) {
          throw new Error('প্রাপক ব্যবহারকারীকে খুঁজে পাওয়া যায়নি। অনুগ্রহ করে ইউনিক আইডি বা রিসেলার আইডি চেক করে আবার চেষ্টা করুন।');
        }

        const recipientDoc = recipientQuerySnap.docs[0];
        const recipientRef = recipientDoc.ref;
        const recipientData = recipientDoc.data();

        const senderDoc = await transaction.get(senderRef);

        if (!senderDoc.exists()) {
          throw new Error('আপনার ব্যবহারকারী অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।');
        }

        const senderData = senderDoc.data();
        if (!senderData || (senderData.walletBalance || 0) < totalDeducted) {
          throw new Error('আপনার ওয়ালেটে এই ট্রান্সফারের জন্য পর্যাপ্ত ব্যালেন্স নেই।');
        }

        const newSenderBalance = (senderData.walletBalance || 0) - totalDeducted;

        // Update sender balance
        transaction.update(senderRef, { walletBalance: newSenderBalance });

        // Update recipient main wallet balance
        const newRecipientBalance = (recipientData?.walletBalance || 0) + amountToReceive;
        transaction.update(recipientRef, { walletBalance: newRecipientBalance });

        const transferRef = doc(collection(firestore, 'balance_transfers'));
        transaction.set(transferRef, {
          id: transferRef.id,
          senderId: firebaseUser.uid,
          senderUniqueId: senderData.uniqueId,
          recipientId: recipientDoc.id,
          recipientUniqueId: isResellerTransfer ? recipientData.resellerId : recipientData.uniqueId,
          isResellerTransfer: isResellerTransfer,
          amountSent: transferAmount,
          fee: fee,
          amountReceived: amountToReceive,
          transferDate: new Date().toISOString(),
        });
      });

      setTransferredAmount(transferAmount);
      setIsSuccess(true);
      setRecipientUniqueId('');
      setAmount('');
      onOpenChange(false);

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'ট্রান্সফার ব্যর্থ হয়েছে', description: error.message });
    } finally {
      setIsProcessing(false);
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setRecipientUniqueId('');
      setAmount('');
    }
    onOpenChange(isOpen);
  }

  const handleSuccessPopupClose = () => {
    setIsSuccess(false);
    setTransferredAmount(0);
  }

  return (
    <>
      <ProcessingLoader isLoading={isProcessing} message="ট্রান্সফার প্রক্রিয়া করা হচ্ছে..." />
      <SuccessPopup
        isOpen={isSuccess}
        onClose={handleSuccessPopupClose}
        title="ট্রান্সফার সফল হয়েছে!"
        message={`সফলভাবে ৳${transferredAmount.toFixed(2)} ট্রান্সফার করা হয়েছে।`}
      />
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md p-0">
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">ব্যালেন্স ট্রান্সফার করুন</DialogTitle>
                <DialogDescription>
                  অন্য ব্যবহারকারীকে আপনার ওয়ালেট থেকে টাকা পাঠান।
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipientUniqueId">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  প্রাপকের ইউনিক আইডি
                </div>
              </Label>
              <Input
                id="recipientUniqueId"
                name="recipientUniqueId"
                type="text"
                placeholder="প্রাপকের ইউনিক আইডি দিন"
                required
                value={recipientUniqueId}
                onChange={(e) => setRecipientUniqueId(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  পরিমাণ (৳)
                </div>
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                placeholder="কত টাকা পাঠাতে চান?"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 text-base font-bold"
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-muted/50 space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">লেনদেনের সারাংশ</h4>
            <Separator />
            <div className="flex justify-between items-center text-sm">
              <p>আপনি পাঠাচ্ছেন:</p>
              <p className="font-semibold">৳{transferAmount.toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center text-sm">
              <p>ট্রান্সফার ফি:</p>
              <p className="font-semibold">৳{fee.toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center text-sm font-bold">
              <p>মোট খরচ হবে:</p>
              <p>৳{totalDeducted.toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-green-600">
              <p>প্রাপক পাবেন:</p>
              <p>৳{amountToReceive.toFixed(2)}</p>
            </div>
          </div>

          <div className="p-6 pt-2">
            <Alert
              variant="destructive"
              className="bg-orange-50 border-orange-200 text-orange-800 text-xs"
            >
              <AlertCircle className="h-4 w-4 !text-orange-500" />
              <AlertDescription>
                <p>ব্যালেন্স ট্রান্সফারের জন্য কোন অতিরিক্ত চার্জ প্রযোজ্য নয়।</p>
              </AlertDescription>
            </Alert>
          </div>


          <div className="p-6 pt-0 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              বাতিল
            </Button>
            <Button onClick={handleTransfer} disabled={isSubmitting} className="h-11">
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  ট্রান্সফার নিশ্চিত করুন
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
