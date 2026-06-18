import { useCallback, useRef, useState } from 'react';
import { ASR_PROVIDERS } from '@/lib/audio/constants';
import type { ASRProviderId } from '@/lib/audio/types';
import { normalizeASRUploadAudio } from '@/lib/audio/wav-utils';
import { createLogger } from '@/lib/logger';

const log = createLogger('AudioRecorder');

function shouldForceLocalWhisper(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('tts') === 'browser';
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Web Speech API is not typed in lib.dom.
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Web Speech API is not typed in lib.dom.
    webkitSpeechRecognition: any;
  }
}

export interface UseAudioRecorderOptions {
  onTranscription?: (text: string) => void;
  onError?: (error: string) => void;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const { onTranscription, onError } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const browserFallbackRecorderRef = useRef<MediaRecorder | null>(null);
  const browserFallbackChunksRef = useRef<Blob[]>([]);
  const browserFallbackStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const browserTranscriptRef = useRef('');
  const browserRecognitionErrorRef = useRef<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Web Speech API is not typed.
  const speechRecognitionRef = useRef<any>(null);
  const busyRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetRecordingState = useCallback(() => {
    busyRef.current = false;
    setIsRecording(false);
    setRecordingTime(0);
    clearTimer();
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  }, [clearTimer]);

  const stopBrowserFallbackStream = useCallback(() => {
    browserFallbackStreamRef.current?.getTracks().forEach((track) => track.stop());
    browserFallbackStreamRef.current = null;
  }, []);

