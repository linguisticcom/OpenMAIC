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

const mocks = vi.hoisted(() => {
  class CourseResourceContextError extends Error {}

  return {
    getCurrentPortalSession: vi.fn(),
    buildResourceSummaryBlock: vi.fn(),
    buildClassroomResourceContextBlock: vi.fn(),
    CourseResourceContextError,
    listCourseResources: vi.fn(),
    readCourseResource: vi.fn(),
    deleteCourseResource: vi.fn(),
    createClassroomGenerationJob: vi.fn(),
    readClassroomGenerationJob: vi.fn(),
    runClassroomGenerationJob: vi.fn(),
  };
});

vi.mock('@/lib/server/organization-session', () => ({
  getCurrentPortalSession: mocks.getCurrentPortalSession,
  isPlatformAdmin: (user: { role: string }) => user.role === 'platform-admin',
}));

vi.mock('@/lib/server/course-resources', () => ({
  buildClassroomResourceContextBlock: mocks.buildClassroomResourceContextBlock,
  buildResourceSummaryBlock: mocks.buildResourceSummaryBlock,
  CourseResourceContextError: mocks.CourseResourceContextError,
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
    expect(mocks.buildClassroomResourceContextBlock).not.toHaveBeenCalled();
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

  it('preserves dashboard publish metadata when creating classroom jobs', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-platform-admin', role: 'platform-admin' },
    });
    mocks.createClassroomGenerationJob.mockResolvedValue({
      id: 'job-1',
      status: 'queued',
      step: 'queued',
      message: 'queued',
    });

    const response = await createClassroomGenerationJob(
      new Request('http://localhost/api/generate-classroom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-host': 'localhost',
          'x-forwarded-proto': 'http',
        },
        body: JSON.stringify({
          requirement: 'Create a short course module.',
          portalCourse: {
            title: 'Published module',
            description: 'Visible to the client dashboard.',
            category: 'AI',
            estimatedDurationMinutes: 30,
            attachToCourseId: 'course-lan110',
            attachToModuleId: 'module-lan110-1',
            publishToOrganizationId: 'org-esilv',
            publishToCohortId: 'cohort-esilv-m2',
            publishStatus: 'active',
          },
        }),
      }) as NextRequest,
    );

    expect(response.status).toBe(202);
    expect(mocks.createClassroomGenerationJob).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        portalCourse: expect.objectContaining({
          title: 'Published module',
          attachToCourseId: 'course-lan110',
          attachToModuleId: 'module-lan110-1',
          publishToOrganizationId: 'org-esilv',
          publishToCohortId: 'cohort-esilv-m2',
          publishStatus: 'active',
        }),
      }),
    );
  });

  it('resolves selected resource context before creating classroom jobs', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-platform-admin', role: 'platform-admin' },
    });
    mocks.buildClassroomResourceContextBlock.mockResolvedValue(
      'Resource: LAN110 corporate finance.pdf\nSummary: Defines subsidiaries, creditors, shares, and liability.\nExtracted source text:\nA limited company can raise capital by issuing shares.',
    );
    mocks.createClassroomGenerationJob.mockResolvedValue({
      id: 'job-grounded',
      status: 'queued',
      step: 'queued',
      message: 'queued',
    });

    const response = await createClassroomGenerationJob(
      new Request('http://localhost/api/generate-classroom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-host': 'localhost',
          'x-forwarded-proto': 'http',
        },
        body: JSON.stringify({
          requirement: 'Create LAN110 module 2 about company law.',
          courseResourceIds: ['res-lan110'],
          pdfContent: {
            text: 'Existing module context that should be preserved.',
            images: [],
          },
        }),
      }) as NextRequest,
    );

    expect(response.status).toBe(202);
    expect(mocks.buildClassroomResourceContextBlock).toHaveBeenCalledWith(['res-lan110']);
    expect(mocks.createClassroomGenerationJob).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        courseResourceIds: ['res-lan110'],
        pdfContent: expect.objectContaining({
          text: expect.stringContaining('Existing module context that should be preserved.'),
        }),
      }),
    );
    const input = mocks.createClassroomGenerationJob.mock.calls.at(-1)?.[1] as {
      pdfContent: { text: string };
    };
    expect(input.pdfContent.text).toContain('Resource: LAN110 corporate finance.pdf');
    expect(input.pdfContent.text).toContain('issuing shares');
  });

  it('rejects invalid selected resources before creating classroom jobs', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-platform-admin', role: 'platform-admin' },
    });
    mocks.buildClassroomResourceContextBlock.mockRejectedValue(
      new mocks.CourseResourceContextError('Selected course resource not found: missing-resource'),
    );

    const response = await createClassroomGenerationJob(
      jsonRequest('/api/generate-classroom', {
        requirement: 'Create a grounded classroom.',
        courseResourceIds: ['missing-resource'],
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Selected course resource not found: missing-resource',
    });
    expect(mocks.createClassroomGenerationJob).not.toHaveBeenCalled();
    expect(mocks.runClassroomGenerationJob).not.toHaveBeenCalled();
  });
});
