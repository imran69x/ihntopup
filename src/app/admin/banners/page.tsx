'use client';

import * as React from 'react';
import {
  MoreHorizontal,
  PlusCircle,
  Search,
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
import { useForm } from 'react-hook-form';
import Image from 'next/image';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import type { BannerData } from '@/lib/data';
import { collection, query, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';


type BannerFormValues = {
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
};

export default function BannersPage() {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingBanner, setEditingBanner] = React.useState<BannerData | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
    const [bannerToDelete, setBannerToDelete] = React.useState<string | null>(null);

    const firestore = useFirestore();
    const { toast } = useToast();
    const bannersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'banners')) : null, [firestore]);
    const { data: banners, isLoading } = useCollection<BannerData>(bannersQuery);

    const { register, handleSubmit, reset, setValue, watch } = useForm<BannerFormValues>();

    const handleEdit = (banner: BannerData) => {
        setEditingBanner(banner);
        reset({
            imageUrl: banner.image?.src || banner.imageUrl,
            linkUrl: banner.linkUrl,
            isActive: banner.isActive,
        });
        setIsDialogOpen(true);
    }
    
    const handleAddNew = () => {
        setEditingBanner(null);
        reset({ imageUrl: '', linkUrl: '', isActive: true });
        setIsDialogOpen(true);
    }
    
    const onSubmit = (data: BannerFormValues) => {
        if (!firestore) return;

        const docData = {
          ...data,
          image: { src: data.imageUrl, hint: "banner" }, // simplified hint
        };

        if (editingBanner) {
            updateDocumentNonBlocking(doc(firestore, 'banners', editingBanner.id), docData);
            toast({ title: "ব্যানার আপডেট করা হয়েছে" });
        } else {
            addDocumentNonBlocking(collection(firestore, 'banners'), docData);
            toast({ title: "ব্যানার যোগ করা হয়েছে" });
        }
        setIsDialogOpen(false);
    }

    const confirmDelete = () => {
        if (!firestore || !bannerToDelete) return;
        deleteDocumentNonBlocking(doc(firestore, 'banners', bannerToDelete));
        toast({ variant: 'destructive', title: "ব্যানার মুছে ফেলা হয়েছে" });
        setBannerToDelete(null);
        setIsDeleteAlertOpen(false);
    }

    const handleDeleteClick = (bannerId: string) => {
        setBannerToDelete(bannerId);
        setIsDeleteAlertOpen(true);
    };

    const getStatusBadgeVariant = (isActive: boolean) => {
        return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
    };
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">ব্যানার</h1>
          <Button onClick={handleAddNew} className="gap-1">
            <PlusCircle className="h-4 w-4" />
            নতুন ব্যানার যোগ করুন
          </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ব্যানার ম্যানেজ করুন</CardTitle>
          <CardDescription>
            প্রমোশনাল ব্যানার যোগ, এডিট বা মুছে ফেলুন।
          </CardDescription>
           <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="ব্যানার খুঁজুন..." className="pl-8 w-full" />
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[150px] sm:table-cell">
                  প্রিভিউ
                </TableHead>
                <TableHead>লিংক URL</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>
                  <span className="sr-only">একশন</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners?.map((banner) => (
                <TableRow key={banner.id}>
                   <TableCell className="hidden sm:table-cell">
                    <Image
                      alt={banner.alt || 'Banner image'}
                      className="aspect-video rounded-md object-cover"
                      height="64"
                      src={banner.image?.src || banner.imageUrl}
                      width="128"
                    />
                  </TableCell>
                  <TableCell className="font-medium truncate max-w-xs">{banner.linkUrl}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadgeVariant(banner.isActive)}>
                      {banner.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
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
                        <DropdownMenuItem onSelect={() => handleEdit(banner)}>এডিট</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteClick(banner.id)} className="text-red-500">মুছে ফেলুন</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingBanner ? 'ব্যানার এডিট করুন' : 'নতুন ব্যানার যোগ করুন'}</DialogTitle>
              <DialogDescription>
                ব্যানারের জন্য বিস্তারিত তথ্য পূরণ করুন।
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">ছবির URL</Label>
                <Input id="imageUrl" {...register('imageUrl', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkUrl">লিংক URL</Label>
                <Input id="linkUrl" {...register('linkUrl', { required: true })} />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="status" checked={watch('isActive')} onCheckedChange={(checked) => setValue('isActive', checked)} />
                <Label htmlFor="status">সক্রিয়</Label>
              </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>বাতিল</Button>
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
                    This action cannot be undone. This will permanently delete this banner and remove its data from our servers.
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
