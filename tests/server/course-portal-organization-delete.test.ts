import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import type { CoursePortalDataset } from '@/lib/types/course-portal';

describe('organization deletion', () => {
  it('cascades tenant data while preserving global courses and platform users', async () => {
    const originalCwd = process.cwd();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-org-delete-'));
    const now = '2026-07-12T10:00:00.000Z';
    const dataset: CoursePortalDataset = {
      organizations: [
        {
          id: 'org-delete',
          name: 'Delete Me',
          slug: 'delete-me',
          description: 'Temporary tenant.',
          contactEmail: 'admin@example.edu',
          createdAt: now,
          updatedAt: now,
        },
      ],
      users: [
        {
          id: 'platform',
          name: 'Platform',
          email: 'platform@example.edu',
          passwordHash: 'hash',
          role: 'platform-admin',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'tenant-admin',
          organizationId: 'org-delete',
          name: 'Tenant Admin',
          email: 'admin@example.edu',
          passwordHash: 'hash',
          role: 'organization-admin',
          createdAt: now,
          updatedAt: now,
        },
      ],
      courses: [
        {
          id: 'course-global',
          title: 'Global course',
          slug: 'global-course',
          description: 'Global.',
          category: 'Cloud',
          status: 'active',
          generatedBy: 'platform',
          createdAt: now,
          updatedAt: now,
          modules: [],
        },
      ],
      assignments: [
        {
          id: 'assignment',
          courseId: 'course-global',
          organizationId: 'org-delete',
          assignedAt: now,
          assignedByUserId: 'platform',
        },
      ],
      students: [
        {
          id: 'student',
          organizationId: 'org-delete',
          name: 'Learner',
          createdAt: now,
          updatedAt: now,
        },
      ],
      enrollments: [
        {
          id: 'enrollment',
          studentId: 'student',
          courseId: 'course-global',
          organizationId: 'org-delete',
          status: 'not_started',
          progressPercentage: 0,
          startedAt: now,
        },
      ],
      accessCodes: [
        {
          id: 'code',
          codeHash: 'hash',
          organizationId: 'org-delete',
          courseId: 'course-global',
          createdByUserId: 'tenant-admin',
          currentUses: 0,
          isActive: true,
          createdAt: now,
        },
      ],
      cohorts: [{ id: 'cohort', organizationId: 'org-delete', name: 'Cohort', createdAt: now }],
      activityLogs: [
        {
          id: 'activity',
          organizationId: 'org-delete',
          action: 'test',
          metadata: {},
          createdAt: now,
        },
      ],
      passwordResetTokens: [
        { id: 'reset', userId: 'tenant-admin', tokenHash: 'hash', createdAt: now, expiresAt: now },
      ],
      accountInvitations: [
        {
          id: 'invite',
          organizationId: 'org-delete',
          email: 'invite@example.edu',
          role: 'student',
          invitedByUserId: 'tenant-admin',
          tokenHash: 'hash',
          status: 'pending',
          createdAt: now,
          expiresAt: now,
        },
      ],
      emailVerificationTokens: [
        { id: 'verify', userId: 'tenant-admin', tokenHash: 'hash', createdAt: now, expiresAt: now },
      ],
      authAuditEvents: [
        {
          id: 'audit',
          userId: 'tenant-admin',
          organizationId: 'org-delete',
          action: 'login',
          metadata: {},
          createdAt: now,
        },
      ],
    };

    try {
      const dataPath = path.join(tempRoot, 'data', 'course-portal', 'catalog.json');
      await mkdir(path.dirname(dataPath), { recursive: true });
      await writeFile(dataPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf-8');
      process.chdir(tempRoot);
      vi.resetModules();
      const scopedData = await import('@/lib/server/course-portal-data');

      await expect(scopedData.deleteOrganization('org-delete')).resolves.toMatchObject({
        organization: { id: 'org-delete' },
      });

      const persisted = JSON.parse(await readFile(dataPath, 'utf-8')) as CoursePortalDataset;
      expect(persisted.organizations).toEqual([]);
      expect(persisted.users.map((user) => user.id)).toEqual(['platform']);
      expect(persisted.courses.map((course) => course.id)).toEqual(['course-global']);
      expect(persisted.assignments).toEqual([]);
      expect(persisted.students).toEqual([]);
      expect(persisted.enrollments).toEqual([]);
      expect(persisted.accessCodes).toEqual([]);
      expect(persisted.passwordResetTokens).toEqual([]);
      expect(persisted.accountInvitations).toEqual([]);
      expect(persisted.emailVerificationTokens).toEqual([]);
      expect(persisted.authAuditEvents).toEqual([]);
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
