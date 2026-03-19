// All 5 API Keys from environment variables
const API_KEYS = [
    process.env.FF_API_KEY_1,
    process.env.FF_API_KEY_2,
    process.env.FF_API_KEY_3,
    process.env.FF_API_KEY_4,
    process.env.FF_API_KEY_5,
].filter(Boolean) as string[];

/**
 * Get a random available API key.
 * Falls back to a hardcoded default if no env keys are set.
 */
export async function getNextApiKey(): Promise<string> {
    if (API_KEYS.length === 0) {
        throw new Error('No FF API keys configured. Please set FF_API_KEY_1 ... FF_API_KEY_5 in environment variables.');
    }

    // Randomly pick a key to distribute load evenly across serverless instances
    const randomIndex = Math.floor(Math.random() * API_KEYS.length);
    console.log(`✅ Using API Key ${randomIndex + 1}/${API_KEYS.length}`);
    return API_KEYS[randomIndex];
}
