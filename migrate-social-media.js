// Migration script to move SOCIAL MEDIA SERVICE cards to Social Media section
// Run this once: node migrate-social-media.js

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateSocialMediaCards() {
    try {
        console.log('Starting migration...');

        // Get all categories to find SOCIAL MEDIA SERVICE category ID
        const categoriesSnapshot = await db.collection('categories').get();
        const socialMediaCategory = categoriesSnapshot.docs.find(
            doc => doc.data().name === 'SOCIAL MEDIA SERVICE'
        );

        if (!socialMediaCategory) {
            console.log('SOCIAL MEDIA SERVICE category not found');
            return;
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
        let updateCount = 0;

        cardsSnapshot.docs.forEach(doc => {
            const cardData = doc.data();
            console.log(`Updating card: ${cardData.name}`);
            batch.update(doc.ref, {
                serviceType: 'Social Media'
            });
            updateCount++;
        });

        if (updateCount > 0) {
            await batch.commit();
            console.log(`✅ Successfully migrated ${updateCount} cards to Social Media service type`);
        } else {
            console.log('No cards to migrate');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error during migration:', error);
        process.exit(1);
    }
}

migrateSocialMediaCards();
