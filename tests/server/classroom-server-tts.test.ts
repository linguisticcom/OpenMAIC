import { promises as fs } from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Scene } from '@/lib/types/stage';

const mocks = vi.hoisted(() => ({
  classroomsDir: `/tmp/openmaic-server-tts-${process.pid}`,
  getServerTTSProviders: vi.fn(),
  generateTTS: vi.fn(),
}));

vi.mock('@/lib/server/classroom-storage', () => ({
  CLASSROOMS_DIR: mocks.classroomsDir,
}));

vi.mock('@/lib/server/provider-config', () => ({
  getServerImageProviders: vi.fn(() => ({})),
  getServerVideoProviders: vi.fn(() => ({})),
  getServerTTSProviders: mocks.getServerTTSProviders,
  resolveImageApiKey: vi.fn(),
  resolveImageBaseUrl: vi.fn(),
  resolveVideoApiKey: vi.fn(),
  resolveVideoBaseUrl: vi.fn(),
  resolveTTSApiKey: vi.fn(() => 'test-key'),
  resolveTTSBaseUrl: vi.fn(),
}));

vi.mock('@/lib/audio/tts-providers', () => ({
  generateTTS: mocks.generateTTS,
}));

import { generateTTSForClassroom } from '@/lib/server/classroom-media-generation';

function narratedScene(): Scene {
  return {
    id: 'scene-1',
    stageId: 'classroom-1',
    type: 'slide',
    title: 'Narrated lesson',
    order: 1,
    content: { type: 'slide' },
    actions: [
      {
        id: 'speech-1',
        type: 'speech',
        text: 'Welcome to the lesson.',
        agentId: 'teacher-1',
      },
      {
        id: 'speech-2',
        type: 'speech',
        text: 'Let us work through an example.',
        agentId: 'teacher-1',
      },
    ],
  } as unknown as Scene;
}

describe('server classroom TTS completeness', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await fs.rm(mocks.classroomsDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(mocks.classroomsDir, { recursive: true, force: true });
  });

  it('fails explicitly when server voice is requested without a configured provider', async () => {
    mocks.getServerTTSProviders.mockReturnValue({});

    await expect(
      generateTTSForClassroom([narratedScene()], 'classroom-1', 'http://localhost:3000'),
    ).rejects.toThrow('no server TTS provider is configured');
    await expect(
      fs.stat(path.join(mocks.classroomsDir, 'classroom-1', 'audio')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('reports complete server audio only after every narration file is persisted', async () => {
    mocks.getServerTTSProviders.mockReturnValue({ openai: { disabled: false } });
    mocks.generateTTS.mockResolvedValue({ audio: Buffer.from('audio-bytes'), format: 'mp3' });
    const scene = narratedScene();

    const report = await generateTTSForClassroom([scene], 'classroom-1', 'http://localhost:3000');

    expect(report).toEqual({
      providerId: 'openai',
      narrationActions: 2,
      generatedAudio: 2,
    });
    const speechActions = scene.actions?.filter((action) => action.type === 'speech') as Array<{
      audioUrl?: string;
    }>;
    expect(
      speechActions.every((action) =>
        action.audioUrl?.includes('/api/classroom-media/classroom-1/audio/'),
      ),
    ).toBe(true);
    const files = await fs.readdir(path.join(mocks.classroomsDir, 'classroom-1', 'audio'));
    expect(files).toHaveLength(2);
  });

  it('fails the server-audio phase instead of accepting partial narration', async () => {
    mocks.getServerTTSProviders.mockReturnValue({ openai: { disabled: false } });
    mocks.generateTTS
      .mockResolvedValueOnce({ audio: Buffer.from('audio-bytes'), format: 'mp3' })
      .mockRejectedValueOnce(new Error('provider timeout'));

    await expect(
      generateTTSForClassroom([narratedScene()], 'classroom-1', 'http://localhost:3000'),
    ).rejects.toThrow('1/2 narration actions have audio');
    await expect(
      fs.stat(path.join(mocks.classroomsDir, 'classroom-1', 'audio')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
