'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { Order } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Calendar, Tag, User, List, DollarSign, CheckCircle, Clock, XCircle, Gamepad2, AlertTriangle, RefreshCcw, CreditCard, Wallet, Hash, CircleDashed, Key, MessageCircle, Eye, EyeOff, Copy, Ticket } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import React from "react";

interface OrderDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: Order;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'BDT',
        currencyDisplay: 'symbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount).replace('BDT', '৳');
};

const DetailRow = ({ icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => {
    const Icon = icon;
    return (
        <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg border">
            <Icon className="h-5 w-5 text-green-500 mt-1" />
            <div className="flex-grow">
                <p className="text-sm text-muted-foreground">{label}</p>
                <div className="font-semibold text-foreground break-all">{value}</div>
            </div>
        </div>
    );
};

const getStatusInfo = (status: Order['status']) => {
    switch (status) {
        case 'Completed':
            return { icon: CheckCircle, className: 'text-green-600', badgeClass: 'bg-green-100 text-green-800' };
        case 'Pending':
            return { icon: Clock, className: 'text-yellow-600', badgeClass: 'bg-yellow-100 text-yellow-800' };
        case 'Processing':
            return { icon: CircleDashed, className: 'text-orange-600', badgeClass: 'bg-orange-100 text-orange-800' };
        case 'Cancelled':
            return { icon: XCircle, className: 'text-red-600', badgeClass: 'bg-red-100 text-red-800' };
        case 'Refunded':
            return { icon: RefreshCcw, className: 'text-blue-600', badgeClass: 'bg-blue-100 text-blue-800' };
        default:
            return { icon: Clock, className: 'text-muted-foreground', badgeClass: 'bg-muted' };
    }
};

export default function OrderDetailDialog({ open, onOpenChange, order }: OrderDetailDialogProps) {
    const statusInfo = getStatusInfo(order.status);
    const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
    const { toast } = useToast();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-2xl bg-card border-4 border-green-500 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-center text-2xl font-bold">Order Details</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl my-4 border border-green-200">
                    <p className={cn("text-4xl font-extrabold tracking-tight text-primary")}>
                        {formatCurrency(order.totalAmount)}
                    </p>
                    <p className="text-sm font-medium capitalize text-muted-foreground">{order.productName || order.topUpCardId}</p>
                </div>

                <Separator />

                <div className="grid gap-3 py-4 text-sm max-h-[60vh] overflow-y-auto">
                    <DetailRow icon={Tag} label="Order ID" value={<span className="font-mono">#{order.orderId || 'N/A'}</span>} />
                    <DetailRow icon={Calendar} label="Date" value={new Date(order.orderDate).toLocaleString()} />

                    {/* UNIPIN CODES SECTION - MOVED TO TOP */}
                    {order.allocatedCodes && order.allocatedCodes.length > 0 && (
                        <div className="mt-2">
                            <h4 className="font-bold text-md mb-2 ml-1 flex items-center gap-2">
                                <Ticket className="h-5 w-5 text-green-600" />
                                Unipin Codes
                            </h4>
                            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                                <p className="text-xs text-muted-foreground mb-3">
                                    Your exclusive Unipin codes ({order.allocatedCodes.length} code{order.allocatedCodes.length > 1 ? 's' : ''})
                                </p>
                                <div className="space-y-2">
                                    {order.allocatedCodes.map((code, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-green-300 shadow-sm">
                                            <div className="flex-grow">
                                                <p className="text-xs text-muted-foreground">Code #{index + 1}</p>
                                                <p className="font-mono font-bold text-sm text-green-700">{code}</p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="ml-2 h-8"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(code);
                                                    toast({
                                                        title: 'কপি সফল!',
                                                        description: `Code #${index + 1} কপি করা হয়েছে`
                                                    });
                                                }}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-2">
                        <h4 className="font-bold text-md mb-2 ml-1">User Information</h4>
                        <DetailRow icon={User} label="User ID" value={<span className="font-mono">{order.userId}</span>} />
                        {order.eFootballDetails ? (
                            <>
                                <DetailRow icon={Gamepad2} label="Konami ID" value={<span className="font-mono">{order.eFootballDetails.konamiId}</span>} />
                                {order.eFootballDetails.password && (
                                    <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg border">
                                        <Key className="h-5 w-5 text-green-500 mt-1" />
                                        <div className="flex-grow">
                                            <p className="text-sm text-muted-foreground">Password</p>
                                            <div className="font-semibold font-mono text-foreground break-all flex items-center">
                                                <span>{isPasswordVisible ? order.eFootballDetails.password : '••••••••••'}</span>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 ml-2" onClick={() => setIsPasswordVisible(!isPasswordVisible)}>
                                                    {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <DetailRow icon={MessageCircle} label="WhatsApp Number" value={<span className="font-mono">{order.eFootballDetails.whatsappNumber}</span>} />
                            </>
                        ) : (
                            <DetailRow icon={Gamepad2} label="Game UID" value={<span className="font-mono">{order.gameUid}</span>} />
                        )}
                    </div>

                    <DetailRow icon={List} label="Item" value={`${order.productName} - ${order.productOption}`} />
                    <DetailRow icon={DollarSign} label="Total Amount" value={formatCurrency(order.totalAmount)} />

                    <div className="mt-2">
                        <h4 className="font-bold text-md mb-2 ml-1">Payment Information</h4>
                        {order.paymentMethod === 'Wallet' ? (
                            <DetailRow icon={Wallet} label="Payment Method" value="Wallet Payment" />
                        ) : (
                            <>
                                <DetailRow icon={CreditCard} label="Payment Method" value={order.manualPaymentDetails?.method || 'Manual/Instant'} />
                                {order.manualPaymentDetails?.senderPhone && (
                                    <DetailRow icon={User} label="Sender Phone" value={<span className="font-mono">{order.manualPaymentDetails.senderPhone}</span>} />
                                )}
                                {order.manualPaymentDetails?.transactionId && (
                                    <DetailRow icon={Hash} label="Transaction ID" value={<span className="font-mono">{order.manualPaymentDetails.transactionId}</span>} />
                                )}
                            </>
                        )}
                    </div>

                    <div className="mt-2">
                        <h4 className="font-bold text-md mb-2 ml-1">Order Status</h4>
                        <DetailRow icon={statusInfo.icon} label="Status" value={
                            <Badge className={cn('text-xs', statusInfo.badgeClass)}>{order.status}</Badge>
                        } />
                        {(order.status === 'Cancelled' || order.status === 'Refunded') && order.cancellationReason && (
                            <div className={cn(
                                "flex items-start gap-4 p-3 mt-2 rounded-lg border",
                                order.status === 'Cancelled' ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"
                            )}>
                                <AlertTriangle className={cn(
                                    "h-5 w-5 mt-1 flex-shrink-0",
                                    order.status === 'Cancelled' ? "text-red-500" : "text-blue-500"
                                )} />
                                <div className="flex-grow">
                                    <p className={cn(
                                        "text-sm font-semibold",
                                        order.status === 'Cancelled' ? "text-red-700" : "text-blue-700"
                                    )}>
                                        {order.status === 'Cancelled' ? 'Cancellation Reason' : 'Refund Reason'}
                                    </p>
                                    <p className={cn(
                                        "font-medium",
                                        order.status === 'Cancelled' ? "text-red-900" : "text-blue-900"
                                    )}>
                                        {order.cancellationReason}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
