import 'server-only';
import { adminFirestore } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// All 5 API Keys in order
const API_KEYS = [
    'oPuRJl0eBZwfZ3FQEI5sESzkLpQSmPgUpR-_dsbUQd0',
    '7smRN-QdbKZRbNh9b8GTjqpTBoUKepYFEiIjIAaxUks',
    'dIORMjiC_dtRwtS5_ow5A86O01nahdUmwWIF66NXg2U',
    'bbLMIrmmQEcMGsLi7ANlMS3kcx3HB22xaNX3QFk8GH8',
    '36-epNjKMiQo1xpFlQ5J3_kSUAwq8TZpqnDmS1Lmts8',
];

const CALLS_PER_KEY = 100; // Max calls per key before rotating
const DOC_PATH = 'system/ff_api_keys';

/**
 * Get the current active API key.
 * - When the active key hits 100 calls, moves to the next key.
 * - After the 5th key is exhausted, it cycles back to the 1st key.
 */
export async function getNextApiKey(): Promise<string> {
    const docRef = adminFirestore.doc(DOC_PATH);
    const docSnap = await docRef.get();

    let data = docSnap.exists ? docSnap.data()! : null;

    // Initialize if no data exists
    if (!data) {
        await docRef.set({
            currentKeyIndex: 0,
            keyCalls: Object.fromEntries(API_KEYS.map((_, i) => [`key_${i}`, 0])),
        });
        console.log('🔧 Initialized API key tracker. Starting with key 0.');
        return API_KEYS[0];
    }

    let currentIndex: number = data.currentKeyIndex ?? 0;
    const keyCalls: Record<string, number> = data.keyCalls ?? {};
    const callsUsed = keyCalls[`key_${currentIndex}`] ?? 0;

    // If current key has hit the call limit, rotate to next key
    if (callsUsed >= CALLS_PER_KEY) {
        const nextIndex = (currentIndex + 1) % API_KEYS.length; // Circular: after 5th → back to 0
        console.log(`🔄 Key ${currentIndex + 1} exhausted (${callsUsed} calls). Rotating to key ${nextIndex + 1}.`);

        // Update Firestore with next key index
        await docRef.update({
            currentKeyIndex: nextIndex,
            [`keyCalls.key_${nextIndex}`]: FieldValue.increment(1),
        });

        const selectedKey = API_KEYS[nextIndex];
        console.log(`✅ Now using API Key ${nextIndex + 1}/${API_KEYS.length}`);
        return selectedKey;
    }

    // Increment call count for current key
    await docRef.update({
        [`keyCalls.key_${currentIndex}`]: FieldValue.increment(1),
    });

    const callsAfter = callsUsed + 1;
    console.log(`✅ Using API Key ${currentIndex + 1}/${API_KEYS.length} — call #${callsAfter}/${CALLS_PER_KEY}`);
    return API_KEYS[currentIndex];
}
