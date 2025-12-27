import { NextRequest, NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const db = adminFirestore();

        // Get all categories to find SOCIAL MEDIA SERVICE category ID
        const categoriesSnapshot = await db.collection('categories').get();
        const socialMediaCategory = categoriesSnapshot.docs.find(
            doc => doc.data().name === 'SOCIAL MEDIA SERVICE'
        );

        if (!socialMediaCategory) {
            return NextResponse.json({
                error: 'SOCIAL MEDIA SERVICE category not found'
            }, { status: 404 });
        }

        const socialMediaCategoryId = socialMediaCategory.id;
        console.log(`Found SOCIAL MEDIA SERVICE category with ID: ${socialMediaCategoryId}`);

        // Get all cards with this category
        const cardsSnapshot = await db.collection('top_up_cards')
            .where('categoryId', '==', socialMediaCategoryId)
            .get();

        console.log(`Found ${cardsSnapshot.docs.length} cards to migrate`);

        // Update each card
        const batch = db.batch();
        const updatedCards: string[] = [];

        cardsSnapshot.docs.forEach(doc => {
            const cardData = doc.data();
            console.log(`Updating card: ${cardData.name}`);
            batch.update(doc.ref, {
                serviceType: 'Social Media'
            });
            updatedCards.push(cardData.name);
        });

        if (updatedCards.length > 0) {
            await batch.commit();
            console.log(`✅ Successfully migrated ${updatedCards.length} cards to Social Media service type`);

            return NextResponse.json({
                success: true,
                message: `Successfully migrated ${updatedCards.length} cards`,
                updatedCards
            });
        } else {
            return NextResponse.json({
                success: true,
                message: 'No cards to migrate',
                updatedCards: []
            });
        }

    } catch (error) {
        console.error('Error during migration:', error);
        return NextResponse.json({
            error: 'Migration failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
