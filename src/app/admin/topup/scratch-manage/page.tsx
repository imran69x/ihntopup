'use client'

import * as React from 'react'
import { PlusCircle, Trash2, Loader2, Gift, ToggleLeft, ToggleRight } from 'lucide-react'
import { Label } from '@/components/ui/label'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase'
import type { ScratchCardReward, ScratchCardConfig } from '@/lib/data'
import { collection, query, doc, getDoc, setDoc, addDoc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { ImageUpload } from '@/components/ui/image-upload'
import { Textarea } from '@/components/ui/textarea'

const DAYS_OF_WEEK = [
    { value: 0, label: 'রবিবার (Sunday)' },
    { value: 1, label: 'সোমবার (Monday)' },
    { value: 2, label: 'মঙ্গলবার (Tuesday)' },
    { value: 3, label: 'বুধবার (Wednesday)' },
    { value: 4, label: 'বৃহস্পতিবার (Thursday)' },
    { value: 5, label: 'শুক্রবার (Friday)' },
    { value: 6, label: 'শনিবার (Saturday)' },
]

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ... imports

export default function ScratchManagementPage() {
    const [activeTab, setActiveTab] = React.useState('free'); // 'free' or 'paid'
    const [cardConfig, setCardConfig] = React.useState({
        isActive: false,
        availableDay: 5,
        name: 'সাপ্তাহিক স্ক্র্যাচ কার্ড',
        description: 'স্ক্র্যাচ করুন এবং পুরস্কার জিতুন!',
        imageUrl: '',
        claimLimit: 0, // 0 means unlimited
        currentWeekClaims: 0,
        cost: 0
    })

    const firestore = useFirestore();
    const { toast } = useToast();

    // Handler to save Config
    const handleSaveConfig = async () => {
        if (!firestore) return;

        try {
            const docId = activeTab === 'free' ? 'default' : 'paid';
            const configRef = doc(firestore, 'scratch_cards', docId);

            // Map state to db model
            const dataToSave: any = {
                name: cardConfig.name,
                availableDay: cardConfig.availableDay,
                description: cardConfig.description,
                isActive: cardConfig.isActive,
                imageUrl: cardConfig.imageUrl,
                claimLimit: cardConfig.claimLimit,
                currentWeekClaims: cardConfig.currentWeekClaims, // Usually shouldn't probably update this manually but keeping for now
                type: activeTab, // 'free' or 'paid'
            };

            if (activeTab === 'paid') {
                dataToSave.cost = cardConfig.cost;
            }

            await setDoc(configRef, dataToSave, { merge: true });
            toast({ title: 'Success', description: 'Configuration saved successfully' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save configuration' });
        }
    };

    const handleToggleActive = () => {
        setCardConfig(prev => ({ ...prev, isActive: !prev.isActive }));
    };

    // Fetch scratch card config based on activeTab
    React.useEffect(() => {
        if (!firestore) return;

        const fetchConfig = async () => {
            const docId = activeTab === 'free' ? 'default' : 'paid';
            const configRef = doc(firestore, 'scratch_cards', docId);
            const configDoc = await getDoc(configRef);

            if (configDoc.exists()) {
                const data = configDoc.data();
                setCardConfig({
                    isActive: data.isActive ?? false,
                    availableDay: data.availableDay ?? 5,
                    name: data.name || (activeTab === 'free' ? 'সাপ্তাহিক স্ক্র্যাচ কার্ড' : 'পেইড স্ক্র্যাচ কার্ড'),
                    description: data.description || 'স্ক্র্যাচ করুন এবং পুরস্কার জিতুন!',
                    imageUrl: data.imageUrl || '',
                    claimLimit: data.claimLimit || 0,
                    currentWeekClaims: data.currentWeekClaims || 0,
                    //@ts-ignore
                    cost: data.cost || (activeTab === 'paid' ? 10 : 0)
                });
            } else {
                // Reset to defaults if doc doesn't exist yet
                setCardConfig({
                    isActive: false,
                    availableDay: 5,
                    name: activeTab === 'free' ? 'সাপ্তাহিক স্ক্র্যাচ কার্ড' : 'পেইড স্ক্র্যাচ কার্ড',
                    description: 'স্ক্র্যাচ করুন এবং পুরস্কার জিতুন!',
                    imageUrl: '',
                    claimLimit: 0,
                    currentWeekClaims: 0,
                    //@ts-ignore
                    cost: activeTab === 'paid' ? 10 : 0
                });
            }
        };

        fetchConfig();
    }, [firestore, activeTab]);

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Gift className="h-7 w-7 text-yellow-500" />
                        স্ক্র্যাচ কার্ড ম্যানেজমেন্ট
                    </h1>
                </div>

                <Tabs defaultValue="free" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="free">ফ্রি কার্ড (সাপ্তাহিক)</TabsTrigger>
                        <TabsTrigger value="paid">পেইড কার্ড (৳10)</TabsTrigger>
                    </TabsList>


                    {/* Scratch Card Config */}
                    <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Gift className="h-5 w-5" />
                                    স্ক্র্যাচ কার্ড কনফিগারেশন
                                </CardTitle>
                                <Button
                                    onClick={handleToggleActive}
                                    variant={cardConfig.isActive ? 'default' : 'outline'}
                                    className="gap-2"
                                >
                                    {cardConfig.isActive ? (
                                        <>
                                            <ToggleRight className="h-5 w-5" />
                                            Active
                                        </>
                                    ) : (
                                        <>
                                            <ToggleLeft className="h-5 w-5" />
                                            Inactive
                                        </>
                                    )}
                                </Button>
                            </div>
                            <CardDescription>
                                একটি মাত্র স্ক্র্যাচ কার্ড। এখানে কনফিগার করুন।
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>কার্ডের নাম</Label>
                                    <Input
                                        value={cardConfig.name}
                                        onChange={(e) => setCardConfig(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="সাপ্তাহিক স্ক্র্যাচ কার্ড"
                                    />
                                </div>
                                {activeTab === 'free' && (
                                    <div className="space-y-2">
                                        <Label>উপলব্ধ দিন</Label>
                                        <Select
                                            value={String(cardConfig.availableDay)}
                                            onValueChange={(val) => setCardConfig(prev => ({ ...prev, availableDay: Number(val) }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DAYS_OF_WEEK.map(day => (
                                                    <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>কার্ডের ছবি</Label>
                                    <ImageUpload
                                        value={cardConfig.imageUrl}
                                        onChange={(url) => setCardConfig(prev => ({ ...prev, imageUrl: url }))}
                                        label=""
                                        placeholder="Upload Image"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{activeTab === 'paid' ? 'মাসিক ক্লেইম লিমিট (0 = আনলিমিটেড)' : 'সাপ্তাহিক ক্লেইম লিমিট (0 = আনলিমিটেড)'}</Label>
                                    <Input
                                        type="number"
                                        value={cardConfig.claimLimit}
                                        onChange={(e) => setCardConfig(prev => ({ ...prev, claimLimit: Number(e.target.value) }))}
                                        placeholder="0"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {activeTab === 'paid'
                                            ? `বর্তমান মাসে ক্লেইম: ${cardConfig.currentWeekClaims}` // We might want to rename this prop in state or display differently, but for now assuming it holds the relevant count
                                            : `বর্তমান সপ্তাহে ক্লেইম: ${cardConfig.currentWeekClaims}`
                                        }
                                    </p>
                                </div>
                                {activeTab === 'paid' && (
                                    <div className="space-y-2">
                                        <Label>কার্ডের দাম (টাকা/কয়েন)</Label>
                                        <Input
                                            type="number"
                                            value={cardConfig.cost}
                                            onChange={(e) => setCardConfig(prev => ({ ...prev, cost: Number(e.target.value) }))}
                                            placeholder="10"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>বিবরণ</Label>
                                <Textarea
                                    value={cardConfig.description}
                                    onChange={(e) => setCardConfig(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="স্ক্র্যাচ করুন এবং পুরস্কার জিতুন!"
                                />
                            </div>

                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSaveConfig} className="w-full">
                                কনফিগারেশন সংরক্ষণ করুন
                            </Button>
                        </CardFooter>
                    </Card>
                </Tabs>
            </div>
        </>
    )
}
