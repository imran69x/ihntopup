import { NextRequest, NextResponse } from 'next/server';
import { adminFirestore, adminAuth } from '@/lib/firebase-admin';
import { FieldPath } from 'firebase-admin/firestore';
import 'server-only';

export async function POST(request: NextRequest) {
    try {
        // Get the authorization token from the request headers
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];

        const db = adminFirestore();
        const auth = adminAuth();

        // Verify the token
        const decodedToken = await auth.verifyIdToken(token);
        const userId = decodedToken.uid;

        // Get request body
        const { claimId } = await request.json();

        if (!claimId) {
            return NextResponse.json({ error: 'Claim ID is required' }, { status: 400 });
        }

        // Get claim document
        const claimDoc = await db.collection('scratch_card_claims').doc(claimId).get();
        if (!claimDoc.exists) {
            return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
        }

        const claimData = claimDoc.data();

        // Verify claim belongs to user
        if (claimData?.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Check if already scratched
        if (claimData?.status === 'scratched' || claimData?.status === 'revealed') {
            return NextResponse.json({
                success: true,
                reward: claimData.rewardDetails,
                message: 'Reward revealed! Click collect to claim.'
            });
        }

        // DEFERRED REWARD SELECTION LOGIC START

        // 1. Get Scratch Card ID from claim
        const scratchCardId = claimData.scratchCardId;
        if (!scratchCardId) {
            return NextResponse.json({ error: 'Invalid claim data: missing card ID' }, { status: 500 });
        }

        // 2. Fetch Scratch Card Config (Still needed for validation if we want, but mainly we need the claim type)
        // Actually, claimData has 'cardType' which is 'free' or 'paid'.
        // We can just query rewards based on that.

        const cardType = claimData.cardType || 'free'; // Default to free if missing

        // 3. Fetch Active Rewards for this category
        const rewardsSnapshot = await db.collection('scratch_card_rewards')
            .where('isActive', '==', true)
            .where('category', '==', cardType)
            .get();

        if (rewardsSnapshot.empty) {
            return NextResponse.json({ error: 'No active rewards available at the moment.' }, { status: 500 });
        }

        const activeRewards = rewardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        // 4. Select Random Reward
        // TODO: Implement probability weights if needed. For now: uniform random.
        const selectedReward = activeRewards[Math.floor(Math.random() * activeRewards.length)];

        // 5. Update Claim with Reward and Status
        const rewardDetails = {
            name: selectedReward.name,
            type: selectedReward.type, // 'wallet', 'coins', 'item', 'no_reward'
            value: selectedReward.value,
            imageUrl: selectedReward.imageUrl || '',
        };

        await db.collection('scratch_card_claims').doc(claimId).update({
            status: 'revealed', // or 'scratched'
            revealedAt: new Date().toISOString(),
            selectedRewardId: selectedReward.id,
            rewardDetails: rewardDetails
        });

        // 6. Return Result
        return NextResponse.json({
            success: true,
            reward: rewardDetails,
            message: 'Reward revealed!'
        });

    } catch (error: any) {
        console.error('Error scratching card:', error);
        return NextResponse.json({ error: 'Failed to scratch card', details: error.message }, { status: 500 });
    }
}
