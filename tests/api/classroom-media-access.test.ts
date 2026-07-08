import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/classroom-media/[classroomId]/[...path]/route';

const mocks = vi.hoisted(() => ({
  canReadClassroom: vi.fn(),
}));

vi.mock('@/lib/server/classroom-access', () => ({
  canReadClassroom: mocks.canReadClassroom,
}));

function request(pathname: string, headers?: Record<string, string>) {
  return new NextRequest(`http://localhost${pathname}`, headers ? { headers } : undefined);
}

function params(classroomId: string, path: string[]) {
  return { params: Promise.resolve({ classroomId, path }) };
}

describe('classroom media LMS access', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rejects assigned classroom media when course access is missing', async () => {
    mocks.canReadClassroom.mockResolvedValue(false);

    const response = await GET(
      request('/api/classroom-media/classroom-cloud/media/cover.png'),
      params('classroom-cloud', ['media', 'cover.png']),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Course access required.' });
    expect(mocks.canReadClassroom).toHaveBeenCalledWith('classroom-cloud');
  });

  it('validates media path shape before checking course access', async () => {
    const response = await GET(
      request('/api/classroom-media/classroom-cloud/private/notes.txt'),
      params('classroom-cloud', ['private', 'notes.txt']),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid path' });
    expect(mocks.canReadClassroom).not.toHaveBeenCalled();
  });

  it('serves classroom audio byte ranges for browser media playback', async () => {
    mocks.canReadClassroom.mockResolvedValue(true);

    const response = await GET(
      request(
        '/api/classroom-media/a1wNxs34ed/audio/tts_s1_action_scene_a1wNxs34ed_1_orientation_speech_0.mp3',
        { Range: 'bytes=0-9' },
      ),
      params('a1wNxs34ed', ['audio', 'tts_s1_action_scene_a1wNxs34ed_1_orientation_speech_0.mp3']),
    );

    expect(response.status).toBe(206);
    expect(response.headers.get('content-type')).toBe('audio/mpeg');
    expect(response.headers.get('accept-ranges')).toBe('bytes');
    expect(response.headers.get('content-length')).toBe('10');
    expect(response.headers.get('content-range')).toMatch(/^bytes 0-9\/\d+$/);
    await expect(response.arrayBuffer()).resolves.toHaveProperty('byteLength', 10);
  });

  it('rejects invalid classroom media byte ranges', async () => {
    mocks.canReadClassroom.mockResolvedValue(true);

    const response = await GET(
      request(
        '/api/classroom-media/a1wNxs34ed/audio/tts_s1_action_scene_a1wNxs34ed_1_orientation_speech_0.mp3',
        { Range: 'bytes=999999999-' },
      ),
      params('a1wNxs34ed', ['audio', 'tts_s1_action_scene_a1wNxs34ed_1_orientation_speech_0.mp3']),
    );

    expect(response.status).toBe(416);
    expect(response.headers.get('content-range')).toMatch(/^bytes \*\/\d+$/);
  });
});
