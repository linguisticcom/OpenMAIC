import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import {
  assignCourseToOrganization,
  createOrganizationAccessCode,
  disableOrganizationAccessCode,
  getOrganizationDashboardSummary,
  getPortalUserByEmail,
  getVisibleOrganizationCourseDetail,
  getVisibleOrganizationStudentDetail,
  hasPortalAccountCourseAccess,
  hashAccessCode,
  listOrganizationAccessCodes,
  listVisibleOrganizationAccessCodes,
  listVisibleOrganizationCourseSummaries,
  listVisibleOrganizationStudentSummaries,
  trackStudentActivity,
  updateGlobalCourseStatus,
  validateCourseAccessGrant,
} from '@/lib/server/course-portal-data';
import type { CoursePortalDataset, PortalUser } from '@/lib/types/course-portal';

describe('validateCourseAccessGrant', () => {
  it('accepts a valid code for the assigned university and cohort', async () => {
    const result = await validateCourseAccessGrant({
      courseId: 'course-cloud-devsecops',
      organizationId: 'org-esilv',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
      accessCode: 'ESILV-CLOUD-M2',
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.grant.assignment.cohortId).toBe('cohort-esilv-m2-cyber-cloud');
      expect(result.grant.accessCode.id).toBe('code-esilv-cloud');
    }
  });

  it('rejects cohort-scoped access when the submitted cohort conflicts', async () => {
    const result = await validateCourseAccessGrant({
      courseId: 'course-cloud-devsecops',
      organizationId: 'org-esilv',
      cohortId: 'cohort-psb-ai-product',
      accessCode: 'ESILV-CLOUD-M2',
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('course-not-assigned');
    }
  });

  it('rejects a real code linked to another course or university', async () => {
    const result = await validateCourseAccessGrant({
      courseId: 'course-ai-foundations',
      organizationId: 'org-esilv',
      accessCode: 'PSB-GENAI',
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('code-not-linked');
    }
  });

  it('rejects expired codes', async () => {
    const result = await validateCourseAccessGrant({
      courseId: 'course-ai-foundations',
      organizationId: 'org-esilv',
      accessCode: 'EXPIRED-COURSE',
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('code-expired');
    }
  });

  it('rejects a code for the right course but wrong organization', async () => {
    const result = await validateCourseAccessGrant({
      courseId: 'course-cloud-devsecops',
      organizationId: 'org-esilv',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
      accessCode: 'INGETIS-CLOUD',
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('code-not-linked');
    }
  });

  it('uses the code record scoped to the requested organization when code hashes collide', async () => {
    const originalCwd = process.cwd();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-access-code-scope-'));
    const now = '2026-07-03T08:00:00.000Z';
    const sharedCodeHash = hashAccessCode('SHARED-CODE');
    const dataset: CoursePortalDataset = {
      organizations: [
        {
          id: 'org-a',
          name: 'Organization A',
          slug: 'org-a',
          description: 'First tenant',
          contactEmail: 'admin-a@example.edu',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'org-b',
          name: 'Organization B',
          slug: 'org-b',
          description: 'Second tenant',
          contactEmail: 'admin-b@example.edu',
          createdAt: now,
          updatedAt: now,
        },
      ],
      users: [],
      courses: [
        {
          id: 'course-shared',
          title: 'Shared Course',
          slug: 'shared-course',
          description: 'Same generated course assigned to multiple tenants.',
          category: 'Cloud',
          status: 'active',
          generatedBy: 'OpenMAIC',
          createdAt: now,
          updatedAt: now,
          modules: [],
        },
      ],
      assignments: [
        {
          id: 'assign-org-a',
          organizationId: 'org-a',
          courseId: 'course-shared',
          assignedAt: now,
          assignedByUserId: 'platform-admin',
        },
        {
          id: 'assign-org-b',
          organizationId: 'org-b',
          courseId: 'course-shared',
          assignedAt: now,
          assignedByUserId: 'platform-admin',
        },
      ],
      students: [],
      enrollments: [],
      accessCodes: [
        {
          id: 'code-org-a',
          codeHash: sharedCodeHash,
          organizationId: 'org-a',
          courseId: 'course-shared',
          createdByUserId: 'platform-admin',
          currentUses: 0,
          isActive: true,
          createdAt: now,
        },
        {
          id: 'code-org-b',
          codeHash: sharedCodeHash,
          organizationId: 'org-b',
          courseId: 'course-shared',
          createdByUserId: 'platform-admin',
          currentUses: 0,
          isActive: true,
          createdAt: now,
        },
      ],
      cohorts: [],
      activityLogs: [],
    };

    try {
      await mkdir(path.join(tempRoot, 'data', 'course-portal'), { recursive: true });
      await writeFile(
        path.join(tempRoot, 'data', 'course-portal', 'catalog.json'),
        `${JSON.stringify(dataset, null, 2)}\n`,
        'utf-8',
      );
      process.chdir(tempRoot);
      vi.resetModules();
      const scopedData = await import('@/lib/server/course-portal-data');

      const result = await scopedData.validateCourseAccessGrant({
        organizationId: 'org-b',
        courseId: 'course-shared',
        accessCode: 'SHARED-CODE',
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.grant.organization.id).toBe('org-b');
        expect(result.grant.accessCode.id).toBe('code-org-b');
      }
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('consumes and reports access codes using organization-scoped ids', async () => {
    const originalCwd = process.cwd();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-access-code-id-scope-'));
    const now = '2026-07-03T08:00:00.000Z';
    const dataset: CoursePortalDataset = {
      organizations: [
        {
          id: 'org-a',
          name: 'Organization A',
          slug: 'org-a',
          description: 'First tenant',
          contactEmail: 'admin-a@example.edu',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'org-b',
          name: 'Organization B',
          slug: 'org-b',
          description: 'Second tenant',
          contactEmail: 'admin-b@example.edu',
          createdAt: now,
          updatedAt: now,
        },
      ],
      users: [],
      courses: [
        {
          id: 'course-shared',
          title: 'Shared Course',
          slug: 'shared-course',
          description: 'Same generated course assigned to multiple tenants.',
          category: 'Cloud',
          status: 'active',
          generatedBy: 'OpenMAIC',
          createdAt: now,
          updatedAt: now,
          modules: [],
        },
      ],
      assignments: [
        {
          id: 'assign-org-a',
          organizationId: 'org-a',
          courseId: 'course-shared',
          assignedAt: now,
          assignedByUserId: 'platform-admin',
        },
        {
          id: 'assign-org-b',
          organizationId: 'org-b',
          courseId: 'course-shared',
          assignedAt: now,
          assignedByUserId: 'platform-admin',
        },
      ],
      students: [
        {
          id: 'student-b',
          organizationId: 'org-b',
          name: 'Organization B Student',
          email: 'student-b@example.edu',
          createdAt: now,
          updatedAt: now,
        },
      ],
      enrollments: [],
      accessCodes: [
        {
          id: 'code-shared',
          codeHash: hashAccessCode('ORG-A-CLOUD'),
          organizationId: 'org-a',
          courseId: 'course-shared',
          createdByUserId: 'platform-admin',
          currentUses: 0,
          isActive: true,
          createdAt: now,
        },
        {
          id: 'code-shared',
          codeHash: hashAccessCode('ORG-B-CLOUD'),
          organizationId: 'org-b',
          courseId: 'course-shared',
          createdByUserId: 'platform-admin',
          currentUses: 0,
          isActive: true,
          createdAt: now,
        },
      ],
      cohorts: [],
      activityLogs: [],
    };

    try {
      await mkdir(path.join(tempRoot, 'data', 'course-portal'), { recursive: true });
      await writeFile(
        path.join(tempRoot, 'data', 'course-portal', 'catalog.json'),
        `${JSON.stringify(dataset, null, 2)}\n`,
        'utf-8',
      );
      process.chdir(tempRoot);
      vi.resetModules();
      const scopedData = await import('@/lib/server/course-portal-data');

      const result = await scopedData.consumeCourseAccessGrant({
        organizationId: 'org-b',
        courseId: 'course-shared',
        accessCode: 'ORG-B-CLOUD',
        studentId: 'student-b',
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.grant.accessCode.organizationId).toBe('org-b');
        expect(result.grant.enrollment?.accessCodeId).toBe('code-shared');
      }

      const persisted = await scopedData.getCoursePortalDataset();
      expect(
        persisted.accessCodes.map((accessCode) => ({
          organizationId: accessCode.organizationId,
          currentUses: accessCode.currentUses,
        })),
      ).toEqual([
        { organizationId: 'org-a', currentUses: 0 },
        { organizationId: 'org-b', currentUses: 1 },
      ]);

      const studentDetail = await scopedData.getOrganizationStudentDetail('org-b', 'student-b');
      expect(studentDetail?.progress[0]?.accessCode).toMatchObject({
        id: 'code-shared',
        organizationId: 'org-b',
        courseId: 'course-shared',
      });
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('accepts a cohort-scoped code without a submitted cohort when the course has multiple assignments', async () => {
    const originalCwd = process.cwd();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-access-cohort-resolve-'));
    const now = '2026-07-03T08:00:00.000Z';
    const dataset: CoursePortalDataset = {
      organizations: [
        {
          id: 'org-school',
          name: 'School',
          slug: 'school',
          description: 'School tenant',
          contactEmail: 'admin@school.example',
          createdAt: now,
          updatedAt: now,
        },
      ],
      users: [],
      courses: [
        {
          id: 'course-cloud',
          title: 'Cloud Delivery Lab',
          slug: 'cloud-delivery-lab',
          description: 'Cloud course.',
          category: 'Cloud',
          status: 'active',
          generatedBy: 'OpenMAIC',
          createdAt: now,
          updatedAt: now,
          modules: [],
        },
      ],
      assignments: [
        {
          id: 'assign-alpha',
          organizationId: 'org-school',
          courseId: 'course-cloud',
          cohortId: 'cohort-alpha',
          assignedAt: now,
          assignedByUserId: 'platform-admin',
        },
        {
          id: 'assign-beta',
          organizationId: 'org-school',
          courseId: 'course-cloud',
          cohortId: 'cohort-beta',
          assignedAt: now,
          assignedByUserId: 'platform-admin',
        },
      ],
      students: [],
      enrollments: [],
      accessCodes: [
        {
          id: 'code-beta',
          codeHash: hashAccessCode('BETA-CLOUD'),
          organizationId: 'org-school',
          courseId: 'course-cloud',
          cohortId: 'cohort-beta',
          createdByUserId: 'platform-admin',
          currentUses: 0,
          isActive: true,
          createdAt: now,
        },
      ],
      cohorts: [
        {
          id: 'cohort-alpha',
          organizationId: 'org-school',
          name: 'Alpha cohort',
          createdAt: now,
        },
        {
          id: 'cohort-beta',
          organizationId: 'org-school',
          name: 'Beta cohort',
          createdAt: now,
        },
      ],
      activityLogs: [],
    };

    try {
      await mkdir(path.join(tempRoot, 'data', 'course-portal'), { recursive: true });
      await writeFile(
        path.join(tempRoot, 'data', 'course-portal', 'catalog.json'),
        `${JSON.stringify(dataset, null, 2)}\n`,
        'utf-8',
      );
      process.chdir(tempRoot);
      vi.resetModules();
      const scopedData = await import('@/lib/server/course-portal-data');

      const result = await scopedData.validateCourseAccessGrant({
        organizationSlug: 'school',
        courseSlug: 'cloud-delivery-lab',
        accessCode: 'BETA-CLOUD',
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.grant.assignment.id).toBe('assign-beta');
        expect(result.grant.assignment.cohortId).toBe('cohort-beta');
      }
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('rejects submitted student identifiers outside the selected organization', async () => {
    const result = await validateCourseAccessGrant({
      courseId: 'course-cloud-devsecops',
      organizationId: 'org-esilv',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
      accessCode: 'ESILV-CLOUD-M2',
      studentId: 'student-psb-1',
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('code-not-linked');
      expect(result.message).toBe('This code is not linked to the selected student.');
    }
  });

  it('rejects submitted student identifiers outside a cohort-scoped code', async () => {
    const result = await validateCourseAccessGrant({
      courseId: 'course-business-genai',
      organizationId: 'org-psb',
      cohortId: 'cohort-psb-ai-product',
      accessCode: 'PSB-GENAI',
      studentId: 'student-psb-2',
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('code-not-linked');
      expect(result.message).toBe('This code is not linked to the selected student.');
    }
  });

  it('exposes readable cohort metadata without exposing code hashes', async () => {
    const accessCodes = await listOrganizationAccessCodes('org-esilv');
    const cloudCode = accessCodes.find((accessCode) => accessCode.id === 'code-esilv-cloud');

    expect(cloudCode?.cohortName).toBe('M2 Cybersecurity and Cloud Computing');
    expect(cloudCode?.cohortProgramName).toBe('Cybersecurity and Cloud Computing');
    expect(JSON.stringify(cloudCode)).not.toContain('codeHash');
  });

  it('scopes access-code student metadata to the access-code organization', async () => {
    const originalCwd = process.cwd();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-access-code-student-scope-'));
    const now = '2026-07-03T08:00:00.000Z';
    const dataset: CoursePortalDataset = {
      organizations: [
        {
          id: 'org-a',
          name: 'Organization A',
          slug: 'org-a',
          description: 'First tenant',
          contactEmail: 'admin-a@example.edu',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'org-b',
          name: 'Organization B',
          slug: 'org-b',
          description: 'Second tenant',
          contactEmail: 'admin-b@example.edu',
          createdAt: now,
          updatedAt: now,
        },
      ],
      users: [
        {
          id: 'admin-b',
          organizationId: 'org-b',
          name: 'Organization B Admin',
          email: 'admin-b@example.edu',
          passwordHash: 'hashed',
          role: 'organization-admin',
          createdAt: now,
          updatedAt: now,
        },
      ],
      courses: [
        {
          id: 'course-cloud',
          title: 'Cloud Delivery Lab',
          slug: 'cloud-delivery-lab',
          description: 'Cloud course.',
          category: 'Cloud',
          status: 'active',
          generatedBy: 'OpenMAIC',
          createdAt: now,
          updatedAt: now,
          modules: [],
        },
      ],
      assignments: [],
      students: [
        {
          id: 'student-shared',
          organizationId: 'org-a',
          name: 'Wrong Tenant Student',
          email: 'wrong@example.edu',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'student-shared',
          organizationId: 'org-b',
          name: 'Right Tenant Student',
          email: 'right@example.edu',
          createdAt: now,
          updatedAt: now,
        },
      ],
      enrollments: [],
      accessCodes: [
        {
          id: 'code-org-b',
          codeHash: hashAccessCode('ORG-B-CLOUD'),
          organizationId: 'org-b',
          courseId: 'course-cloud',
          studentId: 'student-shared',
          createdByUserId: 'admin-b',
          currentUses: 0,
          isActive: true,
          createdAt: now,
        },
      ],
      cohorts: [],
      activityLogs: [],
    };

    try {
      await mkdir(path.join(tempRoot, 'data', 'course-portal'), { recursive: true });
      await writeFile(
        path.join(tempRoot, 'data', 'course-portal', 'catalog.json'),
        `${JSON.stringify(dataset, null, 2)}\n`,
        'utf-8',
      );
      process.chdir(tempRoot);
      vi.resetModules();
      const scopedData = await import('@/lib/server/course-portal-data');

      const accessCodes = await scopedData.listOrganizationAccessCodes('org-b');

      expect(accessCodes).toHaveLength(1);
      expect(accessCodes[0]).toMatchObject({
        id: 'code-org-b',
        organizationId: 'org-b',
        studentId: 'student-shared',
        studentName: 'Right Tenant Student',
      });
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('rejects access-code creation for a cohort outside the organization assignment', async () => {
    const result = await createOrganizationAccessCode({
      organizationId: 'org-esilv',
      courseId: 'course-ai-foundations',
      cohortId: 'cohort-psb-ai-product',
      createdByUserId: 'user-esilv-admin',
    });

    expect(result).toEqual({ error: 'Cohort does not belong to this organization.' });
  });

  it('rejects access-code creation when the cohort is not assigned to the selected course', async () => {
    const result = await createOrganizationAccessCode({
      organizationId: 'org-esilv',
      courseId: 'course-ai-foundations',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
      createdByUserId: 'user-esilv-admin',
    });

    expect(result).toEqual({ error: 'Selected cohort is not assigned to this course.' });
  });

  it('requires a cohort when access-code creation targets a multi-cohort course', async () => {
    const originalCwd = process.cwd();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-access-code-cohort-scope-'));
    const now = '2026-07-03T08:00:00.000Z';
    const dataset: CoursePortalDataset = {
      organizations: [
        {
          id: 'org-school',
          name: 'School',
          slug: 'school',
          description: 'School tenant',
          contactEmail: 'admin@school.example',
          createdAt: now,
          updatedAt: now,
        },
      ],
      users: [
        {
          id: 'admin-school',
          organizationId: 'org-school',
          name: 'School Admin',
          email: 'admin@school.example',
          passwordHash: 'hashed',
          role: 'organization-admin',
          createdAt: now,
          updatedAt: now,
        },
      ],
      courses: [
        {
          id: 'course-cloud',
          title: 'Cloud Delivery Lab',
          slug: 'cloud-delivery-lab',
          description: 'Cloud course.',
          category: 'Cloud',
          status: 'active',
          generatedBy: 'OpenMAIC',
          createdAt: now,
          updatedAt: now,
          modules: [],
        },
      ],
      assignments: [
        {
          id: 'assign-alpha',
          organizationId: 'org-school',
          courseId: 'course-cloud',
          cohortId: 'cohort-alpha',
          assignedAt: now,
          assignedByUserId: 'platform-admin',
        },
        {
          id: 'assign-beta',
          organizationId: 'org-school',
          courseId: 'course-cloud',
          cohortId: 'cohort-beta',
          assignedAt: now,
          assignedByUserId: 'platform-admin',
        },
      ],
      students: [],
      enrollments: [],
      accessCodes: [],
      cohorts: [
        {
          id: 'cohort-alpha',
          organizationId: 'org-school',
          name: 'Alpha cohort',
          createdAt: now,
        },
        {
          id: 'cohort-beta',
          organizationId: 'org-school',
          name: 'Beta cohort',
          createdAt: now,
        },
      ],
      activityLogs: [],
    };

    try {
      await mkdir(path.join(tempRoot, 'data', 'course-portal'), { recursive: true });
      await writeFile(
        path.join(tempRoot, 'data', 'course-portal', 'catalog.json'),
        `${JSON.stringify(dataset, null, 2)}\n`,
        'utf-8',
      );
      process.chdir(tempRoot);
      vi.resetModules();
      const scopedData = await import('@/lib/server/course-portal-data');

      await expect(
        scopedData.createOrganizationAccessCode({
          organizationId: 'org-school',
          courseId: 'course-cloud',
          createdByUserId: 'admin-school',
        }),
      ).resolves.toEqual({
        error: 'Cohort is required when this course has multiple cohort assignments.',
      });

      const persisted = await scopedData.getCoursePortalDataset();
      expect(persisted.accessCodes).toEqual([]);
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('rejects access-code creation for a student outside the selected cohort', async () => {
    const result = await createOrganizationAccessCode({
      organizationId: 'org-psb',
      courseId: 'course-business-genai',
      cohortId: 'cohort-psb-ai-product',
      studentId: 'student-psb-2',
      createdByUserId: 'user-psb-admin',
    });

    expect(result).toEqual({ error: 'Student is not in the selected cohort.' });
  });

  it('rejects invalid access-code usage limits server-side', async () => {
    await expect(
      createOrganizationAccessCode({
        organizationId: 'org-esilv',
        courseId: 'course-cloud-devsecops',
        cohortId: 'cohort-esilv-m2-cyber-cloud',
        createdByUserId: 'user-esilv-admin',
        maxUses: 0,
      }),
    ).resolves.toEqual({ error: 'Maximum uses must be a positive whole number.' });

    await expect(
      createOrganizationAccessCode({
        organizationId: 'org-esilv',
        courseId: 'course-cloud-devsecops',
        cohortId: 'cohort-esilv-m2-cyber-cloud',
        createdByUserId: 'user-esilv-admin',
        maxUses: 1.5,
      }),
    ).resolves.toEqual({ error: 'Maximum uses must be a positive whole number.' });
  });

  it('rejects invalid or past access-code expirations server-side', async () => {
    await expect(
      createOrganizationAccessCode({
        organizationId: 'org-esilv',
        courseId: 'course-cloud-devsecops',
        cohortId: 'cohort-esilv-m2-cyber-cloud',
        createdByUserId: 'user-esilv-admin',
        expiresAt: 'not-a-date',
      }),
    ).resolves.toEqual({ error: 'Expiration date is invalid.' });

    await expect(
      createOrganizationAccessCode({
        organizationId: 'org-esilv',
        courseId: 'course-cloud-devsecops',
        cohortId: 'cohort-esilv-m2-cyber-cloud',
        createdByUserId: 'user-esilv-admin',
        expiresAt: '2020-01-01T00:00:00.000Z',
      }),
    ).resolves.toEqual({ error: 'Expiration date must be in the future.' });
  });

  it('limits teacher-managed access codes to assigned courses', async () => {
    const teacher = await getPortalUserByEmail('teacher@esilv.local');
    expect(teacher).toBeDefined();
    if (!teacher) return;

    const accessCodes = await listVisibleOrganizationAccessCodes(teacher, 'org-esilv');
    expect(accessCodes.map((code) => code.id)).toEqual(['code-esilv-cloud']);

    await expect(
      createOrganizationAccessCode({
        organizationId: 'org-esilv',
        courseId: 'course-ai-foundations',
        createdByUserId: teacher.id,
      }),
    ).resolves.toEqual({ error: 'Course is not assigned to this teacher manager.' });

    await expect(
      disableOrganizationAccessCode({
        organizationId: 'org-esilv',
        accessCodeId: 'code-esilv-ai',
        disabledByUserId: teacher.id,
      }),
    ).resolves.toEqual({ error: 'Course is not assigned to this teacher manager.' });
  });

  it('limits teacher-managed same-course data to the assigned cohort', async () => {
    const now = '2026-07-03T08:00:00.000Z';
    const teacher: PortalUser = {
      id: 'teacher-alpha',
      organizationId: 'org-school',
      name: 'Alpha Teacher',
      email: 'teacher-alpha@example.edu',
      passwordHash: 'hashed',
      role: 'teacher-manager',
      canGenerateAccessCodes: true,
      createdAt: now,
      updatedAt: now,
    };
    const dataset: CoursePortalDataset = {
      organizations: [
        {
          id: 'org-school',
          name: 'School',
          slug: 'school',
          description: 'School tenant',
          contactEmail: 'admin@example.edu',
          createdAt: now,
          updatedAt: now,
        },
      ],
      users: [
        teacher,
        {
          id: 'platform-admin',
          name: 'Platform Admin',
          email: 'platform@example.edu',
          passwordHash: 'hashed',
          role: 'platform-admin',
          createdAt: now,
          updatedAt: now,
        },
      ],
      courses: [
        {
          id: 'course-shared',
          title: 'Shared Cloud Lab',
          slug: 'shared-cloud-lab',
          description: 'One course assigned to multiple cohorts.',
          category: 'Cloud',
          status: 'active',
          generatedBy: 'OpenMAIC',
          createdAt: now,
          updatedAt: now,
          modules: [],
        },
      ],
      cohorts: [
        {
          id: 'cohort-alpha',
          organizationId: 'org-school',
          name: 'Alpha cohort',
          createdAt: now,
        },
        {
          id: 'cohort-beta',
          organizationId: 'org-school',
          name: 'Beta cohort',
          createdAt: now,
        },
      ],
      assignments: [
        {
          id: 'assign-alpha',
          organizationId: 'org-school',
          courseId: 'course-shared',
          cohortId: 'cohort-alpha',
          assignedAt: now,
          assignedByUserId: 'platform-admin',
          teacherUserId: 'teacher-alpha',
        },
        {
          id: 'assign-beta',
          organizationId: 'org-school',
          courseId: 'course-shared',
          cohortId: 'cohort-beta',
          assignedAt: now,
          assignedByUserId: 'platform-admin',
        },
      ],
      students: [
        {
          id: 'student-alpha',
          organizationId: 'org-school',
          cohortId: 'cohort-alpha',
          name: 'Alpha Student',
          email: 'alpha@example.edu',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'student-beta',
          organizationId: 'org-school',
          cohortId: 'cohort-beta',
          name: 'Beta Student',
          email: 'beta@example.edu',
          createdAt: now,
          updatedAt: now,
        },
      ],
      enrollments: [
        {
          id: 'enroll-alpha',
          organizationId: 'org-school',
          studentId: 'student-alpha',
          courseId: 'course-shared',
          accessCodeId: 'code-alpha',
          status: 'in_progress',
          progressPercentage: 40,
          startedAt: now,
          lastActivityAt: now,
        },
        {
          id: 'enroll-beta',
          organizationId: 'org-school',
          studentId: 'student-beta',
          courseId: 'course-shared',
          accessCodeId: 'code-beta',
          status: 'in_progress',
          progressPercentage: 80,
          startedAt: now,
          lastActivityAt: now,
        },
      ],
      accessCodes: [
        {
          id: 'code-alpha',
          codeHash: 'alpha-hash',
          organizationId: 'org-school',
          courseId: 'course-shared',
          cohortId: 'cohort-alpha',
          createdByUserId: 'teacher-alpha',
          currentUses: 1,
          isActive: true,
          createdAt: now,
        },
        {
          id: 'code-beta',
          codeHash: 'beta-hash',
          organizationId: 'org-school',
          courseId: 'course-shared',
          cohortId: 'cohort-beta',
          createdByUserId: 'platform-admin',
          currentUses: 1,
          isActive: true,
          createdAt: now,
        },
      ],
      activityLogs: [
        {
          id: 'activity-alpha',
          organizationId: 'org-school',
          studentId: 'student-alpha',
          courseId: 'course-shared',
          action: 'lesson.viewed',
          metadata: {},
          createdAt: now,
        },
        {
          id: 'activity-beta',
          organizationId: 'org-school',
          studentId: 'student-beta',
          courseId: 'course-shared',
          action: 'lesson.viewed',
          metadata: {},
          createdAt: now,
        },
      ],
    };
    const originalCwd = process.cwd();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-course-portal-'));

    try {
      await mkdir(path.join(tempRoot, 'data', 'course-portal'), { recursive: true });
      await writeFile(
        path.join(tempRoot, 'data', 'course-portal', 'catalog.json'),
        `${JSON.stringify(dataset, null, 2)}\n`,
        'utf-8',
      );
      process.chdir(tempRoot);
      vi.resetModules();
      const scopedData = await import('@/lib/server/course-portal-data');

      const courseDetail = await scopedData.getVisibleOrganizationCourseDetail(
        teacher,
        'org-school',
        'course-shared',
      );
      expect(courseDetail?.enrollments.map((enrollment) => enrollment.id)).toEqual([
        'enroll-alpha',
      ]);
      expect(courseDetail?.students.map((student) => student.id)).toEqual(['student-alpha']);
      expect(courseDetail?.accessCodes.map((accessCode) => accessCode.id)).toEqual(['code-alpha']);
      expect(courseDetail?.completionRate).toBe(40);

      const courseSummaries = await scopedData.listVisibleOrganizationCourseSummaries(
        teacher,
        'org-school',
      );
      expect(courseSummaries).toMatchObject([
        {
          assignmentId: 'assign-alpha',
          activeAccessCodes: 1,
        },
      ]);

      const studentSummaries = await scopedData.listVisibleOrganizationStudentSummaries(
        teacher,
        'org-school',
      );
      expect(studentSummaries.map((summary) => summary.student.id)).toEqual(['student-alpha']);

      await expect(
        scopedData.getVisibleOrganizationStudentDetail(teacher, 'org-school', 'student-beta'),
      ).resolves.toBeUndefined();

      const accessCodes = await scopedData.listVisibleOrganizationAccessCodes(
        teacher,
        'org-school',
      );
      expect(accessCodes.map((accessCode) => accessCode.id)).toEqual(['code-alpha']);

      const cohorts = await scopedData.listVisibleOrganizationCohorts(teacher, 'org-school');
      expect(cohorts.map((cohort) => cohort.id)).toEqual(['cohort-alpha']);

      await expect(
        scopedData.disableOrganizationAccessCode({
          organizationId: 'org-school',
          accessCodeId: 'code-beta',
          disabledByUserId: teacher.id,
        }),
      ).resolves.toEqual({ error: 'Course is not assigned to this teacher manager.' });
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

describe('tenant visibility rules', () => {
  it('limits teacher managers to assigned courses and enrolled students', async () => {
    const teacher = await getPortalUserByEmail('teacher@esilv.local');
    expect(teacher).toBeDefined();
    if (!teacher) return;

    const courses = await listVisibleOrganizationCourseSummaries(teacher, 'org-esilv');
    expect(courses.map((item) => item.course.id).sort()).toEqual([
      'course-cloud-devsecops',
      'course-secure-automation',
    ]);

    const students = await listVisibleOrganizationStudentSummaries(teacher, 'org-esilv');
    expect(
      students.map((item) => item.student.organizationId).every((id) => id === 'org-esilv'),
    ).toBe(true);
    expect(students.map((item) => item.student.id).sort()).toEqual([
      'student-esilv-1',
      'student-esilv-2',
      'student-esilv-3',
    ]);
    const unenrolledSummary = students.find((item) => item.student.id === 'student-esilv-3');
    expect(unenrolledSummary).toMatchObject({
      coursesEnrolled: 0,
      averageProgress: 0,
      completionStatus: 'not_started',
    });

    const studentDetail = await getVisibleOrganizationStudentDetail(
      teacher,
      'org-esilv',
      'student-esilv-1',
    );
    expect(studentDetail?.progress.map((item) => item.course.id).sort()).toEqual([
      'course-cloud-devsecops',
      'course-secure-automation',
    ]);

    const unenrolledDetail = await getVisibleOrganizationStudentDetail(
      teacher,
      'org-esilv',
      'student-esilv-3',
    );
    expect(unenrolledDetail?.progress.map((item) => item.course.id).sort()).toEqual([
      'course-cloud-devsecops',
      'course-secure-automation',
    ]);
    expect(unenrolledDetail?.progress.every((item) => item.enrollment === undefined)).toBe(true);
  });

  it('shows organization admins every organization student, including unenrolled learners', async () => {
    const admin = await getPortalUserByEmail('admin@esilv.local');
    expect(admin).toBeDefined();
    if (!admin) return;

    const summary = await getOrganizationDashboardSummary('org-esilv');
    expect(summary?.enrolledStudents).toBe(2);

    const students = await listVisibleOrganizationStudentSummaries(admin, 'org-esilv');
    expect(students.map((item) => item.student.id).sort()).toEqual([
      'student-esilv-1',
      'student-esilv-2',
      'student-esilv-3',
    ]);

    const unenrolledSummary = students.find((item) => item.student.id === 'student-esilv-3');
    expect(unenrolledSummary).toMatchObject({
      coursesEnrolled: 0,
      averageProgress: 0,
      completionStatus: 'not_started',
    });

    const studentDetail = await getVisibleOrganizationStudentDetail(
      admin,
      'org-esilv',
      'student-esilv-3',
    );
    expect(studentDetail?.progress.map((item) => item.course.id).sort()).toEqual([
      'course-ai-foundations',
      'course-cloud-devsecops',
      'course-secure-automation',
    ]);
    expect(studentDetail?.progress.every((item) => item.enrollment === undefined)).toBe(true);
  });

  it('limits student accounts to their own enrolled course and enrollment detail', async () => {
    const student = await getPortalUserByEmail('student@esilv.local');
    expect(student).toBeDefined();
    if (!student) return;

    const courses = await listVisibleOrganizationCourseSummaries(student, 'org-esilv');
    expect(courses.map((item) => item.course.id)).toEqual(['course-cloud-devsecops']);
    await expect(listVisibleOrganizationAccessCodes(student, 'org-esilv')).resolves.toEqual([]);

    const detail = await getVisibleOrganizationCourseDetail(
      student,
      'org-esilv',
      'course-cloud-devsecops',
    );
    expect(detail?.students.map((item) => item.id)).toEqual(['student-esilv-1']);
    expect(detail?.enrollments.map((item) => item.studentId)).toEqual(['student-esilv-1']);
    expect(detail?.accessCodes).toEqual([]);

    const studentDetail = await getVisibleOrganizationStudentDetail(
      student,
      'org-esilv',
      'student-esilv-1',
    );
    expect(studentDetail?.progress.map((item) => item.course.id)).toEqual([
      'course-cloud-devsecops',
    ]);
  });

  it('limits student accounts to the enrolled cohort for multi-cohort courses', async () => {
    const originalCwd = process.cwd();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-student-cohort-visibility-'));
    const now = '2026-07-03T08:00:00.000Z';
    const studentUser: PortalUser = {
      id: 'user-student-alpha',
      organizationId: 'org-school',
      studentId: 'student-alpha',
      name: 'Alpha Student',
      email: 'alpha@example.edu',
      passwordHash: 'hashed',
      role: 'student',
      createdAt: now,
      updatedAt: now,
    };
    const dataset: CoursePortalDataset = {
      organizations: [
        {
          id: 'org-school',
          name: 'School',
          slug: 'school',
          description: 'School tenant',
          contactEmail: 'admin@school.example',
          createdAt: now,
          updatedAt: now,
        },
      ],
      users: [studentUser],
      courses: [
        {
          id: 'course-cloud',
          title: 'Cloud Delivery Lab',
          slug: 'cloud-delivery-lab',
          description: 'Cloud course.',
          category: 'Cloud',
          status: 'active',
          generatedBy: 'OpenMAIC',
          createdAt: now,
          updatedAt: now,
          modules: [],
        },
      ],
      assignments: [
        {
          id: 'assign-alpha',
          organizationId: 'org-school',
          courseId: 'course-cloud',
          cohortId: 'cohort-alpha',
          assignedAt: now,
          assignedByUserId: 'platform-admin',
        },
        {
          id: 'assign-beta',
          organizationId: 'org-school',
          courseId: 'course-cloud',
          cohortId: 'cohort-beta',
          assignedAt: now,
          assignedByUserId: 'platform-admin',
        },
      ],
      students: [
        {
          id: 'student-alpha',
          organizationId: 'org-school',
          cohortId: 'cohort-alpha',
          name: 'Alpha Student',
          email: 'alpha@example.edu',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'student-beta',
          organizationId: 'org-school',
          cohortId: 'cohort-beta',
          name: 'Beta Student',
          email: 'beta@example.edu',
          createdAt: now,
          updatedAt: now,
        },
      ],
      enrollments: [
        {
          id: 'enroll-alpha',
          organizationId: 'org-school',
          studentId: 'student-alpha',
          courseId: 'course-cloud',
          status: 'in_progress',
          progressPercentage: 55,
          startedAt: now,
          lastActivityAt: now,
        },
      ],
      accessCodes: [],
      cohorts: [
        {
          id: 'cohort-alpha',
          organizationId: 'org-school',
          name: 'Alpha cohort',
          createdAt: now,
        },
        {
          id: 'cohort-beta',
          organizationId: 'org-school',
          name: 'Beta cohort',
          createdAt: now,
        },
      ],
      activityLogs: [],
    };

    try {
      await mkdir(path.join(tempRoot, 'data', 'course-portal'), { recursive: true });
      await writeFile(
        path.join(tempRoot, 'data', 'course-portal', 'catalog.json'),
        `${JSON.stringify(dataset, null, 2)}\n`,
        'utf-8',
      );
      process.chdir(tempRoot);
      vi.resetModules();
      const scopedData = await import('@/lib/server/course-portal-data');

      const courses = await scopedData.listVisibleOrganizationCourseSummaries(
        studentUser,
        'org-school',
      );
      expect(courses.map((item) => item.assignmentId)).toEqual(['assign-alpha']);

      const detail = await scopedData.getVisibleOrganizationCourseDetail(
        studentUser,
        'org-school',
        'course-cloud',
      );
      expect(detail?.assignment.id).toBe('assign-alpha');
      expect(detail?.students.map((student) => student.id)).toEqual(['student-alpha']);
      expect(detail?.enrollments.map((enrollment) => enrollment.id)).toEqual(['enroll-alpha']);
      await expect(
        scopedData.hasPortalAccountCourseAccess(studentUser, {
          organizationId: 'org-school',
          courseId: 'course-cloud',
          cohortId: 'cohort-alpha',
        }),
      ).resolves.toBe(true);
      await expect(
        scopedData.hasPortalAccountCourseAccess(studentUser, {
          organizationId: 'org-school',
          courseId: 'course-cloud',
          cohortId: 'cohort-beta',
        }),
      ).resolves.toBe(false);
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('grants public course account access only to enrolled student accounts', async () => {
    const student = await getPortalUserByEmail('student@esilv.local');
    const teacher = await getPortalUserByEmail('teacher@esilv.local');
    expect(student).toBeDefined();
    expect(teacher).toBeDefined();
    if (!student || !teacher) return;

    await expect(
      hasPortalAccountCourseAccess(student, {
        organizationId: 'org-esilv',
        courseId: 'course-cloud-devsecops',
        cohortId: 'cohort-esilv-m2-cyber-cloud',
      }),
    ).resolves.toBe(true);

    await expect(
      hasPortalAccountCourseAccess(student, {
        organizationId: 'org-esilv',
        courseId: 'course-secure-automation',
        cohortId: 'cohort-esilv-m2-cyber-cloud',
      }),
    ).resolves.toBe(false);

    await expect(
      hasPortalAccountCourseAccess(teacher, {
        organizationId: 'org-esilv',
        courseId: 'course-cloud-devsecops',
        cohortId: 'cohort-esilv-m2-cyber-cloud',
      }),
    ).resolves.toBe(false);
  });

  it('rejects student activity for assigned courses without an enrollment', async () => {
    await expect(
      trackStudentActivity({
        organizationId: 'org-esilv',
        studentId: 'student-esilv-1',
        courseId: 'course-secure-automation',
        action: 'lesson.viewed',
        progressPercentage: 20,
      }),
    ).resolves.toEqual({ error: 'Student is not enrolled in this course.' });
  });

  it('rejects non-finite progress values without mutating enrollment progress', async () => {
    const originalCwd = process.cwd();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-activity-progress-'));
    const now = '2026-07-03T08:00:00.000Z';
    const dataset: CoursePortalDataset = {
      organizations: [
        {
          id: 'org-school',
          name: 'School',
          slug: 'school',
          description: 'School tenant',
          contactEmail: 'admin@school.example',
          createdAt: now,
          updatedAt: now,
        },
      ],
      users: [],
      courses: [
        {
          id: 'course-cloud',
          title: 'Cloud Delivery Lab',
          slug: 'cloud-delivery-lab',
          description: 'Cloud course.',
          category: 'Cloud',
          status: 'active',
          generatedBy: 'OpenMAIC',
          createdAt: now,
          updatedAt: now,
          modules: [],
        },
      ],
      assignments: [
        {
          id: 'assign-cloud',
          organizationId: 'org-school',
          courseId: 'course-cloud',
          assignedAt: now,
          assignedByUserId: 'platform-admin',
        },
      ],
      students: [
        {
          id: 'student-school',
          organizationId: 'org-school',
          name: 'School Student',
          email: 'student@school.example',
          createdAt: now,
          updatedAt: now,
        },
      ],
      enrollments: [
        {
          id: 'enroll-school-cloud',
          organizationId: 'org-school',
          studentId: 'student-school',
          courseId: 'course-cloud',
          status: 'in_progress',
          progressPercentage: 35,
          startedAt: now,
          lastActivityAt: now,
        },
      ],
      accessCodes: [],
      cohorts: [],
      activityLogs: [],
    };

    try {
      await mkdir(path.join(tempRoot, 'data', 'course-portal'), { recursive: true });
      await writeFile(
        path.join(tempRoot, 'data', 'course-portal', 'catalog.json'),
        `${JSON.stringify(dataset, null, 2)}\n`,
        'utf-8',
      );
      process.chdir(tempRoot);
      vi.resetModules();
      const scopedData = await import('@/lib/server/course-portal-data');

      await expect(
        scopedData.trackStudentActivity({
          organizationId: 'org-school',
          studentId: 'student-school',
          courseId: 'course-cloud',
          action: 'lesson.viewed',
          progressPercentage: Number.POSITIVE_INFINITY,
        }),
      ).resolves.toEqual({ error: 'Progress percentage must be a finite number.' });

      const persisted = await scopedData.getCoursePortalDataset();
      expect(persisted.enrollments[0]).toMatchObject({
        id: 'enroll-school-cloud',
        progressPercentage: 35,
        status: 'in_progress',
        lastActivityAt: now,
      });
      expect(persisted.activityLogs).toEqual([]);
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('rejects student activity when enrollment does not match an assigned cohort', async () => {
    const originalCwd = process.cwd();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-activity-cohort-scope-'));
    const now = '2026-07-03T08:00:00.000Z';
    const dataset: CoursePortalDataset = {
      organizations: [
        {
          id: 'org-school',
          name: 'School',
          slug: 'school',
          description: 'School tenant',
          contactEmail: 'admin@school.example',
          createdAt: now,
          updatedAt: now,
        },
      ],
      users: [],
      courses: [
        {
          id: 'course-cloud',
          title: 'Cloud Delivery Lab',
          slug: 'cloud-delivery-lab',
          description: 'Cloud course.',
          category: 'Cloud',
          status: 'active',
          generatedBy: 'OpenMAIC',
          createdAt: now,
          updatedAt: now,
          modules: [],
        },
      ],
      assignments: [
        {
          id: 'assign-alpha',
          organizationId: 'org-school',
          courseId: 'course-cloud',
          cohortId: 'cohort-alpha',
          assignedAt: now,
          assignedByUserId: 'platform-admin',
        },
      ],
      students: [
        {
          id: 'student-beta',
          organizationId: 'org-school',
          cohortId: 'cohort-beta',
          name: 'Beta Student',
          email: 'beta@example.edu',
          createdAt: now,
          updatedAt: now,
        },
      ],
      enrollments: [
        {
          id: 'enroll-beta',
          organizationId: 'org-school',
          studentId: 'student-beta',
          courseId: 'course-cloud',
          status: 'in_progress',
          progressPercentage: 10,
          startedAt: now,
          lastActivityAt: now,
        },
      ],
      accessCodes: [],
      cohorts: [
        {
          id: 'cohort-alpha',
          organizationId: 'org-school',
          name: 'Alpha cohort',
          createdAt: now,
        },
        {
          id: 'cohort-beta',
          organizationId: 'org-school',
          name: 'Beta cohort',
          createdAt: now,
        },
      ],
      activityLogs: [],
    };

    try {
      await mkdir(path.join(tempRoot, 'data', 'course-portal'), { recursive: true });
      await writeFile(
        path.join(tempRoot, 'data', 'course-portal', 'catalog.json'),
        `${JSON.stringify(dataset, null, 2)}\n`,
        'utf-8',
      );
      process.chdir(tempRoot);
      vi.resetModules();
      const scopedData = await import('@/lib/server/course-portal-data');

      await expect(
        scopedData.trackStudentActivity({
          organizationId: 'org-school',
          studentId: 'student-beta',
          courseId: 'course-cloud',
          action: 'lesson.viewed',
          progressPercentage: 70,
        }),
      ).resolves.toEqual({ error: 'Student is not assigned to this course cohort.' });

      const persisted = await scopedData.getCoursePortalDataset();
      expect(persisted.enrollments[0]).toMatchObject({
        id: 'enroll-beta',
        progressPercentage: 10,
        status: 'in_progress',
      });
      expect(persisted.activityLogs).toEqual([]);
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

describe('global course management', () => {
  it('rejects unsupported global course statuses', async () => {
    await expect(
      updateGlobalCourseStatus({
        courseId: 'course-cloud-devsecops',
        status: 'archived',
      }),
    ).resolves.toEqual({ error: 'Invalid course status.' });
  });

  it('validates teacher manager assignment ownership', async () => {
    const existing = await assignCourseToOrganization({
      organizationId: 'org-esilv',
      courseId: 'course-cloud-devsecops',
      cohortId: 'cohort-esilv-m2-cyber-cloud',
      assignedByUserId: 'user-platform-admin',
      teacherUserId: 'user-esilv-teacher',
    });

    expect(existing).toMatchObject({
      organizationId: 'org-esilv',
      courseId: 'course-cloud-devsecops',
      teacherUserId: 'user-esilv-teacher',
    });

    await expect(
      assignCourseToOrganization({
        organizationId: 'org-psb',
        courseId: 'course-business-genai',
        assignedByUserId: 'user-platform-admin',
        teacherUserId: 'user-esilv-teacher',
      }),
    ).resolves.toEqual({ error: 'Teacher manager does not belong to this organization.' });

    await expect(
      assignCourseToOrganization({
        organizationId: 'org-esilv',
        courseId: 'course-cloud-devsecops',
        cohortId: 'cohort-esilv-m2-cyber-cloud',
        assignedByUserId: 'user-esilv-admin',
        teacherUserId: 'user-esilv-teacher',
      }),
    ).resolves.toEqual({ error: 'Platform admin required.' });
  });

  it('clears an existing teacher manager assignment when no teacher is submitted', async () => {
    const originalCwd = process.cwd();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-assignment-teacher-clear-'));
    const now = '2026-07-03T08:00:00.000Z';
    const dataset: CoursePortalDataset = {
      organizations: [
        {
          id: 'org-school',
          name: 'School',
          slug: 'school',
          description: 'School tenant',
          contactEmail: 'admin@school.example',
          createdAt: now,
          updatedAt: now,
        },
      ],
      users: [
        {
          id: 'platform-admin',
          name: 'Platform Admin',
          email: 'platform@example.edu',
          passwordHash: 'hashed',
          role: 'platform-admin',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'teacher-school',
          organizationId: 'org-school',
          name: 'School Teacher',
          email: 'teacher@school.example',
          passwordHash: 'hashed',
          role: 'teacher-manager',
          canGenerateAccessCodes: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
      courses: [
        {
          id: 'course-cloud',
          title: 'Cloud Delivery Lab',
          slug: 'cloud-delivery-lab',
          description: 'Cloud course.',
          category: 'Cloud',
          status: 'active',
          generatedBy: 'OpenMAIC',
          createdAt: now,
          updatedAt: now,
          modules: [],
        },
      ],
      assignments: [
        {
          id: 'assign-cloud',
          organizationId: 'org-school',
          courseId: 'course-cloud',
          assignedAt: now,
          assignedByUserId: 'platform-admin',
          teacherUserId: 'teacher-school',
        },
      ],
      students: [],
      enrollments: [],
      accessCodes: [],
      cohorts: [],
      activityLogs: [],
    };

    try {
      await mkdir(path.join(tempRoot, 'data', 'course-portal'), { recursive: true });
      await writeFile(
        path.join(tempRoot, 'data', 'course-portal', 'catalog.json'),
        `${JSON.stringify(dataset, null, 2)}\n`,
        'utf-8',
      );
      process.chdir(tempRoot);
      vi.resetModules();
      const scopedData = await import('@/lib/server/course-portal-data');

      const result = await scopedData.assignCourseToOrganization({
        organizationId: 'org-school',
        courseId: 'course-cloud',
        assignedByUserId: 'platform-admin',
      });

      expect(result).toMatchObject({
        id: 'assign-cloud',
        organizationId: 'org-school',
        courseId: 'course-cloud',
      });
      expect(result).not.toHaveProperty('teacherUserId');

      const persisted = await scopedData.getCoursePortalDataset();
      expect(persisted.assignments[0]).not.toHaveProperty('teacherUserId');
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
