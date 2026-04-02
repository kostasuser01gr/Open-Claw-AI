import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatComposer } from '@/components/app/ChatComposer';
import type { PersonaType } from '@/types/domain';

function renderComposer(overrides?: Partial<{
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  selectedImage: string | null;
  onSelectedImageChange: (value: string | null) => void;
  isLoading: boolean;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  persona: PersonaType;
}>) {
  const props = {
    input: '',
    onInputChange: vi.fn(),
    onSend: vi.fn(),
    selectedImage: null,
    onSelectedImageChange: vi.fn(),
    isLoading: false,
    isRecording: false,
    onStartRecording: vi.fn(),
    onStopRecording: vi.fn(),
    persona: 'general' as PersonaType,
    ...overrides,
  };

  return {
    ...render(<ChatComposer {...props} />),
    props,
  };
}

describe('ChatComposer', () => {
  it('sends messages from the send button and enter key when content is present', () => {
    const { props } = renderComposer({ input: 'Need a rental quote' });

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(props.onSend).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(props.onSend).toHaveBeenCalledTimes(2);
  });

  it('keeps send disabled when there is no text or image and exposes named action buttons', () => {
    renderComposer();

    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Upload image' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start voice input' })).toBeInTheDocument();
  });

  it('uploads image attachments, removes previews, and forwards voice interactions', async () => {
    const originalFileReader = globalThis.FileReader;

    class MockFileReader {
      result: string | ArrayBuffer | null = 'data:image/png;base64,mock-preview';
      onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
      onloadend: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;

      readAsDataURL(file: Blob) {
        void file;
        this.onloadend?.call(this as unknown as FileReader, new ProgressEvent('loadend') as unknown as ProgressEvent<FileReader>);
      }
    }

    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;

    try {
      const { container, props } = renderComposer({
        selectedImage: 'data:image/png;base64,existing-preview',
      });

      fireEvent.click(screen.getByRole('button', { name: /remove/i }));
      expect(props.onSelectedImageChange).toHaveBeenCalledWith(null);

      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).not.toBeNull();

      const file = new File(['mock'], 'vehicle.png', { type: 'image/png' });
      fireEvent.change(fileInput as HTMLInputElement, { target: { files: [file] } });

      await waitFor(() => {
        expect(props.onSelectedImageChange).toHaveBeenCalledWith('data:image/png;base64,mock-preview');
      });

      fireEvent.mouseDown(screen.getByRole('button', { name: 'Start voice input' }));
      fireEvent.mouseUp(screen.getByRole('button', { name: 'Start voice input' }));
      fireEvent.mouseLeave(screen.getByRole('button', { name: 'Start voice input' }));

      expect(props.onStartRecording).toHaveBeenCalledTimes(1);
      expect(props.onStopRecording).toHaveBeenCalledTimes(2);
    } finally {
      globalThis.FileReader = originalFileReader;
    }
  });
});
