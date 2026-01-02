import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import type { ScratchCardConfig } from '@/lib/data';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Gift, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ScratchCardProps {
    card: ScratchCardConfig;
}

export default function ScratchCard({ card }: ScratchCardProps) {
    return (
        <Link href={`/topup/scratch-card/${card.id}`} className="group block">
            <Card className={cn(
                "overflow-hidden h-full flex flex-col transition-all duration-300 ease-in-out group-hover:shadow-lg group-hover:-translate-y-1.5 group-hover:shadow-yellow-500/30",
                "border-b-4 border-yellow-500/40 group-hover:border-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50"
            )}>
                <CardContent className="p-2 relative">
                    <div className="aspect-square relative w-full rounded-lg overflow-hidden">
                        <Image
                            src={card.imageUrl || 'https://placehold.co/300x300'}
                            alt={card.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                        />
                        {/* Scratch Card Badge */}
                        <div className="absolute top-2 right-2 bg-yellow-500 text-white rounded-full p-1.5 shadow-lg">
                            <Gift className="w-5 h-5" />
                        </div>
                        {/* Sparkle Effect */}
                        <div className="absolute bottom-2 left-2">
                            <Sparkles className="w-5 h-5 text-yellow-500 drop-shadow-md animate-pulse" />
                        </div>
                    </div>
                </CardContent>
                <div className="p-2 text-center flex-grow flex items-center justify-center bg-gradient-to-b from-yellow-100 to-orange-100">
                    <div className="space-y-0.5">
                        <h3 className="font-semibold text-sm">{card.name}</h3>
                        <Badge variant="secondary" className="text-xs bg-yellow-500 text-white">
                            Scratch Card
                        </Badge>
                    </div>
                </div>
            </Card>
        </Link>
    );
}
