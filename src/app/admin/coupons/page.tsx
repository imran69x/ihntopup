'use client';

import * as React from 'react';
import {
  MoreHorizontal,
  PlusCircle,
  Search,
  Loader2,
  CheckCircle2,
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { useForm, Controller } from 'react-hook-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import type { Coupon } from '@/lib/data';
import { collection, query, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

type CouponFormValues = {
  name: string;
  code: string;
  type: 'Percentage' | 'Fixed';
  value: number;
  usageLimitPerUser?: number;
  totalUsageLimit?: number;
  isActive: boolean;
  minPurchaseAmount?: number;
  expiryDate?: string;
  isStoreVisible?: boolean;
  claimLimit?: number;
};

export default function CouponsPage() {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingCoupon, setEditingCoupon] = React.useState<Coupon | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
    const [couponToDelete, setCouponToDelete] = React.useState<string | null>(null);

    const firestore = useFirestore();
    const { toast } = useToast();
    const couponsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'coupons')) : null, [firestore]);
    const { data: coupons, isLoading } = useCollection<Coupon>(couponsQuery);
    
    const { register, handleSubmit, setValue, reset, watch, control } = useForm<CouponFormValues>();
    const isStoreVisible = watch('isStoreVisible');


    const handleEdit = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        reset({
            name: coupon.name,
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            usageLimitPerUser: coupon.usageLimitPerUser,
            totalUsageLimit: coupon.totalUsageLimit,
            isActive: coupon.isActive,
            minPurchaseAmount: coupon.minPurchaseAmount,
            expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : '',
            isStoreVisible: coupon.isStoreVisible || false,
            claimLimit: coupon.claimLimit || 0
        });
        setIsDialogOpen(true);
    }
    
    const handleAddNew = () => {
        setEditingCoupon(null);
        reset({
            name: '',
            code: '',
            type: 'Fixed',
            value: 0,
            usageLimitPerUser: 1,
            totalUsageLimit: undefined,
            isActive: true,
            minPurchaseAmount: 0,
            expiryDate: '',
            isStoreVisible: false,
            claimLimit: 0
        });
        setIsDialogOpen(true);
    }
    
    const onSubmit = (data: CouponFormValues) => {
        if (!firestore) return;
        
        const docData = { 
            ...data, 
            expiryDate: data.expiryDate ? new Date(data.expiryDate).toISOString() : null,
            minPurchaseAmount: data.minPurchaseAmount || null,
            usageLimitPerUser: data.usageLimitPerUser || null,
            totalUsageLimit: data.totalUsageLimit || null,
            isStoreVisible: data.isStoreVisible || false,
            claimLimit: data.isStoreVisible ? (data.claimLimit || 0) : null,
            claimedCount: editingCoupon?.claimedCount || 0,
        };

        if (editingCoupon) {
            const docRef = doc(firestore, 'coupons', editingCoupon.id);
            updateDocumentNonBlocking(docRef, docData);
            toast({ title: 'কুপন সফলভাবে আপডেট করা হয়েছে!' });
        } else {
            const collectionRef = collection(firestore, 'coupons');
            addDocumentNonBlocking(collectionRef, docData);
            toast({ title: 'কুপন সফলভাবে যোগ করা হয়েছে!' });
        }

        setIsDialogOpen(false);
    }

    const handleDeleteClick = (couponId: string) => {
        setCouponToDelete(couponId);
        setIsDeleteAlertOpen(true);
    };

    const confirmDelete = () => {
      if (!firestore || !couponToDelete) return;
      deleteDocumentNonBlocking(doc(firestore, 'coupons', couponToDelete));
      toast({ variant: 'destructive', title: 'কুপন মুছে ফেলা হয়েছে' });
      setCouponToDelete(null);
      setIsDeleteAlertOpen(false);
    }

    const getStatus = (coupon: Coupon) => {
        if (!coupon.isActive) return 'Inactive';
        if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
            return 'Expired';
        }
        return 'Active';
    };

    const getStatusBadgeVariant = (status: string) => {
        if (status === 'Active') return 'bg-green-100 text-green-800';
        if (status === 'Expired') return 'bg-gray-100 text-gray-800';
        return 'bg-yellow-100 text-yellow-800';
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }


  return (
    <>
      <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">কুপন</h1>
          <Button onClick={handleAddNew} className="gap-1">
            <PlusCircle className="h-4 w-4" />
            নতুন কুপন যোগ করুন
          </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>কুপন ম্যানেজ করুন</CardTitle>
          <CardDescription>
            ডিসকাউন্ট কুপন যোগ, এডিট বা মুছে ফেলুন।
          </CardDescription>
           <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="কুপন খুঁজুন..." className="pl-8 w-full" />
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>নাম</TableHead>
                <TableHead>কোড</TableHead>
                <TableHead className="hidden md:table-cell">ধরন</TableHead>
                <TableHead className="hidden md:table-cell">মান</TableHead>
                <TableHead className="hidden sm:table-cell">স্টোর</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>
                  <span className="sr-only">একশন</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons?.map((coupon) => {
                const status = getStatus(coupon);
                return (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium">{coupon.name}</TableCell>
                  <TableCell className="font-medium font-mono">{coupon.code}</TableCell>
                   <TableCell className="hidden md:table-cell">{coupon.type === 'Percentage' ? 'শতাংশ' : 'নির্দিষ্ট পরিমাণ'}</TableCell>
                   <TableCell className="hidden md:table-cell">{coupon.type === 'Percentage' ? `${coupon.value}%` : `৳${coupon.value}`}</TableCell>
                   <TableCell className="hidden sm:table-cell">
                        {coupon.isStoreVisible && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                   </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadgeVariant(status)}>
                      {status === 'Active' ? 'সক্রিয়' : status === 'Expired' ? 'মেয়াদোত্তীর্ণ' : 'নিষ্ক্রিয়'}
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
                        <DropdownMenuItem onSelect={() => handleEdit(coupon)}>এডিট</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteClick(coupon.id)} className="text-red-500">মুছে ফেলুন</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? 'কুপন এডিট করুন' : 'নতুন কুপন যোগ করুন'}</DialogTitle>
              <DialogDescription>
                {editingCoupon ? `${editingCoupon.name}-এর জন্য বিস্তারিত আপডেট করুন।` : 'নতুন কুপনের জন্য বিস্তারিত তথ্য পূরণ করুন।'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
               <div className="space-y-2">
                <Label htmlFor="name">কুপনের নাম</Label>
                <Input id="name" {...register('name', { required: true })} placeholder="যেমন 'নতুন ব্যবহারকারী ডিসকাউন্ট'" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">কুপন কোড</Label>
                <Input id="code" {...register('code', { required: true })} placeholder="যেমন 'WELCOME10'" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">ধরন</Label>
                     <Select onValueChange={(value) => setValue('type', value as any)} value={watch('type')}>
                        <SelectTrigger>
                            <SelectValue placeholder="ধরন নির্বাচন করুন" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Percentage">শতাংশ</SelectItem>
                            <SelectItem value="Fixed">নির্দিষ্ট পরিমাণ</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="value">মান</Label>
                    <Input id="value" type="number" {...register('value', { required: true, valueAsNumber: true })} />
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="minPurchaseAmount">সর্বনিম্ন ক্রয় (৳) <span className='text-muted-foreground'>(ঐচ্ছিক)</span></Label>
                    <Input id="minPurchaseAmount" type="number" {...register('minPurchaseAmount', { valueAsNumber: true })} placeholder="যেমন ৫০০" />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="usageLimitPerUser">ব্যবহার/ব্যবহারকারী <span className='text-muted-foreground'>(ঐচ্ছিক)</span></Label>
                    <Input id="usageLimitPerUser" type="number" {...register('usageLimitPerUser', { valueAsNumber: true })} placeholder="যেমন ১" />
                  </div>
              </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="totalUsageLimit">মোট ব্যবহার সীমা <span className='text-muted-foreground'>(ঐচ্ছিক)</span></Label>
                      <Input id="totalUsageLimit" type="number" {...register('totalUsageLimit', { valueAsNumber: true })} placeholder="যেমন ১০০" />
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="expiryDate">মেয়াদ শেষ হওয়ার তারিখ <span className='text-muted-foreground'>(ঐচ্ছিক)</span></Label>
                      <Input id="expiryDate" type="date" {...register('expiryDate')} />
                  </div>
              </div>
              <div className="flex items-center space-x-2">
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="status-mode"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="status-mode">সক্রিয়</Label>
              </div>
              <div className="space-y-3 rounded-lg border p-3">
                 <div className="flex items-center space-x-2">
                    <Controller
                      name="isStoreVisible"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          id="store-visible"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="store-visible">স্টোরে দেখান</Label>
                </div>
                {isStoreVisible && (
                    <div className="space-y-2 pt-2">
                        <Label htmlFor="claimLimit">সর্বমোট ক্লেইম সংখ্যা</Label>
                        <Input id="claimLimit" type="number" {...register('claimLimit', { valueAsNumber: true, min: 1 })} placeholder="কতজন ক্লেইম করতে পারবে?" />
                    </div>
                )}
              </div>
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>বাতিল</Button>
              <Button type="submit">সংরক্ষণ</Button>
            </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this coupon.
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
