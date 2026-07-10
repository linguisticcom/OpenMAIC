import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActionEngine } from '@/lib/action/engine';
import {
  buildBrowserNarrationChunks,
  pickNaturalBrowserVoice,
  PlaybackEngine,
} from '@/lib/playback/engine';
import type { Scene } from '@/lib/types/stage';
import type { AudioPlayer } from '@/lib/utils/audio-player';

function voice(name: string, options: Partial<SpeechSynthesisVoice> = {}): SpeechSynthesisVoice {
  return {
    default: false,
    lang: 'en-US',
    localService: true,
    name,
    voiceURI: name,
    ...options,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('natural browser narration', () => {
  it('keeps neighboring sentences together without exceeding the safe chunk length', () => {
    const text = 'Welcome to the course. Today we will use a practical example. Ready to begin?';
    const chunks = buildBrowserNarrationChunks(text, 65);

    expect(chunks).toEqual([
      'Welcome to the course. Today we will use a practical example.',
      'Ready to begin?',
    ]);
    expect(chunks.every((chunk) => chunk.length <= 65)).toBe(true);
    expect(chunks.join(' ')).toBe(text);
  });

  it('prefers a premium natural voice over a default compact voice', () => {
    const compact = voice('eSpeak Compact', { default: true });
    const remote = voice('Generic Online Voice', { localService: false });
    const premium = voice('Ava Premium');

    expect(pickNaturalBrowserVoice([compact, remote, premium], 'Welcome to class.')).toBe(premium);
  });

  it('honors the browser override before legacy generated audio', async () => {
    class MockUtterance {
      text: string;
      volume = 1;
      rate = 1;
      pitch = 1;
      lang = '';
      voice: SpeechSynthesisVoice | null = null;
      onend: ((event: Event) => void) | null = null;
      onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;

      constructor(text: string) {
        this.text = text;
      }
    }

    const speak = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
    vi.stubGlobal('window', {
      location: { search: '?tts=browser' },
      speechSynthesis: {
        cancel: vi.fn(),
        speak,
        getVoices: () => [voice('Ava Premium')],
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    const audioPlayer = {
      play: vi.fn().mockResolvedValue(true),
      stop: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      isPlaying: () => false,
      hasActiveAudio: () => false,
      onEnded: vi.fn(),
    } as unknown as AudioPlayer;
    const actionEngine = { clearEffects: vi.fn() } as unknown as ActionEngine;
    const scene = {
      id: 'scene-natural-audio',
      stageId: 'stage-natural-audio',
      type: 'slide',
      title: 'Natural narration',
      order: 0,
      content: { elements: [] },
      actions: [
        {
          id: 'speech-natural',
          type: 'speech',
          text: 'Welcome to a clearer and more natural lesson.',
          audioUrl: '/api/classroom-media/legacy-robotic.mp3',
        },
      ],
    } as unknown as Scene;

    new PlaybackEngine([scene], actionEngine, audioPlayer).start();

    await vi.waitFor(() =>
      expect(
        speak.mock.calls.some(
          ([utterance]) =>
            (utterance as MockUtterance).text === 'Welcome to a clearer and more natural lesson.',
        ),
      ).toBe(true),
    );
    expect(audioPlayer.play).not.toHaveBeenCalled();
    const narration = speak.mock.calls
      .map(([utterance]) => utterance as MockUtterance)
      .find((utterance) => utterance.text.trim().length > 0);
    expect(narration).toMatchObject({ pitch: 1, rate: 0.96, volume: 1 });
  });
});
