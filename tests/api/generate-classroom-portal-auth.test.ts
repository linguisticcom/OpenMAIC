import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  createClassroomGenerationJob: vi.fn(),
  getCurrentPortalSession: vi.fn(),
  runClassroomGenerationJob: vi.fn(),
}));

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: mocks.after };
});

vi.mock('@/lib/server/classroom-job-runner', () => ({
  runClassroomGenerationJob: mocks.runClassroomGenerationJob,
}));

vi.mock('@/lib/server/classroom-job-store', () => ({
  createClassroomGenerationJob: mocks.createClassroomGenerationJob,
}));

vi.mock('@/lib/server/classroom-storage', () => ({
  buildRequestOrigin: () => 'https://academy.example.test',
}));

vi.mock('@/lib/server/organization-session', () => ({
  getCurrentPortalSession: mocks.getCurrentPortalSession,
  isPlatformAdmin: (user: { role: string }) => user.role === 'platform-admin',
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/generate-classroom/route';

function request(body: Record<string, unknown>) {
  return new NextRequest('https://academy.example.test/api/generate-classroom', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('LC Academy upstream generation publishing auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClassroomGenerationJob.mockResolvedValue({
      status: 'queued',
      step: 'queued',
      message: 'Classroom generation job queued',
    });
  });

  it('keeps ordinary upstream generation jobs available without a portal session', async () => {
    const response = await POST(request({ requirement: 'Teach a B1 English lesson.' }));
    expect(response.status).toBe(202);
    expect(mocks.getCurrentPortalSession).not.toHaveBeenCalled();
    expect(mocks.createClassroomGenerationJob).toHaveBeenCalledTimes(1);
  });

  it('requires authentication for jobs that register a portal course', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);
    const response = await POST(
      request({
        requirement: 'Teach a B1 English lesson.',
        portalCourseMetadata: { title: 'B1 Course', publishStatus: 'draft' },
      }),
    );
    expect(response.status).toBe(401);
    expect(mocks.createClassroomGenerationJob).not.toHaveBeenCalled();
  });

  it('rejects non-platform users from publishing generated courses', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({ user: { role: 'organization-admin' } });
    const response = await POST(
      request({
        requirement: 'Teach a B1 English lesson.',
        portalCourseMetadata: { title: 'B1 Course', publishStatus: 'draft' },
      }),
    );
    expect(response.status).toBe(403);
    expect(mocks.createClassroomGenerationJob).not.toHaveBeenCalled();
  });

  it('sanitizes metadata and queues an authenticated platform publishing job', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({ user: { role: 'platform-admin' } });
    const response = await POST(
      request({
        requirement: 'Teach a B1 English lesson.',
        portalCourseMetadata: {
          title: '  B1 Customer Service  ',
          description: '  Complaint handling  ',
          publishStatus: 'anything-else',
          estimatedDurationMinutes: 999999,
        },
      }),
    );

    expect(response.status).toBe(202);
    const queuedInput = mocks.createClassroomGenerationJob.mock.calls[0]?.[1];
    expect(queuedInput.portalCourseMetadata).toMatchObject({
      title: 'B1 Customer Service',
      description: 'Complaint handling',
      publishStatus: 'draft',
      estimatedDurationMinutes: 10080,
    });
    expect(mocks.after).toHaveBeenCalledTimes(1);
  });
});
