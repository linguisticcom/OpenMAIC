import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createCourseAccessToken,
  findCourseAccessAssignment,
  getCourseAccessCookieName,
} from '@/lib/server/course-access';

const mocks = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  getCurrentPortalSession: vi.fn(),
  hasPortalAccountCourseAccess: vi.fn(),
  isCourseAccessSessionValid: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: mocks.cookieGet,
  })),
}));

vi.mock('@/lib/server/course-portal-data', () => ({
  hasPortalAccountCourseAccess: mocks.hasPortalAccountCourseAccess,
  isCourseAccessSessionValid: mocks.isCourseAccessSessionValid,
}));

vi.mock('@/lib/server/organization-session', () => ({
  getCurrentPortalSession: mocks.getCurrentPortalSession,
}));

describe('course access assignment resolution', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns the cohort assignment unlocked by the current access cookie', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);
    mocks.isCourseAccessSessionValid.mockResolvedValue(true);
    const { token } = createCourseAccessToken({
      courseId: 'course-cloud',
      universityId: 'org-school',
      cohortId: 'cohort-beta',
      codeId: 'code-beta',
    });
    const betaCookieName = getCourseAccessCookieName('course-cloud', 'org-school', 'cohort-beta');
    mocks.cookieGet.mockImplementation((name: string) =>
      name === betaCookieName ? { value: token } : undefined,
    );

    const assignment = await findCourseAccessAssignment({
      courseId: 'course-cloud',
      universityId: 'org-school',
      assignments: [
        { id: 'assign-alpha', cohortId: 'cohort-alpha' },
        { id: 'assign-beta', cohortId: 'cohort-beta' },
      ],
    });

    expect(assignment).toEqual({ id: 'assign-beta', cohortId: 'cohort-beta' });
    expect(mocks.isCourseAccessSessionValid).toHaveBeenCalledWith({
      organizationId: 'org-school',
      courseId: 'course-cloud',
      cohortId: 'cohort-beta',
      codeId: 'code-beta',
      studentId: undefined,
      enrollmentId: undefined,
    });
    expect(mocks.hasPortalAccountCourseAccess).not.toHaveBeenCalled();
  });

  it('rejects a signed access cookie when the backing access code is no longer current', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);
    mocks.isCourseAccessSessionValid.mockResolvedValue(false);
    const { token } = createCourseAccessToken({
      courseId: 'course-cloud',
      universityId: 'org-school',
      cohortId: 'cohort-beta',
      codeId: 'code-beta',
    });
    const betaCookieName = getCourseAccessCookieName('course-cloud', 'org-school', 'cohort-beta');
    mocks.cookieGet.mockImplementation((name: string) =>
      name === betaCookieName ? { value: token } : undefined,
    );

    const assignment = await findCourseAccessAssignment({
      courseId: 'course-cloud',
      universityId: 'org-school',
      assignments: [
        { id: 'assign-alpha', cohortId: 'cohort-alpha' },
        { id: 'assign-beta', cohortId: 'cohort-beta' },
      ],
    });

    expect(assignment).toBeUndefined();
    expect(mocks.hasPortalAccountCourseAccess).not.toHaveBeenCalled();
  });
});
