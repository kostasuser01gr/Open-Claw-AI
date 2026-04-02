import { GoogleGenAI } from '@google/genai';
import { defineSecret } from 'firebase-functions/params';
import { CHAT_MODEL_IDS, GEMINI_MODELS, PERSONAS } from '../../shared/aiContracts';

export const REGION = 'us-central1';
export const geminiApiKey = defineSecret('GEMINI_API_KEY');
export const callableOptions = {
  region: REGION,
  secrets: [geminiApiKey],
};

export const PERSONA_PROMPTS = PERSONAS;
export const ALLOWED_CHAT_MODELS = new Set<string>(CHAT_MODEL_IDS);
export const MODELS = GEMINI_MODELS;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = geminiApiKey.value();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY secret is not configured.');
  }

  return new GoogleGenAI({ apiKey });
}
