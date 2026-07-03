import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/classroom-media/[classroomId]/[...path]/route';

const mocks = vi.hoisted(() => ({
  canReadClassroom: vi.fn(),
}));

vi.mock('@/lib/server/classroom-access', () => ({
  canReadClassroom: mocks.canReadClassroom,
}));

function request(pathname: string) {
  return new NextRequest(`http://localhost${pathname}`);
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
});
