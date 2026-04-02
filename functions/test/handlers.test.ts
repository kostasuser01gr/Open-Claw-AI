import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleAnalyzeDamageImage,
  handleChatWithGemini,
  handleTextToSpeech,
  handleTranscribeAudio,
} from '../src/handlers';

const { generateContentMock, loggerErrorMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock('../src/gemini', async () => {
  const actual = await vi.importActual<typeof import('../src/gemini')>('../src/gemini');
  return {
    ...actual,
    getGeminiClient: () => ({
      models: {
        generateContent: generateContentMock,
      },
    }),
  };
});

vi.mock('firebase-functions/logger', () => ({
  error: loggerErrorMock,
}));

vi.mock('../src/rateLimit', () => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock('../src/usage', () => ({
  recordUsage: vi.fn(),
}));

vi.mock('../src/audit', () => ({
  writeAuditLog: vi.fn(),
}));

describe('functions handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns chat text and grounding metadata for authenticated requests', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: 'Server response',
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [{ web: { uri: 'https://example.com', title: 'Example' } }],
          },
        },
      ],
    });

    const response = await handleChatWithGemini({
      auth: { uid: 'staff-1' },
      data: {
        messages: [{ role: 'user', content: 'Hello' }],
        config: { persona: 'coder', useSearch: true },
      },
    } as never);

    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3-flash-preview',
        config: expect.objectContaining({
          tools: [{ googleSearch: {} }],
          systemInstruction: expect.stringContaining('software architect'),
        }),
      }),
    );
    expect(response).toEqual({
      text: 'Server response',
      groundingMetadata: {
        groundingChunks: [{ web: { uri: 'https://example.com', title: 'Example' } }],
      },
    });
  });

  it('rejects unauthenticated callable requests', async () => {
    await expect(
      handleChatWithGemini({
        auth: null,
        data: {
          messages: [{ role: 'user', content: 'Hello' }],
          config: {},
        },
      } as never),
    ).rejects.toMatchObject({
      code: 'unauthenticated',
      message: 'Authentication is required.',
    });
  });

  it('masks upstream chat failures with a generic internal error', async () => {
    generateContentMock.mockRejectedValueOnce(new Error('upstream leaked detail'));

    await expect(
      handleChatWithGemini({
        auth: { uid: 'staff-1' },
        data: {
          messages: [{ role: 'user', content: 'Hello' }],
          config: {},
        },
      } as never),
    ).rejects.toMatchObject({
      code: 'internal',
      message: 'Gemini chat request failed.',
    });

    expect(loggerErrorMock).toHaveBeenCalledWith(
      'Gemini chat request failed.',
      expect.objectContaining({ uid: 'staff-1' }),
    );
  });

  it('returns parsed damage assessments for authenticated requests', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        severity: 'medium',
        estimatedRepairCost: 425,
        description: 'Front bumper scratch',
        aiAssessment: 'Cosmetic repair recommended.',
      }),
    });

    const response = await handleAnalyzeDamageImage({
      auth: { uid: 'staff-1' },
      data: { imageBase64: 'base64-image' },
    } as never);

    expect(response.assessment).toEqual({
      severity: 'medium',
      estimatedRepairCost: 425,
      description: 'Front bumper scratch',
      aiAssessment: 'Cosmetic repair recommended.',
    });
  });

  it('keeps transcription and text-to-speech callables authenticated', async () => {
    generateContentMock.mockResolvedValueOnce({ text: 'spoken words' });
    await expect(
      handleTranscribeAudio({
        auth: { uid: 'staff-1' },
        data: { audioBase64: 'audio-payload' },
      } as never),
    ).resolves.toEqual({ text: 'spoken words' });

    generateContentMock.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { data: 'audio-base64' } }],
          },
        },
      ],
    });
    await expect(
      handleTextToSpeech({
        auth: { uid: 'staff-1' },
        data: { text: 'hello world' },
      } as never),
    ).resolves.toEqual({ audioBase64: 'audio-base64' });
  });
});
