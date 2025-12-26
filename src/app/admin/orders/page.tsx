'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  MoreHorizontal,
  File,
  ListFilter,
  Search,
  Check,
  X,
  Clock,
  Loader2,
  Wallet,
  CreditCard,
  User,
  Gamepad2,
  Hash,
  ShoppingBag,
  Calendar,
  DollarSign,
  RefreshCcw,
  Copy,
  CircleDashed,
  Key,
  MessageCircle,
  Eye,
  EyeOff
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Order, TopUpCardData, User as AppUser } from '@/lib/data';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, updateDoc, orderBy, runTransaction, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { VerifiedBadge } from '@/components/VerifiedBadge';

type OrderStatus = Order['status'];
type OrderType = 'Game' | 'Others' | 'All' | 'eFootball';

const getStatusBadgeVariant = (status: OrderStatus) => {
  switch (status) {
    case 'Completed':
      return 'bg-green-100 text-green-800';
    case 'Pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'Processing':
      return 'bg-orange-100 text-orange-800';
    case 'Cancelled':
      return 'bg-red-100 text-red-800';
    case 'Refunded':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const orderType = (searchParams.get('type') as OrderType) || 'All';

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [currentStatus, setCurrentStatus] = React.useState<OrderStatus | undefined>(undefined);
  const [reason, setReason] = React.useState('');
  const { toast } = useToast();
  const [activeStatusTab, setActiveStatusTab] = React.useState('all');
  const [activeProductTab, setActiveProductTab] = React.useState('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
  const [orderToDelete, setOrderToDelete] = React.useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);

  const firestore = useFirestore();

  const allOrdersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'orders'), orderBy('orderDate', 'desc')) : null, [firestore]);
  const { data: allOrders, isLoading: isLoadingAll } = useCollection<Order>(allOrdersQuery);

  const { data: topUpCards, isLoading: isLoadingCards } = useCollection<TopUpCardData>(
    useMemoFirebase(() => firestore ? query(collection(firestore, 'top_up_cards')) : null, [firestore])
  );

  const { data: users, isLoading: isLoadingUsers } = useCollection<AppUser>(
    useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore])
  );

  const userMap = React.useMemo(() => {
    if (!users) return new Map<string, AppUser>();
    return new Map(users.map(user => [user.id, user]));
  }, [users]);


  const ordersForType = React.useMemo(() => {
    if (allOrders && topUpCards) {
      if (orderType === 'All') {
        return allOrders;
      } else {
        const cardTypeMap = new Map(topUpCards.map(card => [card.id, card.serviceType]));
        return allOrders.filter(order => cardTypeMap.get(order.topUpCardId) === orderType);
      }
    }
    return [];
  }, [allOrders, topUpCards, orderType]);

  const productTabs = React.useMemo(() => {
    if (orderType === 'All' || !ordersForType) return [];
    const productNames = new Set(ordersForType.map(order => order.productName || 'Unknown'));
    return ['all', ...Array.from(productNames)];
  }, [ordersForType, orderType]);


  React.useEffect(() => {
    // Reset product tab when order type changes
    setActiveProductTab('all');
  }, [orderType]);


  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setCurrentStatus(order.status);
    setReason(order.cancellationReason || '');
    setIsPasswordVisible(false);
    setIsDialogOpen(true);
  }

  const handleSaveChanges = async () => {
    if (!selectedOrder || !currentStatus || !firestore) return;

    const orderDocRef = doc(firestore, 'orders', selectedOrder.id);

    // Handling for "Refunded" status
    if (currentStatus === 'Refunded') {
      if (selectedOrder.status === 'Refunded') {
        toast({
          variant: 'destructive',
          title: "ইতিমধ্যে রিফান্ড করা হয়েছে",
          description: "এই অর্ডারটি ইতিমধ্যে রিফান্ড করা হয়ে গেছে।"
        });
        return;
      }

      const userDocRef = doc(firestore, 'users', selectedOrder.userId);
      try {
        await runTransaction(firestore, async (transaction) => {
          const orderDoc = await transaction.get(orderDocRef);
          if (orderDoc.exists() && orderDoc.data().status === 'Refunded') {
            throw new Error("এই অর্ডারটি ইতিমধ্যে অন্য কোনো অ্যাডমিন রিফান্ড করে দিয়েছেন।");
          }

          const userDoc = await transaction.get(userDocRef);
          if (!userDoc.exists()) {
            throw new Error("ব্যবহারকারীকে খুঁজে পাওয়া যায়নি।");
          }

          const userData = userDoc.data() as AppUser;
          const newBalance = (userData.walletBalance || 0) + selectedOrder.totalAmount;

          transaction.update(userDocRef, { walletBalance: newBalance });
          transaction.update(orderDocRef, { status: 'Refunded', cancellationReason: reason });
        });
        toast({
          title: "অর্ডার রিফান্ড করা হয়েছে",
          description: `৳${selectedOrder.totalAmount} ব্যবহারকারীর ওয়ালেটে যোগ করা হয়েছে।`
        });

      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: "রিফান্ড ব্যর্থ হয়েছে",
          description: error.message || "ওয়ালেট ব্যালেন্স আপডেট করা যায়নি।"
        });
      } finally {
        setIsDialogOpen(false);
      }
      return;
    }


    // Handling for other statuses
    const dataToUpdate: Partial<Order> = { status: currentStatus };
    if (currentStatus === 'Cancelled') {
      dataToUpdate.cancellationReason = reason;
    }

    try {
      // If status is being changed TO Completed, add coins to coin fund
      if (currentStatus === 'Completed' && selectedOrder.status !== 'Completed') {
        const userDocRef = doc(firestore, 'users', selectedOrder.userId);

        await runTransaction(firestore, async (transaction) => {
          const orderDoc = await transaction.get(orderDocRef);
          if (orderDoc.exists() && orderDoc.data().status === 'Completed') {
            throw new Error("এই অর্ডারটি ইতিমধ্যে অন্য কোনো অ্যাডমিন সম্পন্ন করে দিয়েছেন।");
          }

          const userDoc = await transaction.get(userDocRef);
          if (!userDoc.exists()) {
            throw new Error("ব্যবহারকারীকে খুঁজে পাওয়া যায়নি।");
          }

          const userData = userDoc.data() as AppUser;

          // Only add coins if NOT a reseller product (10% of order amount)
          const isResellerProduct = selectedOrder.isResellerProduct || false;

          if (!isResellerProduct) {
            const coinReward = selectedOrder.totalAmount * 0.1;
            const currentCoinFund = userData.coinFund || 0;
            transaction.update(userDocRef, {
              coinFund: currentCoinFund + coinReward
            });
          }

          // Update order status
          transaction.update(orderDocRef, dataToUpdate);
        });

        toast({
          title: "অর্ডার সম্পন্ন হয়েছে",
          description: selectedOrder.isResellerProduct ?
            "রিসেলার অর্ডার সম্পন্ন হয়েছে।" :
            `কয়েন ফান্ডে ৳${(selectedOrder.totalAmount * 0.1).toFixed(2)} যোগ করা হয়েছে।`
        });
      } else {
        await updateDoc(orderDocRef, dataToUpdate);
        toast({
          title: "অর্ডার আপডেট করা হয়েছে",
          description: `অর্ডার ${selectedOrder.id.substring(0, 5)}... এখন ${currentStatus}।`
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "আপডেট ব্যর্থ হয়েছে",
        description: error.message || "অর্ডারের স্ট্যাটাস আপডেট করা যায়নি।"
      });
    } finally {
      setIsDialogOpen(false);
    }
  }

  const handleDeleteClick = (orderId: string) => {
    setOrderToDelete(orderId);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = () => {
    if (!firestore || !orderToDelete) return;
    deleteDocumentNonBlocking(doc(firestore, 'orders', orderToDelete));
    toast({ variant: 'destructive', title: 'অর্ডার মুছে ফেলা হয়েছে' });
    setOrderToDelete(null);
    setIsDeleteAlertOpen(false);
  };

  const statusOptions: { value: OrderStatus, label: string, icon: React.ElementType }[] = [
    { value: 'Pending', label: 'পেন্ডিং', icon: Clock },
    { value: 'Processing', label: 'প্রসেসিং', icon: CircleDashed },
    { value: 'Completed', label: 'সম্পন্ন', icon: Check },
    { value: 'Cancelled', label: 'বাতিল', icon: X },
    { value: 'Refunded', label: 'রিফান্ড', icon: RefreshCcw },
  ]

  const filteredOrders = React.useMemo(() => {
    if (!ordersForType) return [];

    let ordersToDisplay = ordersForType;

    if (activeStatusTab !== 'all') {
      ordersToDisplay = ordersToDisplay.filter(order => {
        if (activeStatusTab === 'fulfilled') return order.status === 'Completed';
        if (activeStatusTab === 'pending') return order.status === 'Pending';
        if (activeStatusTab === 'processing') return order.status === 'Processing';
        if (activeStatusTab === 'cancelled') return order.status === 'Cancelled';
        if (activeStatusTab === 'refunded') return order.status === 'Refunded';
        return true;
      });
    }

    if (activeProductTab !== 'all') {
      ordersToDisplay = ordersToDisplay.filter(order => order.productName === activeProductTab);
    }

    if (searchTerm) {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      ordersToDisplay = ordersToDisplay.filter(order => {
        const user = userMap.get(order.userId);
        return (
          order.userName?.toLowerCase().includes(lowercasedSearchTerm) ||
          (user && user.email?.toLowerCase().includes(lowercasedSearchTerm)) ||
          (order.orderId && order.orderId.toString().includes(searchTerm))
        );
      });
    }
    return ordersToDisplay;
  }, [ordersForType, activeStatusTab, activeProductTab, searchTerm, userMap]);

  const renderTable = (orders: Order[], isLoading: boolean) => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!orders || orders.length === 0) {
      return <div className="text-center p-8 text-muted-foreground">এই ক্যাটাগরিতে কোনো অর্ডার পাওয়া যায়নি।</div>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>প্রোডাক্ট</TableHead>
            <TableHead className="text-right">স্ট্যাটাস</TableHead>
            <TableHead>
              <span className="sr-only">একশন</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <div className="font-medium">{order.productName} - {order.productOption}</div>
                <div className="text-sm text-muted-foreground">
                  Order #{order.orderId || 'N/A'} • {order.gameUid}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Badge className={getStatusBadgeVariant(order.status)} variant="outline">
                  {order.status}
                </Badge>
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
                      <span className="sr-only">মেনু</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>একশন</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => handleViewDetails(order)}>বিস্তারিত দেখুন</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteClick(order.id)} className="text-red-500">মুছে ফেলুন</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  const DetailRow = ({ icon: Icon, label, value, onCopy }: { icon: React.ElementType, label: string, value: React.ReactNode, onCopy?: () => void }) => (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-1" />
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="font-semibold">{value}</div>
      </div>
      {onCopy && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopy}>
          <Copy className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  const getPageTitle = () => {
    if (orderType === 'Game') return 'Game Orders';
    if (orderType === 'Others') return 'Others Orders';
    if (orderType === 'eFootball') return 'eFootball Orders';
    return 'All Orders';
  }

  return (
    <>
      <Tabs defaultValue="all" onValueChange={setActiveStatusTab}>
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">সব</TabsTrigger>
            <TabsTrigger value="pending">পেন্ডিং</TabsTrigger>
            <TabsTrigger value="processing">প্রসেসিং</TabsTrigger>
            <TabsTrigger value="fulfilled">সম্পন্ন</TabsTrigger>
            <TabsTrigger value="cancelled">বাতিল</TabsTrigger>
            <TabsTrigger value="refunded">রিফান্ড</TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1">
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                এক্সপোর্ট
              </span>
            </Button>
          </div>
        </div>
      </Tabs>

      {orderType !== 'All' && (
        <Tabs defaultValue="all" onValueChange={setActiveProductTab} className="mt-4">
          <TabsList className="flex flex-wrap h-auto">
            {productTabs.map(name => (
              <TabsTrigger key={name} value={name} className="capitalize">{name === 'all' ? 'সব প্রোডাক্ট' : name}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <Card className='mt-4'>
        <CardHeader>
          <CardTitle>{getPageTitle()}</CardTitle>
          <CardDescription>
            আপনার অর্ডার ম্যানেজ করুন এবং বিস্তারিত দেখুন।
          </CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ইমেল, নাম, বা অর্ডার আইডি দিয়ে খুঁজুন..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {renderTable(filteredOrders, isLoadingAll || isLoadingCards || isLoadingUsers)}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>অর্ডারের বিস্তারিত</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.orderId || 'N/A'} • Firestore ID: <span className='font-mono'>{selectedOrder?.id}</span>
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Order Details */}
              <Card>
                <CardHeader className='pb-4'>
                  <CardTitle className='text-base flex items-center gap-2'><ShoppingBag className='h-4 w-4' /> অর্ডারের বিবরণ</CardTitle>
                </CardHeader>
                <CardContent className='space-y-3 text-sm'>
                  <DetailRow icon={ShoppingBag} label="প্রোডাক্ট" value={`${selectedOrder.productName} - ${selectedOrder.productOption}`} />
                  <DetailRow icon={Hash} label="পরিমাণ" value={selectedOrder.quantity} />
                  <DetailRow icon={DollarSign} label="মোট মূল্য" value={`৳${selectedOrder.totalAmount.toFixed(2)}`} />
                  {selectedOrder.couponId && (
                    <DetailRow
                      icon={DollarSign}
                      label="ডিসকাউন্ট"
                      value={`- ৳${((selectedOrder.originalAmount || selectedOrder.totalAmount) - selectedOrder.totalAmount).toFixed(2)}`}
                    />
                  )}
                  <DetailRow icon={Calendar} label="অর্ডারের সময়" value={new Date(selectedOrder.orderDate).toLocaleString()} />
                </CardContent>
              </Card>

              {/* User Details */}
              <Card>
                <CardHeader className='pb-4'>
                  <CardTitle className='text-base flex items-center gap-2'><User className='h-4 w-4' /> ব্যবহারকারীর বিবরণ</CardTitle>
                </CardHeader>
                <CardContent className='space-y-3 text-sm'>
                  <DetailRow icon={User} label="নাম" value={
                    <div className="flex items-center gap-1">
                      {selectedOrder.userName}
                      <VerifiedBadge isVerified={userMap.get(selectedOrder.userId)?.hasVerifiedBadge} size="sm" />
                    </div>
                  } />
                  <DetailRow icon={Hash} label="ব্যবহারকারী আইডি" value={<span className='font-mono'>{userMap.get(selectedOrder.userId)?.uniqueId || 'N/A'}</span>} />

                  {selectedOrder.eFootballDetails ? (
                    <>
                      <DetailRow icon={Gamepad2} label="Konami ID" value={<span className='font-mono'>{selectedOrder.eFootballDetails.konamiId}</span>} onCopy={() => { navigator.clipboard.writeText(selectedOrder.eFootballDetails!.konamiId); toast({ title: 'Konami ID কপি করা হয়েছে' }); }} />
                      {selectedOrder.eFootballDetails.password && (
                        <div className="flex items-start gap-3">
                          <Key className="h-4 w-4 text-muted-foreground mt-1" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-muted-foreground">Password</p>
                            <div className="font-semibold font-mono flex items-center gap-2">
                              <span>{isPasswordVisible ? selectedOrder.eFootballDetails.password : '••••••••'}</span>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsPasswordVisible(!isPasswordVisible)}>
                                {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(selectedOrder.eFootballDetails!.password!); toast({ title: 'Password কপি করা হয়েছে' }); }}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <DetailRow icon={MessageCircle} label="WhatsApp Number" value={<span className='font-mono'>{selectedOrder.eFootballDetails.whatsappNumber}</span>} onCopy={() => { navigator.clipboard.writeText(selectedOrder.eFootballDetails!.whatsappNumber); toast({ title: 'WhatsApp Number কপি করা হয়েছে' }); }} />
                    </>
                  ) : (
                    <DetailRow
                      icon={Gamepad2}
                      label="গেম আইডি"
                      value={<span className='font-mono'>{selectedOrder.gameUid}</span>}
                      onCopy={() => {
                        navigator.clipboard.writeText(selectedOrder.gameUid);
                        toast({ title: 'গেম আইডি কপি করা হয়েছে' });
                      }}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Payment Details */}
              <Card>
                <CardHeader className='pb-4'>
                  <CardTitle className='text-base flex items-center gap-2'><CreditCard className='h-4 w-4' /> পেমেন্টের বিবরণ</CardTitle>
                </CardHeader>
                <CardContent className='space-y-3 text-sm'>
                  {selectedOrder.paymentMethod === 'Wallet' ? (
                    <div className="flex items-center gap-2 text-sm p-3 rounded-md bg-blue-50 border border-blue-200">
                      <Wallet className='h-5 w-5 text-blue-500' />
                      <p>পেমেন্ট মেথড: <span className='font-bold'>ওয়ালেট</span></p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm p-3 rounded-md bg-green-50 border border-green-200">
                      <CreditCard className='h-5 w-5 text-green-500' />
                      <p>পেমেন্ট মেথড: <span className='font-bold'>{selectedOrder.manualPaymentDetails?.method ? `${selectedOrder.manualPaymentDetails.method} - Instant Pay` : (selectedOrder.paymentMethod || 'ম্যানুয়াল / ইন্সট্যান্ট')}</span></p>
                    </div>
                  )}

                  {selectedOrder.manualPaymentDetails && (
                    <div className='border rounded-lg p-3 space-y-3 bg-muted/50'>
                      <DetailRow icon={CreditCard} label="মেথড" value={selectedOrder.manualPaymentDetails.method} />
                      <DetailRow icon={Hash} label="প্রেরকের নম্বর" value={<span className='font-mono'>{selectedOrder.manualPaymentDetails.senderPhone}</span>} />
                      {selectedOrder.manualPaymentDetails.transactionId && <DetailRow icon={Hash} label="লেনদেন আইডি" value={<span className='font-mono'>{selectedOrder.manualPaymentDetails.transactionId}</span>} />}
                    </div>
                  )}
                </CardContent>
              </Card>


              <div className="space-y-2 pt-4">
                <Label htmlFor="status">স্ট্যাটাস আপডেট করুন</Label>
                <Select
                  value={currentStatus}
                  onValueChange={(value: OrderStatus) => setCurrentStatus(value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="স্ট্যাটাস নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(currentStatus === 'Cancelled' || currentStatus === 'Refunded') && (
                <div className="space-y-2">
                  <Label htmlFor="reason">কারণ</Label>
                  <Textarea
                    id="reason"
                    placeholder="অর্ডারটি কেন বাতিল বা রিফান্ড করা হয়েছে তা ব্যাখ্যা করুন..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>বাতিল</Button>
            <Button onClick={handleSaveChanges}>পরিবর্তন সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this order.
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

