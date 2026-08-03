import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/validate-course-access/route';
import { getCourseAccessCookieName } from '@/lib/server/course-access';

const mocks = vi.hoisted(() => ({
  consumeCourseAccessGrant: vi.fn(),
  getCurrentPortalSession: vi.fn(),
  cookieSet: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: mocks.cookieSet,
  })),
}));

vi.mock('@/lib/server/course-portal-data', () => ({
  consumeCourseAccessGrant: mocks.consumeCourseAccessGrant,
  hasPortalAccountCourseAccess: vi.fn(),
}));

vi.mock('@/lib/server/organization-session', () => ({
  getCurrentPortalSession: mocks.getCurrentPortalSession,
  isStudent: (user: { role: string }) => user.role === 'student',
}));

function request(body: Record<string, unknown>) {
  return new Request('http://localhost/api/validate-course-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function validGrantResult() {
  return {
    valid: true,
    accessSession: 'access-org-esilv-course-cloud-devsecops',
    enrollmentId: 'enroll-esilv-cloud-amina',
    grant: {
      course: {
        id: 'course-cloud-devsecops',
        slug: 'cloud-devsecops-delivery-lab',
      },
      university: {
        id: 'org-esilv',
      },
      organization: {
        id: 'org-esilv',
        slug: 'esilv',
      },
      assignment: {
        cohortId: 'cohort-esilv-m2-cyber-cloud',
      },
      accessCode: {
        id: 'code-esilv-cloud',
        expiresAt: '2027-09-01T00:00:00.000Z',
      },
      enrollment: {
        id: 'enroll-esilv-cloud-amina',
        studentId: 'student-esilv-1',
      },
    },
  };
}

describe('legacy course access validation API', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates an enrollment-backed access session without exposing the token in JSON', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);
    mocks.consumeCourseAccessGrant.mockResolvedValue(validGrantResult());

    const response = await POST(
      request({
        universityId: 'org-esilv',
        courseId: 'course-cloud-devsecops',
        cohortId: 'cohort-esilv-m2-cyber-cloud',
        accessCode: 'ESILV-CLOUD-M2',
      }),
    );

    expect(mocks.consumeCourseAccessGrant).toHaveBeenCalledWith({
      organizationId: undefined,
      organizationSlug: undefined,
      courseId: 'course-cloud-devsecops',
      courseSlug: undefined,
      universityId: 'org-esilv',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
      accessCode: 'ESILV-CLOUD-M2',
      studentId: undefined,
    });
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      getCourseAccessCookieName(
        'course-cloud-devsecops',
        'org-esilv',
        'cohort-esilv-m2-cyber-cloud',
      ),
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        path: '/',
      }),
    );
    const payload = await response.json();
    expect(payload).toMatchObject({
      success: true,
      valid: true,
      accessSession: 'access-org-esilv-course-cloud-devsecops',
      enrollmentId: 'enroll-esilv-cloud-amina',
      organizationId: 'org-esilv',
      redirectUrl: '/u/esilv/courses/cloud-devsecops-delivery-lab',
    });
    expect(payload).not.toHaveProperty('accessToken');
  });

  it('normalizes malformed request fields before validating access', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);
    mocks.consumeCourseAccessGrant.mockResolvedValue({
      valid: false,
      reason: 'missing-fields',
      message: 'Organization, course, and access code are required.',
    });

    const response = await POST(
      request({
        universityId: { value: 'org-esilv' },
        courseId: ['course-cloud-devsecops'],
        accessCode: { value: 'ESILV-CLOUD-M2' },
        cohortId: 42,
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
      universityId: undefined,
      cohortId: undefined,
      accessCode: '',
      studentId: undefined,
    });
  });

  it('uses the authenticated student identity instead of a spoofed request studentId', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: {
        role: 'student',
        studentId: 'student-esilv-1',
      },
    });
    mocks.consumeCourseAccessGrant.mockResolvedValue({
      valid: false,
      reason: 'invalid-code',
      message: 'The access code is not valid for this course.',
    });

    await POST(
      request({
        universityId: 'org-esilv',
        courseId: 'course-cloud-devsecops',
        accessCode: 'ESILV-CLOUD-M2',
        studentId: 'student-esilv-2',
      }),
    );

    expect(mocks.consumeCourseAccessGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: 'student-esilv-1',
      }),
    );
  });
});
