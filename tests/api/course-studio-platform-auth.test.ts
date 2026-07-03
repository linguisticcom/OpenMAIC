import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as editClassroom } from '@/app/api/classroom/edit/route';
import { POST as planCourse } from '@/app/api/course/plan/route';
import {
  DELETE as deleteCourseResource,
  GET as getCourseResource,
} from '@/app/api/course/resources/[id]/route';
import {
  GET as listCourseResources,
  POST as uploadCourseResource,
} from '@/app/api/course/resources/route';
import { GET as getClassroomGenerationJob } from '@/app/api/generate-classroom/[jobId]/route';
import { POST as createClassroomGenerationJob } from '@/app/api/generate-classroom/route';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getCurrentPortalSession: vi.fn(),
  buildResourceSummaryBlock: vi.fn(),
  listCourseResources: vi.fn(),
  readCourseResource: vi.fn(),
  deleteCourseResource: vi.fn(),
  createClassroomGenerationJob: vi.fn(),
  readClassroomGenerationJob: vi.fn(),
  runClassroomGenerationJob: vi.fn(),
}));

vi.mock('@/lib/server/organization-session', () => ({
  getCurrentPortalSession: mocks.getCurrentPortalSession,
  isPlatformAdmin: (user: { role: string }) => user.role === 'platform-admin',
}));

vi.mock('@/lib/server/course-resources', () => ({
  buildResourceSummaryBlock: mocks.buildResourceSummaryBlock,
  createCourseResource: vi.fn(),
  deleteCourseResource: mocks.deleteCourseResource,
  listCourseResources: mocks.listCourseResources,
  readCourseResource: mocks.readCourseResource,
  toPublicCourseResource: (resource: unknown) => resource,
  updateCourseResourceSummary: vi.fn(),
}));

vi.mock('@/lib/server/classroom-job-store', () => ({
  createClassroomGenerationJob: mocks.createClassroomGenerationJob,
  isValidClassroomJobId: (jobId: string) => /^[a-zA-Z0-9_-]+$/.test(jobId),
  readClassroomGenerationJob: mocks.readClassroomGenerationJob,
}));

vi.mock('@/lib/server/classroom-job-runner', () => ({
  runClassroomGenerationJob: mocks.runClassroomGenerationJob,
}));

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return {
    ...actual,
    after: vi.fn(),
  };
});

function jsonRequest(path: string, body: Record<string, unknown> = {}) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

function nextRequest(path: string) {
  return new Request(`http://localhost${path}`) as NextRequest;
}

async function expectAuthRequired(response: Response) {
  expect(response.status).toBe(401);
  await expect(response.json()).resolves.toMatchObject({
    success: false,
    error: 'Authentication required.',
  });
}

async function expectPlatformRequired(response: Response) {
  expect(response.status).toBe(403);
  await expect(response.json()).resolves.toMatchObject({
    success: false,
    error: 'Platform admin required.',
  });
}

describe('Course Studio API platform authorization', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated Course Studio API requests before side effects', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);

    await expectAuthRequired(await planCourse(jsonRequest('/api/course/plan')));
    await expectAuthRequired(await listCourseResources());
    await expectAuthRequired(await uploadCourseResource(jsonRequest('/api/course/resources')));
    await expectAuthRequired(
      await getCourseResource(nextRequest('/api/course/resources/res-1'), {
        params: Promise.resolve({ id: 'res-1' }),
      }),
    );
    await expectAuthRequired(
      await deleteCourseResource(nextRequest('/api/course/resources/res-1'), {
        params: Promise.resolve({ id: 'res-1' }),
      }),
    );
    await expectAuthRequired(await editClassroom(jsonRequest('/api/classroom/edit')));
    await expectAuthRequired(
      await createClassroomGenerationJob(jsonRequest('/api/generate-classroom')),
    );
    await expectAuthRequired(
      await getClassroomGenerationJob(nextRequest('/api/generate-classroom/job-1'), {
        params: Promise.resolve({ jobId: 'job-1' }),
      }),
    );

    expect(mocks.buildResourceSummaryBlock).not.toHaveBeenCalled();
    expect(mocks.listCourseResources).not.toHaveBeenCalled();
    expect(mocks.readCourseResource).not.toHaveBeenCalled();
    expect(mocks.deleteCourseResource).not.toHaveBeenCalled();
    expect(mocks.createClassroomGenerationJob).not.toHaveBeenCalled();
    expect(mocks.readClassroomGenerationJob).not.toHaveBeenCalled();
    expect(mocks.runClassroomGenerationJob).not.toHaveBeenCalled();
  });

  it('rejects organization admins from platform-only Course Studio APIs', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-esilv-admin', role: 'organization-admin', organizationId: 'org-esilv' },
    });

    await expectPlatformRequired(await planCourse(jsonRequest('/api/course/plan')));
    await expectPlatformRequired(
      await createClassroomGenerationJob(jsonRequest('/api/generate-classroom')),
    );
  });
});
