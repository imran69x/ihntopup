'use client'

import * as React from 'react'
import { MoreHorizontal, PlusCircle, Search, Trash2, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import Image from 'next/image'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase'
import type { TopUpCardData, TopUpCategory, TopUpCardOption } from '@/lib/data'
import { collection, query, doc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'

type CardFormValues = {
  name: string
  description: string
  imageUrl: string
  categoryId: string;
  serviceType: 'Game' | 'Others' | 'eFootball';
  purchaseType: 'Paid' | 'Free';
  isActive: boolean
  price?: number;
  sortOrder?: number;
  options: TopUpCardOption[]
}

export default function TopupCardsPage() {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingCard, setEditingCard] = React.useState<TopUpCardData | null>(null)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
  const [cardToDelete, setCardToDelete] = React.useState<string | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();

  const cardsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'top_up_cards')) : null, [firestore]);
  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'categories')) : null, [firestore]);

  const { data: cards, isLoading: isLoadingCards } = useCollection<TopUpCardData>(cardsQuery);
  const { data: categories, isLoading: isLoadingCategories } = useCollection<TopUpCategory>(categoriesQuery);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CardFormValues>({
    defaultValues: {
      name: '',
      description: '',
      imageUrl: '',
      categoryId: '',
      serviceType: 'Game',
      purchaseType: 'Paid',
      isActive: true,
      price: undefined,
      sortOrder: 0,
      options: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options',
  })

  const hasOptions = watch('options').length > 0

  const handleEdit = (card: TopUpCardData) => {
    setEditingCard(card)
    reset({
      name: card.name,
      description: card.description || '',
      imageUrl: card.image?.src || '',
      categoryId: card.categoryId,
      serviceType: card.serviceType || 'Game',
      purchaseType: card.purchaseType || 'Paid',
      isActive: card.isActive ?? true,
      price: card.price,
      sortOrder: card.sortOrder || 0,
      options: card.options?.map(o => ({
        ...o,
        inStock: o.inStock ?? true,
        stockLimit: o.stockLimit,
        stockSoldCount: o.stockSoldCount || 0,
      })) || [],
    })
    setIsDialogOpen(true)
  }

  const handleAddNew = () => {
    setEditingCard(null)
    reset({
      name: '',
      description: '',
      imageUrl: '',
      categoryId: '',
      serviceType: 'Game',
      purchaseType: 'Paid',
      isActive: true,
      price: 0,
      sortOrder: 0,
      options: [{ name: '', price: 0, inStock: true, stockLimit: undefined, stockSoldCount: 0 }]
    })
    setIsDialogOpen(true)
  }

  const onSubmit = (data: CardFormValues) => {
    if (!firestore) return;

    const collectionRef = collection(firestore, 'top_up_cards');

    // Check if this is a reseller product
    const isResellerProduct = data.categoryId === 'reseller';

    const docData: any = {
      name: data.name,
      description: data.description,
      image: { src: data.imageUrl, hint: data.name.toLowerCase().replace(/ /g, '-') },
      categoryId: isResellerProduct ? 'reseller' : data.categoryId,
      serviceType: data.serviceType,
      purchaseType: data.purchaseType,
      price: data.options.length > 0 ? (data.options[0].price || 0) : (data.price || 0),
      options: data.options.map(opt => ({
        ...opt,
        stockLimit: opt.stockLimit ? Number(opt.stockLimit) : null,
        stockSoldCount: opt.stockSoldCount || 0
      })),
      isActive: data.isActive,
      sortOrder: Number(data.sortOrder) || 0,
    };

    // Set isResellerProduct flag
    if (isResellerProduct) {
      docData.isResellerProduct = true;
    }

    // Filter out undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(docData).filter(([_, value]) => value !== undefined)
    );

    if (editingCard) {
      const docRef = doc(firestore, 'top_up_cards', editingCard.id);
      updateDocumentNonBlocking(docRef, cleanedData);
      toast({ title: "কার্ড আপডেট করা হয়েছে", description: `${data.name} আপডেট করা হয়েছে।` });
    } else {
      addDocumentNonBlocking(collectionRef, cleanedData);
      toast({ title: "কার্ড যোগ করা হয়েছে", description: `${data.name} যোগ করা হয়েছে।` });
    }
    setIsDialogOpen(false)
  }

  const handleDeleteClick = (cardId: string) => {
    setCardToDelete(cardId);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = () => {
    if (!firestore || !cardToDelete) return;
    deleteDocumentNonBlocking(doc(firestore, 'top_up_cards', cardToDelete));
    toast({ variant: 'destructive', title: "কার্ড মুছে ফেলা হয়েছে" });
    setCardToDelete(null);
    setIsDeleteAlertOpen(false);
  }

  const getCategoryName = (categoryId: string) => {
    return categories?.find(c => c.id === categoryId)?.name || 'N/A';
  }

  const isLoading = isLoadingCards || isLoadingCategories;

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h1 className="text-2xl font-bold">টপ-আপ কার্ড</h1>
        <Button onClick={handleAddNew} className="gap-1">
          <PlusCircle className="h-4 w-4" />
          নতুন কার্ড যোগ করুন
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="কার্ড খুঁজুন..." className="pl-8 w-full" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[64px] sm:table-cell">
                    ছবি
                  </TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead className="md:table-cell">ক্যাটাগরি</TableHead>
                  <TableHead className="text-right sm:table-cell">মূল্য</TableHead>
                  <TableHead className="text-right sm:table-cell">Sort Order</TableHead>
                  <TableHead>
                    <span className="sr-only">একশন</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards?.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="sm:table-cell">
                      <Image
                        alt={card.name}
                        className="aspect-square rounded-md object-cover"
                        height="64"
                        src={card.image?.src || 'https://placehold.co/64x64'}
                        width="64"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{card.name}</TableCell>
                    <TableCell className="md:table-cell">
                      <Badge variant="outline">{getCategoryName(card.categoryId)}</Badge>
                    </TableCell>
                    <TableCell className="text-right sm:table-cell">
                      ৳{card.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right sm:table-cell font-mono">
                      {card.sortOrder || 0}
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
                          <DropdownMenuItem onSelect={() => handleEdit(card)}>
                            এডিট
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteClick(card.id)} className="text-red-500">মুছে ফেলুন</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            <strong>{cards?.length || 0}</strong> এর মধ্যে <strong>1-{cards?.length || 0}</strong> টি প্রোডাক্ট দেখানো হচ্ছে
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCard ? 'কার্ড এডিট করুন' : 'নতুন কার্ড যোগ করুন'}
            </DialogTitle>
            <DialogDescription>
              টপ-আপ কার্ডের জন্য বিস্তারিত তথ্য পূরণ করুন।
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-4">
            <div className="space-y-2">
              <Label htmlFor="name">কার্ডের নাম</Label>
              <Input
                id="name"
                {...register('name', { required: 'নাম আবশ্যক' })}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">বিবরণ</Label>
              <Textarea id="description" {...register('description')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">ছবির URL</Label>
              <Input
                id="imageUrl"
                {...register('imageUrl')}
                placeholder="https://example.com/image.png"
              />
            </div>


            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">ক্যাটাগরি</Label>
                <Controller
                  name="categoryId"
                  control={control}
                  rules={{ required: 'ক্যাটাগরি আবশ্যক' }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="একটি ক্যাটাগরি নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reseller">রিসেলার পেজ (Reseller Page)</SelectItem>
                        {categories?.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.categoryId && <p className="text-sm text-red-500">{errors.categoryId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceType">সার্ভিসের ধরন</Label>
                <Controller
                  name="serviceType"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="সার্ভিসের ধরন নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Game">গেম সার্ভিস</SelectItem>
                        <SelectItem value="eFootball">eFootball</SelectItem>
                        <SelectItem value="Others">অন্যান্য সার্ভিস</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchaseType">পেমেন্ট টাইপ</Label>
                <Controller
                  name="purchaseType"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="পেমেন্ট টাইপ নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Paid">Paid (Wallet/Instant)</SelectItem>
                        <SelectItem value="Free">Free (Coin Only)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="flex items-center pt-4 space-x-2">
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

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                {...register('sortOrder', { valueAsNumber: true })}
                placeholder="e.g., 10"
              />
            </div>

            <div className="border-t my-4" />

            <div className="space-y-4">
              <Label>মূল্যের বিকল্প</Label>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2 p-3 border rounded-lg bg-muted">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 flex-grow">
                    <div className="space-y-1">
                      <Label htmlFor={`options.${index}.name`} className="text-xs">বিকল্পের নাম</Label>
                      <Input {...register(`options.${index}.name` as const, { required: true })} placeholder="যেমন ১০০ ডায়মন্ড" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`options.${index}.price`} className="text-xs">মূল্য (৳)</Label>
                      <Input type="number" {...register(`options.${index}.price` as const, { required: true, valueAsNumber: true })} placeholder="যেমন ১০০" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`options.${index}.stockLimit`} className="text-xs">স্টক লিমিট (ঐচ্ছিক)</Label>
                      <Input type="number" {...register(`options.${index}.stockLimit` as const, { valueAsNumber: true })} placeholder="e.g., 20" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 ml-2">
                    <Controller
                      name={`options.${index}.inStock`}
                      control={control}
                      defaultValue={true}
                      render={({ field }) => (
                        <Switch
                          id={`options-instock-${index}`}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor={`options-instock-${index}`} className="text-xs">In Stock</Label>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', price: 0, inStock: true, stockLimit: undefined, stockSoldCount: 0 })}>
                <PlusCircle className="mr-2 h-4 w-4" />
                বিকল্প যোগ করুন
              </Button>
            </div>


            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                বাতিল
              </Button>
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
              This action cannot be undone. This will permanently delete this card.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteAlertOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
