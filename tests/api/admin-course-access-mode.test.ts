import { afterEach, describe, expect, it, vi } from 'vitest';
import { PATCH } from '@/app/api/admin/courses/[courseId]/route';

const mocks = vi.hoisted(() => ({
  getCurrentPortalSession: vi.fn(),
  updateGlobalCourseStatus: vi.fn(),
  updateGlobalCourseAccessMode: vi.fn(),
}));

vi.mock('@/lib/server/organization-session', () => ({
  getCurrentPortalSession: mocks.getCurrentPortalSession,
  isPlatformAdmin: (user: { role: string }) => user.role === 'platform-admin',
}));

vi.mock('@/lib/server/course-portal-data', () => ({
  updateGlobalCourseStatus: mocks.updateGlobalCourseStatus,
  updateGlobalCourseAccessMode: mocks.updateGlobalCourseAccessMode,
  deleteGlobalCourse: vi.fn(),
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

function platformSession() {
  mocks.getCurrentPortalSession.mockResolvedValue({
    user: { id: 'user-platform-admin', role: 'platform-admin' },
  });
}

describe('admin course learner access API', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('switches a course to code-protected access without touching its status', async () => {
    platformSession();
    mocks.updateGlobalCourseAccessMode.mockResolvedValue({
      id: 'course-cloud-devsecops',
      status: 'active',
      accessMode: 'code',
    });

    const response = await PATCH(request({ accessMode: 'code' }), params());

    expect(response.status).toBe(200);
    expect(mocks.updateGlobalCourseAccessMode).toHaveBeenCalledWith({
      courseId: 'course-cloud-devsecops',
      accessMode: 'code',
    });
    expect(mocks.updateGlobalCourseStatus).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      course: { id: 'course-cloud-devsecops', accessMode: 'code' },
    });
  });

  it('re-opens a course to link access', async () => {
    platformSession();
    mocks.updateGlobalCourseAccessMode.mockResolvedValue({
      id: 'course-cloud-devsecops',
      status: 'active',
      accessMode: 'open',
    });

    const response = await PATCH(request({ accessMode: 'open' }), params());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      course: { accessMode: 'open' },
    });
  });

  it('rejects unknown access modes before calling the data layer', async () => {
    platformSession();

    const response = await PATCH(request({ accessMode: 'private' }), params());

    expect(response.status).toBe(400);
    expect(mocks.updateGlobalCourseAccessMode).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'accessMode must be "open" or "code".',
    });
  });

  it('still requires a status or access mode', async () => {
    platformSession();

    const response = await PATCH(request({}), params());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'status is required.' });
  });
});
