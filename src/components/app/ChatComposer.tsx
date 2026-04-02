import { useRef } from 'react';
import { Image as ImageIcon, Loader2, Mic, Send, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { PersonaType } from '@/types/domain';

interface ChatComposerProps {
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
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  });
}

export function ChatComposer({
  input,
  onInputChange,
  onSend,
  selectedImage,
  onSelectedImageChange,
  isLoading,
  isRecording,
  onStartRecording,
  onStopRecording,
  persona,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-t from-bg via-bg to-transparent">
      <div className="max-w-4xl mx-auto relative">
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-full mb-4 left-0 p-2.5 bg-surface rounded-2xl border border-border flex items-center gap-3 group shadow-2xl"
          >
            <img src={selectedImage} alt="Preview" className="w-14 h-14 rounded-xl object-cover border border-border" />
            <div className="flex flex-col">
              <span className="text-[10px] text-text-muted uppercase font-bold">Image Attached</span>
              <button
                onClick={() => onSelectedImageChange(null)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Remove
              </button>
            </div>
          </motion.div>
        )}

        <div className="relative flex items-end gap-2 bg-surface border border-border rounded-[24px] p-2.5 focus-within:border-orange-500/50 transition-all shadow-2xl">
          <div className="flex items-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload image"
              className="p-3.5 hover:bg-border rounded-2xl text-text-muted hover:text-text transition-all active:scale-95"
              title="Upload Image"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }

                const result = await fileToDataUrl(file);
                onSelectedImageChange(result);
              }}
              className="hidden"
              accept="image/*"
            />

            <button
              onMouseDown={onStartRecording}
              onMouseUp={onStopRecording}
              onMouseLeave={onStopRecording}
              aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
              className={cn(
                'p-3.5 rounded-2xl transition-all active:scale-95',
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-border text-text-muted hover:text-text',
              )}
              title="Voice Input"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>

          <textarea
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder={`Message Open Claw (${persona})...`}
            className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] py-3.5 resize-none max-h-64 min-h-[48px] placeholder-text-muted/50"
            rows={1}
          />

          <button
            onClick={onSend}
            disabled={isLoading || (!input.trim() && !selectedImage)}
            aria-label="Send message"
            className={cn(
              'p-3.5 rounded-2xl transition-all shadow-lg active:scale-95',
              isLoading || (!input.trim() && !selectedImage) ? 'text-text-muted bg-border' : 'bg-text text-bg hover:opacity-90',
            )}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <div className="flex items-center justify-center gap-4 mt-4">
          <p className="text-[10px] text-text-muted tracking-widest uppercase font-bold">Adaptive Intelligence v3</p>
          <div className="w-1 h-1 rounded-full bg-border" />
          <p className="text-[10px] text-text-muted tracking-widest uppercase font-bold">Secure Session</p>
        </div>
      </div>
    </div>
  );
}
