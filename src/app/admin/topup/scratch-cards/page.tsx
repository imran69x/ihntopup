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
import { useForm, Controller } from 'react-hook-form'
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase'
import type { ScratchCardConfig, ScratchCardReward } from '@/lib/data'
import { collection, query, doc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { ImageUpload } from '@/components/ui/image-upload'
import { Checkbox } from '@/components/ui/checkbox'

type CardFormValues = {
    name: string
    description: string
    imageUrl: string
    availableDay: number
    rewards: string[]
    isActive: boolean
    sortOrder?: number
}

const DAYS_OF_WEEK = [
    { value: 0, label: 'রবিবার (Sunday)' },
    { value: 1, label: 'সোমবার (Monday)' },
    { value: 2, label: 'মঙ্গলবার (Tuesday)' },
    { value: 3, label: 'বুধবার (Wednesday)' },
    { value: 4, label: 'বৃহস্পতিবার (Thursday)' },
    { value: 5, label: 'শুক্রবার (Friday)' },
    { value: 6, label: 'শনিবার (Saturday)' },
]

export default function ScratchCardsPage() {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [editingCard, setEditingCard] = React.useState<ScratchCardConfig | null>(null)
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
    const [cardToDelete, setCardToDelete] = React.useState<string | null>(null);

    const firestore = useFirestore();
    const { toast } = useToast();

    const cardsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'scratch_cards')) : null, [firestore]);
    const rewardsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'scratch_card_rewards')) : null, [firestore]);

    const { data: cards, isLoading: isLoadingCards } = useCollection<ScratchCardConfig>(cardsQuery);
    const { data: rewards, isLoading: isLoadingRewards } = useCollection<ScratchCardReward>(rewardsQuery);

    const activeRewards = React.useMemo(() => rewards?.filter(r => r.isActive) || [], [rewards]);

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
            availableDay: 5, // Friday by default
            rewards: [],
            isActive: true,
            sortOrder: 0,
        },
    })

    const selectedRewards = watch('rewards')

    const handleEdit = (card: ScratchCardConfig) => {
        setEditingCard(card)
        reset({
            name: card.name,
            description: card.description || '',
            imageUrl: card.imageUrl || '',
            availableDay: card.availableDay,
            rewards: card.rewards || [],
            isActive: card.isActive ?? true,
            sortOrder: card.sortOrder || 0,
        })
        setIsDialogOpen(true)
    }

    const handleAddNew = () => {
        setEditingCard(null)
        reset({
            name: '',
            description: '',
            imageUrl: '',
            availableDay: 5,
            rewards: [],
            isActive: true,
            sortOrder: 0,
        })
        setIsDialogOpen(true)
    }

    const onSubmit = (data: CardFormValues) => {
        if (!firestore) return;

        if (data.rewards.length === 0) {
            toast({ variant: 'destructive', title: "অন্তত একটি রিওয়ার্ড নির্বাচন করুন" });
            return;
        }

        const collectionRef = collection(firestore, 'scratch_cards');

        const docData: any = {
            name: data.name,
            description: data.description,
            imageUrl: data.imageUrl,
            availableDay: Number(data.availableDay),
            rewards: data.rewards,
            isActive: data.isActive,
            sortOrder: Number(data.sortOrder) || 0,
            updatedAt: new Date(),
        };

        if (editingCard) {
            const docRef = doc(firestore, 'scratch_cards', editingCard.id);
            updateDocumentNonBlocking(docRef, docData);
            toast({ title: "স্ক্র্যাচ কার্ড আপডেট করা হয়েছে", description: `${data.name} আপডেট করা হয়েছে।` });
        } else {
            docData.createdAt = new Date();
            addDocumentNonBlocking(collectionRef, docData);
            toast({ title: "স্ক্র্যাচ কার্ড যোগ করা হয়েছে", description: `${data.name} যোগ করা হয়েছে।` });
        }
        setIsDialogOpen(false)
    }

    const handleDeleteClick = (cardId: string) => {
        setCardToDelete(cardId);
        setIsDeleteAlertOpen(true);
    };

    const confirmDelete = () => {
        if (!firestore || !cardToDelete) return;
        deleteDocumentNonBlocking(doc(firestore, 'scratch_cards', cardToDelete));
        toast({ variant: 'destructive', title: "স্ক্র্যাচ কার্ড মুছে ফেলা হয়েছে" });
        setCardToDelete(null);
        setIsDeleteAlertOpen(false);
    }

    const getDayName = (day: number) => {
        return DAYS_OF_WEEK.find(d => d.value === day)?.label || 'N/A';
    }

    const handleRewardToggle = (rewardId: string, checked: boolean) => {
        const currentRewards = watch('rewards') || [];
        if (checked) {
            setValue('rewards', [...currentRewards, rewardId]);
        } else {
            setValue('rewards', currentRewards.filter(id => id !== rewardId));
        }
    }

    const isLoading = isLoadingCards || isLoadingRewards;

    return (
        <>
            <div className="flex items-center justify-between gap-2 mb-4">
                <h1 className="text-2xl font-bold">স্ক্র্যাচ কার্ডস</h1>
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
                                    <TableHead className="md:table-cell">উপলব্ধ দিন</TableHead>
                                    <TableHead className="text-right sm:table-cell">রিওয়ার্ডস</TableHead>
                                    <TableHead className="text-right sm:table-cell">Sort Order</TableHead>
                                    <TableHead>স্ট্যাটাস</TableHead>
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
                                                src={card.imageUrl || 'https://placehold.co/64x64'}
                                                width="64"
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{card.name}</TableCell>
                                        <TableCell className="md:table-cell">
                                            <Badge variant="outline">{getDayName(card.availableDay)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right sm:table-cell font-mono">
                                            {card.rewards?.length || 0}
                                        </TableCell>
                                        <TableCell className="text-right sm:table-cell font-mono">
                                            {card.sortOrder || 0}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={card.isActive ? 'default' : 'secondary'}>
                                                {card.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
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
                        <strong>{cards?.length || 0}</strong> টি স্ক্র্যাচ কার্ড
                    </div>
                </CardFooter>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCard ? 'স্ক্র্যাচ কার্ড এডিট করুন' : 'নতুন স্ক্র্যাচ কার্ড যোগ করুন'}
                        </DialogTitle>
                        <DialogDescription>
                            স্ক্র্যাচ কার্ডের জন্য বিস্তারিত তথ্য পূরণ করুন।
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">কার্ডের নাম</Label>
                            <Input
                                id="name"
                                {...register('name', { required: 'নাম আবশ্যক' })}
                                placeholder="যেমন: সাপ্তাহিক লাকি ড্র"
                            />
                            {errors.name && (
                                <p className="text-sm text-red-500">{errors.name.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">বিবরণ</Label>
                            <Textarea
                                id="description"
                                {...register('description')}
                                placeholder="স্ক্র্যাচ করুন এবং পুরস্কার জিতুন!"
                            />
                        </div>

                        <Controller
                            name="imageUrl"
                            control={control}
                            rules={{ required: 'ছবি আবশ্যক' }}
                            render={({ field }) => (
                                <ImageUpload
                                    value={field.value}
                                    onChange={field.onChange}
                                    label="কার্ডের ছবি"
                                    placeholder="https://example.com/image.png"
                                />
                            )}
                        />
                        {errors.imageUrl && (
                            <p className="text-sm text-red-500">{errors.imageUrl.message}</p>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="availableDay">উপলব্ধ দিন</Label>
                                <Controller
                                    name="availableDay"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="একটি দিন নির্বাচন করুন" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DAYS_OF_WEEK.map(day => (
                                                    <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
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
                        </div>

                        <div className="space-y-2">
                            <Label>রিওয়ার্ডস নির্বাচন করুন</Label>
                            <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                                {activeRewards.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">কোনো সক্রিয় রিওয়ার্ড নেই। প্রথমে রিওয়ার্ড তৈরি করুন।</p>
                                ) : (
                                    activeRewards.map(reward => (
                                        <div key={reward.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`reward-${reward.id}`}
                                                checked={selectedRewards?.includes(reward.id)}
                                                onCheckedChange={(checked) => handleRewardToggle(reward.id, checked as boolean)}
                                            />
                                            <label
                                                htmlFor={`reward-${reward.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                            >
                                                {reward.name} - {reward.type === 'wallet' ? `৳${reward.value}` : `${reward.value} Coins`}
                                            </label>
                                        </div>
                                    ))
                                )}
                            </div>
                            {selectedRewards?.length === 0 && (
                                <p className="text-sm text-red-500">অন্তত একটি রিওয়ার্ড নির্বাচন করুন</p>
                            )}
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
                            <Label htmlFor="status-mode">সক্রিয়</Label>
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
                            This action cannot be undone. This will permanently delete this scratch card.
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
