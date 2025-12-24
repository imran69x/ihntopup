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

        // Verify the token and get the user
        const decodedToken = await adminAuth.verifyIdToken(token);
        const adminUserId = decodedToken.uid;

        // Check if the requesting user is an admin
        const adminUserDoc = await adminFirestore.collection('users').doc(adminUserId).get();
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

        // Delete user from Firebase Authentication
        try {
            await adminAuth.deleteUser(userId);
        } catch (authError: any) {
            // If user doesn't exist in Auth, continue (they might only exist in Firestore)
            if (authError.code !== 'auth/user-not-found') {
                console.error('Error deleting user from Auth:', authError);
                throw authError;
            }
        }

        // Delete user document from Firestore
        try {
            await adminFirestore.collection('users').doc(userId).delete();
        } catch (firestoreError) {
            console.error('Error deleting user from Firestore:', firestoreError);
            throw firestoreError;
        }

        return NextResponse.json(
            {
                success: true,
                message: 'User deleted successfully from Auth and Firestore'
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
