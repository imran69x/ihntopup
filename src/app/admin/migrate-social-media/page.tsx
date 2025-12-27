'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MigrateSocialMediaPage() {
    const [status, setStatus] = useState<string>('Ready to migrate');
    const [updatedCards, setUpdatedCards] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const firestore = useFirestore();

    const migrateSocialMediaCards = async () => {
        if (!firestore) {
            setStatus('Firebase not initialized');
            return;
        }

        setIsLoading(true);
        setStatus('Starting migration...');

        try {
            // Get all categories to find SOCIAL MEDIA SERVICE category ID
            const categoriesSnapshot = await getDocs(collection(firestore, 'categories'));
            const socialMediaCategory = categoriesSnapshot.docs.find(
                doc => doc.data().name === 'SOCIAL MEDIA SERVICE'
            );

            if (!socialMediaCategory) {
                setStatus('❌ SOCIAL MEDIA SERVICE category not found');
                setIsLoading(false);
                return;
            }

            const socialMediaCategoryId = socialMediaCategory.id;
            setStatus(`Found SOCIAL MEDIA SERVICE category with ID: ${socialMediaCategoryId}`);
            console.log(`Found SOCIAL MEDIA SERVICE category with ID: ${socialMediaCategoryId}`);

            // Get all cards with this category
            const cardsQuery = query(
                collection(firestore, 'top_up_cards'),
                where('categoryId', '==', socialMediaCategoryId)
            );
            const cardsSnapshot = await getDocs(cardsQuery);

            setStatus(`Found ${cardsSnapshot.docs.length} cards to migrate`);
            console.log(`Found ${cardsSnapshot.docs.length} cards to migrate`);

            // Update each card
            const updates: Promise<void>[] = [];
            const cardNames: string[] = [];

            cardsSnapshot.docs.forEach(cardDoc => {
                const cardData = cardDoc.data();
                console.log(`Updating card: ${cardData.name}`);
                cardNames.push(cardData.name);

                const cardRef = doc(firestore, 'top_up_cards', cardDoc.id);
                updates.push(updateDoc(cardRef, {
                    serviceType: 'Social Media'
                }));
            });

            if (updates.length > 0) {
                await Promise.all(updates);
                setUpdatedCards(cardNames);
                setStatus(`✅ Successfully migrated ${updates.length} cards to Social Media service type!`);
                console.log(`✅ Successfully migrated ${updates.length} cards`);
            } else {
                setStatus('No cards to migrate');
            }

        } catch (error) {
            console.error('Error during migration:', error);
            setStatus(`❌ Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-8">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Migrate Social Media Service Cards</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        This will update all cards with category "SOCIAL MEDIA SERVICE" to have serviceType "Social Media",
                        which will move them from the Cards section to the Social Media section.
                    </p>

                    <Button
                        onClick={migrateSocialMediaCards}
                        disabled={isLoading}
                        className="w-full"
                    >
                        {isLoading ? 'Migrating...' : 'Start Migration'}
                    </Button>

                    <div className="p-4 bg-muted rounded-md">
                        <p className="font-semibold mb-2">Status:</p>
                        <p>{status}</p>
                    </div>

                    {updatedCards.length > 0 && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                            <p className="font-semibold mb-2">Updated Cards:</p>
                            <ul className="list-disc list-inside">
                                {updatedCards.map((cardName, index) => (
                                    <li key={index}>{cardName}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
