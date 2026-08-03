import { afterEach, describe, expect, it, vi } from 'vitest';
import { PATCH } from '@/app/api/admin/courses/[courseId]/route';

const mocks = vi.hoisted(() => ({
  getCurrentPortalSession: vi.fn(),
  updateGlobalCourseStatus: vi.fn(),
}));

vi.mock('@/lib/server/organization-session', () => ({
  getCurrentPortalSession: mocks.getCurrentPortalSession,
  isPlatformAdmin: (user: { role: string }) => user.role === 'platform-admin',
}));

vi.mock('@/lib/server/course-portal-data', () => ({
  updateGlobalCourseStatus: mocks.updateGlobalCourseStatus,
}));

function request(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/courses/course-cloud-devsecops', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function params(courseId = 'course-cloud-devsecops') {
  return { params: Promise.resolve({ courseId }) };
}

describe('admin course status API', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);

    const response = await PATCH(request({ status: 'active' }), params());

    expect(response.status).toBe(401);
    expect(mocks.updateGlobalCourseStatus).not.toHaveBeenCalled();
  });

  it('requires a platform admin session', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-esilv-admin', role: 'organization-admin', organizationId: 'org-esilv' },
    });

    const response = await PATCH(request({ status: 'active' }), params());

    expect(response.status).toBe(403);
    expect(mocks.updateGlobalCourseStatus).not.toHaveBeenCalled();
  });

  it('updates a global course status for platform admins', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-platform-admin', role: 'platform-admin' },
    });
    mocks.updateGlobalCourseStatus.mockResolvedValue({
      id: 'course-cloud-devsecops',
      status: 'locked',
    });

    const response = await PATCH(request({ status: 'locked' }), params());

    expect(response.status).toBe(200);
    expect(mocks.updateGlobalCourseStatus).toHaveBeenCalledWith({
      courseId: 'course-cloud-devsecops',
      status: 'locked',
    });
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      course: { id: 'course-cloud-devsecops', status: 'locked' },
    });
  });

  it('returns controlled validation errors from the data layer', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-platform-admin', role: 'platform-admin' },
    });
    mocks.updateGlobalCourseStatus.mockResolvedValue({ error: 'Invalid course status.' });

    const response = await PATCH(request({ status: 'archived' }), params());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Invalid course status.',
    });
  });

  it('rejects malformed course statuses before calling the data layer', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-platform-admin', role: 'platform-admin' },
    });

    const response = await PATCH(request({ status: { value: 'locked' } }), params());

    expect(response.status).toBe(400);
    expect(mocks.updateGlobalCourseStatus).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'status must be a string.',
    });
  });
});
