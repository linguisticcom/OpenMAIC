import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/organization/activity/route';
import { createCourseAccessToken, getCourseAccessCookieName } from '@/lib/server/course-access';

const mocks = vi.hoisted(() => ({
  getCurrentPortalSession: vi.fn(),
  isCourseAccessSessionValid: vi.fn(),
  trackStudentActivity: vi.fn(),
  cookieGet: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: mocks.cookieGet,
  })),
}));

vi.mock('@/lib/server/course-portal-data', () => ({
  hasPortalAccountCourseAccess: vi.fn(),
  isCourseAccessSessionValid: mocks.isCourseAccessSessionValid,
  trackStudentActivity: mocks.trackStudentActivity,
}));

vi.mock('@/lib/server/organization-session', () => ({
  getCurrentPortalSession: mocks.getCurrentPortalSession,
  canAccessOrganization: (
    user: { role: string; organizationId?: string },
    organizationId: string,
  ) => user.role === 'platform-admin' || user.organizationId === organizationId,
  isStudent: (user: { role: string }) => user.role === 'student',
}));

function request(body: unknown) {
  return new Request('http://localhost/api/organization/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('organization activity access-session authorization', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('tracks no-login learner activity from a valid course access cookie', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);
    mocks.isCourseAccessSessionValid.mockResolvedValue(true);
    const { token } = createCourseAccessToken({
      courseId: 'course-cloud-devsecops',
      universityId: 'org-esilv',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
      codeId: 'code-esilv-cloud',
      studentId: 'student-esilv-1',
      enrollmentId: 'enroll-esilv-cloud-amina',
    });
    const cookieName = getCourseAccessCookieName(
      'course-cloud-devsecops',
      'org-esilv',
      'cohort-esilv-m2-cyber-cloud',
    );
    mocks.cookieGet.mockImplementation((name: string) =>
      name === cookieName ? { value: token } : undefined,
    );
    mocks.trackStudentActivity.mockResolvedValue({
      id: 'activity-access-start',
      organizationId: 'org-esilv',
      studentId: 'student-esilv-1',
      courseId: 'course-cloud-devsecops',
      action: 'course.started',
      metadata: { source: 'course-detail' },
      createdAt: '2026-07-03T08:00:00.000Z',
    });

    const response = await POST(
      request({
        organizationId: 'org-esilv',
        courseId: 'course-cloud-devsecops',
        cohortId: 'cohort-esilv-m2-cyber-cloud',
        studentId: 'student-esilv-2',
        action: 'course.started',
        metadata: { source: 'course-detail' },
        progressPercentage: 1,
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.isCourseAccessSessionValid).toHaveBeenCalledWith({
      organizationId: 'org-esilv',
      courseId: 'course-cloud-devsecops',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
      codeId: 'code-esilv-cloud',
      studentId: 'student-esilv-1',
      enrollmentId: 'enroll-esilv-cloud-amina',
    });
    expect(mocks.trackStudentActivity).toHaveBeenCalledWith({
      organizationId: 'org-esilv',
      studentId: 'student-esilv-1',
      courseId: 'course-cloud-devsecops',
      action: 'course.started',
      metadata: { source: 'course-detail' },
      progressPercentage: 1,
    });
  });

  it('rejects no-login activity when the access session is no longer current', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);
    mocks.isCourseAccessSessionValid.mockResolvedValue(false);
    const { token } = createCourseAccessToken({
      courseId: 'course-cloud-devsecops',
      universityId: 'org-esilv',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
      codeId: 'code-esilv-cloud',
      studentId: 'student-esilv-1',
      enrollmentId: 'enroll-esilv-cloud-amina',
    });
    const cookieName = getCourseAccessCookieName(
      'course-cloud-devsecops',
      'org-esilv',
      'cohort-esilv-m2-cyber-cloud',
    );
    mocks.cookieGet.mockImplementation((name: string) =>
      name === cookieName ? { value: token } : undefined,
    );

    const response = await POST(
      request({
        organizationId: 'org-esilv',
        courseId: 'course-cloud-devsecops',
        cohortId: 'cohort-esilv-m2-cyber-cloud',
        action: 'course.started',
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.trackStudentActivity).not.toHaveBeenCalled();
  });

  it('rejects no-login activity without a matching course access cookie', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);
    mocks.cookieGet.mockReturnValue(undefined);

    const response = await POST(
      request({
        organizationId: 'org-esilv',
        courseId: 'course-cloud-devsecops',
        cohortId: 'cohort-esilv-m2-cyber-cloud',
        action: 'course.started',
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.trackStudentActivity).not.toHaveBeenCalled();
  });

  it('rejects malformed no-login activity references before cookie lookup', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);

    const response = await POST(
      request({
        organizationId: 'org-esilv',
        courseId: ['course-cloud-devsecops'],
        action: 'course.started',
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.cookieGet).not.toHaveBeenCalled();
    expect(mocks.isCourseAccessSessionValid).not.toHaveBeenCalled();
    expect(mocks.trackStudentActivity).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Activity reference fields must be strings.',
    });
  });

  it('rejects malformed progress before activity persistence', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);

    const response = await POST(
      request({
        organizationId: 'org-esilv',
        courseId: 'course-cloud-devsecops',
        action: 'course.started',
        progressPercentage: Number.POSITIVE_INFINITY,
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.cookieGet).not.toHaveBeenCalled();
    expect(mocks.trackStudentActivity).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Progress percentage must be a finite number.',
    });
  });

  it('rejects non-object JSON bodies', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);

    const response = await POST(request(null));

    expect(response.status).toBe(400);
    expect(mocks.cookieGet).not.toHaveBeenCalled();
    expect(mocks.trackStudentActivity).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Invalid JSON body',
    });
  });
});
