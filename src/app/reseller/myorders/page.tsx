'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ArrowRight, Box, CheckCircle, Clock, Search, XCircle, Loader2, RefreshCcw, CircleDashed } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import OrderDetailDialog from '@/components/OrderDetailDialog';
import type { Order } from '@/lib/data';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';

const getStatusStyles = (status: Order['status']) => {
    switch (status) {
        case 'Completed': return { variant: 'secondary', className: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle };
        case 'Pending': return { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock };
        case 'Processing': return { variant: 'secondary', className: 'bg-orange-100 text-orange-800 border-orange-300', icon: CircleDashed };
        case 'Cancelled': return { variant: 'secondary', className: 'bg-red-100 text-red-800 border-red-300', icon: XCircle };
        case 'Refunded': return { variant: 'secondary', className: 'bg-blue-100 text-blue-800 border-blue-300', icon: RefreshCcw };
        default: return { variant: 'secondary', className: 'bg-muted text-muted-foreground', icon: Clock };
    }
};

const StatCard = ({ title, value, color, icon: Icon }: { title: string; value: number; color: string; icon: React.ElementType }) => (
    <Card className={cn("shadow-md border-l-4", color)}>
        <CardContent className="p-4 flex items-center gap-3">
            <Icon className={cn("h-6 w-6", color.replace('border-', 'text-'))} />
            <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="text-xl font-bold">{value}</p>
            </div>
        </CardContent>
    </Card>
);

const OrderItem = ({ order, onViewDetails }: { order: Order, onViewDetails: (order: Order) => void }) => {
    const statusStyle = getStatusStyles(order.status);
    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-start gap-4">
                    <div className="bg-muted p-3 rounded-lg"><Box className="h-8 w-8 text-primary" /></div>
                    <div className="flex-grow">
                        <p className="font-bold">{order.productName || order.topUpCardId}</p>
                        <p className="text-sm text-muted-foreground">{order.productOption}</p>
                        <p className="text-xs text-muted-foreground">Order #<span className='font-mono'>{order.orderId || 'N/A'}</span></p>
                        <p className="text-sm text-muted-foreground">UID: {order.gameUid}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.orderDate).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <p className="font-bold text-lg text-primary flex items-center gap-1">
                            {order.paymentMethod === 'CoinFund' ? (
                                <> <Image src="/coin-icon.png" alt="Coin" width={18} height={18} className="w-[18px] h-[18px]" /> {order.totalAmount.toFixed(0)} </>
                            ) : (
                                <>৳{order.totalAmount.toFixed(2)}</>
                            )}
                        </p>
                        <Badge variant="secondary" className={cn("text-xs border rounded-full", statusStyle.className)}>{order.status}</Badge>
                    </div>
                </div>
                <div className="flex justify-end items-center mt-3 pt-3 border-t">
                    <button onClick={() => onViewDetails(order)} className="flex items-center text-sm text-primary font-semibold hover:underline">
                        View Details <ArrowRight className="h-4 w-4 ml-1" />
                    </button>
                </div>
            </CardContent>
        </Card>
    );
};

export default function ResellerOrdersPage() {
    const { firebaseUser } = useAuthContext();
    const firestore = useFirestore();

    const ordersQuery = useMemoFirebase(() => {
        if (!firebaseUser?.uid || !firestore) return null;
        // Fetch all user orders, filter for reseller products client-side to avoid composite index
        return query(
            collection(firestore, 'orders'),
            where('userId', '==', firebaseUser.uid),
            orderBy('orderDate', 'desc')
        );
    }, [firebaseUser?.uid, firestore]);

    const { data: allOrders, isLoading: isLoadingOrders, error: ordersError } = useCollection<Order>(ordersQuery);

    // Filter for reseller products client-side
    const orders = useMemo(() => {
        if (!allOrders) return [];
        return allOrders.filter(order => order.isResellerProduct === true);
    }, [allOrders]);

    const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Processing' | 'Completed' | 'Cancelled' | 'Refunded'>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const orderCounts = useMemo(() => {
        if (!orders) return { All: 0, Pending: 0, Processing: 0, Completed: 0, Cancelled: 0, Refunded: 0 };
        return {
            All: orders.length,
            Pending: orders.filter(o => o.status === 'Pending').length,
            Processing: orders.filter(o => o.status === 'Processing').length,
            Completed: orders.filter(o => o.status === 'Completed').length,
            Cancelled: orders.filter(o => o.status === 'Cancelled').length,
            Refunded: orders.filter(o => o.status === 'Refunded').length,
        }
    }, [orders]);

    const filteredOrders = useMemo(() => {
        if (!orders) return [];
        let filtered = orders;
        if (activeTab !== 'All') filtered = filtered.filter(order => order.status === activeTab);
        if (searchTerm) {
            filtered = filtered.filter(order =>
                (order.orderId && order.orderId.toString().includes(searchTerm)) ||
                order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.productName && order.productName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (order.gameUid && order.gameUid.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        return filtered;
    }, [activeTab, searchTerm, orders]);

    const tabs: (keyof typeof orderCounts)[] = ['All', 'Pending', 'Processing', 'Completed', 'Cancelled', 'Refunded'];

    return (
        <>
            <div className="container mx-auto px-4 py-6">
                <div className="flex items-center gap-2 mb-6">
                    <h1 className="text-3xl font-bold font-headline text-primary">Reseller Orders</h1>
                    <Box className="h-7 w-7 text-primary" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard title="Total Orders" value={orderCounts.All} color="border-blue-500" icon={Box} />
                    <StatCard title="Pending" value={orderCounts.Pending} color="border-yellow-500" icon={Clock} />
                    <StatCard title="Completed" value={orderCounts.Completed} color="border-green-500" icon={CheckCircle} />
                    <StatCard title="Cancelled" value={orderCounts.Cancelled} color="border-red-500" icon={XCircle} />
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="Search orders..." className="pl-10 h-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>

                <div className="flex items-center space-x-2 overflow-x-auto pb-2 mb-6">
                    {tabs.map(tab => (
                        <Button
                            key={tab}
                            variant={activeTab === tab ? 'default' : 'outline'}
                            onClick={() => setActiveTab(tab as any)}
                            className={cn("rounded-full flex-shrink-0", { "bg-primary text-white hover:bg-primary/90": activeTab === tab })}
                        >
                            {tab} ({orderCounts[tab]})
                        </Button>
                    ))}
                </div>

                {isLoadingOrders ? (
                    <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : ordersError ? (
                    <div className="text-center py-8 text-destructive">Error: {ordersError.message}</div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.length > 0 ? (
                            filteredOrders.map((order) => <OrderItem key={order.id} order={order} onViewDetails={setSelectedOrder} />)
                        ) : (
                            <p className="text-muted-foreground text-center py-8">No reseller orders found.</p>
                        )}
                    </div>
                )}
            </div>
            {selectedOrder && (
                <OrderDetailDialog order={selectedOrder} open={!!selectedOrder} onOpenChange={(isOpen) => !isOpen && setSelectedOrder(null)} />
            )}
        </>
    );
}
