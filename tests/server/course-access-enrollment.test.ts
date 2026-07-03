import { createHash } from 'crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import type { CoursePortalDataset } from '@/lib/types/course-portal';

function hashAccessCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

describe('course access enrollment creation', () => {
  it('rejects access sessions backed by disabled access codes', async () => {
    const originalCwd = process.cwd();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-access-session-disabled-'));
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
          cohortId: 'cohort-cloud',
          assignedAt: now,
          assignedByUserId: 'platform-admin',
        },
      ],
      students: [
        {
          id: 'student-cloud',
          organizationId: 'org-school',
          cohortId: 'cohort-cloud',
          name: 'Cloud Student',
          email: 'student@school.example',
          createdAt: now,
          updatedAt: now,
        },
      ],
      enrollments: [
        {
          id: 'enroll-cloud',
          studentId: 'student-cloud',
          organizationId: 'org-school',
          courseId: 'course-cloud',
          accessCodeId: 'code-cloud',
          status: 'in_progress',
          progressPercentage: 50,
          startedAt: now,
          lastActivityAt: now,
        },
      ],
      accessCodes: [
        {
          id: 'code-cloud',
          codeHash: hashAccessCode('SCHOOL-CLOUD'),
          organizationId: 'org-school',
          courseId: 'course-cloud',
          cohortId: 'cohort-cloud',
          createdByUserId: 'platform-admin',
          currentUses: 1,
          isActive: false,
          disabledAt: now,
          createdAt: now,
        },
      ],
      cohorts: [
        {
          id: 'cohort-cloud',
          organizationId: 'org-school',
          name: 'Cloud cohort',
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
        scopedData.isCourseAccessSessionValid({
          organizationId: 'org-school',
          courseId: 'course-cloud',
          cohortId: 'cohort-cloud',
          codeId: 'code-cloud',
          studentId: 'student-cloud',
          enrollmentId: 'enroll-cloud',
        }),
      ).resolves.toBe(false);
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('creates an enrollment-backed access session for no-login access-code learners', async () => {
    const originalCwd = process.cwd();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-access-enrollment-'));
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
          cohortId: 'cohort-cloud',
          assignedAt: now,
          assignedByUserId: 'platform-admin',
        },
      ],
      students: [],
      enrollments: [],
      accessCodes: [
        {
          id: 'code-cloud',
          codeHash: hashAccessCode('SCHOOL-CLOUD'),
          organizationId: 'org-school',
          courseId: 'course-cloud',
          cohortId: 'cohort-cloud',
          createdByUserId: 'platform-admin',
          currentUses: 0,
          maxUses: 10,
          isActive: true,
          createdAt: now,
        },
      ],
      cohorts: [
        {
          id: 'cohort-cloud',
          organizationId: 'org-school',
          name: 'Cloud cohort',
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

      const result = await scopedData.consumeCourseAccessGrant({
        organizationSlug: 'school',
        courseSlug: 'cloud-delivery-lab',
        accessCode: 'SCHOOL-CLOUD',
      });

      expect(result.valid).toBe(true);
      if (!result.valid) return;
      expect(result.enrollmentId).toMatch(/^enroll-/);
      expect(result.accessSession).toContain('access-org-school-course-cloud');
      expect(result.grant.enrollment).toMatchObject({
        id: result.enrollmentId,
        organizationId: 'org-school',
        courseId: 'course-cloud',
        accessCodeId: 'code-cloud',
        status: 'not_started',
        progressPercentage: 0,
      });
      expect(result.grant.enrollment?.studentId).toMatch(/^student-access-/);

      const persisted = await scopedData.getCoursePortalDataset();
      expect(persisted.students).toHaveLength(1);
      expect(persisted.students[0]).toMatchObject({
        organizationId: 'org-school',
        cohortId: 'cohort-cloud',
        name: 'Access code learner',
      });
      expect(persisted.enrollments).toHaveLength(1);
      expect(persisted.accessCodes[0].currentUses).toBe(1);
      expect(persisted.activityLogs).toEqual([
        expect.objectContaining({
          organizationId: 'org-school',
          studentId: persisted.students[0].id,
          courseId: 'course-cloud',
          action: 'course.access_granted',
          metadata: { accessCodeId: 'code-cloud' },
        }),
      ]);
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('does not consume another use when an enrolled student revalidates a maxed code', async () => {
    const originalCwd = process.cwd();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-access-reuse-'));
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
          id: 'student-cloud',
          organizationId: 'org-school',
          name: 'Enrolled Student',
          email: 'student@school.example',
          createdAt: now,
          updatedAt: now,
        },
      ],
      enrollments: [
        {
          id: 'enroll-cloud',
          organizationId: 'org-school',
          studentId: 'student-cloud',
          courseId: 'course-cloud',
          accessCodeId: 'code-cloud',
          status: 'in_progress',
          progressPercentage: 30,
          startedAt: now,
          lastActivityAt: now,
        },
      ],
      accessCodes: [
        {
          id: 'code-cloud',
          codeHash: hashAccessCode('SCHOOL-CLOUD'),
          organizationId: 'org-school',
          courseId: 'course-cloud',
          createdByUserId: 'platform-admin',
          currentUses: 1,
          maxUses: 1,
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
        organizationSlug: 'school',
        courseSlug: 'cloud-delivery-lab',
        accessCode: 'SCHOOL-CLOUD',
        studentId: 'student-cloud',
      });

      expect(result.valid).toBe(true);
      if (!result.valid) return;
      expect(result.enrollmentId).toBe('enroll-cloud');
      expect(result.grant.enrollment).toMatchObject({
        id: 'enroll-cloud',
        progressPercentage: 30,
      });

      const persisted = await scopedData.getCoursePortalDataset();
      expect(persisted.enrollments).toHaveLength(1);
      expect(persisted.accessCodes[0].currentUses).toBe(1);
      expect(persisted.activityLogs).toEqual([
        expect.objectContaining({
          studentId: 'student-cloud',
          courseId: 'course-cloud',
          action: 'course.access_granted',
        }),
      ]);
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('rejects a maxed code for a different already enrolled student', async () => {
    const originalCwd = process.cwd();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-access-maxed-enrolled-'));
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
          id: 'student-first',
          organizationId: 'org-school',
          name: 'First Student',
          email: 'first@school.example',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'student-second',
          organizationId: 'org-school',
          name: 'Second Student',
          email: 'second@school.example',
          createdAt: now,
          updatedAt: now,
        },
      ],
      enrollments: [
        {
          id: 'enroll-first',
          organizationId: 'org-school',
          studentId: 'student-first',
          courseId: 'course-cloud',
          accessCodeId: 'code-maxed',
          status: 'in_progress',
          progressPercentage: 50,
          startedAt: now,
          lastActivityAt: now,
        },
        {
          id: 'enroll-second',
          organizationId: 'org-school',
          studentId: 'student-second',
          courseId: 'course-cloud',
          accessCodeId: 'code-other',
          status: 'in_progress',
          progressPercentage: 25,
          startedAt: now,
          lastActivityAt: now,
        },
      ],
      accessCodes: [
        {
          id: 'code-maxed',
          codeHash: hashAccessCode('SCHOOL-CLOUD'),
          organizationId: 'org-school',
          courseId: 'course-cloud',
          createdByUserId: 'platform-admin',
          currentUses: 1,
          maxUses: 1,
          isActive: true,
          createdAt: now,
        },
        {
          id: 'code-other',
          codeHash: hashAccessCode('SCHOOL-OTHER'),
          organizationId: 'org-school',
          courseId: 'course-cloud',
          createdByUserId: 'platform-admin',
          currentUses: 1,
          maxUses: 1,
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
        organizationSlug: 'school',
        courseSlug: 'cloud-delivery-lab',
        accessCode: 'SCHOOL-CLOUD',
        studentId: 'student-second',
      });

      expect(result).toEqual({
        valid: false,
        reason: 'usage-limit-reached',
        message: 'This access code has reached its usage limit.',
      });

      const persisted = await scopedData.getCoursePortalDataset();
      expect(persisted.accessCodes.map((accessCode) => accessCode.currentUses)).toEqual([1, 1]);
      expect(persisted.activityLogs).toEqual([]);
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
