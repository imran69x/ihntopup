'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import type { Order } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type OrderWithUserName = Order & {
  finalUserName: string;
  hasVerifiedBadge?: boolean;
};

const getStatusBadgeVariant = (status: Order['status']) => {
  switch (status) {
    case 'Completed':
      return 'bg-green-100 text-green-800';
    case 'Pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'Processing':
      return 'bg-orange-100 text-orange-800';
    case 'Cancelled':
      return 'bg-red-100 text-red-800';
    case 'Refunded':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function RecentOrders() {
  const firestore = useFirestore();
  const [ordersWithNames, setOrdersWithNames] = useState<OrderWithUserName[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const fetchOrdersAndUsers = async () => {
      setIsLoading(true);
      const recentOrdersQuery = query(collection(firestore, 'orders'), orderBy('orderDate', 'desc'), limit(10));

      try {
        const orderSnapshot = await getDocs(recentOrdersQuery);
        const orders = orderSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Order))
          .filter(order => !order.isResellerProduct); // Exclude reseller orders from main page

        const enhancedOrders = await Promise.all(
          orders.map(async (order) => {
            let finalUserName = order.userName;
            let hasVerifiedBadge = false;

            if (!finalUserName && order.userId) {
              try {
                const userDocRef = doc(firestore, 'users', order.userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                  const userData = userDocSnap.data();
                  finalUserName = userData.name || `User...`;
                  hasVerifiedBadge = userData.hasVerifiedBadge || false;
                }
              } catch (userError) {
                console.error(`Failed to fetch user ${order.userId}`, userError);
                finalUserName = 'Guest User';
              }
            } else if (order.userId) {
              try {
                const userDocRef = doc(firestore, 'users', order.userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                  const userData = userDocSnap.data();
                  hasVerifiedBadge = userData.hasVerifiedBadge || false;
                }
              } catch (userError) {
                console.error(`Failed to fetch verified badge for user ${order.userId}`, userError);
              }
            }

            return {
              ...order,
              finalUserName: finalUserName || 'Guest User',
              hasVerifiedBadge,
            };
          })
        );

        setOrdersWithNames(enhancedOrders);
      } catch (error) {
        console.error("Error fetching recent orders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrdersAndUsers();
  }, [firestore]);

  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-3">
          <ShoppingCart className="h-6 w-6 text-primary" />
          <CardTitle>Latest Orders</CardTitle>
        </div>
        <CardDescription>Check out some of the latest orders on our website.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {ordersWithNames.map((order) => (
              <div key={order.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-10 w-10 border-2 border-primary/50">
                  <AvatarFallback>{order.finalUserName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <p className="font-semibold text-sm flex items-center gap-1">
                    {order.finalUserName}
                    {order.hasVerifiedBadge && (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="inline-block flex-shrink-0"
                        aria-label="Verified"
                      >
                        <g fillRule="evenodd" transform="translate(-98 -917)">
                          <path
                            d="m106.853 922.354-3.5 3.5a.499.499 0 0 1-.706 0l-1.5-1.5a.5.5 0 1 1 .706-.708l1.147 1.147 3.147-3.147a.5.5 0 1 1 .706.708m3.078 2.295-.589-1.149.588-1.15a.633.633 0 0 0-.219-.82l-1.085-.7-.065-1.287a.627.627 0 0 0-.6-.603l-1.29-.066-.703-1.087a.636.636 0 0 0-.82-.217l-1.148.588-1.15-.588a.631.631 0 0 0-.82.22l-.701 1.085-1.289.065a.626.626 0 0 0-.6.6l-.066 1.29-1.088.702a.634.634 0 0 0-.216.82l.588 1.149-.588 1.15a.632.632 0 0 0 .219.819l1.085.701.065 1.286c.014.33.274.59.6.604l1.29.065.703 1.088c.177.27.53.362.82.216l1.148-.588 1.15.589a.629.629 0 0 0 .82-.22l.701-1.085 1.286-.064a.627.627 0 0 0 .604-.601l.065-1.29 1.088-.703a.633.633 0 0 0 .216-.819"
                            fill="#1877F2"
                          />
                        </g>
                      </svg>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    {order.paymentMethod === 'CoinFund' && (
                      <Image src="/coin-icon.png" alt="Coin" width={14} height={14} className="w-3.5 h-3.5" />
                    )}
                    {order.productName} - {order.productOption} {order.quantity > 1 && <span className='font-bold text-primary'>(x{order.quantity})</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-primary flex items-center justify-end gap-1">
                    {order.paymentMethod === 'CoinFund' ? (
                      <>
                        <Image src="/coin-icon.png" alt="Coin" width={16} height={16} className="w-4 h-4" />
                        {order.totalAmount.toFixed(0)}
                      </>
                    ) : (
                      <>৳{order.totalAmount.toFixed(2)}</>
                    )}
                  </p>
                  <Badge variant="outline" className={cn("text-xs mt-1", getStatusBadgeVariant(order.status))}>
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))}
            {ordersWithNames.length === 0 && (
              <p className='text-center text-muted-foreground py-8'>No orders have been placed yet.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
