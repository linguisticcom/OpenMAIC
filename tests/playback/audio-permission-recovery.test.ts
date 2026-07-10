import { describe, expect, it, vi } from 'vitest';
import type { ActionEngine } from '@/lib/action/engine';
import { PlaybackEngine, isAudioPlaybackPermissionError } from '@/lib/playback/engine';
import type { Scene } from '@/lib/types/stage';
import type { AudioPlayer } from '@/lib/utils/audio-player';

function createSpeechScene(): Scene {
  return {
    id: 'scene-audio',
    stageId: 'stage-audio',
    type: 'slide',
    title: 'Audio recovery',
    order: 0,
    content: { elements: [] },
    actions: [
      {
        id: 'speech-1',
        type: 'speech',
        text: 'This sentence must not be skipped.',
        audioUrl: '/api/classroom-media/audio.mp3',
      },
    ],
  } as unknown as Scene;
}

describe('PlaybackEngine audio permission recovery', () => {
  it('recognizes browser autoplay denials', () => {
    expect(
      isAudioPlaybackPermissionError(new DOMException('play() failed', 'NotAllowedError')),
    ).toBe(true);
    expect(
      isAudioPlaybackPermissionError(new Error('The user did not interact with the document')),
    ).toBe(true);
    expect(isAudioPlaybackPermissionError(new Error('Media decode failed'))).toBe(false);
  });

  it('pauses on a denied audio start and retries the same sentence', async () => {
    let ended: (() => void) | undefined;
    const play = vi
      .fn<() => Promise<boolean>>()
      .mockRejectedValueOnce(new DOMException('play() failed', 'NotAllowedError'))
      .mockResolvedValueOnce(true);
    const audioPlayer = {
      play,
      stop: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      isPlaying: () => false,
      hasActiveAudio: () => false,
      onEnded: (callback: () => void) => {
        ended = callback;
      },
    } as unknown as AudioPlayer;
    const actionEngine = { clearEffects: vi.fn() } as unknown as ActionEngine;
    const onAudioPlaybackIssue = vi.fn();
    const onComplete = vi.fn();
    const engine = new PlaybackEngine([createSpeechScene()], actionEngine, audioPlayer, {
      onAudioPlaybackIssue,
      onComplete,
    });

    engine.start();
    await vi.waitFor(() => expect(engine.getMode()).toBe('paused'));

    expect(engine.getSnapshot().actionIndex).toBe(0);
    expect(onAudioPlaybackIssue).toHaveBeenCalledWith('permission-denied');
    expect(onComplete).not.toHaveBeenCalled();

    engine.resume();
    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(2));
    expect(engine.getSnapshot().actionIndex).toBe(1);
    expect(onComplete).not.toHaveBeenCalled();

    ended?.();
    await vi.waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });
});
