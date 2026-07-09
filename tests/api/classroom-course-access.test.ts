import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/classroom/route';

const mocks = vi.hoisted(() => ({
  getClassroomCourseAccessContext: vi.fn(),
  getCurrentPortalSession: vi.fn(),
  getOrganizationById: vi.fn(),
  getVisibleOrganizationCourseDetail: vi.fn(),
  hasCourseAccess: vi.fn(),
  readClassroom: vi.fn(),
}));

vi.mock('@/lib/server/classroom-storage', () => ({
  buildRequestOrigin: vi.fn(() => 'http://localhost'),
  isValidClassroomId: (id: string) => /^[a-zA-Z0-9_-]+$/.test(id),
  persistClassroom: vi.fn(),
  readClassroom: mocks.readClassroom,
}));

vi.mock('@/lib/server/course-access', () => ({
  hasCourseAccess: mocks.hasCourseAccess,
}));

vi.mock('@/lib/server/course-portal-data', () => ({
  getClassroomCourseAccessContext: mocks.getClassroomCourseAccessContext,
  getOrganizationById: mocks.getOrganizationById,
  getVisibleOrganizationCourseDetail: mocks.getVisibleOrganizationCourseDetail,
}));

vi.mock('@/lib/server/organization-session', () => ({
  canAccessOrganization: (
    user: { role: string; organizationId?: string },
    organizationId: string,
  ) => user.role === 'platform-admin' || user.organizationId === organizationId,
  getCurrentPortalSession: mocks.getCurrentPortalSession,
}));

function request(classroomId: string) {
  return new NextRequest(`http://localhost/api/classroom?id=${classroomId}`);
}

const classroom = {
  stage: { id: 'classroom-cloud', name: 'Cloud classroom' },
  scenes: [],
};

describe('classroom API course access', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps unassigned classrooms readable for existing OpenMAIC generation flows', async () => {
    mocks.getClassroomCourseAccessContext.mockResolvedValue(undefined);
    mocks.readClassroom.mockResolvedValue(classroom);

    const response = await GET(request('classroom-cloud'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      classroom,
    });
    expect(mocks.readClassroom).toHaveBeenCalledWith('classroom-cloud');
    expect(mocks.hasCourseAccess).not.toHaveBeenCalled();
  });

  it('blocks assigned LMS classrooms when no account or access cookie can see the course', async () => {
    mocks.getClassroomCourseAccessContext.mockResolvedValue({
      course: { id: 'course-cloud', classroomId: 'classroom-cloud' },
      assignments: [
        {
          id: 'assign-cloud',
          organizationId: 'org-school',
          courseId: 'course-cloud',
          cohortId: 'cohort-alpha',
        },
      ],
    });
    mocks.getOrganizationById.mockResolvedValue({ id: 'org-school', name: 'Test School', slug: 'test-school' } as any);
    mocks.getCurrentPortalSession.mockResolvedValue(null);
    mocks.hasCourseAccess.mockResolvedValue(false);

    const response = await GET(request('classroom-cloud'));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Course access required.',
    });
    expect(mocks.readClassroom).not.toHaveBeenCalled();
  });

  it('allows assigned LMS classrooms for a portal user with visible course detail', async () => {
    mocks.getClassroomCourseAccessContext.mockResolvedValue({
      course: { id: 'course-cloud', classroomId: 'classroom-cloud' },
      assignments: [
        {
          id: 'assign-cloud',
          organizationId: 'org-school',
          courseId: 'course-cloud',
          cohortId: 'cohort-alpha',
        },
      ],
    });
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-school-admin', role: 'organization-admin', organizationId: 'org-school' },
    });
    mocks.getVisibleOrganizationCourseDetail.mockResolvedValue({
      course: { id: 'course-cloud' },
    });
    mocks.readClassroom.mockResolvedValue(classroom);

    const response = await GET(request('classroom-cloud'));

    expect(response.status).toBe(200);
    expect(mocks.getVisibleOrganizationCourseDetail).toHaveBeenCalledWith(
      { id: 'user-school-admin', role: 'organization-admin', organizationId: 'org-school' },
      'org-school',
      'course-cloud',
    );
    expect(mocks.readClassroom).toHaveBeenCalledWith('classroom-cloud');
  });

  it('allows assigned LMS classrooms for a valid course access cookie session', async () => {
    mocks.getClassroomCourseAccessContext.mockResolvedValue({
      course: { id: 'course-cloud', classroomId: 'classroom-cloud' },
      assignments: [
        {
          id: 'assign-cloud',
          organizationId: 'org-school',
          courseId: 'course-cloud',
          cohortId: 'cohort-alpha',
        },
      ],
    });
    mocks.getCurrentPortalSession.mockResolvedValue(null);
    mocks.hasCourseAccess.mockResolvedValue(true);
    mocks.readClassroom.mockResolvedValue(classroom);

    const response = await GET(request('classroom-cloud'));

    expect(response.status).toBe(200);
    expect(mocks.hasCourseAccess).toHaveBeenCalledWith({
      courseId: 'course-cloud',
      universityId: 'org-school',
      cohortId: 'cohort-alpha',
    });
    expect(mocks.readClassroom).toHaveBeenCalledWith('classroom-cloud');
  });
});
