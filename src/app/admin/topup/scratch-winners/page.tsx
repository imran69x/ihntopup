'use client'

import React, { useState } from 'react'
import { collection, query, orderBy, limit, where } from 'firebase/firestore'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { Gift, Copy, Check, Search, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'
import type { UserScratchCardClaim } from '@/lib/data'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ScratchWinnersPage() {
    const firestore = useFirestore()
    const { toast } = useToast()
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'item' | 'wallet' | 'coins' | 'no_reward'>('all')
    const [activeTab, setActiveTab] = useState('free') // 'free' | 'paid' | 'all'

    const claimsQuery = useMemoFirebase(() => {
        if (!firestore) return null

        // Base query constraints
        const constraints: any[] = [orderBy('claimedAt', 'desc'), limit(100)]

        // Filter by card type if not 'all'
        // REMOVED: Server-side filtering to avoid Missing Index issues.
        // We will filter client-side since we are fetching recent 100 claims anyway.
        /* 
        if (activeTab !== 'all') {
            constraints.unshift(where('cardType', '==', activeTab));
        }
        */

        return query(collection(firestore, 'scratch_card_claims'), ...constraints)
    }, [firestore]) // Removed activeTab dependency for query, we filter client side

    const { data: claims, isLoading } = useCollection<UserScratchCardClaim>(claimsQuery)

    const filteredClaims = claims?.filter(claim => {
        const matchesSearch =
            claim.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            claim.submittedUid?.includes(searchTerm) ||
            claim.userId.includes(searchTerm)

        const matchesFilter = statusFilter === 'all' || claim.rewardDetails?.type === statusFilter

        const matchesType = activeTab === 'all' ||
            (activeTab === 'free' && (!claim.cardType || claim.cardType === 'free')) || // Handle logic for older/default free claims
            (activeTab === 'paid' && claim.cardType === 'paid')

        return matchesSearch && matchesFilter && matchesType
    }) || []

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast({ title: 'Copied!', description: 'UID copied to clipboard.' })
    }

    const getTypeBadgeColor = (type: string) => {
        if (type === 'wallet') return 'bg-green-100 text-green-800'
        if (type === 'coins') return 'bg-blue-100 text-blue-800'
        return 'bg-purple-100 text-purple-800'
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Gift className="h-7 w-7 text-yellow-500" />
                স্ক্র্যাচ কার্ড বিজয়ীদের তালিকা
            </h1>

            <Tabs defaultValue="free" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="free">ফ্রি কার্ড বিজয়ী</TabsTrigger>
                    <TabsTrigger value="paid">পেইড কার্ড বিজয়ী</TabsTrigger>
                    <TabsTrigger value="all">সকল বিজয়ী</TabsTrigger>
                </TabsList>

                <Card>
                    <CardHeader>
                        <CardTitle>বিজয়ীদের তালিকা</CardTitle>
                        <CardDescription>সবশেষ ১০০ জন বিজয়ী এবং তাদের পুরস্কারের বিবরণ।</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Filters */}
                        <div className="flex gap-4 mb-6">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by User, UID..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('all')}
                                >
                                    All
                                </Button>
                                <Button
                                    variant={statusFilter === 'item' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('item')}
                                >
                                    Items Only
                                </Button>
                                <Button
                                    variant={statusFilter === 'no_reward' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('no_reward')}
                                >
                                    No Reward
                                </Button>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="p-8 text-center text-muted-foreground">Loading winners...</div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Reward</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Submitted UID</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredClaims.map((claim) => (
                                            <TableRow key={claim.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-full bg-slate-100 overflow-hidden relative">
                                                            {claim.userPhotoURL ? (
                                                                <Image src={claim.userPhotoURL} alt="User" fill className="object-cover" />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center text-xs font-bold text-slate-400">
                                                                    {claim.userName?.charAt(0) || 'U'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-sm">{claim.userName || 'Unknown'}</span>
                                                            <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={claim.userId}>
                                                                {claim.userId}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {claim.rewardDetails?.imageUrl && (
                                                            <div className="h-6 w-6 relative">
                                                                <Image src={claim.rewardDetails.imageUrl} alt="Reward" fill className="object-contain" />
                                                            </div>
                                                        )}
                                                        <span className="font-medium">{claim.rewardDetails?.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={getTypeBadgeColor(claim.rewardDetails?.type || '')}>
                                                        {claim.rewardDetails?.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {claim.submittedUid ? (
                                                        <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded border border-slate-200 w-fit">
                                                            <span className="font-mono text-xs">{claim.submittedUid}</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-4 w-4 text-slate-500 hover:text-slate-900"
                                                                onClick={() => copyToClipboard(claim.submittedUid!)}
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {new Date(claim.claimedAt).toLocaleDateString()}
                                                    <br />
                                                    {new Date(claim.claimedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={claim.status === 'scratched' ? 'default' : 'outline'}>
                                                        {claim.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredClaims.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                                    No winners found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </Tabs>
        </div>
    )
}
