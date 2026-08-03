import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getClassroomCourseAccessContext: vi.fn(),
  getVisibleOrganizationCourseDetail: vi.fn(),
  getCurrentPortalSession: vi.fn(),
  hasCourseAccess: vi.fn(),
}));

vi.mock('@/lib/server/course-portal-data', () => ({
  getClassroomCourseAccessContext: mocks.getClassroomCourseAccessContext,
  getVisibleOrganizationCourseDetail: mocks.getVisibleOrganizationCourseDetail,
}));

vi.mock('@/lib/server/organization-session', () => ({
  canAccessOrganization: (
    user: { organizationId?: string; role: string },
    organizationId: string,
  ) => user.role === 'platform-admin' || user.organizationId === organizationId,
  getCurrentPortalSession: mocks.getCurrentPortalSession,
  isPlatformAdmin: (user: { role: string }) => user.role === 'platform-admin',
}));

vi.mock('@/lib/server/course-access', () => ({
  hasCourseAccess: mocks.hasCourseAccess,
}));

import { canReadClassroom } from '@/lib/server/classroom-access';

function context(status: 'draft' | 'active', assigned = true) {
  return {
    course: { id: 'course-1', status },
    assignments: assigned ? [{ organizationId: 'org-1', courseId: 'course-1' }] : [],
  };
}

describe('classroom publication access', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps unregistered legacy classrooms readable', async () => {
    mocks.getClassroomCourseAccessContext.mockResolvedValue(undefined);

    await expect(canReadClassroom('legacy-classroom')).resolves.toBe(true);
  });

  it('blocks draft and unassigned registered classrooms from public access', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);
    mocks.getClassroomCourseAccessContext.mockResolvedValueOnce(context('draft'));
    await expect(canReadClassroom('draft-classroom')).resolves.toBe(false);

    mocks.getClassroomCourseAccessContext.mockResolvedValueOnce(context('active', false));
    await expect(canReadClassroom('unassigned-classroom')).resolves.toBe(false);
  });

  it('allows platform admins to review draft classrooms', async () => {
    mocks.getClassroomCourseAccessContext.mockResolvedValue(context('draft'));
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'platform', role: 'platform-admin' },
    });

    await expect(canReadClassroom('draft-classroom')).resolves.toBe(true);
  });

  it('allows an active assigned classroom after a valid access grant', async () => {
    mocks.getClassroomCourseAccessContext.mockResolvedValue(context('active'));
    mocks.getCurrentPortalSession.mockResolvedValue(null);
    mocks.hasCourseAccess.mockResolvedValue(true);

    await expect(canReadClassroom('active-classroom')).resolves.toBe(true);
  });
});
