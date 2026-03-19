'use client';

import { useState, useMemo, useEffect } from 'react';
import type { TopUpCardData, Order as OrderType, Coupon, SavedUid, Notice, TopUpCardOption, PaymentSettings } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Minus, Plus, ShoppingCart, Zap, Gem, Info, Loader2, AlertCircle, RefreshCw, Gamepad2, Star, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useAuthContext } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirestore, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, getDocs, limit, getCountFromServer, doc, runTransaction, updateDoc } from 'firebase/firestore';
import { ProcessingLoader } from './ui/processing-loader';
import { RedirectLoader } from './ui/redirect-loader';
import { Badge } from './ui/badge';
import { sendTelegramNotification, formatOrderNotification, sendOrderAlert } from '@/lib/telegram';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
} from "@/components/ui/alert-dialog"
import FFIDCheckerView from './FFIDCheckerView';

interface TopUpDetailClientProps {
    card: TopUpCardData;
}

const SectionCard: React.FC<{ title: string, step?: string, children: React.ReactNode, className?: string }> = ({ title, step, children, className }) => (
    <Card className={cn("border-l-4 border-green-500 shadow-md", className)}>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
            {step && <div className="bg-green-500 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold">{step}</div>}
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            {children}
        </CardContent>
    </Card>
);

const DescriptionRenderer = ({ description }: { description: string }) => {
    if (!description) return null;
    const points = description.split('\\n').filter(line => line.trim() !== '');

    return (
        <ul className="space-y-3">
            {points.map((point, index) => (
                <li key={index} className="flex items-start gap-2">
                    <Star className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
                    <span className="font-semibold text-gray-700">{point}</span>
                </li>
            ))}
        </ul>
    );
};


