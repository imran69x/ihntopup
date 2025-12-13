'use client';

import TopUpCard from '@/components/TopUpCard';
import ResellerRecentOrders from '@/components/reseller/ResellerRecentOrders';
import { useFirestore } from '@/firebase';
import type { TopUpCardData } from '@/lib/data';
import { Loader2, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function ResellerHome() {
    const firestore = useFirestore();
    const [cards, setCards] = useState<TopUpCardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        const fetchResellerCards = async () => {
            try {
                const q = query(
                    collection(firestore, 'top_up_cards'),
                    where('isResellerProduct', '==', true),
                    where('isActive', '==', true)
                );
                const snap = await getDocs(q);
                const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as TopUpCardData));
                data.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

                setCards(data);
            } catch (error) {
                console.error("Error fetching reseller cards:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchResellerCards();
    }, [firestore]);

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-white" />
                    <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-white/20" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="container mx-auto space-y-8 px-4 py-6 relative">
                {/* Premium Glass Header */}
                <div className="text-center space-y-4 animate-fade-in">
                    <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/30 inline-block mx-auto">
                        <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent drop-shadow-2xl">
                            Reseller Exclusive Products
                        </h1>
                        <div className="mt-4 h-2 w-48 mx-auto bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-full animate-pulse shadow-lg" />
                    </div>
                </div>

                {/* Products Grid with Glass Container */}
                {cards.length === 0 ? (
                    <div className="text-center py-20 rounded-3xl bg-white/30 backdrop-blur-2xl border-2 border-white/40 shadow-2xl animate-fade-in">
                        <Package className="h-16 w-16 mx-auto mb-4 text-gray-700 animate-pulse" />
                        <p className="text-gray-800 text-lg font-semibold">No reseller products available right now.</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        {/* Glass Container for Products */}
                        <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-6 border border-white/30 shadow-2xl">
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">{cards.map((card, index) => (
                                <div
                                    key={card.id}
                                    className="animate-scale-in-bounce"
                                    style={{
                                        animationDelay: `${index * 80}ms`,
                                        animationFillMode: 'both'
                                    }}
                                >
                                    <div className="glass-card-wrapper">
                                        <TopUpCard card={card} />
                                    </div>
                                </div>
                            ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Orders with glass effect */}
                <div className="animate-fade-in-up bg-white/5 backdrop-blur-sm rounded-2xl p-1 border border-white/10"
                    style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                    <ResellerRecentOrders />
                </div>
            </div>

            <style jsx global>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(40px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes scale-in-bounce {
                    0% {
                        opacity: 0;
                        transform: scale(0.8);
                    }
                    50% {
                        transform: scale(1.05);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                .animate-fade-in {
                    animation: fade-in 1s ease-out;
                }

                .animate-fade-in-up {
                    animation: fade-in-up 0.8s ease-out;
                }

                .animate-scale-in-bounce {
                    animation: scale-in-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                /* Glass Card Wrapper with Glow */
                .glass-card-wrapper {
                    position: relative;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .glass-card-wrapper::before {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    background: linear-gradient(135deg, 
                        rgba(255, 255, 255, 0.4),
                        rgba(255, 255, 255, 0.1)
                    );
                    border-radius: 1rem;
                    opacity: 0;
                    transition: opacity 0.4s ease;
                    z-index: -1;
                }

                .glass-card-wrapper:hover {
                    transform: translateY(-8px) scale(1.05);
                    filter: brightness(1.1);
                }

                .glass-card-wrapper:hover::before {
                    opacity: 1;
                    box-shadow: 0 0 30px rgba(139, 92, 246, 0.5),
                                0 0 60px rgba(236, 72, 153, 0.3);
                }
            `}</style>
        </>
    );
}
