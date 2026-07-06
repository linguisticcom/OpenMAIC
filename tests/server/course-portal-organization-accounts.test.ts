import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import type { CoursePortalDataset, PortalUser } from '@/lib/types/course-portal';

describe('organization account provisioning', () => {
  it('creates an organization and first organization-admin login record', async () => {
    const originalCwd = process.cwd();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-org-account-'));
    const dataset: CoursePortalDataset = {
      organizations: [],
      users: [],
      courses: [],
      assignments: [],
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
      const passwordHashing = await import('@/lib/server/password-hashing');

      const created = await scopedData.createOrganizationWithAdmin({
        name: 'New School',
        slug: 'new-school',
        description: 'Client institution.',
        contactEmail: 'contact@new-school.example',
        adminName: 'New School Admin',
        adminEmail: 'admin@new-school.example',
        adminPassword: 'temporary-demo-password',
      });

      expect(created).toMatchObject({
        organization: {
          id: 'org-new-school',
          slug: 'new-school',
          subscriptionStatus: 'trial',
        },
        adminUser: {
          id: 'user-new-school-admin',
          organizationId: 'org-new-school',
          email: 'admin@new-school.example',
          role: 'organization-admin',
        },
      });
      expect(JSON.stringify(created)).not.toContain('passwordHash');

      const admin = await scopedData.getPortalUserByEmail('admin@new-school.example');
      expect(admin).toMatchObject({
        organizationId: 'org-new-school',
        role: 'organization-admin',
      });
      expect(admin?.passwordHash.startsWith('scrypt$')).toBe(true);
      expect(
        admin
          ? passwordHashing.verifyPortalPassword(admin.passwordHash, 'temporary-demo-password')
          : undefined,
      ).toMatchObject({ valid: true, needsUpgrade: false });

      await expect(
        scopedData.createOrganizationWithAdmin({
          name: 'Duplicate School',
          slug: 'new-school',
          description: 'Duplicate tenant.',
          contactEmail: 'duplicate@new-school.example',
          adminName: 'Duplicate Admin',
          adminEmail: 'duplicate@new-school.example',
          adminPassword: 'temporary-demo-password',
        }),
      ).resolves.toEqual({ error: 'Organization slug is already in use.' });

      await expect(
        scopedData.createOrganizationWithAdmin({
          name: 'Unsafe Logo School',
          slug: 'unsafe-logo-school',
          logoUrl: 'javascript:alert(1)',
          description: 'Tenant with unsafe branding.',
          contactEmail: 'unsafe@new-school.example',
          adminName: 'Unsafe Logo Admin',
          adminEmail: 'unsafe-admin@new-school.example',
          adminPassword: 'temporary-demo-password',
        }),
      ).resolves.toEqual({ error: 'Logo URL must be a relative path or an HTTP(S) URL.' });

      await expect(
        scopedData.updateOrganizationSettings({
          organizationId: 'org-new-school',
          logoUrl: 'data:image/svg+xml,<svg onload=alert(1)>',
        }),
      ).resolves.toEqual({ error: 'Logo URL must be a relative path or an HTTP(S) URL.' });

      await expect(
        scopedData.updateOrganizationSettings({
          organizationId: 'org-new-school',
          logoUrl: '/logos/new-school.svg',
        }),
      ).resolves.toMatchObject({ id: 'org-new-school', logoUrl: '/logos/new-school.svg' });

      await expect(
        scopedData.updateOrganizationSettings({
          organizationId: 'org-new-school',
          contactEmail: 'Admissions@New-School.Example',
        }),
      ).resolves.toMatchObject({
        id: 'org-new-school',
        contactEmail: 'admissions@new-school.example',
      });
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('lists only sanitized organization-admin users for one organization', async () => {
    const originalCwd = process.cwd();
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-org-admin-users-'));
    const now = '2026-07-03T08:00:00.000Z';
    const user = (overrides: Partial<PortalUser>): PortalUser => ({
      id: 'user-test',
      organizationId: 'org-school',
      name: 'Test User',
      email: 'user@example.edu',
      passwordHash: 'hashed',
      role: 'organization-admin',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    });
    const dataset: CoursePortalDataset = {
      organizations: [
        {
          id: 'org-school',
          name: 'School',
          slug: 'school',
          description: 'Client school.',
          contactEmail: 'contact@school.example',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'org-other',
          name: 'Other School',
          slug: 'other-school',
          description: 'Other client school.',
          contactEmail: 'contact@other-school.example',
          createdAt: now,
          updatedAt: now,
        },
      ],
      users: [
        user({
          id: 'user-school-admin-b',
          name: 'Beta Admin',
          email: 'beta-admin@school.example',
          passwordHash: 'beta-secret-hash',
        }),
        user({
          id: 'user-school-teacher',
          name: 'Teacher Manager',
          email: 'teacher@school.example',
          role: 'teacher-manager',
          passwordHash: 'teacher-secret-hash',
        }),
        user({
          id: 'user-school-admin-a',
          name: 'Alpha Admin',
          email: 'alpha-admin@school.example',
          passwordHash: 'alpha-secret-hash',
        }),
        user({
          id: 'user-other-admin',
          organizationId: 'org-other',
          name: 'Other Admin',
          email: 'admin@other-school.example',
          passwordHash: 'other-secret-hash',
        }),
      ],
      courses: [],
      assignments: [],
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

      const admins = await scopedData.listOrganizationAdminUsers('org-school');

      expect(admins.map((admin) => admin.id)).toEqual([
        'user-school-admin-a',
        'user-school-admin-b',
      ]);
      expect(admins.every((admin) => admin.organizationId === 'org-school')).toBe(true);
      expect(JSON.stringify(admins)).not.toContain('passwordHash');
      expect(JSON.stringify(admins)).not.toContain('secret-hash');
      expect(JSON.stringify(admins)).not.toContain('user-school-teacher');
      expect(JSON.stringify(admins)).not.toContain('user-other-admin');
    } finally {
      process.chdir(originalCwd);
      vi.resetModules();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
