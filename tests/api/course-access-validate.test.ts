import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/course-access/validate/route';

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
});
