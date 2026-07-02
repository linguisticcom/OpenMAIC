import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Organization, PortalUser } from '@/lib/types/course-portal';
import { GET as getOrganizationCourses } from '@/app/api/organization/courses/route';
import { GET as getOrganizationStudents } from '@/app/api/organization/students/route';
import { GET as getOrganizationAccessCodes } from '@/app/api/organization/access-codes/route';
import { POST as postOrganizationActivity } from '@/app/api/organization/activity/route';
import { PATCH as patchOrganizationSettings } from '@/app/api/organization/settings/route';
import { getCurrentPortalSession } from '@/lib/server/organization-session';

vi.mock('@/lib/server/organization-session', () => ({
  getCurrentPortalSession: vi.fn(),
  canAccessOrganization: (user: PortalUser, organizationId: string) =>
    user.role === 'platform-admin' || user.organizationId === organizationId,
  canManageAccessCodes: (user: PortalUser, organizationId: string) =>
    user.role === 'platform-admin' ||
    (user.organizationId === organizationId &&
      (user.role === 'organization-admin' || !!user.canGenerateAccessCodes)),
  canViewStudentManagement: (user: PortalUser, organizationId: string) =>
    user.role === 'platform-admin' ||
    (user.organizationId === organizationId &&
      (user.role === 'organization-admin' || user.role === 'teacher-manager')),
  isOrganizationAdmin: (user: PortalUser) => user.role === 'organization-admin',
  isPlatformAdmin: (user: PortalUser) => user.role === 'platform-admin',
  isStudent: (user: PortalUser) => user.role === 'student',
}));

const getCurrentPortalSessionMock = vi.mocked(getCurrentPortalSession);

const organization: Organization = {
  id: 'org-esilv',
  name: 'ESILV',
  slug: 'esilv',
  description: 'Engineering school',
  contactEmail: 'learning-admin@esilv.example',
  createdAt: '2026-06-01T09:00:00.000Z',
  updatedAt: '2026-07-02T09:00:00.000Z',
};

const organizationAdmin: PortalUser = {
  id: 'user-esilv-admin',
  organizationId: 'org-esilv',
  name: 'ESILV Learning Admin',
  email: 'admin@esilv.local',
  passwordHash: 'hashed',
  role: 'organization-admin',
  createdAt: '2026-06-01T09:15:00.000Z',
  updatedAt: '2026-07-02T09:00:00.000Z',
};

const teacherManager: PortalUser = {
  ...organizationAdmin,
  id: 'user-esilv-teacher',
  name: 'ESILV Cloud Teacher',
  email: 'teacher@esilv.local',
  role: 'teacher-manager',
  canGenerateAccessCodes: true,
};

const studentUser: PortalUser = {
  ...organizationAdmin,
  id: 'user-esilv-student',
  name: 'ESILV Student',
  email: 'student@esilv.local',
  role: 'student',
  studentId: 'student-esilv-1',
  canGenerateAccessCodes: false,
};

function setOrganizationAdminSession() {
  getCurrentPortalSessionMock.mockResolvedValue({
    user: organizationAdmin,
    organization,
  });
}

function setTeacherManagerSession() {
  getCurrentPortalSessionMock.mockResolvedValue({
    user: teacherManager,
    organization,
  });
}

function setStudentSession() {
  getCurrentPortalSessionMock.mockResolvedValue({
    user: studentUser,
    organization,
  });
}

async function expectForbidden(response: Response) {
  expect(response.status).toBe(403);
  await expect(response.json()).resolves.toMatchObject({
    success: false,
    error: expect.stringContaining('denied'),
  });
}

describe('organization API tenant scope', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('denies cross-tenant course list requests with a controlled 403', async () => {
    setOrganizationAdminSession();

    const response = await getOrganizationCourses(
      new Request('http://localhost/api/organization/courses?organizationId=org-psb'),
    );

    await expectForbidden(response);
  });

  it('denies cross-tenant student list requests with a controlled 403', async () => {
    setOrganizationAdminSession();

    const response = await getOrganizationStudents(
      new Request('http://localhost/api/organization/students?organizationId=org-psb'),
    );

    await expectForbidden(response);
  });

  it('denies cross-tenant access-code list requests with a controlled 403', async () => {
    setOrganizationAdminSession();

    const response = await getOrganizationAccessCodes(
      new Request('http://localhost/api/organization/access-codes?organizationId=org-psb'),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Access-code management is not allowed.',
    });
  });

  it('denies cross-tenant activity writes with a controlled 403', async () => {
    setOrganizationAdminSession();

    const response = await postOrganizationActivity(
      new Request('http://localhost/api/organization/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 'org-psb',
          action: 'lesson.viewed',
        }),
      }),
    );

    await expectForbidden(response);
  });

  it('denies student activity writes for another student identity', async () => {
    setStudentSession();

    const response = await postOrganizationActivity(
      new Request('http://localhost/api/organization/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 'org-esilv',
          studentId: 'student-esilv-2',
          courseId: 'course-cloud-devsecops',
          action: 'course.started',
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Students can only track their own activity.',
    });
  });

  it('denies cross-tenant organization settings updates with a controlled 403', async () => {
    setOrganizationAdminSession();

    const response = await patchOrganizationSettings(
      new Request('http://localhost/api/organization/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 'org-psb',
          name: 'PSB',
          contactEmail: 'faculty-success@psb.example',
          description: 'Business school',
        }),
      }),
    );

    await expectForbidden(response);
  });

  it('denies non-admin organization settings updates', async () => {
    setTeacherManagerSession();

    const response = await patchOrganizationSettings(
      new Request('http://localhost/api/organization/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: 'org-esilv',
          name: 'ESILV',
          contactEmail: 'learning-admin@esilv.example',
          description: 'Engineering school',
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Organization admin required.',
    });
  });
});
