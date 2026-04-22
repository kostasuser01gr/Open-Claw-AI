import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '@/firebase';
import { appEnv } from '@/config/env';
import { GEMINI_MODELS, PERSONAS } from '../../shared/aiContracts';
import type {
  ChatMessage,
  DamageAssessment,
  GroundingMetadata,
  PersonaType,
  ToolCallRecord,
} from '@/types/domain';
const firebaseProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

export const MODELS = GEMINI_MODELS;
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
  specialistId?: string;
  provider?: 'gemini' | 'anthropic';
  model?: string;
  toolCalls?: ToolCallRecord[];
}

function extractBase64Payload(value: string): string {
  const [, base64] = value.split(',', 2);
  return base64 || value;
}

export interface StreamDoneInfo {
  model?: string;
  provider?: 'gemini' | 'anthropic';
  specialistId?: string;
  toolCalls?: ToolCallRecord[];
}

export interface StreamCallbacks {
  onToken: (text: string) => void;
  onGrounding?: (metadata: GroundingMetadata) => void;
  onToolUse?: (call: { name: string; args: Record<string, unknown> }) => void;
  onToolResult?: (call: ToolCallRecord) => void;
  onDone: (info?: StreamDoneInfo) => void;
  onError: (message: string) => void;
}

function getStreamUrl(): string {
  if (appEnv.workerBaseUrl) {
    return `${appEnv.workerBaseUrl}/api/chat/stream`;
  }
  if (appEnv.useFunctionsEmulator) {
    return `http://${appEnv.functionsHost}:${appEnv.functionsPort}/${firebaseProjectId}/${appEnv.functionsRegion}/streamChat`;
  }
  return `https://${appEnv.functionsRegion}-${firebaseProjectId}.cloudfunctions.net/streamChat`;
}

async function workerPost<T>(path: string, body: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');
  const response = await fetch(`${appEnv.workerBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error ?? `Worker request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export class GeminiService {
  async chatStream(
    messages: ChatMessage[],
    config: GeminiChatConfig,
    callbacks: StreamCallbacks,
    signal?: AbortSignal,
  ): Promise<void> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      callbacks.onError('Not authenticated');
      return;
    }

    let response: Response;
    try {
      response = await fetch(getStreamUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages, config }),
        signal,
      });
    } catch (error) {
      if (signal?.aborted) return;
      callbacks.onError(error instanceof Error ? error.message : 'Streaming request failed');
      return;
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Streaming request failed' }));
      callbacks.onError((body as { error?: string }).error ?? 'Streaming request failed');
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError('Streaming not supported');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      if (signal?.aborted) {
        await reader.cancel().catch(() => undefined);
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7);
        } else if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data) as Record<string, unknown>;
            switch (eventType) {
              case 'token':
                if (typeof parsed.text === 'string') callbacks.onToken(parsed.text);
                break;
              case 'grounding':
                if (parsed.groundingMetadata && callbacks.onGrounding) {
                  callbacks.onGrounding(parsed.groundingMetadata as GroundingMetadata);
                }
                break;
              case 'tool_use':
                if (typeof parsed.name === 'string' && callbacks.onToolUse) {
                  callbacks.onToolUse({
                    name: parsed.name,
                    args: (parsed.args as Record<string, unknown>) ?? {},
                  });
                }
                break;
              case 'tool_result':
                if (typeof parsed.name === 'string' && callbacks.onToolResult) {
                  callbacks.onToolResult({ name: parsed.name, ok: Boolean(parsed.ok) });
                }
                break;
              case 'done':
                callbacks.onDone({
                  model: typeof parsed.model === 'string' ? parsed.model : undefined,
                  provider:
                    parsed.provider === 'gemini' || parsed.provider === 'anthropic'
                      ? parsed.provider
                      : undefined,
                  specialistId:
                    typeof parsed.specialistId === 'string' ? parsed.specialistId : undefined,
                  toolCalls: Array.isArray(parsed.toolCalls)
                    ? (parsed.toolCalls as ToolCallRecord[])
                    : undefined,
                });
                break;
              case 'error':
                callbacks.onError(typeof parsed.message === 'string' ? parsed.message : 'Streaming error');
                break;
            }
          } catch {
            // Skip malformed JSON lines
          }
          eventType = '';
        }
      }
    }
  }

  async chat(messages: ChatMessage[], config: GeminiChatConfig): Promise<GeminiChatResponse> {
    if (appEnv.workerBaseUrl) {
      return workerPost<GeminiChatResponse>('/api/chat', { messages, config });
    }
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
