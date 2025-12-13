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
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import type { TopUpCategory } from '@/lib/data';
import { collection, query, doc } from 'firebase/firestore';
import { useForm, Controller } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';


type CategoryFormValues = {
  name: string;
  status: 'Active' | 'Draft';
  sortOrder: number;
};

export default function CategoriesPage() {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingCategory, setEditingCategory] = React.useState<TopUpCategory | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
    const [categoryToDelete, setCategoryToDelete] = React.useState<string | null>(null);

    const firestore = useFirestore();
    const { toast } = useToast();
    const { register, handleSubmit, reset, setValue, watch, control } = useForm<CategoryFormValues>();

    const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'categories')) : null, [firestore]);
    const { data: categories, isLoading } = useCollection<TopUpCategory>(categoriesQuery);

    const handleEdit = (category: TopUpCategory) => {
        setEditingCategory(category);
        reset({
            name: category.name,
            status: category.status as 'Active' | 'Draft' || 'Draft',
            sortOrder: category.sortOrder || 0
        });
        setIsDialogOpen(true);
    }
    
    const handleAddNew = () => {
        setEditingCategory(null);
        reset({
            name: '',
            status: 'Draft',
            sortOrder: 0
        });
        setIsDialogOpen(true);
    }
    
    const onSubmit = async (data: CategoryFormValues) => {
        if (!firestore) return;
        setIsSubmitting(true);
        
        const docData = {
          name: data.name,
          status: data.status,
          sortOrder: Number(data.sortOrder) || 0,
          description: editingCategory?.description || '', // Preserve existing data
          imageUrl: editingCategory?.imageUrl || '' // Preserve existing data
        };

        try {
            if (editingCategory) {
                const docRef = doc(firestore, 'categories', editingCategory.id);
                updateDocumentNonBlocking(docRef, docData);
                toast({ title: "ক্যাটাগরি আপডেট করা হয়েছে", description: `${data.name} আপডেট করা হয়েছে।` });
            } else {
                addDocumentNonBlocking(collection(firestore, 'categories'), docData);
                toast({ title: "ক্যাটাগরি যোগ করা হয়েছে", description: `${data.name} যোগ করা হয়েছে।` });
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            console.error("Failed to save category:", error);
            toast({
                variant: 'destructive',
                title: "অপারেশন ব্যর্থ",
                description: error.message || "ক্যাটাগরি সংরক্ষণ করা যায়নি। অনুমতি পরীক্ষা করুন অথবা আবার চেষ্টা করুন।",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleDeleteClick = (categoryId: string) => {
        setCategoryToDelete(categoryId);
        setIsDeleteAlertOpen(true);
    };

    const confirmDelete = () => {
        if (!firestore || !categoryToDelete) return;
        const docRef = doc(firestore, 'categories', categoryToDelete);
        deleteDocumentNonBlocking(docRef);
        toast({ variant: 'destructive', title: "ক্যাটাগরি মুছে ফেলা হয়েছে" });
        setCategoryToDelete(null);
        setIsDeleteAlertOpen(false);
    }

    const getStatusBadgeVariant = (status: TopUpCategory['status']) => {
        return status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
    };
    
    const sortedCategories = React.useMemo(() => {
        if (!categories) return [];
        return [...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }, [categories]);

    if (isLoading) {
      return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">টপ-আপ ক্যাটাগরি</h1>
          <Button onClick={handleAddNew} className="gap-1">
            <PlusCircle className="h-4 w-4" />
            নতুন ক্যাটাগরি যোগ করুন
          </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ক্যাটাগরি ম্যানেজ করুন</CardTitle>
          <CardDescription>
            টপ-আপ ক্যাটাগরি যোগ, এডিট বা মুছে ফেলুন।
          </CardDescription>
           <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="ক্যাটাগরি খুঁজুন..." className="pl-8 w-full" />
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>নাম</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead className="text-right">Sort Order</TableHead>
                <TableHead>
                  <span className="sr-only">একশন</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadgeVariant(category.status)}>
                      {category.status === 'Active' ? 'সক্রিয়' : 'খসড়া'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{category.sortOrder || 0}</TableCell>
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
                        <DropdownMenuItem onSelect={() => handleEdit(category)}>এডিট</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteClick(category.id)} className="text-red-500">মুছে ফেলুন</DropdownMenuItem>
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
              <DialogTitle>{editingCategory ? 'ক্যাটাগরি এডিট করুন' : 'নতুন ক্যাটাগরি যোগ করুন'}</DialogTitle>
              <DialogDescription>
                {editingCategory ? `${editingCategory.name}-এর জন্য বিস্তারিত আপডেট করুন।` : 'নতুন ক্যাটাগরির জন্য বিস্তারিত তথ্য পূরণ করুন।'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">ক্যাটাগরির নাম</Label>
                <Input id="name" {...register('name', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input id="sortOrder" type="number" {...register('sortOrder', { valueAsNumber: true })} />
              </div>
              <div className="flex items-center space-x-2">
                 <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="status-mode"
                        checked={field.value === 'Active'}
                        onCheckedChange={(checked) => field.onChange(checked ? 'Active' : 'Draft')}
                      />
                    )}
                  />
                <Label htmlFor="status-mode">সক্রিয়</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>বাতিল</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                সংরক্ষণ
              </Button>
            </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this category.
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
