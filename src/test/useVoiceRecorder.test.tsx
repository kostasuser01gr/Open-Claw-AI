import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  transcribeMock,
  getUserMediaMock,
  stopTrackMock,
} = vi.hoisted(() => ({
  transcribeMock: vi.fn(),
  getUserMediaMock: vi.fn(),
  stopTrackMock: vi.fn(),
}));

vi.mock('@/services/gemini', () => ({
  gemini: {
    transcribe: transcribeMock,
  },
}));

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onloadend: null | (() => void) = null;

  readAsDataURL() {
    this.result = 'data:audio/wav;base64,ZmFrZS1hdWRpbw==';
    this.onloadend?.();
  }
}

class MockMediaRecorder {
  static instances: MockMediaRecorder[] = [];

  ondataavailable: null | ((event: { data: Blob }) => void) = null;
  onstop: null | (() => void) = null;
  start = vi.fn();
  stop = vi.fn(() => {
    this.ondataavailable?.({ data: new Blob(['audio'], { type: 'audio/wav' }) });
    this.onstop?.();
  });

  constructor(public stream: MediaStream) {
    MockMediaRecorder.instances.push(this);
  }
}

const originalFileReader = globalThis.FileReader;
const originalMediaRecorder = globalThis.MediaRecorder;
const originalMediaDevices = navigator.mediaDevices;

describe('useVoiceRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockMediaRecorder.instances = [];

    Object.defineProperty(globalThis, 'FileReader', {
      configurable: true,
      writable: true,
      value: MockFileReader,
    });
    Object.defineProperty(globalThis, 'MediaRecorder', {
      configurable: true,
      writable: true,
      value: MockMediaRecorder,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      writable: true,
      value: {
        getUserMedia: getUserMediaMock,
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'FileReader', {
      configurable: true,
      writable: true,
      value: originalFileReader,
    });
    Object.defineProperty(globalThis, 'MediaRecorder', {
      configurable: true,
      writable: true,
      value: originalMediaRecorder,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      writable: true,
      value: originalMediaDevices,
    });
  });

  it('records audio, transcribes it, and stops the active stream', async () => {
    const stream = {
      getTracks: () => [
        {
          stop: stopTrackMock,
        },
      ],
    } as unknown as MediaStream;
    getUserMediaMock.mockResolvedValue(stream);
    transcribeMock.mockResolvedValue('Transcribed speech');

    const onTranscribed = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useVoiceRecorder({ onTranscribed, onError }));

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
    expect(MockMediaRecorder.instances).toHaveLength(1);
    expect(MockMediaRecorder.instances[0]?.start).toHaveBeenCalled();

    await act(async () => {
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(onTranscribed).toHaveBeenCalledWith('Transcribed speech');
    });

    expect(result.current.isRecording).toBe(false);
    expect(transcribeMock).toHaveBeenCalledWith('ZmFrZS1hdWRpbw==');
    expect(stopTrackMock).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('surfaces microphone permission failures', async () => {
    getUserMediaMock.mockRejectedValue(new Error('denied'));

    const onTranscribed = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useVoiceRecorder({ onTranscribed, onError }));

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(onTranscribed).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('Microphone access was denied.');
  });

  it('surfaces transcription failures and still tears down the stream', async () => {
    const stream = {
      getTracks: () => [
        {
          stop: stopTrackMock,
        },
      ],
    } as unknown as MediaStream;
    getUserMediaMock.mockResolvedValue(stream);
    transcribeMock.mockRejectedValue(new Error('failed'));

    const onTranscribed = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useVoiceRecorder({ onTranscribed, onError }));

    await act(async () => {
      await result.current.startRecording();
    });

    await act(async () => {
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Voice transcription failed.');
    });

    expect(onTranscribed).not.toHaveBeenCalled();
    expect(stopTrackMock).toHaveBeenCalled();
  });
});
