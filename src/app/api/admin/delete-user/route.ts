import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminFirestore } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export async function POST(request: NextRequest) {
    try {
        // Get the authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized - No token provided' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];

        const db = adminFirestore();
        const auth = adminAuth();

        // Verify the token and get the user
        const decodedToken = await auth.verifyIdToken(token);
        const adminUserId = decodedToken.uid;

        // Check if the requesting user is an admin
        const adminUserDoc = await db.collection('users').doc(adminUserId).get();
        const adminUser = adminUserDoc.data();

        if (!adminUser || !adminUser.isAdmin) {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 403 }
            );
        }

        // Get userId from request body
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Prevent admin from deleting themselves
        if (userId === adminUserId) {
            return NextResponse.json(
                { error: 'Cannot delete your own account' },
                { status: 400 }
            );
        }

        // Delete user from Firebase Authentication (optional, may timeout)
        let authDeleted = false;
        try {
            await Promise.race([
                auth.deleteUser(userId),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Auth deletion timeout')), 10000))
            ]);
            authDeleted = true;
            console.log(`User ${userId} deleted from Firebase Auth`);
        } catch (authError: any) {
            console.warn('Auth deletion failed or timed out:', authError.message);
            // Continue anyway - Firestore deletion is more critical
        }

        // Delete user document from Firestore (critical)
        try {
            await db.collection('users').doc(userId).delete();
            console.log(`User ${userId} deleted from Firestore`);
        } catch (firestoreError) {
            console.error('Error deleting user from Firestore:', firestoreError);
            throw new Error('Failed to delete user from database');
        }

        return NextResponse.json(
            {
                success: true,
                message: `User deleted from Firestore${authDeleted ? ' and Auth' : ' (Auth deletion skipped)'}`,
                authDeleted
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('Error in delete-user API:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete user' },
            { status: 500 }
        );
    }
}
