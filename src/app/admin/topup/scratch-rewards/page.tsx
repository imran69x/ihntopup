'use client'

import * as React from 'react'
import { MoreHorizontal, PlusCircle, Search, Trash2, Loader2, Gift } from 'lucide-react'

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useForm, Controller } from 'react-hook-form'
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase'
import type { ScratchCardReward } from '@/lib/data'
import { collection, query, doc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { ImageUpload } from '@/components/ui/image-upload'

type RewardFormValues = {
    name: string
    type: 'wallet' | 'coins' | 'item' | 'no_reward'
    value: number
    imageUrl?: string
    category: 'free' | 'paid'
    isActive: boolean
}

export default function ScratchRewardsPage() {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [editingReward, setEditingReward] = React.useState<ScratchCardReward | null>(null)
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);
    const [rewardToDelete, setRewardToDelete] = React.useState<string | null>(null);

    const firestore = useFirestore();
    const { toast } = useToast();

    const rewardsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'scratch_card_rewards')) : null, [firestore]);

    const { data: rewards, isLoading: isLoadingRewards } = useCollection<ScratchCardReward>(rewardsQuery);

    const {
        register,
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<RewardFormValues>({
        defaultValues: {
            name: '',
            type: 'wallet',
            value: 0,
            imageUrl: '',
            category: 'free',
            isActive: true,
        },
    })

    const handleEdit = (reward: ScratchCardReward) => {
        setEditingReward(reward)
        reset({
            name: reward.name,
            type: reward.type,
            value: reward.value,
            imageUrl: reward.imageUrl || '',
            category: (reward.category as 'free' | 'paid') || 'free',
            isActive: reward.isActive ?? true,
        })
        setIsDialogOpen(true)
    }

    const handleAddNew = () => {
        setEditingReward(null)
        reset({
            name: '',
            type: 'wallet',
            value: 0,
            imageUrl: '',
            category: 'free',
            isActive: true,
        })
        setIsDialogOpen(true)
    }

    const onSubmit = (data: RewardFormValues) => {
        if (!firestore) return;

        const collectionRef = collection(firestore, 'scratch_card_rewards');

        const docData: any = {
            name: data.name,
            type: data.type,
            value: Number(data.value),
            imageUrl: data.imageUrl || null,
            category: data.category,
            isActive: data.isActive,
            updatedAt: new Date(),
        };

        if (editingReward) {
            const docRef = doc(firestore, 'scratch_card_rewards', editingReward.id);
            updateDocumentNonBlocking(docRef, docData);
            toast({ title: "রিওয়ার্ড আপডেট করা হয়েছে", description: `${data.name} আপডেট করা হয়েছে।` });
        } else {
            docData.createdAt = new Date();
            addDocumentNonBlocking(collectionRef, docData);
            toast({ title: "রিওয়ার্ড যোগ করা হয়েছে", description: `${data.name} যোগ করা হয়েছে।` });
        }
        setIsDialogOpen(false)
    }

    const handleDeleteClick = (rewardId: string) => {
        setRewardToDelete(rewardId);
        setIsDeleteAlertOpen(true);
    };

    const confirmDelete = () => {
        if (!firestore || !rewardToDelete) return;
        deleteDocumentNonBlocking(doc(firestore, 'scratch_card_rewards', rewardToDelete));
        toast({ variant: 'destructive', title: "রিওয়ার্ড মুছে ফেলা হয়েছে" });
        setRewardToDelete(null);
        setIsDeleteAlertOpen(false);
    }

    const getTypeBadgeColor = (type: string) => {
        if (type === 'wallet') return 'bg-green-100 text-green-800';
        if (type === 'coins') return 'bg-yellow-100 text-yellow-800';
        if (type === 'item') return 'bg-purple-100 text-purple-800';
        return 'bg-gray-100 text-gray-800';
    }

    return (
        <>
            <div className="flex items-center justify-between gap-2 mb-4">
                <h1 className="text-2xl font-bold">স্ক্র্যাচ কার্ড রিওয়ার্ডস</h1>
                <Button onClick={handleAddNew} className="gap-1">
                    <PlusCircle className="h-4 w-4" />
                    নতুন রিওয়ার্ড যোগ করুন
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="রিওয়ার্ড খুঁজুন..." className="pl-8 w-full" />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoadingRewards ? (
                        <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>নাম</TableHead>
                                    <TableHead>ক্যাটাগরি</TableHead>
                                    <TableHead>টাইপ</TableHead>
                                    <TableHead className="text-right">মূল্য</TableHead>
                                    <TableHead>স্ট্যাটাস</TableHead>
                                    <TableHead>
                                        <span className="sr-only">একশন</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rewards?.map((reward) => (
                                    <TableRow key={reward.id}>
                                        <TableCell className="font-medium">{reward.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={reward.category === 'paid' ? 'default' : 'secondary'}>
                                                {reward.category === 'paid' ? 'Premium (Paid)' : 'Free'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getTypeBadgeColor(reward.type)}>
                                                {reward.type === 'wallet' ? 'Wallet' :
                                                    reward.type === 'coins' ? 'Coins' :
                                                        reward.type === 'item' ? 'Item' : 'No Reward'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {reward.type === 'wallet' ? `৳${reward.value}` :
                                                reward.type === 'coins' ? `${reward.value} Coins` :
                                                    reward.type === 'item' ? 'Item' : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={reward.isActive ? 'default' : 'secondary'}>
                                                {reward.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
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
                                                    <DropdownMenuItem onSelect={() => handleEdit(reward)}>
                                                        এডিট
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDeleteClick(reward.id)} className="text-red-500">মুছে ফেলুন</DropdownMenuItem>
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
                        <strong>{rewards?.length || 0}</strong> টি রিওয়ার্ড
                    </div>
                </CardFooter>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingReward ? 'রিওয়ার্ড এডিট করুন' : 'নতুন রিওয়ার্ড যোগ করুন'}
                        </DialogTitle>
                        <DialogDescription>
                            স্ক্র্যাচ কার্ড রিওয়ার্ডের জন্য বিস্তারিত তথ্য পূরণ করুন।
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="category">কার্ড ক্যাটাগরি</Label>
                                <Controller
                                    name="category"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="free">Free Card</SelectItem>
                                                <SelectItem value="paid">Premium (Paid) Card</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">রিওয়ার্ডের নাম</Label>
                                <Input
                                    id="name"
                                    {...register('name', { required: 'নাম আবশ্যক' })}
                                    placeholder="যেমন: ৳50 ওয়ালেট বোনাস"
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-500">{errors.name.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">রিওয়ার্ড টাইপ</Label>
                                <Controller
                                    name="type"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="টাইপ নির্বাচন করুন" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="wallet">Wallet Balance</SelectItem>
                                                <SelectItem value="coins">Coins</SelectItem>
                                                <SelectItem value="item">Special Item</SelectItem>
                                                <SelectItem value="no_reward">No Reward</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="value">মূল্য (বা পরিমাণ)</Label>
                                <Input
                                    id="value"
                                    type="number"
                                    {...register('value', { required: 'মূল্য আবশ্যক', valueAsNumber: true, min: 0 })}
                                    placeholder="0"
                                />
                                <p className="text-xs text-muted-foreground">No Reward এর জন্য 0 সেট করুন</p>
                                {errors.value && (
                                    <p className="text-sm text-red-500">{errors.value.message}</p>
                                )}
                            </div>
                        </div>

                        {/* REMOVED IMAGE UPLOAD AS PER REQUEST */}

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
                            This action cannot be undone. This will permanently delete this reward.
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