  const startBrowserFallbackRecorder = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    browserFallbackStreamRef.current = stream;
    browserFallbackRecorderRef.current = recorder;
    browserFallbackChunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        browserFallbackChunksRef.current.push(event.data);
      }
    };
    recorder.start();
  }, []);

  const stopBrowserFallbackRecorder = useCallback(async (): Promise<Blob | null> => {
    const recorder = browserFallbackRecorderRef.current;
    if (!recorder) return null;

    if (recorder.state === 'inactive') {
      browserFallbackRecorderRef.current = null;
      stopBrowserFallbackStream();
      return browserFallbackChunksRef.current.length
        ? new Blob(browserFallbackChunksRef.current, { type: 'audio/webm' })
        : null;
    }

    const stopped = new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true });
    });
    recorder.stop();
    await stopped;
    browserFallbackRecorderRef.current = null;
    stopBrowserFallbackStream();

    return browserFallbackChunksRef.current.length
      ? new Blob(browserFallbackChunksRef.current, { type: 'audio/webm' })
      : null;
  }, [stopBrowserFallbackStream]);

  const transcribeAudio = useCallback(
    async (
      audioBlob: Blob,
      override?: {
        providerId?: string;
        modelId?: string;
        language?: string;
        localWhisper?: boolean;
      },
    ) => {
      setIsProcessing(true);

      try {
        const formData = new FormData();
        const useLocalWhisper = override?.localWhisper || shouldForceLocalWhisper();

        if (useLocalWhisper) {
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('model', override?.modelId || 'base');
          formData.append('language', override?.language || 'en');
        } else if (typeof window !== 'undefined') {
          const { useSettingsStore } = await import('@/lib/store/settings');
          const { asrProviderId, asrLanguage, asrProvidersConfig } = useSettingsStore.getState();
          const providerId = (override?.providerId || asrProviderId) as ASRProviderId;
          const uploadAudio = await normalizeASRUploadAudio(providerId, audioBlob);
          formData.append('audio', uploadAudio.blob, uploadAudio.fileName);
          formData.append('providerId', providerId);
          formData.append(
            'modelId',
            override?.modelId ||
              asrProvidersConfig?.[providerId]?.modelId ||
              ASR_PROVIDERS[providerId as keyof typeof ASR_PROVIDERS]?.defaultModelId ||
              '',
          );
          formData.append('language', override?.language || asrLanguage);

          const providerConfig = asrProvidersConfig?.[providerId];
          if (providerConfig?.apiKey?.trim()) {
            formData.append('apiKey', providerConfig.apiKey);
          }
          const effectiveBaseUrl =
            providerConfig?.baseUrl?.trim() || providerConfig?.customDefaultBaseUrl || '';
          if (effectiveBaseUrl) {
            formData.append('baseUrl', effectiveBaseUrl);
          }
        } else {
          formData.append('audio', audioBlob, 'recording.webm');
        }

        const response = await fetch(useLocalWhisper ? '/api/transcription/local-whisper' : '/api/transcription', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.details || error.error || 'Transcription failed');
        }

        const result = await response.json();
        onTranscription?.(result.text || '');
      } catch (error) {
        log.warn('Transcription error:', error);
        onError?.(error instanceof Error ? error.message : 'Speech recognition failed. Please try again.');
      } finally {
        setIsProcessing(false);
        setRecordingTime(0);
      }
    },
    [onTranscription, onError],
  );

  const startBrowserRecognition = useCallback(
    (language: string) => {
      if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        onError?.('This browser does not support speech recognition. Try Chrome or use text input.');
        resetRecordingState();
        return;
      }

      window.speechSynthesis?.cancel();
      browserTranscriptRef.current = '';
      browserRecognitionErrorRef.current = null;
      void startBrowserFallbackRecorder().catch((error) => {
        log.warn('Browser ASR fallback recorder unavailable:', error);
      });

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = language || 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        setRecordingTime(0);
        startTimer();
      };

      recognition.onresult = (event: {
        resultIndex?: number;
        results: {
          length: number;
          [index: number]: {
            isFinal?: boolean;
            [index: number]: { transcript: string };
          };
        };
      }) => {
        let bestTranscript = browserTranscriptRef.current;
        const startIndex = event.resultIndex ?? 0;
        for (let index = startIndex; index < event.results.length; index++) {
          const transcript = event.results[index]?.[0]?.transcript?.trim();
          if (transcript) bestTranscript = transcript;
        }
        browserTranscriptRef.current = bestTranscript;

        const lastResult = event.results[event.results.length - 1];
        if (lastResult?.isFinal && bestTranscript.trim()) {
          recognition.stop();
        }
      };

      recognition.onerror = (event: { error: string }) => {
        let errorMessage = 'Speech recognition failed.';

        switch (event.error) {
          case 'aborted':
            resetRecordingState();
            return;
          case 'no-speech':
            errorMessage = 'No speech detected. Click the mic and start speaking right away.';
            break;
          case 'audio-capture':
            errorMessage = 'Could not access the microphone. Check the selected input device.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission was denied.';
            break;
          case 'network':
            errorMessage = 'Browser speech recognition needs network access in Chrome.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }

        if (event.error === 'no-speech') {
          log.warn('Speech recognition warning:', event.error);
        } else {
          log.error('Speech recognition error:', event.error);
        }
        browserRecognitionErrorRef.current = errorMessage;
      };

      recognition.onend = async () => {
        const transcript = browserTranscriptRef.current.trim();
        const errorMessage = browserRecognitionErrorRef.current;
        browserTranscriptRef.current = '';
        browserRecognitionErrorRef.current = null;
        speechRecognitionRef.current = null;

        if (transcript) {
          void stopBrowserFallbackRecorder();
          onTranscription?.(transcript);
        } else {
          const fallbackAudio = await stopBrowserFallbackRecorder();
          if (fallbackAudio && fallbackAudio.size > 0) {
            await transcribeAudio(fallbackAudio, {
              localWhisper: true,
              providerId: 'local-whisper',
              modelId: 'base',
              language: 'en',
            });
          } else if (errorMessage) {
            onError?.(errorMessage);
          } else {
            onError?.('No transcript captured. Check that Chrome is using the correct microphone input.');
          }
        }

        resetRecordingState();
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    },
    [
      onError,
      onTranscription,
      resetRecordingState,
      startBrowserFallbackRecorder,
      startTimer,
      stopBrowserFallbackRecorder,
      transcribeAudio,
    ],
  );

  const startRecording = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      if (typeof window !== 'undefined') {
        const { useSettingsStore } = await import('@/lib/store/settings');
        const { asrProviderId, asrLanguage } = useSettingsStore.getState();

        if (asrProviderId === 'browser-native') {
          startBrowserRecognition(asrLanguage || 'en-US');
          return;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });
        await transcribeAudio(audioBlob);
        busyRef.current = false;
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      startTimer();
    } catch (error) {
      log.error('Failed to start recording:', error);
      onError?.('Could not access the microphone. Check browser and Windows permissions.');
      resetRecordingState();
    }
  }, [onError, resetRecordingState, startBrowserRecognition, startTimer, transcribeAudio]);

  const stopRecording = useCallback(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      return;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearTimer();
    }
  }, [clearTimer, isRecording]);

  const cancelRecording = useCallback(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.onresult = null;
      speechRecognitionRef.current.onerror = null;
      speechRecognitionRef.current.onend = null;
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
      browserTranscriptRef.current = '';
      browserRecognitionErrorRef.current = null;
      if (browserFallbackRecorderRef.current?.state === 'recording') {
        browserFallbackRecorderRef.current.stop();
      }
      browserFallbackRecorderRef.current = null;
      browserFallbackChunksRef.current = [];
      stopBrowserFallbackStream();
      resetRecordingState();
      return;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();

      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }

      audioChunksRef.current = [];
      resetRecordingState();
    }
  }, [isRecording, resetRecordingState, stopBrowserFallbackStream]);

  return {
    isRecording,
    isProcessing,
    recordingTime,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
