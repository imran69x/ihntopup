'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase'
import { collection, query, where, doc, getDoc, orderBy } from 'firebase/firestore'
import type { ScratchCardConfig, UserScratchCardClaim } from '@/lib/data'
import { useAuthContext } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Gift, Loader2, Sparkles, X, History, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import { useToast } from '@/hooks/use-toast'
import { getAuth } from 'firebase/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function ScratchCardDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { appUser, firebaseUser } = useAuthContext()
    const firestore = useFirestore()
    const { toast } = useToast()
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const [activeTab, setActiveTab] = useState('free')
    const [scratchCard, setScratchCard] = useState<ScratchCardConfig | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isClaiming, setIsClaiming] = useState(false)

    // Bulk Buy State
    const [isBuyDialogOpen, setIsBuyDialogOpen] = useState(false)
    const [buyQuantity, setBuyQuantity] = useState(1)

    // Scratch Modal States
    const [activeScratchClaim, setActiveScratchClaim] = useState<UserScratchCardClaim | null>(null)
    const [isScratchModalOpen, setIsScratchModalOpen] = useState(false)
    const [isScratching, setIsScratching] = useState(false)
    const [isCardScratched, setIsCardScratched] = useState(false) // Visual state for canvas
    const [scratchReward, setScratchReward] = useState<any>(null)
    const [scratchPercentage, setScratchPercentage] = useState(0)

    const [isCollecting, setIsCollecting] = useState(false)
    const [uidInput, setUidInput] = useState('')

    const cardId = activeTab === 'free' ? 'default' : 'paid'

    // Fetch scratch card config
    useEffect(() => {
        if (!firestore) return

        const fetchCard = async () => {
            setIsLoading(true)
            const cardRef = doc(firestore, 'scratch_cards', cardId);
            const cardDoc = await getDoc(cardRef);
            if (cardDoc.exists()) {
                setScratchCard({ id: cardDoc.id, ...cardDoc.data() } as ScratchCardConfig)
            }
            setIsLoading(false)
        }

        fetchCard()
    }, [firestore, cardId])

    // Reset states on tab change
    useEffect(() => {
        setBuyQuantity(1);
    }, [activeTab]);

    // Fetch user's claims for this card type
    // For Paid: could be many. For Free: usually relevant for this week.
    const claimsQuery = useMemoFirebase(() =>
        firestore && appUser
            ? query(
                collection(firestore, 'scratch_card_claims'),
                where('userId', '==', appUser.id),
                where('scratchCardId', '==', cardId),
                // orderBy('claimedAt', 'desc') // Need index for this usually, doing client sort instead
            )
            : null,
        [firestore, appUser, cardId]
    )

    const { data: claims } = useCollection<UserScratchCardClaim>(claimsQuery)

    // Process claims
    const sortedClaims = claims?.sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime()) || [];

    // For Free tab, we mainly care about the "current week's" claim
    const currentFreeClaim = activeTab === 'free' ? sortedClaims.find(c => {
        const lastClaim = new Date(c.claimedAt);
        const now = new Date();
        const daysSince = Math.floor((now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60 * 24));
        return daysSince < 7;
    }) : null;

    // Filter for History Table (Only Scratched/Revealed)
    const historyClaims = sortedClaims.filter(c => c.status === 'scratched' || c.status === 'revealed');

    // Open Modal logic updated for "Pre-fetch" flow
    const handleScratchClick = async (claim: UserScratchCardClaim) => {
        // Only show result if ALREADY FULLY COLLECTED (status === 'scratched')
        if (claim.status === 'scratched') {
            setActiveScratchClaim(claim);
            setScratchReward(claim.rewardDetails || null);
            setIsCardScratched(true); // Don't show canvas
            setIsScratchModalOpen(true);
            return;
        }

        // For 'purchased' OR 'revealed' (but not collected), we allow scratching
        // Reset state for new scratch session
        setActiveScratchClaim(claim);
        setIsCardScratched(false); // Valid for both: we want to show canvas
        setScratchPercentage(0);
        setScratchReward(claim.rewardDetails || null); // Might be null if 'purchased'

        // Prepare deferred scratch if needed
        if (claim.status === 'purchased' || !claim.rewardDetails) {
            setIsScratching(true);
            try {
                const token = await getAuth().currentUser?.getIdToken();
                const response = await fetch('/api/scratch-card/scratch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ claimId: claim.id }),
                });

                const data = await response.json();

                if (!response.ok) {
                    toast({ variant: 'destructive', title: 'Error', description: data.error });
                    return; // Don't open if error? Or close?
                }

                // Update with fetched reward
                const updatedClaim = { ...claim, status: 'revealed', rewardDetails: data.reward };
                setActiveScratchClaim(updatedClaim as UserScratchCardClaim);
                setScratchReward(data.reward);

                // Open modal NOW that we have reward (to put behind canvas)
                setIsScratchModalOpen(true);

            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error', description: error.message });
            } finally {
                setIsScratching(false);
            }
        } else {
            // Already revealed (but not scratched/collected), just open
            setIsScratchModalOpen(true);
        }
    };

    // Close Modal
    const handleCloseScratch = () => {
        setIsScratchModalOpen(false);
        setTimeout(() => {
            setActiveScratchClaim(null);
            setScratchReward(null);
            setIsCardScratched(false);
            setUidInput('');
            setIsCollecting(false);
        }, 300);
    };

    // Initialize canvas
    useEffect(() => {
        if (!isScratchModalOpen || !activeScratchClaim) return;

        // If already 'scratched' (collected), don't init canvas
        if (activeScratchClaim.status === 'scratched' || isCardScratched) return;

        let canvas = canvasRef.current;
        // If canvas is null, it might be because Dialog hasn't mounted it yet. 
        // We will try to get it in the interval loop.

        let isDrawing = false;
        let isReady = false;
        let animationFrameId: number;

        const initCanvas = () => {
            canvas = canvasRef.current;
            if (!canvas) {
                animationFrameId = requestAnimationFrame(initCanvas);
                return;
            }

            const width = canvas.offsetWidth;
            const height = canvas.offsetHeight;

            // Wait until layout is stable (width > 0)
            if (width === 0 || height === 0) {
                animationFrameId = requestAnimationFrame(initCanvas);
                return;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Fill with scratch-off layer
            ctx.fillStyle = '#9ca3af'; // Slate-400
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Text Overlay
            ctx.fillStyle = '#4b5563';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.globalCompositeOperation = 'source-over';
            ctx.fillText('SCRATCH HERE', canvas.width / 2, canvas.height / 2);

            isReady = true;
        };

        // Start initialization loop
        animationFrameId = requestAnimationFrame(initCanvas);

        const scratch = (e: MouseEvent | TouchEvent) => {
            if (!isDrawing || !isReady || !canvas) return;

            const rect = canvas.getBoundingClientRect();
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const x = (e as TouchEvent).touches
                ? (e as TouchEvent).touches[0].clientX - rect.left
                : (e as MouseEvent).clientX - rect.left;
            const y = (e as TouchEvent).touches
                ? (e as TouchEvent).touches[0].clientY - rect.top
                : (e as MouseEvent).clientY - rect.top;

            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(x, y, 25, 0, Math.PI * 2);
            ctx.fill();

            checkScratchPercentage();
        };

        const checkScratchPercentage = () => {
            if (!isReady || isCollecting || !canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            let transparentPixels = 0;

            for (let i = 3; i < pixels.length; i += 16) {
                if (pixels[i] === 0) transparentPixels++;
            }

            const totalPixelsChecked = pixels.length / 16;
            const percentage = (transparentPixels / totalPixelsChecked) * 100;
            setScratchPercentage(percentage);

            if (percentage > 50 && !isCardScratched) {
                handleScratchComplete();
            }
        };

        const startDrawing = () => { isDrawing = true; };
        const stopDrawing = () => { isDrawing = false; };

        // Attach listeners (Need to attach to canvas explicitly once found, or document?)
        // Better to check if canvas exists before attaching.
        // We moved listener attachment inside a separate effect or callback? 
        // No, we can't easily. We'll poll for canvas to attach events or use a parent wrapper ref?
        // Simpler: Just rely on the ref being stable after init loop.

        // Wait, if canvasRef.current IS null initially, we can't attach listeners to undefined.
        // We need to attach listeners to the DOM element.

        const attachEvents = () => {
            if (canvasRef.current) {
                canvasRef.current.addEventListener('mousedown', startDrawing);
                canvasRef.current.addEventListener('mouseup', stopDrawing);
                canvasRef.current.addEventListener('mousemove', scratch);
                canvasRef.current.addEventListener('touchstart', startDrawing);
                canvasRef.current.addEventListener('touchend', stopDrawing);
                canvasRef.current.addEventListener('touchmove', scratch);
            } else {
                requestAnimationFrame(attachEvents);
            }
        }
        attachEvents();

        return () => {
            cancelAnimationFrame(animationFrameId);
            if (canvasRef.current) {
                canvasRef.current.removeEventListener('mousedown', startDrawing);
                canvasRef.current.removeEventListener('mouseup', stopDrawing);
                canvasRef.current.removeEventListener('mousemove', scratch);
                canvasRef.current.removeEventListener('touchstart', startDrawing);
                canvasRef.current.removeEventListener('touchend', stopDrawing);
                canvasRef.current.removeEventListener('touchmove', scratch);
            }
        };
    }, [isScratchModalOpen, activeScratchClaim, isCardScratched, isCollecting]);

    // Fetch recent winners
    const recentWinnersQuery = useMemoFirebase(() =>
        firestore
            ? query(
                collection(firestore, 'scratch_card_claims'),
                where('status', 'in', ['scratched', 'revealed']),
                where('scratchCardId', '==', cardId),
            )
            : null,
        [firestore, cardId]
    )

    const { data: recentWinners } = useCollection<any>(recentWinnersQuery)
    const winnersList = recentWinners
        ? recentWinners
            .sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime())
            .slice(0, 5)
        : []


    const handleCollectReward = async () => {
        if (!activeScratchClaim || isCollecting) return

        if (scratchReward?.type === 'item' && !uidInput.trim()) {
            toast({ variant: 'destructive', title: 'Start Required', description: 'Please enter your Player UID to collect this reward.' })
            return
        }

        setIsCollecting(true)

        try {
            const token = await getAuth().currentUser?.getIdToken()
            const response = await fetch('/api/scratch-card/collect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    claimId: activeScratchClaim.id,
                    uid: scratchReward?.type === 'item' ? uidInput : undefined
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                toast({ variant: 'destructive', title: 'Failed to collect', description: data.error })
                return
            }

            toast({ title: 'Success!', description: data.message })

            // If it was auto-collect, we can stay open to show message, or close.
            // User requested "direct status change".
            // We might want to just show the "Collected!" message and let them close.

            // Update local state to reflect 'scratched' status so list updates immediately
            // (Though Firestore listener handles this, local update feels snappier if listener lags)
            setActiveScratchClaim(prev => prev ? ({ ...prev, status: 'scratched' }) : null);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message })
        } finally {
            setIsCollecting(false)
        }
    }

    const handleClaimCard = async () => {
        if (!firebaseUser || !appUser) {
            toast({ variant: 'destructive', title: 'Please login to claim scratch card' })
            router.push('/login')
            return
        }

        // Use local state quantity for Paid, 1 for Free
        const quantityToBuy = activeTab === 'paid' ? buyQuantity : 1;

        setIsClaiming(true)

        try {
            const token = await getAuth().currentUser?.getIdToken()
            const response = await fetch('/api/scratch-card/claim', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    scratchCardId: cardId,
                    quantity: quantityToBuy
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                toast({ variant: 'destructive', title: 'Cannot Claim', description: data.error })
                return
            }

            toast({ title: 'Success!', description: activeTab === 'paid' ? `${quantityToBuy} Card(s) purchased!` : 'Scratch card claimed!' })
            setIsBuyDialogOpen(false); // Close dialog if open
            setBuyQuantity(1); // Reset

        } catch (error: any) {
            console.error('Claim Error:', error);
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Something went wrong' })
        } finally {
            setIsClaiming(false)
        }
    }

    const handleScratchComplete = async () => {
        // 1. Reveal Visually
        setIsCardScratched(true);

        // 2. We do NOT auto-collect anymore for ANY type, to enforce manual interaction.
        // Even for no_reward, user sees the message and clicks "Close".
        // The "Scratched" status update for no_reward could be done on close, 
        // OR we can just visually show it and update status when they close the modal.
        // Actually, for consistency, if it is 'no_reward', we might want to mark it as 'scratched' in DB 
        // so they can't scratch it again. But if we do that, we need an API call.
        // Let's rely on the "Close/Collect" button action.
    }

    // Logic for limits and eligibility
    const today = new Date().getDay()
    const isCorrectDay = activeTab === 'paid' ? true : today === scratchCard?.availableDay
    const isUserActive = appUser?.isActive ?? false

    let canBuy = false;
    let limitMessage = '';
    let remainingLimit = 999;

    if (activeTab === 'paid') {
        const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
        const monthlyClaimsCount = sortedClaims.filter(c => c.claimedAt.startsWith(currentMonth)).length || 0
        const limit = scratchCard?.claimLimit || 0

        remainingLimit = limit > 0 ? limit - monthlyClaimsCount : 999;
        const hasClaimedLimit = limit > 0 && monthlyClaimsCount >= limit

        canBuy = !hasClaimedLimit;
        limitMessage = limit > 0 ? `Monthly Limit: ${monthlyClaimsCount} / ${limit}` : 'Unlimited Purchases';
    } else {
        const hasClaimedThisWeek = !!currentFreeClaim
        canBuy = isUserActive && isCorrectDay && !hasClaimedThisWeek
    }

    // Cost calculation
    const totalCost = (scratchCard?.cost || 0) * buyQuantity;

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-6 flex justify-center items-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!scratchCard) {
        return (
            <div className="container mx-auto px-4 py-6">
                <Card><CardContent className="pt-6"><p className="text-center">Scratch card not found</p></CardContent></Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-6 max-w-2xl relative space-y-8">
            <Tabs defaultValue="free" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="free">Weekly Free</TabsTrigger>
                    <TabsTrigger value="paid">Premium (10৳)</TabsTrigger>
                </TabsList>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <Gift className="h-6 w-6" />
                                {scratchCard.name}
                            </CardTitle>
                            <Badge variant={scratchCard.isActive ? 'default' : 'secondary'}>
                                {scratchCard.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                        <CardDescription>{scratchCard.description}</CardDescription>
                        {activeTab === 'paid' && (
                            <div className="mt-2 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded inline-block">
                                {limitMessage}
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* Status Alert */}
                        {!appUser && (
                            <div className="flex items-start gap-2 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                                <AlertCircle className="h-5 w-5 text-yellow-600" />
                                <p className="text-sm text-yellow-700">Please login to claim this scratch card</p>
                            </div>
                        )}

                        {/* --- BUY SECTION --- */}
                        {(activeTab === 'paid' || (activeTab === 'free' && !currentFreeClaim)) && (
                            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                <Gift className="h-12 w-12 text-primary mb-3" />
                                <h3 className="text-xl font-bold mb-2">
                                    {activeTab === 'paid' ? 'Purchase Scratch Cards' : 'Claim Weekly Free Card'}
                                </h3>
                                <p className="text-muted-foreground mb-4 text-center">
                                    {activeTab === 'paid'
                                        ? `Price: ৳${scratchCard.cost} per card`
                                        : 'Available once every week on ' + DAYS_OF_WEEK[scratchCard.availableDay]}
                                </p>

                                {activeTab === 'free' && !isCorrectDay ? (
                                    <Button disabled variant="secondary">Available on {DAYS_OF_WEEK[scratchCard.availableDay]}</Button>
                                ) : (
                                    <Button
                                        onClick={() => activeTab === 'paid' ? setIsBuyDialogOpen(true) : handleClaimCard()}
                                        disabled={isClaiming || !canBuy}
                                        size="lg"
                                        className="w-full max-w-xs"
                                    >
                                        {isClaiming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {canBuy ? (activeTab === 'paid' ? 'Buy Now' : 'Claim Free Card') : 'Limit Reached'}
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* --- MY CARDS INVENTORY --- */}
                        {activeTab === 'paid' && (
                            <div>
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-yellow-500" />
                                    My Cards {sortedClaims.length > 0 && `(${sortedClaims.length})`}
                                </h3>

                                {sortedClaims.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground bg-gray-50 rounded-lg">
                                        No cards found. Buy some above!
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sortedClaims.map((claim, idx) => {
                                            const isRevealed = claim.status === 'scratched'; // ONLY scratched is fully revealed
                                            // 'revealed' status is intermediate, handled as 'needs scratching'
                                            return (
                                                <div
                                                    key={claim.id}
                                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm
                                                    ${isRevealed ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}
                                                `}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-10 w-10 flex items-center justify-center rounded-full 
                                                            ${isRevealed ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}
                                                        `}>
                                                            {isRevealed ? <Gift className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-sm">
                                                                {isRevealed ? (claim.rewardDetails?.name || 'Wrapped Reward') : `Mystery Card #${sortedClaims.length - idx}`}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {new Date(claim.claimedAt).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleScratchClick(claim)}
                                                        disabled={isScratching && activeScratchClaim?.id === claim.id} // Disable only this one? Or global isScratching?
                                                        variant={isRevealed ? "outline" : "default"}
                                                        className={!isRevealed ? "bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white" : ""}
                                                    >
                                                        {isScratching && activeScratchClaim?.id === claim.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            isRevealed ? 'View Reward' : 'Scratch Now'
                                                        )}
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- MY REWARD HISTORY (Paid Only) --- */}
                        {activeTab === 'paid' && historyClaims.length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <History className="h-4 w-4 text-blue-500" />
                                    My Reward History
                                </h3>
                                <div className="bg-white rounded-md border text-sm text-center">
                                    {/* Simple list or keep Table */}
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Reward</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {historyClaims.slice(0, 10).map((claim) => (
                                                <TableRow key={claim.id}>
                                                    <TableCell>{new Date(claim.claimedAt).toLocaleDateString()}</TableCell>
                                                    <TableCell className="font-medium text-green-600">
                                                        {claim.rewardDetails?.name || 'Unknown'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {/* --- FREE CARD DISPLAY (Restored for Free Tab) --- */}
                        {activeTab === 'free' && currentFreeClaim && (
                            <div className="mt-4">
                                <h3 className="text-lg font-semibold mb-2">My Card</h3>
                                <div
                                    onClick={() => handleScratchClick(currentFreeClaim)}
                                    className={`relative w-full max-w-sm aspect-video rounded-lg border-2 overflow-hidden transition-all cursor-pointer hover:shadow-md mx-auto
                                        ${currentFreeClaim.status === 'scratched' ? 'border-green-200 bg-green-50' : 'bg-gradient-to-br from-yellow-400 to-orange-500'}
                                    `}
                                >
                                    {currentFreeClaim.status === 'scratched' || currentFreeClaim.status === 'revealed' ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                            <p className="font-bold text-lg text-green-700">Reward Claimed!</p>
                                            <p className="text-green-600">{currentFreeClaim.rewardDetails?.name}</p>
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                                            <Gift className="h-12 w-12 mb-2 animate-bounce" />
                                            <p className="font-bold text-xl">SCRATCH CARD</p>
                                            <p className="opacity-90">Click to Reveal</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </CardContent>
                </Card>

                {/* Recent Winners - Show ONLY if Active Tab is FREE (or just hide for Paid) */}
                {activeTab === 'free' && winnersList.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-yellow-500" />
                                Recent Lucky Winners
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {winnersList.map((winner: any) => (
                                    <div key={winner.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden relative">
                                                {winner.userPhotoURL ? (
                                                    <Image src={winner.userPhotoURL} alt="User" fill className="object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold">
                                                        {winner.userName?.charAt(0) || 'U'}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{winner.userName || 'Anonymous User'}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(winner.claimedAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm text-primary">{winner.rewardDetails?.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </Tabs>

            {/* BUY DIALOG */}
            <Dialog open={isBuyDialogOpen} onOpenChange={setIsBuyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Purchase Scratch Cards</DialogTitle>
                        <DialogDescription>
                            Enter the number of cards you want to buy.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="flex items-center gap-4">
                            <Label htmlFor="quantity" className="text-right">
                                Quantity
                            </Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="1"
                                max={remainingLimit}
                                value={buyQuantity}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val)) setBuyQuantity(Math.min(val, remainingLimit));
                                }}
                                className="col-span-3"
                            />
                        </div>

                        <div className="space-y-2 bg-slate-50 p-4 rounded-lg">
                            <div className="flex justify-between text-sm">
                                <span>Unit Price:</span>
                                <span>৳{scratchCard?.cost || 0}</span>
                            </div>
                            <div className="flex justify-between font-bold border-t pt-2 mt-2">
                                <span>Total Cost:</span>
                                <span>৳{totalCost}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>Remaining Limit:</span>
                                <span>{remainingLimit}</span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBuyDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleClaimCard} disabled={isClaiming || buyQuantity < 1}>
                            {isClaiming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingBag className="mr-2 h-4 w-4" />}
                            Confirm Purchase
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* SCRATCH MODAL DIALOG */}
            <Dialog open={isScratchModalOpen} onOpenChange={(val) => !val && handleCloseScratch()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center flex items-center justify-center gap-2">
                            <Sparkles className="h-5 w-5 text-yellow-500" />
                            {isCardScratched ? 'Start Collecting!' : 'Scratch to Reveal'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col items-center justify-center py-4">
                        <div className="relative w-full aspect-video bg-white rounded-lg shadow-inner overflow-hidden border border-slate-200 select-none">

                            {/* Reward Layer */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50 z-0">
                                {scratchReward ? (
                                    <div className="animate-in zoom-in duration-500 flex flex-col items-center p-4 text-center">
                                        {scratchReward.type === 'no_reward' ? (
                                            <>
                                                <div className="h-20 w-20 mb-3 grayscale opacity-50">
                                                    <Gift className="h-full w-full" />
                                                </div>
                                                <h4 className="text-xl font-bold text-gray-600 mb-1">Better Luck Next Time!</h4>
                                                <p className="text-gray-500 text-sm">Unfortunately, this card had no reward.</p>
                                            </>
                                        ) : (
                                            <>
                                                {scratchReward.imageUrl ? (
                                                    <div className="relative h-24 w-24 mb-2">
                                                        <Image src={scratchReward.imageUrl} alt="Reward" fill className="object-contain" />
                                                    </div>
                                                ) : (
                                                    <Gift className="h-16 w-16 text-orange-500 mb-2" />
                                                )}
                                                <h4 className="text-xl font-bold text-gray-900">{scratchReward.name}</h4>
                                                <p className="text-orange-600 font-bold">
                                                    {scratchReward.type === 'wallet' ? `৳${scratchReward.value}` :
                                                        scratchReward.type === 'coins' ? `${scratchReward.value} Coins` :
                                                            scratchReward.type === 'item' ? 'Special Item' : ''}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400">
                                        <Gift className="h-12 w-12 mb-2" />
                                        <p>Hidden Reward</p>
                                    </div>
                                )}
                            </div>

                            {/* Scratch Canvas (Only if not fully scratched/revealed) */}
                            {!isCardScratched && (
                                <canvas
                                    ref={canvasRef}
                                    className="absolute inset-0 z-10 w-full h-full cursor-pointer touch-none"
                                />
                            )}
                        </div>

                        {/* Collect Action */}
                        {isCardScratched && scratchReward && activeScratchClaim?.status !== 'scratched' && (
                            <div className="w-full mt-6 space-y-4 animate-in slide-in-from-bottom duration-300">
                                {scratchReward.type === 'no_reward' ? (
                                    <Button onClick={handleCollectReward} variant="outline" className="w-full h-12">
                                        Close
                                    </Button>
                                ) : (
                                    <>
                                        {scratchReward.type === 'item' && (
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Enter your Game UID to receive this item:</Label>
                                                <Input
                                                    className="h-11 border-orange-200 focus-visible:ring-orange-500"
                                                    placeholder="Example: 123456789"
                                                    value={uidInput}
                                                    onChange={(e) => setUidInput(e.target.value)}
                                                />
                                            </div>
                                        )}

                                        <Button
                                            onClick={handleCollectReward}
                                            disabled={isCollecting}
                                            className="w-full h-12 text-lg"
                                        >
                                            {isCollecting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                                            {scratchReward.type === 'item' ? 'Submit UID & Claim' : 'Collect Reward'}
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Closed Message */}
                        {activeScratchClaim?.status === 'scratched' && (
                            <div className="mt-4 text-center">
                                <p className="text-green-600 font-bold">Reward Collected!</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