export default function TopUpDetailClient({ card }: TopUpDetailClientProps) {
    const [quantity, setQuantity] = useState(1);
    const [uid, setUid] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [isCouponLoading, setIsCouponLoading] = useState(false);
    const [efootballDetails, setEfootballDetails] = useState({ konamiId: '', password: '', whatsappNumber: '' });

    // Social Media specific state
    const [socialMediaLink, setSocialMediaLink] = useState('');
    const [socialMediaQuantity, setSocialMediaQuantity] = useState<number | ''>(''); // Empty by default
    const [minQuantity, setMinQuantity] = useState(10);
    const [maxQuantity, setMaxQuantity] = useState(100000);

    // Game ID Checker state
    const [isCheckingId, setIsCheckingId] = useState(false);
    const [checkedUsername, setCheckedUsername] = useState<string | null>(null);
    const [checkIdError, setCheckIdError] = useState<string | null>(null);

    const getInitialOption = () => {
        if (!card.options || card.options.length === 0) return undefined;
        return card.options.find(o => {
            const isManuallyInStock = o.inStock !== false;
            const hasStockLimit = typeof o.stockLimit === 'number' && o.stockLimit > 0;
            if (!hasStockLimit) return isManuallyInStock;
            return isManuallyInStock && (o.stockSoldCount || 0) < (o.stockLimit ?? 0);
        });
    }


    const [selectedOption, setSelectedOption] = useState<TopUpCardOption | undefined>(getInitialOption());
    const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'instant' | 'coinFund'>('wallet');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isConfirmingInstantPay, setIsConfirmingInstantPay] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);

    const { toast } = useToast();
    const { isLoggedIn, firebaseUser, appUser } = useAuthContext();
    const router = useRouter();
    const firestore = useFirestore();

    const noticeQuery = useMemoFirebase(
        () => firestore
            ? query(
                collection(firestore, 'notices'),
                where('status', '==', 'Active'),
                where('type', '==', 'HowToOrder'),
                limit(1)
            )
            : null,
        [firestore]
    );

    const { data: notices } = useCollection<Notice>(noticeQuery);
    const howToOrderNotice = useMemo(() => notices?.[0], [notices]);

    const isLimitedStockOffer = useMemo(() => {
        return !!(selectedOption && typeof selectedOption.stockLimit === 'number' && selectedOption.stockLimit > 0);
    }, [selectedOption]);

    useEffect(() => {
        if (isLimitedStockOffer) {
            setPaymentMethod('wallet');
            setQuantity(1);
        } else if (card.purchaseType === 'Free') {
            setPaymentMethod('coinFund');
        }
    }, [isLimitedStockOffer, selectedOption, card.purchaseType]);

    useEffect(() => {
        if (appliedCoupon) {
            setAppliedCoupon(null);
            setCouponCode('');
            toast({
                variant: "default",
                title: "কুপন রিসেট করা হয়েছে",
                description: "প্যাকেজ বা পরিমাণ পরিবর্তন করার কারণে আপনাকে আবার কুপন প্রয়োগ করতে হবে।"
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedOption, quantity]);

    // Clear checked username when UID changes
    useEffect(() => {
        setCheckedUsername(null);
        setCheckIdError(null);
    }, [uid]);

    const price = selectedOption ? selectedOption.price : card.price;

    // Calculate totalPrice based on service type
    const totalPrice = card.serviceType === 'Social Media'
        ? (typeof socialMediaQuantity === 'number' ? (price / 1000) * socialMediaQuantity : 0)
        : (price * quantity);

    const discount = appliedCoupon ? (appliedCoupon.type === 'Percentage' ? totalPrice * (appliedCoupon.value / 100) : appliedCoupon.value) : 0;
    const finalPrice = Math.max(0, totalPrice - discount);

    // Use main wallet for all products (reseller and regular)
    const walletBalance = appUser?.walletBalance ?? 0;
    const hasSufficientBalance = walletBalance >= finalPrice;

    const savedUids = appUser?.savedGameUids || [];

    const handleApplyCoupon = async () => {
        if (!couponCode) {
            toast({ variant: 'destructive', title: "অনুগ্রহ করে একটি কুপন কোড লিখুন।" });
            return;
        }
        if (!firestore || !firebaseUser) return;

        setIsCouponLoading(true);

        try {
            const couponsRef = collection(firestore, 'coupons');
            const q = query(couponsRef, where('code', '==', couponCode), limit(1));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast({ variant: 'destructive', title: 'অবৈধ কুপন', description: 'এই কুপন কোডটি موجود নেই।' });
                return;
            }

            const coupon = { ...querySnapshot.docs[0].data(), id: querySnapshot.docs[0].id } as Coupon;

            if (!coupon.isActive) {
                toast({ variant: 'destructive', title: 'নিষ্ক্রিয় কুপন', description: 'এই কুপনটি আর সক্রিয় নেই।' });
                return;
            }
            if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
                toast({ variant: 'destructive', title: 'মেয়াদোত্তীর্ণ কুপন', description: 'এই কুপনের মেয়াদ শেষ হয়ে গেছে।' });
                return;
            }
            if (coupon.minPurchaseAmount && totalPrice < coupon.minPurchaseAmount) {
                toast({ variant: 'destructive', title: 'সর্বনিম্ন ক্রয় পূরণ হয়নি', description: `এই কুপন ব্যবহার করতে আপনাকে কমপক্ষে ৳${coupon.minPurchaseAmount} খরচ করতে হবে।` });
                return;
            }

            const ordersRef = collection(firestore, 'orders');

            if (coupon.totalUsageLimit && coupon.totalUsageLimit > 0) {
                const totalUsageQuery = query(ordersRef, where('couponId', '==', coupon.id));
                const totalUsageSnap = await getCountFromServer(totalUsageQuery);
                if (totalUsageSnap.data().count >= coupon.totalUsageLimit) {
                    toast({ variant: 'destructive', title: 'কুপন সীমা শেষ', description: 'এই কুপনটি তার মোট ব্যবহারের সীমা পর্যন্ত পৌঁছেছে।' });
                    return;
                }
            }

            const userCouponQuery = query(ordersRef, where('userId', '==', firebaseUser.uid), where('couponId', '==', coupon.id));
            const userCouponSnap = await getDocs(userCouponQuery);

            if (coupon.usageLimitPerUser && userCouponSnap.size >= coupon.usageLimitPerUser) {
                toast({ variant: 'destructive', title: 'কুপন ইতিমধ্যে ব্যবহৃত', description: 'আপনি ইতিমধ্যে এই কুপনের ব্যবহারের সীমা পর্যন্ত পৌঁছেছেন।' });
                return;
            }

            const calculatedDiscount = coupon.type === 'Percentage' ? totalPrice * (coupon.value / 100) : coupon.value;

            setAppliedCoupon(coupon);

            toast({ title: 'কুপন প্রয়োগ করা হয়েছে!', description: `আপনি ৳${calculatedDiscount.toFixed(2)} ছাড় পেয়েছেন।` });

        } finally {
            setIsCouponLoading(false);
        }
    }

    const handleCheckGameId = async () => {
        if (!uid || uid.trim() === '') {
            toast({
                variant: 'destructive',
                title: 'প্লেয়ার আইডি প্রয়োজন',
                description: 'অনুগ্রহ করে প্রথমে আপনার প্লেয়ার আইডি দিন।'
            });
            return;
        }

        setIsCheckingId(true);
        setCheckIdError(null);
        setCheckedUsername(null);

        try {
            const response = await fetch('/api/game-id-checker', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ playerid: uid.trim() }),
            });

            const data = await response.json();

            if (data.success && data.username) {
                setCheckedUsername(data.username);
                toast({
                    title: 'প্লেয়ার আইডি যাচাই সফল!',
                    description: `প্লেয়ার নাম: ${data.username}`,
                });
            } else {
                const errorMsg = data.error || 'প্লেয়ার আইডি যাচাই করা যায়নি';
                setCheckIdError(errorMsg);
                toast({
                    variant: 'destructive',
                    title: 'যাচাই ব্যর্থ',
                    description: errorMsg,
                });
            }
        } catch (error) {
            const errorMsg = 'নেটওয়ার্ক সমস্যা। অনুগ্রহ করে আবার চেষ্টা করুন।';
            setCheckIdError(errorMsg);
            toast({
                variant: 'destructive',
                title: 'সমস্যা হয়েছে',
                description: errorMsg,
            });
        } finally {
            setIsCheckingId(false);
        }
    };

    const handleInstantPay = async () => {
        setIsConfirmingInstantPay(false);
        setIsRedirecting(true);

        // Always use Manual Payment Flow
        const cartItem = {
            cardId: card.id,
            name: card.name,
            image: card.image.src,
            quantity: quantity,
            selectedOptionName: selectedOption?.name,
            price: selectedOption?.price,
        };

        const sessionId = crypto.randomUUID();
        sessionStorage.setItem('paymentSessionId', sessionId);

        const params = new URLSearchParams({
            type: 'productPurchase',
            amount: finalPrice.toString(),
            uid: card.serviceType === 'eFootball' ? 'eFootball Order' : (card.isResellerProduct ? 'Reseller Order' : uid),
            cartItems: encodeURIComponent(JSON.stringify([cartItem])),
            sessionId: sessionId,
        });

        if (card.serviceType === 'eFootball') {
            params.set('eFootballDetails', encodeURIComponent(JSON.stringify(efootballDetails)));
        }

        if (appliedCoupon?.id) {
            params.set('couponId', appliedCoupon.id);
        }

        setTimeout(() => {
            router.push(`/payment?${params.toString()}`);
            setIsRedirecting(false);
        }, 1500); // simulate network delay
    };


    const createOrderObject = (paymentType: 'Wallet' | 'Manual' | 'CoinFund'): Omit<OrderType, 'id'> => {
        // Calculate social media price: (price / 1000) × quantity
        const qty = typeof socialMediaQuantity === 'number' ? socialMediaQuantity : 0;
        const socialMediaTotal = card.serviceType === 'Social Media' && selectedOption
            ? (selectedOption.price / 1000) * qty
            : 0;

        const baseOrder: Partial<OrderType> = {
            userId: firebaseUser!.uid,
            userName: appUser?.name || firebaseUser?.displayName || 'Unknown User',
            topUpCardId: card.id,
            quantity: card.serviceType === 'Social Media' ? qty : quantity,
            gameUid: card.serviceType === 'Social Media' ? socialMediaLink :
                (card.serviceType === 'eFootball' ? 'eFootball Order' :
                    (card.isResellerProduct ? 'Reseller Order' : uid)),
            paymentMethod: paymentType,
            originalAmount: card.serviceType === 'Social Media' ? socialMediaTotal : totalPrice,
            totalAmount: card.serviceType === 'Social Media' ? socialMediaTotal : finalPrice,
            orderDate: new Date().toISOString(),
            // Auto-complete reseller orders
            status: card.isResellerProduct ? 'Completed' : (card.serviceType === 'Others' ? 'Processing' : 'Pending'),
            productName: card.name,
            productOption: selectedOption?.name || 'Standard',
            serviceType: card.serviceType, // Store service type for display purposes
            couponId: appliedCoupon?.id || null,
            isLimitedStock: isLimitedStockOffer,
            isResellerProduct: card.isResellerProduct || false,
        };

        if (card.serviceType === 'eFootball') {
            baseOrder.eFootballDetails = efootballDetails;
        }

        return baseOrder as Omit<OrderType, 'id'>;
    }

    const handleWalletPayment = async () => {
        if (!isLoggedIn || !firebaseUser || !firestore || !appUser || !selectedOption) return;

        setIsProcessing(true);

        const newOrderData = createOrderObject('Wallet');

        runTransaction(firestore, async (transaction) => {

            // Skip limited stock check for reseller products (unlimited orders)
            if (isLimitedStockOffer && !card.isResellerProduct) {
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

                const baseQuery = [
                    where('isLimitedStock', '==', true),
                    where('topUpCardId', '==', card.id),
                    where('productOption', '==', selectedOption.name),
                    where('orderDate', '>=', thirtyDaysAgo.toISOString()),
                ];

                const userOrderQuery = query(collection(firestore, 'orders'), where('userId', '==', firebaseUser.uid), ...baseQuery);
                const uidOrderQuery = query(collection(firestore, 'orders'), where('gameUid', '==', uid), ...baseQuery);

                const [userOrdersSnap, uidOrdersSnap] = await Promise.all([
                    getDocs(userOrderQuery),
                    getDocs(uidOrderQuery),
                ]);

                const checkAndSetError = (snap: typeof userOrdersSnap, errorMsgFn: (days: number) => string): string | null => {
                    if (!snap.empty) {
                        const lastOrder = snap.docs[0].data() as OrderType;
                        const lastOrderDate = new Date(lastOrder.orderDate);
                        const nextAvailableDate = new Date(lastOrderDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                        const remainingDays = Math.ceil((nextAvailableDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                        if (remainingDays > 0) {
                            return errorMsgFn(remainingDays);
                        }
                    }
                    return null;
                }

                let proceedError: string | null = null;
                proceedError = checkAndSetError(userOrdersSnap, (days) => `আপনি এই অফারটি আবার ${days} দিন পর নিতে পারবেন।`);
                if (proceedError) throw new Error(proceedError);

                proceedError = checkAndSetError(uidOrdersSnap, (days) => `এই UID দিয়ে অফারটি আবার ${days} দিন পর নেওয়া যাবে।`);
                if (proceedError) throw new Error(proceedError);
            }

            // ALL READS MUST COME FIRST
            let updatedOptions = null;
            let allocatedCodes: string[] = [];

            if (selectedOption) {
                const productRef = doc(firestore, 'top_up_cards', card.id);
                const productSnap = await transaction.get(productRef);

                if (productSnap.exists()) {
                    const productData = productSnap.data();
                    const options = productData.options || [];

                    // Check if this is a unipin_only card
                    if (card.cardType === 'unipin_only') {
                        // Find the matching option
                        const matchingOption = options.find((opt: any) => opt.name === selectedOption.name);

                        if (!matchingOption || !matchingOption.unipinCodes) {
                            throw new Error('Unipin codes not available for this option');
                        }

                        // Get available codes (not used)
                        const availableCodes = matchingOption.unipinCodes.filter((c: any) => !c.isUsed);

                        if (availableCodes.length < quantity) {
                            throw new Error(`অপর্যাপ্ত স্টক। শুধুমাত্র ${availableCodes.length} টি কোড উপলব্ধ আছে।`);
                        }

                        // Allocate codes for this order
                        const codesToAllocate = availableCodes.slice(0, quantity);
                        allocatedCodes = codesToAllocate.map((c: any) => c.code);

                        // Mark codes as used and update options
                        updatedOptions = {
                            ref: productRef,
                            data: options.map((opt: any) => {
                                if (opt.name === selectedOption.name) {
                                    return {
                                        ...opt,
                                        unipinCodes: opt.unipinCodes.map((c: any) => {
                                            if (allocatedCodes.includes(c.code)) {
                                                return {
                                                    ...c,
                                                    isUsed: true,
                                                    usedBy: '', // Will be set after order creation
                                                    usedAt: new Date().toISOString()
                                                };
                                            }
                                            return c;
                                        }),
                                        availableCodeCount: (opt.availableCodeCount || 0) - quantity,
                                        stockSoldCount: (opt.stockSoldCount || 0) + quantity
                                    };
                                }
                                return opt;
                            })
                        };
                    } else {
                        // Normal card - just update stock count if applicable
                        if (selectedOption.stockLimit && selectedOption.stockLimit > 0) {
                            updatedOptions = {
                                ref: productRef,
                                data: options.map((opt: any) => {
                                    if (opt.name === selectedOption.name) {
                                        return {
                                            ...opt,
                                            stockSoldCount: (opt.stockSoldCount || 0) + quantity
                                        };
                                    }
                                    return opt;
                                })
                            };
                        }
                    }
                }
            }

            // Get next sequential order ID
            const counterRef = doc(firestore, 'counters', 'orderIdCounter');
            const counterSnap = await transaction.get(counterRef);
            let nextOrderId = 100; // Start from 100

            if (counterSnap.exists()) {
                nextOrderId = (counterSnap.data().currentId || 99) + 1;
            }

            // Update counter
            if (counterSnap.exists()) {
                transaction.update(counterRef, { currentId: nextOrderId });
            } else {
                transaction.set(counterRef, { currentId: nextOrderId });
            }

            // NOW DO ALL WRITES
            const orderRef = doc(collection(firestore, 'orders'));
            const orderToSave = {
                ...newOrderData,
                id: orderRef.id,
                orderId: nextOrderId, // Add sequential order ID
                ...(allocatedCodes.length > 0 && { allocatedCodes }) // Add allocated codes if any
            };
            transaction.set(orderRef, orderToSave);

            // Update stock and codes if needed
            if (updatedOptions) {
                transaction.update(updatedOptions.ref, { options: updatedOptions.data });
            }

            // Deduct from main wallet for all products
            const userRef = doc(firestore, 'users', firebaseUser.uid);
            const newBalance = walletBalance - finalPrice;
            transaction.update(userRef, { walletBalance: newBalance });

            return orderToSave;
        })
            .then(async (finalOrderData) => {
                if (finalOrderData) {
                    // Send Telegram alert and store message ID (non-blocking)
                    try {
                        const telegramResponse = await sendOrderAlert(finalOrderData);
                        if (telegramResponse.success && telegramResponse.messageId && firestore) {
                            // Update order with Telegram message ID for future editing
                            const orderRef = doc(firestore, 'orders', finalOrderData.id);
                            await updateDoc(orderRef, { telegramMessageId: telegramResponse.messageId });
                        }
                    } catch (error) {
                        console.log('Telegram notification failed (non-critical):', error);
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 1500));
                toast({
                    title: 'অর্ডার সফল হয়েছে!',
                    description: card.isResellerProduct ? 'অর্ডারটি সম্পন্ন হয়েছে!' : 'আপনার অর্ডারটি পর্যালোচনার জন্য পেন্ডিং আছে।',
                });
                // Redirect only for non-reseller products
                if (!card.isResellerProduct) {
                    router.push('/orders');
                }
            })
            .catch((error: any) => {
                if (error.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: 'orders',
                        operation: 'create',
                        requestResourceData: newOrderData,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                } else if (error.message.includes('দিন পর নিতে পারবেন') || error.message.includes('দিন পর নেওয়া যাবে') || error.message.includes('স্টক শেষ')) {
                    toast({
                        variant: 'destructive',
                        title: 'অর্ডার করা যায়নি',
                        description: error.message,
                    });
                }
                else {
                    console.error(`Wallet order failed:`, error);
                    toast({
                        variant: 'destructive',
                        title: 'অর্ডার ব্যর্থ হয়েছে',
                        description: error.message || 'আপনার অর্ডার দেওয়ার সময় একটি ত্রুটি হয়েছে।',
                    });
                }
            })
            .finally(() => {
                setIsProcessing(false);
            });
    }

    const handleCoinFundPayment = async () => {
        if (!isLoggedIn || !firebaseUser || !firestore || !appUser || !selectedOption) return;

        setIsProcessing(true);

        const newOrderData = createOrderObject('CoinFund');

        runTransaction(firestore, async (transaction) => {
            // ALL READS MUST COME FIRST
            let updatedOptions = null;
            if (selectedOption && selectedOption.stockLimit && selectedOption.stockLimit > 0) {
                const productRef = doc(firestore, 'top_up_cards', card.id);
                const productSnap = await transaction.get(productRef);

                if (productSnap.exists()) {
                    const productData = productSnap.data();
                    const options = productData.options || [];

                    // Prepare updated options
                    updatedOptions = {
                        ref: productRef,
                        data: options.map((opt: any) => {
                            if (opt.name === selectedOption.name) {
                                return {
                                    ...opt,
                                    stockSoldCount: (opt.stockSoldCount || 0) + quantity
                                };
                            }
                            return opt;
                        })
                    };
                }
            }

            // Get next sequential order ID
            const counterRef = doc(firestore, 'counters', 'orderIdCounter');
            const counterSnap = await transaction.get(counterRef);
            let nextOrderId = 100; // Start from 100

            if (counterSnap.exists()) {
                nextOrderId = (counterSnap.data().currentId || 99) + 1;
            }

            // Update counter
            if (counterSnap.exists()) {
                transaction.update(counterRef, { currentId: nextOrderId });
            } else {
                transaction.set(counterRef, { currentId: nextOrderId });
            }

            // NOW DO ALL WRITES
            const orderRef = doc(collection(firestore, 'orders'));
            transaction.set(orderRef, { ...newOrderData, id: orderRef.id, orderId: nextOrderId });

            // Update stock if needed
            if (updatedOptions) {
                transaction.update(updatedOptions.ref, { options: updatedOptions.data });
            }

            const coinBalance = appUser.coinFund ?? 0;
            const newCoinBalance = coinBalance - finalPrice;
            const userRef = doc(firestore, 'users', firebaseUser.uid);
            transaction.update(userRef, { coinFund: newCoinBalance });

            return { ...newOrderData, id: orderRef.id, orderId: nextOrderId };
        })
            .then(async (finalOrderData) => {
                if (finalOrderData) {
                    // Send Telegram alert and store message ID (non-blocking)
                    try {
                        const telegramResponse = await sendOrderAlert(finalOrderData);
                        if (telegramResponse.success && telegramResponse.messageId && firestore) {
                            // Update order with Telegram message ID for future editing
                            const orderRef = doc(firestore, 'orders', finalOrderData.id);
                            await updateDoc(orderRef, { telegramMessageId: telegramResponse.messageId });
                        }
                    } catch (error) {
                        console.log('Telegram notification failed (non-critical):', error);
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 1500));
                toast({
                    title: 'অর্ডার সফল হয়েছে!',
                    description: 'আপনার Coin Fund থেকে পেমেন্ট সম্পন্ন হয়েছে।',
                });
                // Redirect only for non-reseller products
                if (!card.isResellerProduct) {
                    router.push('/orders');
                }
            })

            .catch((error: any) => {
                if (error.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: 'orders',
                        operation: 'create',
                        requestResourceData: newOrderData,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                } else {
                    console.error(`Coin Fund order failed:`, error);
                    toast({
                        variant: 'destructive',
                        title: 'অর্ডার ব্যর্থ হয়েছে',
                        description: error.message || 'আপনার অর্ডার দেওয়ার সময় একটি ত্রুটি হয়েছে।',
                    });
                }
            })
            .finally(() => {
                setIsProcessing(false);
            });
    }

    const handleOrderNowClick = async () => {
        if (!isLoggedIn) {
            router.push('/login');
            return;
        }

        if (card.serviceType === 'Social Media') {
            if (!socialMediaLink || !selectedOption) {
                toast({
                    variant: 'destructive',
                    title: 'প্রয়োজনীয় তথ্য দিন',
                    description: 'অর্ডার করার জন্য অনুগ্রহ করে সার্ভিস নির্বাচন করুন এবং আপনার সোশ্যাল মিডিয়া লিংক দিন।'
                });
                return;
            }
            if (!socialMediaQuantity || socialMediaQuantity < 10) {
                toast({
                    variant: 'destructive',
                    title: 'অবৈধ পরিমাণ',
                    description: 'ন্যূনতম ১০ পরিমাণ দিতে হবে।'
                });
                return;
            }
        } else if (card.serviceType === 'eFootball') {
            if (!efootballDetails.konamiId || !efootballDetails.password || !efootballDetails.whatsappNumber) {
                toast({ variant: 'destructive', title: 'প্রয়োজনীয় তথ্য দিন', description: 'অর্ডার করার জন্য অনুগ্রহ করে আপনার Konami ID, Password, এবং WhatsApp নম্বর দিন।' });
                return;
            }
        } else if (!uid && !card.isResellerProduct) {
            toast({
                variant: 'destructive',
                title: 'প্রয়োজনীয় তথ্য দিন',
                description: `অর্ডার করার জন্য অনুগ্রহ করে আপনার ${card.serviceType === 'Game' ? 'প্লেয়ার আইডি' : card.serviceType === 'Subscriptions' ? 'হোয়াটসঅ্যাপ নাম্বার' : 'লিংক বা নম্বর'} দিন।`,
            });
            return;
        }

        if (paymentMethod === 'instant') {
            setIsConfirmingInstantPay(true);
        } else if (paymentMethod === 'wallet') {
            if (!hasSufficientBalance) {
                toast({
                    variant: 'destructive',
                    title: 'অপর্যাপ্ত ব্যালেন্স',
                    description: 'আপনার ওয়ালেটে যথেষ্ট টাকা নেই। অনুগ্রহ করে টাকা যোগ করুন।',
                });
                return;
            }
            await handleWalletPayment();
        } else if (paymentMethod === 'coinFund') {
            const coinBalance = appUser?.coinFund ?? 0;
            if (coinBalance < finalPrice) {
                toast({
                    variant: 'destructive',
                    title: 'অপর্যাপ্ত Coin Fund',
                    description: 'আপনার Coin Fund এ যথেষ্ট টাকা নেই। আরও কয়েন উপার্জন করতে অর্ডার সম্পন্ন করুন।',
                });
                return;
            }
            await handleCoinFundPayment();
        }
    };

    const hasOptions = card.options && card.options.length > 0;

    const uidLabel = card.serviceType === 'Subscriptions' ? 'হোয়াটসঅ্যাপ নাম্বার' :
        card.serviceType === 'Others' ? 'প্রয়োজনীয় তথ্য' : 'প্লেয়ার আইডি';
    const uidPlaceholder = card.serviceType === 'Subscriptions' ? 'হোয়াটসঅ্যাপ নাম্বার দিন' :
        card.serviceType === 'Others' ? 'আপনার লিংক বা নম্বর দিন' : 'প্লেয়ার আইডি লিখুন';

    return (
        <>
            {isProcessing && <ProcessingLoader isLoading={true} message="Processing..." />}
            {isRedirecting && <RedirectLoader isLoading={true} />}
            <AlertDialog open={isConfirmingInstantPay} onOpenChange={setIsConfirmingInstantPay}>
                <AlertDialogContent className="sm:max-w-xs p-6 text-center">
                    <AlertDialogHeader className="space-y-3">
                        <AlertDialogTitle className="text-xl font-bold">Confirm Order</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to proceed with this payment?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex flex-col gap-2 mt-4">
                        <Button onClick={handleInstantPay} className="w-full h-12 text-lg">Confirm Pay</Button>
                        <Button variant="ghost" onClick={() => setIsConfirmingInstantPay(false)} className="w-full">Cancel</Button>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            {card.serviceType === 'FFIDChecker' ? (
                <div className="space-y-8">
                    <Card className="shadow-lg overflow-hidden max-w-4xl mx-auto">
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className="relative h-24 w-24 flex-shrink-0">
                                <Image
                                    src={card.image.src || '/placeholder.png'}
                                    alt={card.name}
                                    fill
                                    className="object-cover rounded-lg"
                                    data-ai-hint={card.image.hint}
                                />
                            </div>
                            <div>
                                <h1 className="text-xl lg:text-2xl font-bold font-headline">{card.name}</h1>
                                <p className="text-sm text-muted-foreground">টুলস</p>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <FFIDCheckerView />
                    
                    {card.description && (
                        <div className="max-w-4xl mx-auto print:hidden">
                            <SectionCard title="বিবরণ" >
                                <DescriptionRenderer description={card.description} />
                            </SectionCard>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                    <div className="space-y-8">
                        <Card className="shadow-lg overflow-hidden">
                            <CardContent className="flex items-center gap-4 p-4">
                                <div className="relative h-24 w-24 flex-shrink-0">
                                    <Image
                                        src={card.image.src || '/placeholder.png'}
                                        alt={card.name}
                                        fill
                                        className="object-cover rounded-lg"
                                        data-ai-hint={card.image.hint}
                                    />
                                </div>
                                <div>
                                    <h1 className="text-xl lg:text-2xl font-bold font-headline">{card.name}</h1>
                                    <p className="text-sm text-muted-foreground">গেম / টপ-আপ</p>
                                </div>
                            </CardContent>
                        </Card>

                    {hasOptions && card.serviceType !== 'Social Media' && (
                        <SectionCard title="সার্ভিস নির্বাচন করুন" step="1">
                            <div className={cn(
                                "grid gap-3",
                                card.serviceType === 'Others' ? 'grid-cols-1' : 'grid-cols-2'
                            )}>
                                {card.options!.map((option) => {
                                    const stockLimit = option.stockLimit ?? 0;
                                    const soldCount = option.stockSoldCount ?? 0;
                                    const remainingStock = stockLimit - soldCount;
                                    const hasFiniteStock = typeof stockLimit === 'number' && stockLimit > 0;
                                    const isOutOfStock = hasFiniteStock && soldCount >= stockLimit;
                                    const isManuallyOutOfStock = option.inStock === false;
                                    const isDisabled = isOutOfStock || isManuallyOutOfStock;

                                    return (
                                        <button
                                            key={option.name}
                                            onClick={() => !isDisabled && setSelectedOption(option)}
                                            disabled={isDisabled}
                                            className={cn(
                                                "border-2 rounded-lg p-3 text-left transition-all flex flex-col justify-center",
                                                selectedOption?.name === option.name
                                                    ? "border-primary bg-primary/10"
                                                    : "border-input bg-background hover:bg-muted",
                                                isDisabled && "bg-gray-100 cursor-not-allowed opacity-60"
                                            )}
                                        >
                                            <div className="flex justify-between items-center w-full">
                                                <span className="font-medium text-xs break-words">{option.name}</span>
                                                <div className="flex items-center gap-1 ml-2">
                                                    {card.purchaseType === 'Free' ? (
                                                        <>
                                                            <Image
                                                                src="/coin-icon.png"
                                                                alt="Coin"
                                                                width={16}
                                                                height={16}
                                                                className="w-4 h-4"
                                                            />
                                                            <span className="font-bold text-primary text-xs whitespace-nowrap">{option.price}</span>
                                                        </>
                                                    ) : (
                                                        <span className="font-bold text-primary text-xs whitespace-nowrap">৳{option.price}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-1">
                                                {isDisabled ? (
                                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">Stock Out</Badge>
                                                ) : hasFiniteStock ? (
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-800">{remainingStock} remaining</Badge>
                                                ) : null}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                            {howToOrderNotice?.linkUrl && (
                                <div className="mt-4">
                                    <Link href={howToOrderNotice.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary font-semibold underline">
                                        <HelpCircle className="h-4 w-4" />
                                        {howToOrderNotice.content || 'কিভাবে অর্ডার করবেন?'}
                                    </Link>
                                </div>
                            )}
                        </SectionCard>
                    )}


                    {!card.isResellerProduct && (
                        card.serviceType === 'Social Media' ? (
                            <>
                                <SectionCard title="Select Service" step="1">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="socialService">Service</Label>
                                            <select
                                                id="socialService"
                                                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                                                value={selectedOption?.name || ''}
                                                onChange={(e) => {
                                                    const option = card.options?.find(o => o.name === e.target.value);
                                                    if (option) {
                                                        setSelectedOption(option);
                                                    }
                                                }}
                                            >
                                                <option value="">Select a service</option>
                                                {card.options?.map((option) => {
                                                    const stockLimit = option.stockLimit ?? 0;
                                                    const soldCount = option.stockSoldCount ?? 0;
                                                    const hasFiniteStock = typeof stockLimit === 'number' && stockLimit > 0;
                                                    const isOutOfStock = hasFiniteStock && soldCount >= stockLimit;
                                                    const isManuallyOutOfStock = option.inStock === false;
                                                    const isDisabled = isOutOfStock || isManuallyOutOfStock;

                                                    return (
                                                        <option key={option.name} value={option.name} disabled={isDisabled}>
                                                            {hasFiniteStock ? `[${stockLimit - soldCount}] ` : ''}
                                                            {option.name} - ৳{option.price}
                                                            {isDisabled ? ' (Stock Out)' : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    </div>
                                </SectionCard>

                                <SectionCard title="Link" step="2">
                                    <div className="space-y-2">
                                        <Label htmlFor="socialLink">Social Media Profile Link</Label>
                                        <Input
                                            id="socialLink"
                                            placeholder="Enter your social media profile URL"
                                            value={socialMediaLink}
                                            onChange={(e) => setSocialMediaLink(e.target.value)}
                                        />
                                    </div>
                                </SectionCard>

                                <SectionCard title="Quantity" step="3">
                                    <div className="space-y-2">
                                        <Label htmlFor="socialQuantity">Quantity</Label>
                                        <Input
                                            id="socialQuantity"
                                            type="number"
                                            min={minQuantity}
                                            max={maxQuantity}
                                            value={socialMediaQuantity}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '') {
                                                    setSocialMediaQuantity('');
                                                } else {
                                                    const num = parseInt(val);
                                                    setSocialMediaQuantity(isNaN(num) ? '' : Math.min(Math.max(num, 0), maxQuantity));
                                                }
                                            }}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Min: {minQuantity} - Max: {maxQuantity.toLocaleString()}
                                        </p>
                                    </div>
                                </SectionCard>

                                <SectionCard title="Charge" step="4">
                                    <div className="text-center py-4">
                                        <p className="text-2xl font-bold text-primary">
                                            ৳{(() => {
                                                if (!selectedOption || !socialMediaQuantity) return '0.00';
                                                const qty = typeof socialMediaQuantity === 'number' ? socialMediaQuantity : 0;
                                                // Formula: (price / 1000) × quantity
                                                const totalPrice = (selectedOption.price / 1000) * qty;
                                                return totalPrice.toFixed(2);
                                            })()}
                                        </p>
                                    </div>
                                </SectionCard>
                            </>
                        ) : (
                            <SectionCard title="অ্যাকাউন্ট তথ্য" step={hasOptions ? "২" : "১"}>
                                {card.serviceType === 'eFootball' ? (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="konamiId">Konami ID</Label>
                                            <Input id="konamiId" placeholder="আপনার Konami ID দিন" value={efootballDetails.konamiId} onChange={(e) => setEfootballDetails(prev => ({ ...prev, konamiId: e.target.value }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password</Label>
                                            <Input id="password" type="password" placeholder="আপনার পাসওয়ার্ড দিন" value={efootballDetails.password} onChange={(e) => setEfootballDetails(prev => ({ ...prev, password: e.target.value }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                                            <Input id="whatsappNumber" placeholder="আপনার হোয়াটসঅ্যাপ নম্বর দিন" value={efootballDetails.whatsappNumber} onChange={(e) => setEfootballDetails(prev => ({ ...prev, whatsappNumber: e.target.value }))} />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="uid">{uidLabel}</Label>
                                            <Input id="uid" placeholder={uidPlaceholder} value={uid} onChange={(e) => { setUid(e.target.value); }} />
                                        </div>

                                        {/* Game ID Checker - Only show for Game service type */}
                                        {card.serviceType === 'Game' && (
                                            <div className="mt-4 space-y-3">
                                                <Button
                                                    type="button"
                                                    variant={checkedUsername ? "default" : "outline"}
                                                    size="default"
                                                    onClick={handleCheckGameId}
                                                    disabled={!uid || uid.trim() === '' || isCheckingId}
                                                    className={cn(
                                                        "w-full text-base font-bold",
                                                        checkedUsername 
                                                            ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white" 
                                                            : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                                                    )}
                                                >
                                                    {isCheckingId ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            যাচাই করা হচ্ছে...
                                                        </>
                                                    ) : checkedUsername ? (
                                                        checkedUsername
                                                    ) : (
                                                        'আইডির নাম দেখুন'
                                                    )}
                                                </Button>

                                                {/* Display checked username and region */}
                                                {checkedUsername && (
                                                    <div className="mt-2 text-sm font-semibold">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-muted-foreground w-24">Player Name:</span>
                                                            <span>{checkedUsername}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-muted-foreground w-24">Region:</span>
                                                            <span>BD Server</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Display error */}
                                                {checkIdError && (
                                                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                        <p className="text-sm text-red-700">{checkIdError}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {savedUids.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                <Label className="text-xs text-muted-foreground">আপনার সংরক্ষিত আইডি</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {savedUids.map((saved, index) => (
                                                        <Button
                                                            key={index}
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-auto"
                                                            onClick={() => setUid(saved.uid)}
                                                        >
                                                            <Star className="mr-2 h-4 w-4 text-yellow-400" />
                                                            <div>
                                                                <p className="font-semibold text-left">{saved.game}</p>
                                                                <p className="text-xs text-muted-foreground font-mono">{saved.uid}</p>
                                                            </div>
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </SectionCard>
                        )
                    )}

                    {card.serviceType !== 'eFootball' && card.serviceType !== 'Social Media' && (
                        <SectionCard title="পরিমাণ নির্বাচন করুন" step={hasOptions ? "৩" : "২"}>
                            <div className="flex items-center justify-center gap-4">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    disabled={isLimitedStockOffer && !card.isResellerProduct}
                                >
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                        // For unipin_only cards, respect available code count
                                        if (card.cardType === 'unipin_only' && selectedOption?.availableCodeCount) {
                                            if (quantity < selectedOption.availableCodeCount) {
                                                setQuantity(quantity + 1);
                                            }
                                        } else {
                                            // For reseller products (non-unipin), allow unlimited
                                            // For non-reseller products, respect limited stock rules
                                            if (card.isResellerProduct || !isLimitedStockOffer) {
                                                setQuantity(quantity + 1);
                                            }
                                        }
                                    }}
                                    disabled={Boolean(
                                        // Disable if limited stock and NOT reseller product
                                        (isLimitedStockOffer && !card.isResellerProduct) ||
                                        // OR if unipin_only and reached code limit
                                        (card.cardType === 'unipin_only' && selectedOption?.availableCodeCount && quantity >= selectedOption.availableCodeCount)
                                    )}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {isLimitedStockOffer && !card.isResellerProduct && (
                                <p className="text-xs text-muted-foreground text-center mt-2">সীমিত অফারের জন্য পরিমাণ ১-এ সীমাবদ্ধ।</p>
                            )}
                            {card.cardType === 'unipin_only' && selectedOption?.availableCodeCount && (
                                <p className="text-xs text-muted-foreground text-center mt-2">
                                    সর্বোচ্চ {selectedOption.availableCodeCount} টি পর্যন্ত অর্ডার করতে পারবেন। ({selectedOption.availableCodeCount} কোড উপলব্ধ)
                                </p>
                            )}
                            {card.isResellerProduct && card.cardType !== 'unipin_only' && (
                                <p className="text-xs text-green-600 text-center mt-2">✓ যেকোনো সংখ্যক অর্ডার করতে পারবেন</p>
                            )}
                        </SectionCard>
                    )}



                </div>

                <div className="space-y-6">
                    <SectionCard title="পেমেন্ট নির্বাচন করুন" step={card.serviceType === 'Social Media' ? "5" : (hasOptions ? "৪" : "৩")}>
                        {card.purchaseType === 'Free' ? (
                            // Free cards - Coin Fund only
                            <div className="space-y-4">
                                <div className="border-2 border-primary rounded-lg p-6 bg-gradient-to-br from-yellow-50 to-orange-50">
                                    <div className="flex items-center justify-center mb-3">
                                        <Image src="/coin-icon.png" alt="Coin" width={48} height={48} className="w-12 h-12" />
                                    </div>
                                    <h3 className="text-center font-bold text-lg mb-2">Coin Fund Payment</h3>
                                    <p className="text-center text-sm text-muted-foreground mb-4">
                                        This product can only be purchased using your Coin Fund
                                    </p>
                                    <div className="flex items-center justify-between p-3 bg-white rounded-md border">
                                        {card.purchaseType === 'Free' && (
                                            <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-semibold">Your Coin Fund:</span>
                                                    <span className="text-lg font-bold text-orange-600">
                                                        {!card.isResellerProduct && `৳${appUser?.coinFund?.toFixed(2) ?? '0.00'}`}
                                                    </span>
                                                </div>
                                                {(appUser?.coinFund ?? 0) < finalPrice && !card.isResellerProduct && (
                                                    <div className="mt-3 text-xs text-destructive flex items-center gap-1.5 p-2 bg-destructive/10 rounded-md">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <span>আপনার Coin Fund এ যথেষ্ট ব্যালেন্স নেই।</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Paid cards - Normal payment methods
                            <>
                                <div className={cn(
                                    "grid gap-2",
                                    // Hide Instant Pay for Unipin Voucher [BD] and reseller products
                                    card.name === 'Unipin Voucher [BD]' || card.isResellerProduct ? "grid-cols-1" : "grid-cols-2"
                                )}>
                                    <div
                                        onClick={() => setPaymentMethod('wallet')}
                                        className={cn(
                                            'border-2 rounded-lg cursor-pointer transition-all overflow-hidden flex flex-col',
                                            paymentMethod === 'wallet' ? 'border-primary' : 'border-input bg-background hover:bg-muted'
                                        )}
                                    >
                                        <div className="relative w-full flex-grow p-4 flex items-center justify-center min-h-[140px]">
                                            <Image src="/wallet.png" alt="My Wallet" layout="fill" className="object-contain p-4 rounded-lg" />
                                        </div>
                                        <div className={cn(
                                            "p-2 text-center w-full text-sm font-semibold",
                                            paymentMethod === 'wallet' ? 'bg-primary text-white' : 'bg-muted'
                                        )}>
                                            My Wallet (৳: {walletBalance.toFixed(0)})
                                        </div>
                                    </div>

                                    {/* Hide Instant Pay for Unipin Voucher [BD] and reseller products */}
                                    {card.name !== 'Unipin Voucher [BD]' && !card.isResellerProduct && (
                                        <button
                                            onClick={() => !(isLimitedStockOffer && !card.isResellerProduct) && setPaymentMethod('instant')}
                                            disabled={isLimitedStockOffer && !card.isResellerProduct}
                                            className={cn(
                                                'border-2 rounded-lg cursor-pointer transition-all overflow-hidden flex flex-col disabled:opacity-50 disabled:cursor-not-allowed',
                                                paymentMethod === 'instant' && !(isLimitedStockOffer && !card.isResellerProduct) ? 'border-primary' : 'border-input bg-background hover:bg-muted'
                                            )}
                                        >
                                            <div className="relative w-full flex-grow p-4 flex items-center justify-center min-h-[80px]">
                                                <Image src="https://i.imgur.com/kUmq3Xe.png" alt="Instant Pay" layout="fill" className="object-contain" />
                                            </div>
                                            <div className={cn(
                                                "p-2 text-center w-full text-sm font-semibold",
                                                paymentMethod === 'instant' && !(isLimitedStockOffer && !card.isResellerProduct) ? 'bg-primary text-white' : 'bg-muted'
                                            )}>
                                                Instant Pay
                                            </div>
                                        </button>
                                    )}
                                </div>
                                <div className='mt-4 space-y-2'>
                                    <div className='flex items-center gap-2 text-sm p-2 rounded-md bg-blue-50 border border-blue-200'>
                                        <Info className='h-5 w-5 text-blue-500' />
                                        <p>আপনার অ্যাকাউন্ট ব্যালেন্স: <span className='font-bold'>৳{walletBalance.toFixed(2)}</span></p>
                                        <button className='ml-auto text-blue-500'><RefreshCw className='h-4 w-4' /></button>
                                    </div>
                                    <div className='flex items-center gap-2 text-sm p-2 rounded-md bg-green-50 border border-green-200'>
                                        <Info className='h-5 w-5 text-green-500' />
                                        <p>প্রোডাক্ট কিনতে আপনার প্রয়োজন: <span className='font-bold'>৳{finalPrice.toFixed(2)}</span></p>
                                    </div>
                                </div>
                                {paymentMethod === 'wallet' && !hasSufficientBalance && (
                                    <div className="mt-3 text-xs text-destructive flex items-center gap-1.5 p-2 bg-destructive/10 rounded-md">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>আপনার ওয়ালেটে যথেষ্ট ব্যালেন্স নেই।</span>
                                    </div>
                                )}
                                {isLimitedStockOffer && !card.isResellerProduct && (
                                    <div className="mt-3 text-xs text-blue-800 flex items-center gap-1.5 p-2 bg-blue-100 rounded-md">
                                        <Info className="h-4 w-4" />
                                        <span>এই সীমিত অফারটি শুধুমাত্র ওয়ালেট পেমেন্টের মাধ্যমে উপলব্ধ।</span>
                                    </div>
                                )}
                            </>
                        )}
                    </SectionCard>

                    <Card className="shadow-md">
                        <CardContent className="pt-6">


                            <div className={cn("space-y-2", card.purchaseType !== 'Free' && "mt-4")}>
                                <div className="flex justify-between">
                                    <span>
                                        {card.serviceType === 'Social Media'
                                            ? `${selectedOption?.name || card.name} ${socialMediaQuantity || 0}`
                                            : `${selectedOption ? selectedOption.name : card.name} x ${quantity}`
                                        }
                                    </span>
                                    <span>
                                        ৳{card.serviceType === 'Social Media'
                                            ? (() => {
                                                const qty = typeof socialMediaQuantity === 'number' ? socialMediaQuantity : 0;
                                                return ((selectedOption?.price || 0) / 1000 * qty).toFixed(2);
                                            })()
                                            : totalPrice.toFixed(2)
                                        }
                                    </span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>ডিসকাউন্ট</span>
                                        <span>-৳{discount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-lg">
                                    <span>মোট</span>
                                    <span>
                                        ৳{card.serviceType === 'Social Media'
                                            ? (() => {
                                                const qty = typeof socialMediaQuantity === 'number' ? socialMediaQuantity : 0;
                                                return ((selectedOption?.price || 0) / 1000 * qty).toFixed(2);
                                            })()
                                            : finalPrice.toFixed(2)
                                        }
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 mt-6">
                                {isLoggedIn ? (

                                    <Button size="lg" onClick={handleOrderNowClick} className="text-base font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white" disabled={!selectedOption || isProcessing || (paymentMethod === 'wallet' && !hasSufficientBalance)}>
                                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        এখনই কিনুন
                                    </Button>

                                ) : (
                                    <Button id="login-button" size="lg" onClick={() => router.push('/login')} className="text-base font-bold">
                                        অর্ডার করতে লগইন করুন
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="md:hidden print:hidden">
                        <SectionCard title="বিবরণ" >
                            <DescriptionRenderer description={card.description} />
                        </SectionCard>
                    </div>
                </div>
            </div>
            )}
        </>
    );
}
