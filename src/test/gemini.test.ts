import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GeminiService, MODELS, PERSONAS } from '@/services/gemini';

const { callableMocks, httpsCallableMock } = vi.hoisted(() => {
  const mocks = {
    chatWithGemini: vi.fn(),
    transcribeAudio: vi.fn(),
    textToSpeech: vi.fn(),
    analyzeDamageImage: vi.fn(),
  };

  return {
    callableMocks: mocks,
    httpsCallableMock: vi.fn((_functions: unknown, name: keyof typeof mocks) => mocks[name]),
  };
});

vi.mock('firebase/functions', () => ({
  httpsCallable: httpsCallableMock,
}));

vi.mock('@/firebase', () => ({
  functions: {},
}));

describe('GeminiService', () => {
  let geminiService: GeminiService;

  beforeEach(() => {
    vi.clearAllMocks();

    callableMocks.chatWithGemini.mockResolvedValue({
      data: { text: 'Mocked response', groundingMetadata: { groundingChunks: [] } },
    });
    callableMocks.transcribeAudio.mockResolvedValue({
      data: { text: 'Mocked transcription' },
    });
    callableMocks.textToSpeech.mockResolvedValue({
      data: { audioBase64: 'mocked-audio-data' },
    });
    callableMocks.analyzeDamageImage.mockResolvedValue({
      data: {
        assessment: {
          severity: 'medium',
          estimatedRepairCost: 450,
          description: 'Front bumper scratch',
          aiAssessment: 'Cosmetic repair recommended.',
        },
      },
    });

    geminiService = new GeminiService();
  });

  it('exports the expected model and persona metadata', () => {
    expect(MODELS.FLASH).toBe('gemini-3-flash-preview');
    expect(PERSONAS.rentalAgent).toContain('car rental concierge');
  });

  it('calls the chat callable with messages and config', async () => {
    const messages = [{ role: 'user' as const, content: 'Hello' }];
    const response = await geminiService.chat(messages, { persona: 'coder', useSearch: true });

    expect(httpsCallableMock).toHaveBeenCalledWith({}, 'chatWithGemini');
    expect(callableMocks.chatWithGemini).toHaveBeenCalledWith({
      messages,
      config: { persona: 'coder', useSearch: true },
    });
    expect(response.text).toBe('Mocked response');
  });

  it('calls the transcription callable', async () => {
    const response = await geminiService.transcribe('mocked-audio-base64');

    expect(httpsCallableMock).toHaveBeenCalledWith({}, 'transcribeAudio');
    expect(callableMocks.transcribeAudio).toHaveBeenCalledWith({ audioBase64: 'mocked-audio-base64' });
    expect(response).toBe('Mocked transcription');
  });

  it('calls the text-to-speech callable', async () => {
    const response = await geminiService.textToSpeech('Hello world');

    expect(httpsCallableMock).toHaveBeenCalledWith({}, 'textToSpeech');
    expect(callableMocks.textToSpeech).toHaveBeenCalledWith({ text: 'Hello world' });
    expect(response).toBe('mocked-audio-data');
  });

  it('calls the damage analysis callable and strips the data URL prefix', async () => {
    const response = await geminiService.analyzeDamage('data:image/jpeg;base64,mocked-base64');

    expect(httpsCallableMock).toHaveBeenCalledWith({}, 'analyzeDamageImage');
    expect(callableMocks.analyzeDamageImage).toHaveBeenCalledWith({ imageBase64: 'mocked-base64' });
    expect(response?.severity).toBe('medium');
  });
});
