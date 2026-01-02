import { NextRequest, NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
    try {
        // Optional: Add a secret key check for security
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');

        // Simple protection - you can change this key
        if (key !== 'weekly_reset_secure_key_123') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const usersRef = adminFirestore.collection('users');

        // Query all users who are currently active
        const activeUsersSnapshot = await usersRef.where('isActive', '==', true).get();

        if (activeUsersSnapshot.empty) {
            return NextResponse.json({
                message: 'No active users found to reset',
                count: 0
            });
        }

        // Batch update - Firestore limits batches to 500 operations
        const batches = [];
        let currentBatch = adminFirestore.batch();
        let operationCount = 0;

        activeUsersSnapshot.docs.forEach((doc) => {
            currentBatch.update(doc.ref, {
                isActive: false,
                lastActiveReset: new Date() // Optional: track when reset happened
            });

            operationCount++;

            if (operationCount === 500) {
                batches.push(currentBatch.commit());
                currentBatch = adminFirestore.batch();
                operationCount = 0;
            }
        });

        // Commit any remaining operations
        if (operationCount > 0) {
            batches.push(currentBatch.commit());
        }

        await Promise.all(batches);

        return NextResponse.json({
            success: true,
            message: `Successfully reset ${activeUsersSnapshot.size} users to inactive`,
            count: activeUsersSnapshot.size
        });

    } catch (error: any) {
        console.error('Error in weekly reset:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
