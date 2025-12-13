/**
 * @fileOverview This file initializes and configures the Genkit AI instance.
 * It sets up the necessary plugins, such as the Google AI plugin, and
 * exports a singleton `ai` object to be used throughout the application
 * for defining and running AI flows and prompts.
 */

import { genkit, Ai } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize Genkit with necessary plugins
const aiInstance: Ai = genkit({
  plugins: [
    googleAI(),
  ],
});


export const ai = aiInstance;

// You can specify the model for your prompts and generators
export const gemini15Flash = googleAI.model('gemini-1.5-flash');