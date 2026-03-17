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

const CALLS_PER_KEY = 100;        // Max calls per key per cycle
const CYCLE_DAYS = 30;            // Cycle duration in days
const DOC_PATH = 'system/ff_api_keys';  // Firestore document path

/**
 * Get the next available API key.
 * - Starts from key index 0.
 * - When a key reaches 100 calls, moves to the next one.
 * - After 30 days from cycle start, resets all keys and starts from index 0.
 */
export async function getNextApiKey(): Promise<string> {
    const docRef = adminFirestore.doc(DOC_PATH);
    const docSnap = await docRef.get();

    const now = Date.now();
    const cycleMs = CYCLE_DAYS * 24 * 60 * 60 * 1000;

    let data = docSnap.exists ? docSnap.data()! : null;

    // Check if 30-day cycle has passed — if so, reset everything
    const cycleStart = data?.cycleStart ?? 0;
    const isNewCycle = (now - cycleStart) >= cycleMs;

    if (!data || isNewCycle) {
        // Reset: start fresh from key 0
        const freshData = {
            cycleStart: now,
            currentKeyIndex: 0,
            keyCalls: Object.fromEntries(API_KEYS.map((_, i) => [`key_${i}`, 0])),
        };
        await docRef.set(freshData);
        console.log('🔄 30-day cycle reset. Starting from key 0.');
        return API_KEYS[0];
    }

    // Find the current usable key
    let currentIndex = data.currentKeyIndex ?? 0;
    const keyCalls: Record<string, number> = data.keyCalls ?? {};

    // Find the first key that hasn't hit 100 calls
    while (currentIndex < API_KEYS.length) {
        const callsUsed = keyCalls[`key_${currentIndex}`] ?? 0;
        if (callsUsed < CALLS_PER_KEY) {
            break;
        }
        console.log(`⚠️ Key ${currentIndex} exhausted (${callsUsed} calls). Moving to next.`);
        currentIndex++;
    }

    if (currentIndex >= API_KEYS.length) {
        // All keys exhausted — use last key anyway (will get rate limit error)
        console.error('🚨 All API keys exhausted for this 30-day cycle!');
        return API_KEYS[API_KEYS.length - 1];
    }

    // Increment call count and update index in Firestore
    await docRef.update({
        currentKeyIndex: currentIndex,
        [`keyCalls.key_${currentIndex}`]: FieldValue.increment(1),
    });

    const selectedKey = API_KEYS[currentIndex];
    const callsAfter = (keyCalls[`key_${currentIndex}`] ?? 0) + 1;
    console.log(`✅ Using API Key ${currentIndex + 1}/5 — call #${callsAfter}/${CALLS_PER_KEY}`);

    return selectedKey;
}
