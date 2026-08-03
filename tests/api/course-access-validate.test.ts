import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/course-access/validate/route';
import { resetRateLimitBucketsForTests } from '@/lib/server/rate-limit';

const mocks = vi.hoisted(() => ({
  consumeCourseAccessGrant: vi.fn(),
  getCurrentPortalSession: vi.fn(),
}));

vi.mock('@/lib/server/course-portal-data', () => ({
  consumeCourseAccessGrant: mocks.consumeCourseAccessGrant,
}));

vi.mock('@/lib/server/organization-session', () => ({
  getCurrentPortalSession: mocks.getCurrentPortalSession,
  isStudent: (user: { role: string }) => user.role === 'student',
}));

function invalidCodeResult() {
  return {
    valid: false,
    reason: 'invalid-code',
    message: 'The access code is not valid for this course.',
  };
}

describe('course access validation API', () => {
  afterEach(() => {
    vi.clearAllMocks();
    resetRateLimitBucketsForTests();
  });

  it('does not trust a frontend studentId when no student session exists', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);
    mocks.consumeCourseAccessGrant.mockResolvedValue(invalidCodeResult());

    await POST(
      new Request('http://localhost/api/course-access/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationSlug: 'esilv',
          courseSlug: 'cloud-devsecops-delivery-lab',
          accessCode: 'ESILV-CLOUD-M2',
          studentId: 'student-esilv-2',
        }),
      }),
    );

    expect(mocks.consumeCourseAccessGrant).toHaveBeenCalledWith({
      organizationId: undefined,
      organizationSlug: 'esilv',
      courseId: undefined,
      courseSlug: 'cloud-devsecops-delivery-lab',
      accessCode: 'ESILV-CLOUD-M2',
      cohortId: undefined,
      studentId: undefined,
    });
  });

  it('normalizes malformed request fields before validating access', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);
    mocks.consumeCourseAccessGrant.mockResolvedValue({
      valid: false,
      reason: 'missing-fields',
      message: 'Organization, course, and access code are required.',
    });

    const response = await POST(
      new Request('http://localhost/api/course-access/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationSlug: { value: 'esilv' },
          courseSlug: ['cloud-devsecops-delivery-lab'],
          accessCode: { value: 'ESILV-CLOUD-M2' },
          cohortId: 42,
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      valid: false,
      reason: 'missing-fields',
    });
    expect(mocks.consumeCourseAccessGrant).toHaveBeenCalledWith({
      organizationId: undefined,
      organizationSlug: undefined,
      courseId: undefined,
      courseSlug: undefined,
      accessCode: '',
      cohortId: undefined,
      studentId: undefined,
    });
  });

  it('uses the authenticated student identity instead of a spoofed request studentId', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: {
        id: 'user-esilv-student-1',
        organizationId: 'org-esilv',
        studentId: 'student-esilv-1',
        role: 'student',
      },
      organization: { id: 'org-esilv' },
    });
    mocks.consumeCourseAccessGrant.mockResolvedValue(invalidCodeResult());

    await POST(
      new Request('http://localhost/api/course-access/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationSlug: 'esilv',
          courseSlug: 'cloud-devsecops-delivery-lab',
          accessCode: 'ESILV-CLOUD-M2',
          studentId: 'student-esilv-2',
        }),
      }),
    );

    expect(mocks.consumeCourseAccessGrant).toHaveBeenCalledWith({
      organizationId: undefined,
      organizationSlug: 'esilv',
      courseId: undefined,
      courseSlug: 'cloud-devsecops-delivery-lab',
      accessCode: 'ESILV-CLOUD-M2',
      cohortId: undefined,
      studentId: 'student-esilv-1',
    });
  });

  it('rate limits repeated access-code guesses by client IP', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);
    mocks.consumeCourseAccessGrant.mockResolvedValue(invalidCodeResult());
    const request = () =>
      new Request('http://localhost/api/course-access/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '203.0.113.15',
        },
        body: JSON.stringify({
          organizationSlug: 'esilv',
          courseSlug: 'cloud-devsecops-delivery-lab',
          accessCode: 'INVALID-CODE',
        }),
      });

    for (let attempt = 0; attempt < 12; attempt += 1) {
      expect((await POST(request())).status).toBe(200);
    }
    const blocked = await POST(request());

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toMatch(/^\d+$/);
    await expect(blocked.json()).resolves.toMatchObject({
      success: false,
      errorCode: 'RATE_LIMITED',
    });
    expect(mocks.consumeCourseAccessGrant).toHaveBeenCalledTimes(12);
  });
});
