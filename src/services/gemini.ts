import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { GEMINI_MODELS, PERSONAS } from '../../shared/aiContracts';
import type { ChatMessage, DamageAssessment, GroundingMetadata, PersonaType } from '@/types/domain';

export const MODELS = GEMINI_MODELS;
export const PERSONA_METADATA: Record<PersonaType, string> = PERSONAS;
export { PERSONAS };

export interface GeminiChatConfig {
  model?: string;
  systemInstruction?: string;
  useSearch?: boolean;
  useMaps?: boolean;
  highThinking?: boolean;
  persona?: PersonaType;
}

export interface GeminiChatResponse {
  text: string;
  groundingMetadata?: GroundingMetadata;
}

function extractBase64Payload(value: string): string {
  const [, base64] = value.split(',', 2);
  return base64 || value;
}

export class GeminiService {
  async chat(messages: ChatMessage[], config: GeminiChatConfig): Promise<GeminiChatResponse> {
    const callable = httpsCallable<
      { messages: ChatMessage[]; config: GeminiChatConfig },
      GeminiChatResponse
    >(functions, 'chatWithGemini');
    const response = await callable({ messages, config });
    return response.data;
  }

  async transcribe(audioBase64: string): Promise<string> {
    const callable = httpsCallable<{ audioBase64: string }, { text: string }>(functions, 'transcribeAudio');
    const response = await callable({ audioBase64 });
    return response.data.text;
  }

  async textToSpeech(text: string): Promise<string | undefined> {
    const callable = httpsCallable<{ text: string }, { audioBase64?: string }>(functions, 'textToSpeech');
    const response = await callable({ text });
    return response.data.audioBase64;
  }

  async analyzeDamage(image: string): Promise<DamageAssessment | null> {
    const callable = httpsCallable<{ imageBase64: string }, { assessment: DamageAssessment | null }>(
      functions,
      'analyzeDamageImage',
    );
    const response = await callable({ imageBase64: extractBase64Payload(image) });
    return response.data.assessment;
  }
}

export const gemini = new GeminiService();

export type Message = ChatMessage;
