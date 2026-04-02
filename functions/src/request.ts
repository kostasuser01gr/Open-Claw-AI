import { HttpsError } from 'firebase-functions/v2/https';
import { GEMINI_MODELS, PERSONA_IDS } from '../../shared/aiContracts';
import { ALLOWED_CHAT_MODELS } from './gemini';
import type { ChatMessage, PersonaType } from './types';

export function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function requireAuth(auth: unknown): string {
  if (!auth || typeof auth !== 'object' || !('uid' in auth) || typeof auth.uid !== 'string') {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  return auth.uid;
}

export function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpsError('invalid-argument', `${fieldName} is required.`);
  }

  return value;
}

export function extractBase64Payload(value: string): string {
  const [, base64] = value.split(',', 2);
  return base64 || value;
}

export function getMimeTypeFromDataUrl(value: string): string {
  const match = /^data:([^;,]+)[;,]/.exec(value);
  return match?.[1] || 'image/jpeg';
}

export function normalizePersona(value: unknown): PersonaType {
  return typeof value === 'string' && PERSONA_IDS.includes(value as PersonaType) ? (value as PersonaType) : 'general';
}

export function normalizeModel(model: unknown, highThinking: boolean | undefined): string {
  if (highThinking) {
    return GEMINI_MODELS.PRO;
  }

  if (typeof model === 'string' && ALLOWED_CHAT_MODELS.has(model)) {
    return model;
  }

  return GEMINI_MODELS.FLASH;
}

export function validateChatMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    throw new HttpsError('invalid-argument', 'messages must be an array.');
  }

  return value.map((message) => {
    if (!message || typeof message !== 'object') {
      throw new HttpsError('invalid-argument', 'Each message must be an object.');
    }

    const candidate = message as Record<string, unknown>;
    const role = candidate.role === 'model' ? 'model' : 'user';
    const content = typeof candidate.content === 'string' ? candidate.content : '';
    const image = typeof candidate.image === 'string' ? candidate.image : undefined;

    if (!content && !image) {
      throw new HttpsError('invalid-argument', 'Each message must include content or an image.');
    }

    return {
      role,
      content,
      image,
    };
  });
}

export function buildChatContents(messages: ChatMessage[]) {
  return messages.map((message) => {
    const parts: Array<Record<string, unknown>> = [];
    if (message.content) {
      parts.push({ text: message.content });
    }
    if (message.image) {
      parts.push({
        inlineData: {
          mimeType: getMimeTypeFromDataUrl(message.image),
          data: extractBase64Payload(message.image),
        },
      });
    }

    return {
      role: message.role,
      parts,
    };
  });
}
