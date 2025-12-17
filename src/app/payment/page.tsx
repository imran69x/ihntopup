


'use client';

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, addDoc, runTransaction, doc, updateDoc, setDoc } from "firebase/firestore";
import type { PaymentMethod, Order } from "@/lib/data";
import { useAuthContext } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Copy, ArrowLeft, Home, X, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendTelegramNotification, formatOrderNotification, formatWalletRequestNotification, sendOrderAlert, sendWalletRequestAlert } from '@/lib/telegram';
import { ProcessingLoader } from '@/components/ui/processing-loader';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type PaymentFormValues = {
  senderPhone: string;
  transactionId?: string;
};

const paymentMethodLogos: { [key: string]: string } = {
  "bkash personal": "https://i.imgur.com/GeOlI04.png",
  "nagad personal": "https://i.imgur.com/RZBbEjb.png",
  "bkash payment": "https://i.imgur.com/fu6TVaZ.png",
  "islami bank": "https://i.imgur.com/qujYZ1l.png",
  "celfin": "https://i.imgur.com/R4ik5NZ.png",
};


const TopBar = ({ onBack, onCancel, showBackArrow, timeLeft }: { onBack: () => void; onCancel: () => void; showBackArrow: boolean; timeLeft: number }) => {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-14 flex items-center justify-between px-2 bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
      <button onClick={onBack} className="p-2 text-gray-500 hover:text-gray-800">
        {showBackArrow ? <ArrowLeft className="h-5 w-5" /> : <Home className="h-5 w-5" />}
      </button>
      <div className="flex items-center gap-2 font-mono text-lg font-bold text-destructive">
        <Timer className="h-5 w-5" />
        <span>{formatTime(timeLeft)}</span>
      </div>
      <button onClick={onCancel} className="p-2 text-gray-500 hover:text-gray-800">
        <X className="h-5 w-5" />
      </button>
    </div>
  )
};


function PaymentPageComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  const { register, handleSubmit, formState: { errors } } = useForm<PaymentFormValues>();
  const { toast } = useToast();

  const firestore = useFirestore();
  const { firebaseUser, appUser } = useAuthContext();

  const paymentMethodsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'payment_methods')) : null,
    [firestore]
  );
  const { data: paymentMethods, isLoading: isLoadingMethods } = useCollection<PaymentMethod>(paymentMethodsQuery);

  const paymentInfo = useMemo(() => {
    const type = searchParams.get('type');
    const amount = searchParams.get('amount');
    const sessionId = searchParams.get('sessionId');

    if (!type || !amount || !sessionId) {
      return null;
    }

    const decodedCartItems = searchParams.get('cartItems');
    const cartItems = decodedCartItems ? JSON.parse(decodeURIComponent(decodedCartItems)) : [];

    return {
      type,
      amount: parseFloat(amount),
      cartItems,
      uid: searchParams.get('uid') || '',
      couponId: searchParams.get('couponId') || null,
      sessionId: sessionId,
    };
  }, [searchParams]);

  useEffect(() => {
    // Security check: Validate session ID on load
    if (typeof window !== 'undefined') {
      const storedSessionId = sessionStorage.getItem('paymentSessionId');
      if (!paymentInfo || paymentInfo.sessionId !== storedSessionId) {
        router.replace('/payment/failed');
      }
    }
  }, [paymentInfo, router]);

  useEffect(() => {
    if (timeLeft <= 0) {
      sessionStorage.removeItem('paymentSessionId');
      router.replace('/payment/failed?reason=timeout');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, router]);


  const sortedPaymentMethods = useMemo(() => {
    if (!paymentMethods) return [];
    return [...paymentMethods].filter(m => m.isActive).sort((a, b) => {
      if (a.name.toLowerCase() === 'bkash') return -1;
      if (b.name.toLowerCase() === 'bkash') return 1;
      if (a.name.toLowerCase() === 'nagad') return -1;
      if (b.name.toLowerCase() === 'nagad') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [paymentMethods]);

  const handleCopy = (numberToCopy: string) => {
    navigator.clipboard.writeText(numberToCopy).then(() => {
      setCopied(true);
      toast({ title: 'নম্বর কপি করা হয়েছে' });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const createOrderObject = (item: any, manualDetails: any): Omit<Order, 'id'> => {
    return {
      userId: firebaseUser!.uid,
      userName: appUser?.name || 'Unknown',
      topUpCardId: item.cardId,
      productName: item.name,
      productOption: item.selectedOptionName || 'Standard',
      quantity: item.quantity,
      gameUid: paymentInfo!.uid,
      paymentMethod: 'Manual',
      couponId: paymentInfo!.couponId || null,
      totalAmount: item.price * item.quantity,
      orderDate: new Date().toISOString(),
      status: 'Pending',
      manualPaymentDetails: {
        method: selectedMethod!.name,
        ...manualDetails
      }
    };
  };

  const onSubmit = async (data: PaymentFormValues) => {
    if (!paymentInfo || !selectedMethod || !firestore || !firebaseUser) {
      toast({ variant: 'destructive', title: 'একটি ত্রুটি ঘটেছে' });
      return;
    }

    setIsProcessing(true);

    try {
      if (paymentInfo.type === 'productPurchase') {

        await runTransaction(firestore, async (transaction) => {
          const orderRefs: { id: string; data: any }[] = [];

          for (const item of paymentInfo.cartItems) {
            const orderData = createOrderObject(item, data);
            const newOrderRef = doc(collection(firestore, "orders"));

            const finalOrderData = { ...orderData, id: newOrderRef.id, totalAmount: paymentInfo.amount };
            transaction.set(newOrderRef, finalOrderData);
            orderRefs.push({ id: newOrderRef.id, data: finalOrderData });
          }

          return orderRefs;
        }).then(async (orderRefs) => {
          // Send Telegram alerts after transaction completes
          for (const order of orderRefs) {
            const telegramResponse = await sendOrderAlert(order.data);
            if (telegramResponse.success && telegramResponse.messageId) {
              // Update order with Telegram message ID
              const orderRef = doc(firestore, 'orders', order.id);
              await updateDoc(orderRef, { telegramMessageId: telegramResponse.messageId });
            }
          }
        });

        toast({ title: "অর্ডার সফল হয়েছে!", description: "আপনার অর্ডারটি পর্যালোচনার জন্য অপেক্ষারত আছে।" });

      } else if (paymentInfo.type === 'walletTopUp' || paymentInfo.type === 'resellerBalanceTopUp') {
        const isResellerBalance = paymentInfo.type === 'resellerBalanceTopUp';
        const requestsCollection = collection(firestore, 'wallet_top_up_requests');
        const newRequestRef = doc(requestsCollection);

        const requestData = {
          id: newRequestRef.id,
          userId: firebaseUser.uid,
          userEmail: appUser?.email || 'N/A',
          userName: appUser?.name || 'Unknown',
          amount: paymentInfo.amount,
          senderPhone: data.senderPhone,
          transactionId: data.transactionId || '',
          method: selectedMethod.name,
          requestDate: new Date().toISOString(),
          status: 'Pending' as const,
          isResellerBalance: isResellerBalance
        };

        // Use setDoc with the generated ID
        await setDoc(newRequestRef, requestData);

        // Send Telegram alert and save message ID
        const telegramResponse = await sendWalletRequestAlert(requestData, isResellerBalance);
        if (telegramResponse.success && telegramResponse.messageId) {
          await updateDoc(newRequestRef, { telegramMessageId: telegramResponse.messageId });
        }

        const message = isResellerBalance
          ? 'আপনার রিসেলার ব্যালেন্স টপ-আপ অনুরোধ পর্যালোচনার জন্য জমা দেওয়া হয়েছে।'
          : 'আপনার ওয়ালেট টপ-আপ অনুরোধ পর্যালোচনার জন্য জমা দেওয়া হয়েছে।';
        toast({ title: 'অনুরোধ জমা হয়েছে', description: message });
      }

      sessionStorage.removeItem('paymentSessionId');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Redirect based on type
      if (paymentInfo.type === 'productPurchase') {
        router.push('/orders');
      } else if (paymentInfo.type === 'resellerBalanceTopUp') {
        router.push('/reseller/wallet');
      } else {
        router.push('/wallet');
      }

    } catch (error: any) {
      console.error("Payment submission error:", error);
      toast({ variant: "destructive", title: "জমা দিতে ব্যর্থ", description: error.message || "একটি ত্রুটি ঘটেছে।" });
    } finally {
      setIsProcessing(false);
    }
  };

  const getDynamicBackgroundColor = () => {
    if (!selectedMethod) return 'bg-primary';
    const methodName = selectedMethod.name.toLowerCase();
    if (methodName.includes('bkash payment')) return 'bg-black hover:bg-gray-800';
    if (methodName.includes('bkash')) return 'bg-[#e2136e] hover:bg-[#c0105c]';
    if (methodName.includes('nagad')) return 'bg-[#D81A24] hover:bg-[#b0121c]';
    if (methodName.includes('celfin')) return 'bg-green-600 hover:bg-green-700';
    return 'bg-primary hover:bg-primary/90';
  }

  const handleTopBarBack = () => {
    if (selectedMethod) {
      setSelectedMethod(null);
    } else {
      router.push('/');
    }
  };

  const handleCancel = useCallback(() => {
    sessionStorage.removeItem('paymentSessionId');
    const params = new URLSearchParams(searchParams.toString());
    router.push(`/payment/cancelled?${params.toString()}`);
  }, [searchParams, router]);


  if (!paymentInfo) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <>
      <ProcessingLoader isLoading={isProcessing} message="আপনার অনুরোধ প্রক্রিয়া করা হচ্ছে..." />
      <div className="container mx-auto max-w-md px-4 py-8 min-h-screen bg-gray-50 bg-payment-pattern">

        {!selectedMethod ? (
          <div className="flex flex-col items-center gap-5 pb-20">
            <TopBar onBack={handleTopBarBack} onCancel={handleCancel} showBackArrow={!!selectedMethod} timeLeft={timeLeft} />
            <div className="text-center">
              <Image src="https://i.imgur.com/Jl3DuJs.jpeg" alt="IHN TOPUP Logo" width={80} height={80} className="mx-auto rounded-full border-4 border-white shadow-lg" />
              <h1 className="text-2xl font-bold mt-3">IHN TOPUP</h1>
            </div>
            <div className="w-full bg-primary text-white text-center p-3 rounded-lg font-semibold shadow-md">
              মোবাইল ব্যাংকিং
            </div>
            <div className="w-full grid grid-cols-2 gap-4">
              {isLoadingMethods ? <Loader2 className='animate-spin' /> : sortedPaymentMethods.map(method => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method)}
                  className="flex items-center justify-center p-4 border-2 border-gray-200 rounded-xl bg-white cursor-pointer transition-all hover:border-primary hover:shadow-lg hover:-translate-y-1 h-24"
                >
                  <div className="relative w-full h-full">
                    <Image src={paymentMethodLogos[method.name.toLowerCase()] || method.image.src} alt={method.name} fill className="object-contain h-full w-full" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-20">
            <TopBar onBack={handleTopBarBack} onCancel={handleCancel} showBackArrow={!!selectedMethod} timeLeft={timeLeft} />
            <div className="text-center">
              <Image src={paymentMethodLogos[selectedMethod.name.toLowerCase()] || selectedMethod.image.src} alt={selectedMethod.name} width={150} height={50} className="mx-auto object-contain h-16" />
            </div>

            <div className="bg-white border rounded-lg p-4 flex items-center gap-4">
              <Image src="https://i.imgur.com/Jl3DuJs.jpeg" alt="IHN TOPUP" width={40} height={40} className="rounded-full" />
              <div>
                <h2 className="font-bold">IHN TOPUP</h2>
                <p className="text-sm text-muted-foreground">Pay With {selectedMethod.name}</p>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4 text-center">
              <p className="text-3xl font-bold">৳ {(paymentInfo.amount).toFixed(2)}</p>
            </div>

            <div className={cn("text-white rounded-lg p-6", getDynamicBackgroundColor())}>
              <h2 className="text-lg font-bold text-center mb-4">পেমেন্টের তথ্য দিন</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {selectedMethod.name.toLowerCase() === 'bkash payment' ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-white/90">প্রেরকের {selectedMethod.name} নম্বর</Label>
                      <Input {...register('senderPhone', { required: true })} className="bg-white text-black" placeholder="আপনার প্রেরক নম্বর দিন" />
                      {errors.senderPhone && <p className="text-white text-xs font-bold">Sender number is required.</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-white/90">ট্রানজেকশন আইডি দিন</Label>
                      <Input {...register('transactionId')} className="bg-white text-black" placeholder="ট্রানজেকশন আইডি দিন" />
                    </div>
                    <ul className="space-y-3 pt-4 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">*247# ডায়াল করে আপনার BKASH মোবাইল মেনুতে যান অথবা BKASH অ্যাপে যান।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">"Payment" -এ ক্লিক করুন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">
                          প্রাপক নম্বর হিসেবে এই নম্বরটি লিখুনঃ <strong className="font-mono">{selectedMethod.accountNumber}</strong>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(selectedMethod.accountNumber)} className="h-auto px-2 py-1 ml-2 bg-white/20 hover:bg-white/30 text-white">
                            <Copy className="h-3 w-3 mr-1" />
                            {copied ? 'Copied' : 'Copy'}
                          </Button>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">টাকার পরিমাণঃ <strong className="font-mono">{(paymentInfo.amount).toFixed(2)}</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">নিশ্চিত করতে এখন আপনার {selectedMethod.name} মোবাইল মেনু পিন লিখুন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">সবকিছু ঠিক থাকলে, আপনি {selectedMethod.name} থেকে একটি নিশ্চিতকরণ বার্তা পাবেন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">এখন উপরের বক্সে আপনার Sender Number & Transaction ID দিন এবং নিচের SUBMIT বাটনে ক্লিক করুন।</span>
                      </li>
                    </ul>
                  </>
                ) : selectedMethod.name.toLowerCase().includes('bkash') ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-white/90">প্রেরকের {selectedMethod.name} নম্বর</Label>
                      <Input {...register('senderPhone', { required: true })} className="bg-white text-black" placeholder="আপনার প্রেরক নম্বর দিন" />
                      {errors.senderPhone && <p className="text-white text-xs font-bold">Sender number is required.</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-white/90">ট্রানজেকশন আইডি দিন</Label>
                      <Input {...register('transactionId')} className="bg-white text-black" placeholder="ট্রানজেকশন আইডি দিন" />
                    </div>
                    <ul className="space-y-3 pt-4 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">*247# ডায়াল করে আপনার BKASH মোবাইল মেনুতে যান অথবা BKASH অ্যাপে যান।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">"Send Money" -এ ক্লিক করুন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">
                          প্রাপক নম্বর হিসেবে এই নম্বরটি লিখুনঃ <strong className="font-mono">{selectedMethod.accountNumber}</strong>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(selectedMethod.accountNumber)} className="h-auto px-2 py-1 ml-2 bg-white/20 hover:bg-white/30 text-white">
                            <Copy className="h-3 w-3 mr-1" />
                            {copied ? 'Copied' : 'Copy'}
                          </Button>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">টাকার পরিমাণঃ <strong className="font-mono">{(paymentInfo.amount).toFixed(2)}</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">নিশ্চিত করতে এখন আপনার {selectedMethod.name} মোবাইল মেনু পিন লিখুন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">সবকিছু ঠিক থাকলে, আপনি {selectedMethod.name} থেকে একটি নিশ্চিতকরণ বার্তা পাবেন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">এখন উপরের বক্সে আপনার Sender Number & Transaction ID দিন এবং নিচের SUBMIT বাটনে ক্লিক করুন।</span>
                      </li>
                    </ul>
                  </>
                ) : selectedMethod.name.toLowerCase().includes('nagad') ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-white/90">প্রেরকের {selectedMethod.name} নম্বর</Label>
                      <Input {...register('senderPhone', { required: true })} className="bg-white text-black" placeholder="আপনার প্রেরক নম্বর দিন" />
                      {errors.senderPhone && <p className="text-white text-xs font-bold">Sender number is required.</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-white/90">ট্রানজেকশন আইডি দিন</Label>
                      <Input {...register('transactionId')} className="bg-white text-black" placeholder="ট্রানজেকশন আইডি দিন" />
                    </div>
                    <ul className="space-y-3 pt-4 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">*167# ডায়াল করে আপনার NAGAD মোবাইল মেনুতে যান অথবা NAGAD অ্যাপে যান।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">"Send Money" -এ ক্লিক করুন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">
                          প্রাপক নম্বর হিসেবে এই নম্বরটি লিখুনঃ <strong className="font-mono">{selectedMethod.accountNumber}</strong>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(selectedMethod.accountNumber)} className="h-auto px-2 py-1 ml-2 bg-white/20 hover:bg-white/30 text-white">
                            <Copy className="h-3 w-3 mr-1" />
                            {copied ? 'Copied' : 'Copy'}
                          </Button>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">টাকার পরিমাণঃ <strong className="font-mono">{(paymentInfo.amount).toFixed(2)}</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">নিশ্চিত করতে এখন আপনার NAGAD মোবাইল মেনু পিন লিখুন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">সবকিছু ঠিক থাকলে, আপনি NAGAD থেকে একটি নিশ্চিতকরণ বার্তা পাবেন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">এখন উপরের বক্সে আপনার Sender Number & Transaction ID দিন এবং নিচের SUBMIT বাটনে ক্লিক করুন।</span>
                      </li>
                    </ul>
                  </>
                ) : selectedMethod.name.toLowerCase().includes('celfin') ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-white/90">প্রেরকের Cell fin নম্বর</Label>
                      <Input {...register('senderPhone', { required: true })} className="bg-white text-black" placeholder="আপনার প্রেরক নম্বর দিন" />
                      {errors.senderPhone && <p className="text-white text-xs font-bold">Sender number is required.</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-white/90">ট্রানজেকশন আইডি দিন</Label>
                      <Input {...register('transactionId', { required: true })} className="bg-white text-black" placeholder="ট্রানজেকশন আইডি দিন" />
                      {errors.transactionId && <p className="text-white text-xs font-bold">Transaction ID is required.</p>}
                    </div>
                    <ul className="space-y-3 pt-4 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">প্রথমে আপনার ফোনের CELLFIN অ্যাপে প্রবেশ করুন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">"FUND TRANSFER"-এ ক্লিক করুন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">
                          প্রাপক নম্বর হিসেবে এই নম্বরটি লিখুনঃ <strong className="font-mono">{selectedMethod.accountNumber}</strong>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(selectedMethod.accountNumber)} className="h-auto px-2 py-1 ml-2 bg-white/20 hover:bg-white/30 text-white">
                            <Copy className="h-3 w-3 mr-1" />
                            {copied ? 'Copied' : 'Copy'}
                          </Button>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">টাকার পরিমাণঃ <strong className="font-mono">{(paymentInfo.amount).toFixed(2)}</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">নিশ্চিত করতে এখন আপনার CELLFIN মোবাইল মেনু পিন লিখুন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">সবকিছু ঠিক থাকলে, আপনি CELLFIN থেকে একটি নিশ্চিতকরণ বার্তা পাবেন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">এখন উপরের বক্সে আপনার Transaction ID দিন এবং নিচের SUBMIT বাটনে ক্লিক করুন।</span>
                      </li>
                    </ul>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label className="text-white/90">প্রেরকের নম্বর</Label>
                      <Input {...register('senderPhone', { required: true })} className="bg-white text-black" placeholder="আপনার প্রেরক নম্বর দিন" />
                      {errors.senderPhone && <p className="text-white text-xs font-bold">Sender number is required.</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-white/90">ট্রানজেকশন আইডি দিন</Label>
                      <Input {...register('transactionId')} className="bg-white text-black" placeholder="ট্রানজেকশন আইডি দিন" />
                    </div>
                    <ul className="space-y-3 pt-4 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">আপনার {selectedMethod.name} অ্যাপ বা মেনুতে যান।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">"Send Money" বা "Fund Transfer" অপশনটি বেছে নিন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">
                          প্রাপক নম্বর হিসেবে এই নম্বরটি লিখুনঃ <strong className="font-mono">{selectedMethod.accountNumber}</strong>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(selectedMethod.accountNumber)} className="h-auto px-2 py-1 ml-2 bg-white/20 hover:bg-white/30 text-white">
                            <Copy className="h-3 w-3 mr-1" />
                            {copied ? 'Copied' : 'Copy'}
                          </Button>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">টাকার পরিমাণঃ <strong className="font-mono">{(paymentInfo.amount).toFixed(2)}</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">আপনার পিন দিয়ে পেমেন্ট নিশ্চিত করুন।</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold mt-0.5">•</span>
                        <span className="font-semibold">পেমেন্ট সফল হলে, উপরের বক্সে আপনার প্রেরকের নম্বর এবং ট্রানজেকশন আইডি দিয়ে ফর্মটি সাবমিট করুন।</span>
                      </li>
                    </ul>
                  </>
                )}
              </form>
            </div>
          </div>
        )}

        {!selectedMethod ? (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#D6FAC0] rounded-t-lg">
            <div className="max-w-md mx-auto text-center text-lg font-bold text-green-800">
              Pay {(paymentInfo.amount || 0).toFixed(2)} BDT
            </div>
          </div>
        ) : (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-transparent max-w-md mx-auto">
            <Button type="submit" onClick={handleSubmit(onSubmit)} className={cn("w-full text-lg font-bold", getDynamicBackgroundColor())} disabled={isProcessing}>
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              SUBMIT
            </Button>
          </div>
        )}

      </div>
    </>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <PaymentPageComponent />
    </Suspense>
  );
}
