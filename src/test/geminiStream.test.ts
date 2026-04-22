import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getIdTokenMock } = vi.hoisted(() => ({
  getIdTokenMock: vi.fn(),
}));

vi.mock('@/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: getIdTokenMock,
    },
  },
  functions: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}));

vi.mock('@/config/env', () => ({
  appEnv: {
    functionsRegion: 'us-central1',
    useFunctionsEmulator: false,
    functionsHost: '127.0.0.1',
    functionsPort: 5001,
  },
}));

import { GeminiService } from '@/services/gemini';

describe('GeminiService.chatStream', () => {
  let service: GeminiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GeminiService();
  });

  it('calls onError when fetch response is not ok', async () => {
    getIdTokenMock.mockResolvedValueOnce('test-token');
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValueOnce({ error: 'Rate limit exceeded' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const onError = vi.fn();
    const onToken = vi.fn();
    const onDone = vi.fn();

    await service.chatStream(
      [{ role: 'user', content: 'hello' }],
      {},
      { onToken, onDone, onError },
    );

    expect(onError).toHaveBeenCalledWith('Rate limit exceeded');
    expect(onToken).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('parses SSE events and calls appropriate callbacks', async () => {
    getIdTokenMock.mockResolvedValueOnce('test-token');

    const sseData = [
      'event: token\ndata: {"text":"Hello"}\n\n',
      'event: token\ndata: {"text":" world"}\n\n',
      'event: grounding\ndata: {"groundingMetadata":{"chunks":[]}}\n\n',
      'event: done\ndata: {}\n\n',
    ].join('');

    const encoder = new TextEncoder();

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: encoder.encode(sseData) })
            .mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const onToken = vi.fn();
    const onGrounding = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    await service.chatStream(
      [{ role: 'user', content: 'hello' }],
      { persona: 'general' },
      { onToken, onGrounding, onDone, onError },
    );

    expect(onToken).toHaveBeenCalledTimes(2);
    expect(onToken).toHaveBeenCalledWith('Hello');
    expect(onToken).toHaveBeenCalledWith(' world');
    expect(onGrounding).toHaveBeenCalledWith({ chunks: [] });
    expect(onDone).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('handles SSE error events', async () => {
    getIdTokenMock.mockResolvedValueOnce('test-token');

    const sseData = 'event: error\ndata: {"message":"Server overloaded"}\n\n';
    const encoder = new TextEncoder();

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: encoder.encode(sseData) })
            .mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const onToken = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    await service.chatStream([], {}, { onToken, onDone, onError });

    expect(onError).toHaveBeenCalledWith('Server overloaded');
    expect(onDone).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('sends correct authorization header', async () => {
    getIdTokenMock.mockResolvedValueOnce('my-jwt-token');

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValueOnce({ done: true, value: undefined }),
        }),
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    await service.chatStream(
      [{ role: 'user', content: 'test' }],
      {},
      { onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('streamChat'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer my-jwt-token',
        }),
      }),
    );

    vi.unstubAllGlobals();
  });
});
