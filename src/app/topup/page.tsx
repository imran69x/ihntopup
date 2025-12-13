'use client';
import TopUpCard from '@/components/TopUpCard';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { TopUpCategory, TopUpCardData } from '@/lib/data';
import { collection, query, getDocs } from 'firebase/firestore';
import { useMemo, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function TopUpPage() {
  const firestore = useFirestore();

  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'categories')) : null, [firestore]);
  const { data: allCategories, isLoading: isLoadingCategories } = useCollection<TopUpCategory>(categoriesQuery);

  const [cardsByCategory, setCardsByCategory] = useState<Record<string, TopUpCardData[]>>({});
  const [isLoadingCards, setIsLoadingCards] = useState(true);

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
    } else if (!isLoadingCategories) {
      setIsLoadingCards(false);
    }
  }, [firestore, categories, isLoadingCategories]);

  const isLoading = isLoadingCategories || isLoadingCards;

  return (
    <div className="container mx-auto px-4 py-6 fade-in">
      <h1 className="text-3xl font-bold font-headline mb-6">Browse Top-Ups</h1>
      {isLoading ? (
        <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-8">
          {categories?.map((category) => (
            <section key={category.id}>
              <h2 className="text-2xl font-bold font-headline mb-4">{category.name}</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-8 gap-2 sm:gap-4">
                {cardsByCategory[category.id]?.map((card) => (
                  <TopUpCard key={card.id} card={card} />
                ))}
              </div>
              {cardsByCategory[category.id]?.length === 0 && (
                <p className="text-muted-foreground">No cards in this category yet.</p>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
