import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiService, MODELS, PERSONAS } from '../services/gemini';
import { GoogleGenAI } from '@google/genai';

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(function() {
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: 'Mocked response',
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        data: 'mocked-audio-data',
                      },
                    },
                  ],
                },
              },
            ],
          }),
        },
      };
    }),
    ThinkingLevel: { HIGH: 'HIGH' },
    Modality: { AUDIO: 'AUDIO' },
  };
});

describe('GeminiService', () => {
  let geminiService: GeminiService;

  beforeEach(() => {
    vi.clearAllMocks();
    geminiService = new GeminiService();
  });

  it('should initialize with GoogleGenAI', () => {
    expect(GoogleGenAI).toHaveBeenCalled();
  });

  it('should call chat with default config', async () => {
    const messages = [{ role: 'user' as const, content: 'Hello' }];
    const response = await geminiService.chat(messages, {});

    expect(geminiService.ai.models.generateContent).toHaveBeenCalledWith({
      model: MODELS.FLASH,
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      config: {
        systemInstruction: expect.stringContaining(PERSONAS.general),
        tools: undefined,
        thinkingConfig: undefined,
      },
    });
    expect(response.text).toBe('Mocked response');
  });

  it('should call chat with specific persona and tools', async () => {
    const messages = [{ role: 'user' as const, content: 'Hello' }];
    await geminiService.chat(messages, {
      persona: 'coder',
      useSearch: true,
      useMaps: true,
      highThinking: true,
    });

    expect(geminiService.ai.models.generateContent).toHaveBeenCalledWith({
      model: MODELS.PRO,
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      config: {
        systemInstruction: expect.stringContaining(PERSONAS.coder),
        tools: [{ googleSearch: {} }, { googleMaps: {} }],
        thinkingConfig: { thinkingLevel: 'HIGH' },
      },
    });
  });

  it('should handle messages with images', async () => {
    const messages = [{ role: 'user' as const, content: 'What is this?', image: 'data:image/jpeg;base64,mocked-base64' }];
    await geminiService.chat(messages, {});

    expect(geminiService.ai.models.generateContent).toHaveBeenCalledWith({
      model: MODELS.FLASH,
      contents: [{ role: 'user', parts: [{ text: 'What is this?' }, { inlineData: { mimeType: 'image/jpeg', data: 'mocked-base64' } }] }],
      config: expect.any(Object),
    });
  });

  it('should transcribe audio', async () => {
    const response = await geminiService.transcribe('mocked-audio-base64');
    
    expect(geminiService.ai.models.generateContent).toHaveBeenCalledWith({
      model: MODELS.FLASH,
      contents: [
        {
          parts: [
            { text: 'Transcribe this audio exactly as spoken.' },
            { inlineData: { mimeType: 'audio/wav', data: 'mocked-audio-base64' } },
          ],
        },
      ],
    });
    expect(response).toBe('Mocked response');
  });

  it('should convert text to speech', async () => {
    const response = await geminiService.textToSpeech('Hello world');
    
    expect(geminiService.ai.models.generateContent).toHaveBeenCalledWith({
      model: MODELS.TTS,
      contents: [{ parts: [{ text: 'Hello world' }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    expect(response).toBe('mocked-audio-data');
  });
});
