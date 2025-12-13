'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  Users,
  CreditCard,
  Activity,
  ArrowUpRight,
  Loader2,
  BarChart,
} from 'lucide-react'
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, where, limit, orderBy, Timestamp } from 'firebase/firestore'
import type { Order, User } from '@/lib/data'
import { useMemo } from 'react'

export default function DashboardPage() {
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const allOrdersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'orders')) : null, [firestore]);
  const pendingOrdersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'orders'), where('status', '==', 'Pending')) : null, [firestore]);
  const recentOrdersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'orders'), orderBy('orderDate', 'desc'), limit(5)) : null, [firestore]);
  
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  const { data: allOrders, isLoading: isLoadingAllOrders } = useCollection<Order>(allOrdersQuery);
  const { data: pendingOrders, isLoading: isLoadingPendingOrders } = useCollection<Order>(pendingOrdersQuery);
  const { data: recentOrders, isLoading: isLoadingRecentOrders } = useCollection<Order>(recentOrdersQuery);
  
  const totalRevenue = useMemo(() => {
    if (!allOrders) return 0;
    return allOrders.reduce((acc, order) => acc + (order.status === 'Completed' ? order.totalAmount : 0), 0);
  }, [allOrders]);


  const chartData = useMemo(() => {
    if (!allOrders) return [];
    
    const monthlyData: { [key: string]: { name: string; revenue: number; orders: number } } = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Initialize last 12 months
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
        const monthName = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
        monthlyData[monthKey] = { name: monthName, revenue: 0, orders: 0 };
    }
    
    allOrders.forEach(order => {
        const orderDate = new Date(order.orderDate);
        const monthKey = `${orderDate.getFullYear()}-${orderDate.getMonth()}`;
        
        if (monthlyData[monthKey]) {
            if (order.status === 'Completed') {
                 monthlyData[monthKey].revenue += order.totalAmount;
            }
            monthlyData[monthKey].orders += 1;
        }
    });

    return Object.values(monthlyData);
  }, [allOrders]);
  
  const isLoading = isLoadingUsers || isLoadingAllOrders || isLoadingPendingOrders || isLoadingRecentOrders;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl font-semibold text-muted-foreground'>All-Time Summary</h2>
         <Button asChild>
            <Link href="/admin/reports/monthly">
              <BarChart className="mr-2 h-4 w-4" />
              View Reports
            </Link>
          </Button>
      </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">৳{totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                All-time revenue from completed orders.
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">+{users?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                Total registered users.
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">+{allOrders?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                All-time orders placed.
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">+{pendingOrders?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                Orders waiting for processing.
                </p>
            </CardContent>
            </Card>
        </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-7 mt-6">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <RechartsBarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `৳${value / 1000}k`}
                />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="revenue"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="orders"
                  fill="hsl(var(--accent))"
                  radius={[4, 4, 0, 0]}
                />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              Showing last {recentOrders?.length || 0} orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium">{order.userName}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
                        {order.userId}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">৳{order.totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex items-center justify-end">
              <Button asChild size="sm" className="ml-auto gap-1">
                <Link href="/admin/orders">
                  View All
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
