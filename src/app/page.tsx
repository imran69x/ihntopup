'use client';
import BannerSlider from '@/components/BannerSlider';
import NoticeBanner from '@/components/NoticeBanner';
import RecentOrders from '@/components/RecentOrders';
import TopUpCard from '@/components/TopUpCard';
import ScratchCard from '@/components/ScratchCard';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { BannerData, TopUpCategory, TopUpCardData, ScratchCardConfig } from '@/lib/data';
import { Loader2, Gift } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore';

export default function Home() {
  const firestore = useFirestore();

  const bannersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'banners')) : null, [firestore]);
  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'categories')) : null, [firestore]);

  const { data: banners, isLoading: isLoadingBanners } = useCollection<BannerData>(bannersQuery);
  const { data: allCategories, isLoading: isLoadingCategories } = useCollection<TopUpCategory>(categoriesQuery);

  const [cardsByCategory, setCardsByCategory] = useState<Record<string, TopUpCardData[]>>({});
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [scratchCards, setScratchCards] = useState<ScratchCardConfig[]>([]);
  const [isLoadingScratchCards, setIsLoadingScratchCards] = useState(true);

  const categories = useMemo(() => {
    if (!allCategories) return [];
    return allCategories
      .filter(c => c.status === 'Active')
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [allCategories]);

  useEffect(() => {
    if (firestore && categories) {
      const fetchCards = async () => {
        setIsLoadingCards(true);
        const cardsData: Record<string, TopUpCardData[]> = {};

        const cardsSnapshot = await getDocs(collection(firestore, 'top_up_cards'));
        const allCards = cardsSnapshot.docs
          .map(doc => ({ ...doc.data(), id: doc.id }))
          .filter(card => (card as TopUpCardData).isActive && !(card as TopUpCardData).isResellerProduct) as TopUpCardData[]; // Exclude reseller products

        for (const category of categories) {
          const categoryCards = allCards.filter(card => card.categoryId === category.id);
          categoryCards.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          cardsData[category.id] = categoryCards;
        }

        setCardsByCategory(cardsData);
        setIsLoadingCards(false);
      };
      fetchCards();
    }
  }, [firestore, categories]);

  // Fetch scratch cards
  useEffect(() => {
    if (firestore) {
      const fetchScratchCards = async () => {
        setIsLoadingScratchCards(true);
        // Fetch the single default scratch card
        const defaultCardRef = doc(firestore, 'scratch_cards', 'default');
        const defaultCardDoc = await getDoc(defaultCardRef);
        if (defaultCardDoc.exists() && defaultCardDoc.data()?.isActive) {
          const cardData = { ...defaultCardDoc.data(), id: defaultCardDoc.id } as ScratchCardConfig;
          setScratchCards([cardData]);
        } else {
          setScratchCards([]);
        }
        setIsLoadingScratchCards(false);
      };
      fetchScratchCards();
    }
  }, [firestore]);

  const isLoading = isLoadingBanners || isLoadingCategories || isLoadingCards;

  return (
    <div className="fade-in space-y-8">
      <div className="container mx-auto px-4">
        <NoticeBanner />
      </div>

      <div className="w-full px-1 md:container md:mx-auto md:px-0">
        {isLoadingBanners ? (
          <div className="w-full aspect-[16/6] flex items-center justify-center bg-muted rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <BannerSlider banners={banners || []} />
        )}
      </div>

      <div className="container mx-auto px-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Scratch Cards Section */}
            {!isLoadingScratchCards && scratchCards.length > 0 && (
              <section className="mb-8">
                <h2 className="text-2xl font-bold font-headline mb-4 text-center flex items-center justify-center gap-2">
                  <Gift className="h-6 w-6 text-yellow-500" />
                  স্ক্র্যাচ কার্ড (Scratch Cards)
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-8 gap-2 sm:gap-4">
                  {scratchCards.map((card) => (
                    <ScratchCard key={card.id} card={card} />
                  ))}
                </div>
              </section>
            )}

            {/* Regular Categories */}
            {categories?.map((category) => (
              <section key={category.id} className="mb-8">
                <h2 className="text-2xl font-bold font-headline mb-4 text-center">{category.name}</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-8 gap-2 sm:gap-4">
                  {cardsByCategory[category.id]?.map((card) => (
                    <TopUpCard key={card.id} card={card} />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        <div className="px-4 sm:px-0">
          <RecentOrders />
        </div>
      </div>

    </div>
  );
}
