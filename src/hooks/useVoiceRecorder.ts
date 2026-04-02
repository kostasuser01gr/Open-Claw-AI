import { useEffect, useRef, useState } from 'react';
import { gemini } from '@/services/gemini';

interface UseVoiceRecorderOptions {
  onTranscribed: (text: string) => void;
  onError: (message: string) => void;
}

export function useVoiceRecorder({ onTranscribed, onError }: UseVoiceRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const result = typeof reader.result === 'string' ? reader.result.split(',')[1] ?? '' : '';
              const transcription = await gemini.transcribe(result);
              if (transcription) {
                onTranscribed(transcription);
              }
            } catch {
              onError('Voice transcription failed.');
            } finally {
              stopStream();
            }
          };
          reader.readAsDataURL(audioBlob);
        } catch {
          stopStream();
          onError('Voice transcription failed.');
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      stopStream();
      onError('Microphone access was denied.');
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) {
      return;
    }

    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
