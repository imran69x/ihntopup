import { NextRequest, NextResponse } from 'next/server';
import { adminFirestore, adminAuth } from '@/lib/firebase-admin';
import 'server-only';

export async function POST(request: NextRequest) {
    try {
        // Get the authorization token from the request headers
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];

        // Verify the token
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;

        // Get request body
        const { claimId, uid } = await request.json();

        if (!claimId) {
            return NextResponse.json({ error: 'Claim ID is required' }, { status: 400 });
        }

        const db = adminFirestore;

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

        // Verify status is 'revealed'
        if (claimData?.status !== 'revealed') {
            return NextResponse.json({ error: 'Invalid claim status' }, { status: 400 });
        }

        const rewardDetails = claimData.rewardDetails;
        if (!rewardDetails) {
            return NextResponse.json({ error: 'Reward details not found' }, { status: 400 });
        }

        // Check if item type requires UID
        if (rewardDetails.type === 'item' && !uid) {
            return NextResponse.json({ error: 'Player UID is required to claim this reward' }, { status: 400 });
        }

        // Prepare update data
        const updateData: any = {
            status: 'scratched',
            collectedAt: new Date().toISOString(),
        };

        if (rewardDetails.type === 'item') {
            updateData.submittedUid = uid;
            updateData.isPendingVerification = true; // Flag for manual admin processing
        }

        // Update claim status to 'scratched' (completed)
        await db.collection('scratch_card_claims').doc(claimId).update(updateData);

        // Credit user's wallet or coinFund ONLY if NOT an item and NOT no_reward
        if (rewardDetails.type !== 'item' && rewardDetails.type !== 'no_reward') {
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            const userData = userDoc.data();

            if (rewardDetails.type === 'wallet') {
                await userRef.update({
                    walletBalance: (userData?.walletBalance || 0) + rewardDetails.value,
                    'scratchCardData.totalRewardsWon': (userData?.scratchCardData?.totalRewardsWon || 0) + rewardDetails.value,
                });
            } else if (rewardDetails.type === 'coins') {
                await userRef.update({
                    coinFund: (userData?.coinFund || 0) + rewardDetails.value,
                    'scratchCardData.totalRewardsWon': (userData?.scratchCardData?.totalRewardsWon || 0) + rewardDetails.value,
                });
            }
        }

        let successMessage = '';
        if (rewardDetails.type === 'item') {
            successMessage = `Successfully submitted claim for ${rewardDetails.name}! Admin will review.`;
        } else if (rewardDetails.type === 'no_reward') {
            successMessage = 'Better luck next time!';
        } else {
            successMessage = `Successfully collected ${rewardDetails.type === 'wallet' ? `৳${rewardDetails.value}` : `${rewardDetails.value} Coins`}!`;
        }

        return NextResponse.json({
            success: true,
            message: successMessage
        });

    } catch (error: any) {
        console.error('Error collecting reward:', error);
        return NextResponse.json({ error: 'Failed to collect reward', details: error.message }, { status: 500 });
    }
}
