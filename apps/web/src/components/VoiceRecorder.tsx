'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Volume2, AlertCircle, Trash2 } from 'lucide-react';

interface VoiceRecorderProps {
  /** Called once recording stops with the raw audio — this is what actually
   * gets sent to POST /api/v1/visits for real Groq Whisper transcription.
   * Nothing here fakes a transcript client-side. */
  onAudioReady: (blob: Blob, mimeType: string) => void;
  onClear: () => void;
  hasRecording: boolean;
  disabled?: boolean;
}

/** Picks a MIME type the browser's MediaRecorder actually supports, in the
 * order the backend's STT module prefers (see services/speech/validation.ts). */
function pickSupportedMimeType(): string | null {
  const candidates = ['audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(type)) {
      return type;
    }
  }
  return null;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAudioReady,
  onClear,
  hasRecording,
  disabled,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = async () => {
    setError(null);
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Voice recording is not supported in this browser. Use text entry instead.');
      return;
    }
    const mimeType = pickSupportedMimeType();
    if (!mimeType) {
      setError('No supported audio format available on this device. Use text entry instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onAudioReady(blob, mimeType);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      setError('Microphone access was denied. Allow microphone access, or use text entry instead.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    mediaRecorderRef.current?.stop();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isRecording ? 'bg-rose-100 text-rose-600 animate-pulse' : ''
          }`}
          style={!isRecording ? { backgroundColor: 'var(--color-accent-light)', color: 'var(--color-primary)' } : undefined}
        >
          <Volume2 className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Voice Documentation</h3>
          <p className="text-xs text-slate-500">Recorded audio is sent for real transcription</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        {!isRecording && !hasRecording && (
          <div className="text-center space-y-3">
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled}
              className="w-18 h-18 rounded-full text-white flex items-center justify-center shadow-md hover:shadow-lg active:scale-95 transition-all mx-auto disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)' }}
              aria-label="Tap to speak"
            >
              <Mic className="w-8 h-8" />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-800">Tap to speak</p>
              <p className="text-xs text-slate-500 max-w-xs px-4 mt-0.5">
                Describe the visit naturally. It will be transcribed and structured for your review.
              </p>
            </div>
          </div>
        )}

        {isRecording && (
          <div className="text-center space-y-3">
            <button
              type="button"
              onClick={stopRecording}
              className="w-18 h-18 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all mx-auto animate-pulse"
              aria-label="Stop recording"
            >
              <Square className="w-6 h-6 fill-current" />
            </button>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <p className="text-sm font-bold text-rose-600">Recording…</p>
                <span className="text-sm font-mono font-bold text-slate-700">{formatTimer(duration)}</span>
              </div>
              <p className="text-xs text-slate-500">Tap square button when finished</p>
            </div>
          </div>
        )}

        {!isRecording && hasRecording && (
          <div className="text-center space-y-3">
            <div
              className="w-18 h-18 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: 'var(--color-online-bg)', color: 'var(--color-online-text)' }}
            >
              <Mic className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-online-text)' }}>
                Recording captured ({formatTimer(duration)})
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Ready to submit for transcription.</p>
            </div>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Discard &amp; re-record
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl text-xs font-medium"
          style={{ backgroundColor: 'var(--color-urgent-bg)', color: 'var(--color-urgent-text)' }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
