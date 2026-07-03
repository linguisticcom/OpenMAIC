import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/admin/course-assignments/route';

const mocks = vi.hoisted(() => ({
  getCurrentPortalSession: vi.fn(),
  assignCourseToOrganization: vi.fn(),
  getCoursePortalDataset: vi.fn(),
}));

vi.mock('@/lib/server/organization-session', () => ({
  getCurrentPortalSession: mocks.getCurrentPortalSession,
  isPlatformAdmin: (user: { role: string }) => user.role === 'platform-admin',
}));

vi.mock('@/lib/server/course-portal-data', () => ({
  assignCourseToOrganization: mocks.assignCourseToOrganization,
  getCoursePortalDataset: mocks.getCoursePortalDataset,
}));

function request(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/course-assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin course assignments API', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requires a platform admin session', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-esilv-admin', role: 'organization-admin', organizationId: 'org-esilv' },
    });

    const response = await POST(
      request({
        organizationId: 'org-esilv',
        courseId: 'course-cloud-devsecops',
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.assignCourseToOrganization).not.toHaveBeenCalled();
  });

  it('passes an optional teacher manager assignment to the data layer', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-platform-admin', role: 'platform-admin' },
    });
    mocks.assignCourseToOrganization.mockResolvedValue({
      id: 'assign-esilv-cloud',
      organizationId: 'org-esilv',
      courseId: 'course-cloud-devsecops',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
      teacherUserId: 'user-esilv-teacher',
    });

    const response = await POST(
      request({
        organizationId: 'org-esilv',
        courseId: 'course-cloud-devsecops',
        cohortId: 'cohort-esilv-m2-cyber-cloud',
        teacherUserId: 'user-esilv-teacher',
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.assignCourseToOrganization).toHaveBeenCalledWith({
      organizationId: 'org-esilv',
      courseId: 'course-cloud-devsecops',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
      teacherUserId: 'user-esilv-teacher',
      assignedByUserId: 'user-platform-admin',
    });
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      assignment: {
        teacherUserId: 'user-esilv-teacher',
      },
    });
  });

  it('returns controlled data-layer validation errors', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-platform-admin', role: 'platform-admin' },
    });
    mocks.assignCourseToOrganization.mockResolvedValue({
      error: 'Teacher manager does not belong to this organization.',
    });

    const response = await POST(
      request({
        organizationId: 'org-psb',
        courseId: 'course-business-genai',
        teacherUserId: 'user-esilv-teacher',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Teacher manager does not belong to this organization.',
    });
  });
});
