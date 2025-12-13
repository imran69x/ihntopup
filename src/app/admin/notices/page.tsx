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
import { useForm, Controller } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Notice } from '@/lib/data';


type NoticeFormValues = {
  title: string;
  content: string;
  type: 'Info' | 'Popup' | 'HowToOrder';
  status: boolean;
  imageUrl?: string;
  linkUrl?: string;
};

export default function NoticesPage() {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingNotice, setEditingNotice] = React.useState<Notice | null>(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
    const [noticeToDelete, setNoticeToDelete] = React.useState<string | null>(null);

    const firestore = useFirestore();
    const { toast } = useToast();
    const noticesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'notices')) : null, [firestore]);
    const { data: notices, isLoading } = useCollection<Notice>(noticesQuery);

    const { register, handleSubmit, reset, setValue, watch, control } = useForm<NoticeFormValues>();

    const existingNoticeTypes = React.useMemo(() => notices?.map(n => n.type) || [], [notices]);
    
    // Allow creating multiple notices of the same type, so this logic is simplified.
    const availableNoticeTypes: ('Info' | 'Popup' | 'HowToOrder')[] = ['Info', 'Popup', 'HowToOrder'];
    
    const canAddNew = true;

    const handleEdit = (notice: Notice) => {
        setEditingNotice(notice);
        reset({
            title: notice.title,
            content: notice.content,
            type: notice.type,
            status: notice.status === 'Active',
            imageUrl: notice.image?.src || '',
            linkUrl: notice.linkUrl || '',
        });
        setIsDialogOpen(true);
    }
    
    const handleAddNew = () => {
        if (!canAddNew) return;
        setEditingNotice(null);
        reset({ title: '', content: '', status: true, type: 'Info', imageUrl: '', linkUrl: '' });
        setIsDialogOpen(true);
    }
    
    const onSubmit = (data: NoticeFormValues) => {
        if (!firestore) return;
        const docData: Partial<Notice> = {
          title: data.title,
          content: data.content,
          type: data.type,
          status: data.status ? 'Active' : 'Inactive',
          image: data.imageUrl ? { src: data.imageUrl, hint: "notice image" } : null,
          linkUrl: data.linkUrl || null,
        };

        if (editingNotice) {
            updateDocumentNonBlocking(doc(firestore, 'notices', editingNotice.id), docData);
            toast({ title: 'নোটিশ সফলভাবে আপডেট করা হয়েছে' });
        } else {
            addDocumentNonBlocking(collection(firestore, 'notices'), docData);
            toast({ title: 'নোটিশ সফলভাবে যোগ করা হয়েছে' });
        }
        setIsDialogOpen(false);
    }

    const handleDeleteClick = (noticeId: string) => {
        setNoticeToDelete(noticeId);
        setIsDeleteAlertOpen(true);
    };

    const confirmDelete = () => {
        if (!firestore || !noticeToDelete) return;
        deleteDocumentNonBlocking(doc(firestore, 'notices', noticeToDelete));
        toast({ variant: 'destructive', title: 'নোটিশ মুছে ফেলা হয়েছে' });
        setNoticeToDelete(null);
        setIsDeleteAlertOpen(false);
    }

    const getStatusBadgeVariant = (status: Notice['status']) => {
        return status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
    };
    
    const getTypeBadgeVariant = (type: Notice['type']) => {
        switch(type){
            case 'Info': return 'bg-blue-100 text-blue-800';
            case 'Popup': return 'bg-purple-100 text-purple-800';
            case 'HowToOrder': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    const noticeTypeLabels: Record<Notice['type'], string> = {
        Info: 'তথ্য (ব্যানার)',
        Popup: 'পপ-আপ',
        HowToOrder: 'কিভাবে অর্ডার করবেন (লিঙ্ক)',
    };

    if (isLoading) {
      return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }


  return (
    <>
      <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">নোটিশসমূহ</h1>
          <Button onClick={handleAddNew} className="gap-1" disabled={!canAddNew}>
            <PlusCircle className="h-4 w-4" />
            নতুন নোটিশ যোগ করুন
          </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>নোটিশ ম্যানেজ করুন</CardTitle>
          <CardDescription>
            সাইট-জুড়ে ব্যানার বা পপ-আপ নোটিশ ম্যানেজ করুন।
          </CardDescription>
           <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="নোটিশ খুঁজুন..." className="pl-8 w-full" />
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>শিরোনাম</TableHead>
                <TableHead className="hidden sm:table-cell">ধরন</TableHead>
                <TableHead className="hidden md:table-cell">বিষয়বস্তু</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>
                  <span className="sr-only">একশন</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notices?.map((notice) => (
                <TableRow key={notice.id}>
                  <TableCell className="font-medium">{notice.title}</TableCell>
                   <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className={getTypeBadgeVariant(notice.type)}>{noticeTypeLabels[notice.type]}</Badge>
                    </TableCell>
                   <TableCell className="hidden md:table-cell max-w-xs truncate">{notice.content}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadgeVariant(notice.status)}>
                      {notice.status === 'Active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
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
                        <DropdownMenuItem onSelect={() => handleEdit(notice)}>এডিট</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteClick(notice.id)} className="text-red-500">মুছে ফেলুন</DropdownMenuItem>
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingNotice ? 'নোটিশ এডিট করুন' : 'নতুন নোটিশ যোগ করুন'}</DialogTitle>
              <DialogDescription>
                নোটিশের জন্য বিস্তারিত তথ্য পূরণ করুন।
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-4">
                <div className="space-y-2">
                    <Label htmlFor="title">শিরোনাম</Label>
                    <Input id="title" {...register('title', { required: true })} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="content">বিষয়বস্তু</Label>
                    <Textarea id="content" {...register('content', { required: true })} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="linkUrl">লিঙ্ক URL (ঐচ্ছিক)</Label>
                    <Input id="linkUrl" {...register('linkUrl')} placeholder="https://example.com/some-page" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="imageUrl">ছবির URL (ঐচ্ছিক)</Label>
                    <Input id="imageUrl" {...register('imageUrl')} placeholder="https://example.com/image.png" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="type">নোটিশের ধরন</Label>
                     <Controller
                        name="type"
                        control={control}
                        render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="একটি ধরন নির্বাচন করুন" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableNoticeTypes.map(type => (
                                    <SelectItem key={type} value={type}>
                                        {noticeTypeLabels[type]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        )}
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <Switch
                                id="status"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        )}
                    />
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
                    This action cannot be undone. This will permanently delete this notice.
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
