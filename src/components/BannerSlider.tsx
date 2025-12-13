'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import type { BannerData } from '@/lib/data';
import Autoplay from "embla-carousel-autoplay"
import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';

interface BannerSliderProps {
  banners: BannerData[];
}

export default function BannerSlider({ banners }: BannerSliderProps) {
  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  )

  const renderBannerContent = (banner: BannerData) => (
    <div className="p-1 md:p-1">
      <Card className="overflow-hidden rounded-lg">
        <CardContent className="relative flex items-center justify-center p-0 aspect-[16/6]">
          <Image
            src={banner.imageUrl || (banner.image?.src ?? "https://placehold.co/1920x720")}
            alt={banner.alt || 'Promotional banner'}
            fill
            className="w-full h-full object-cover"
            data-ai-hint={banner.image?.hint}
          />
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Carousel 
      plugins={[plugin.current]}
      className="w-full"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
      opts={{ loop: true }}
    >
      <CarouselContent className="-ml-1 md:-ml-4">
        {banners.filter(b => b.isActive).map((banner) => {
          const isInternalLink = banner.linkUrl.startsWith('/');

          return (
             <CarouselItem key={banner.id} className="pl-1 md:pl-4">
                {isInternalLink ? (
                    <Link href={banner.linkUrl}>
                        {renderBannerContent(banner)}
                    </Link>
                ) : (
                    <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer">
                        {renderBannerContent(banner)}
                    </a>
                )}
            </CarouselItem>
          )
        })}
      </CarouselContent>
    </Carousel>
  );
}
