import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { createHash } from 'crypto';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoursePortalDataset } from '@/lib/types/course-portal';

const cookieMocks = vi.hoisted(() => ({
  cookieValue: undefined as string | undefined,
  cookieSet: vi.fn((name: string, value: string) => {
    if (name === 'openmaic_org_session') cookieMocks.cookieValue = value;
  }),
  cookieDelete: vi.fn(() => {
    cookieMocks.cookieValue = undefined;
  }),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: cookieMocks.cookieSet,
    delete: cookieMocks.cookieDelete,
    get: vi.fn((name: string) =>
      name === 'openmaic_org_session' && cookieMocks.cookieValue
        ? { value: cookieMocks.cookieValue }
        : undefined,
    ),
  })),
}));

const now = '2026-07-06T09:00:00.000Z';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function baseDataset(): CoursePortalDataset {
  return {
    organizations: [
      {
        id: 'org-a',
        name: 'Organization A',
        slug: 'org-a',
        description: 'Primary tenant.',
        contactEmail: 'admin@org-a.test',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'org-b',
        name: 'Organization B',
        slug: 'org-b',
        description: 'Secondary tenant.',
        contactEmail: 'admin@org-b.test',
        createdAt: now,
        updatedAt: now,
      },
    ],
    users: [
      {
        id: 'user-platform',
        name: 'Platform Admin',
        email: 'platform@example.test',
        passwordHash: sha256('platform-password'),
        role: 'platform-admin',
        status: 'active',
        sessionVersion: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'user-admin-a',
        organizationId: 'org-a',
        name: 'Org A Admin',
        email: 'admin@org-a.test',
        passwordHash: sha256('old-password'),
        role: 'organization-admin',
        status: 'active',
        sessionVersion: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'user-disabled-a',
        organizationId: 'org-a',
        name: 'Disabled Admin',
        email: 'disabled@org-a.test',
        passwordHash: sha256('disabled-password'),
        role: 'organization-admin',
        status: 'disabled',
        sessionVersion: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'user-teacher-a',
        organizationId: 'org-a',
        name: 'Org A Teacher',
        email: 'teacher@org-a.test',
        passwordHash: sha256('teacher-password'),
        role: 'teacher-manager',
        status: 'active',
        sessionVersion: 1,
        createdAt: now,
        updatedAt: now,
      },
    ],
    courses: [
      {
        id: 'course-a',
        title: 'Tenant A Course',
        slug: 'tenant-a-course',
        description: 'Course for tenant A.',
        category: 'Cloud',
        status: 'active',
        generatedBy: 'OpenMAIC',
        createdAt: now,
        updatedAt: now,
        modules: [],
      },
      {
        id: 'course-b',
        title: 'Tenant B Course',
        slug: 'tenant-b-course',
        description: 'Course for tenant B.',
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
        id: 'assign-a',
        organizationId: 'org-a',
        courseId: 'course-a',
        assignedAt: now,
        assignedByUserId: 'user-platform',
      },
      {
        id: 'assign-b',
        organizationId: 'org-b',
        courseId: 'course-b',
        assignedAt: now,
        assignedByUserId: 'user-platform',
      },
    ],
    students: [],
    enrollments: [],
    accessCodes: [
      {
        id: 'code-a',
        codeHash: sha256('JOIN-A'),
        organizationId: 'org-a',
        courseId: 'course-a',
        createdByUserId: 'user-admin-a',
        currentUses: 0,
        maxUses: 5,
        isActive: true,
        createdAt: now,
      },
      {
        id: 'code-b',
        codeHash: sha256('JOIN-B'),
        organizationId: 'org-b',
        courseId: 'course-b',
        createdByUserId: 'user-platform',
        currentUses: 0,
        maxUses: 5,
        isActive: true,
        createdAt: now,
      },
    ],
    cohorts: [],
    activityLogs: [],
  };
}

async function withTempCatalog(
  dataset: CoursePortalDataset,
  fn: (catalogPath: string) => Promise<void>,
) {
  const originalCwd = process.cwd();
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-lms-lifecycle-'));
  const catalogPath = path.join(tempRoot, 'data', 'course-portal', 'catalog.json');

  try {
    await mkdir(path.dirname(catalogPath), { recursive: true });
    await writeFile(catalogPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf-8');
    process.chdir(tempRoot);
    vi.resetModules();
    await fn(catalogPath);
  } finally {
    process.chdir(originalCwd);
    vi.resetModules();
    await rm(tempRoot, { recursive: true, force: true });
  }
}

beforeEach(() => {
  cookieMocks.cookieValue = undefined;
  cookieMocks.cookieSet.mockClear();
  cookieMocks.cookieDelete.mockClear();
  process.env.ORGANIZATION_SESSION_SECRET = 'test-organization-session-secret';
  delete process.env.DATABASE_URL;
  delete process.env.RESEND_API_KEY;
  delete process.env.AUTH_EMAIL_FROM;
  process.env.AUTH_DEV_EXPOSE_TOKENS = 'true';
});

afterEach(() => {
  delete process.env.AUTH_DEV_EXPOSE_TOKENS;
  delete process.env.ORGANIZATION_SESSION_SECRET;
  vi.unstubAllEnvs();
});

describe('LMS password and session lifecycle', () => {
  it('upgrades legacy SHA-256 hashes on login and rejects disabled accounts', async () => {
    await withTempCatalog(baseDataset(), async () => {
      const data = await import('@/lib/server/course-portal-data');
      const session = await import('@/lib/server/organization-session');

      expect(session.verifyPortalPasswordHash(sha256('old-password'), 'old-password')).toBe(true);

      const valid = await session.loginPortalUser({
        email: 'admin@org-a.test',
        password: 'old-password',
      });
      expect(valid.ok).toBe(true);
      expect(cookieMocks.cookieSet).toHaveBeenCalledWith(
        'openmaic_org_session',
        expect.any(String),
        expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
      );

      const upgradedUser = await data.getPortalUserByEmail('admin@org-a.test');
      expect(upgradedUser?.passwordHash.startsWith('scrypt$')).toBe(true);
      if (valid.ok) {
        expect(JSON.stringify(session.serializeSession(valid.session))).not.toContain(
          'passwordHash',
        );
      }

      await expect(
        session.loginPortalUser({
          email: 'disabled@org-a.test',
          password: 'disabled-password',
        }),
      ).resolves.toEqual({ ok: false, error: 'Invalid email or password.' });
    });
  });

  it('rejects an existing session after the account is disabled', async () => {
    await withTempCatalog(baseDataset(), async (catalogPath) => {
      const session = await import('@/lib/server/organization-session');
      const login = await session.loginPortalUser({
        email: 'admin@org-a.test',
        password: 'old-password',
      });
      expect(login.ok).toBe(true);

      const catalog = JSON.parse(await readFile(catalogPath, 'utf-8')) as CoursePortalDataset;
      catalog.users = catalog.users.map((user) =>
        user.id === 'user-admin-a' ? { ...user, status: 'disabled' } : user,
      );
      await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf-8');

      await expect(session.getCurrentPortalSession()).resolves.toBeNull();
    });
  });
});

describe('LMS reset, signup, and invitation lifecycle', () => {
  it('creates dev-only reset URLs, consumes reset tokens once, and accepts only the new password', async () => {
    await withTempCatalog(baseDataset(), async () => {
      const { POST: forgotPassword } =
        await import('@/app/api/organization-auth/forgot-password/route');
      const { POST: resetPassword } =
        await import('@/app/api/organization-auth/reset-password/route');
      const session = await import('@/lib/server/organization-session');

      const unknownResponse = await forgotPassword(
        new Request('http://localhost/api/organization-auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-real-ip': '10.0.0.1' },
          body: JSON.stringify({ email: 'missing@example.test' }),
        }),
      );
      const unknownPayload = await unknownResponse.json();
      expect(unknownResponse.status).toBe(200);
      expect(unknownPayload.resetUrl).toBeUndefined();

      const knownResponse = await forgotPassword(
        new Request('http://localhost/api/organization-auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-real-ip': '10.0.0.2' },
          body: JSON.stringify({ email: 'admin@org-a.test' }),
        }),
      );
      const knownPayload = await knownResponse.json();
      expect(knownResponse.status).toBe(200);
      expect(knownPayload.resetUrl).toContain('/reset-password?token=');
      const token = new URL(knownPayload.resetUrl).searchParams.get('token');
      expect(token).toBeTruthy();

      const invalidResponse = await resetPassword(
        new Request('http://localhost/api/organization-auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-real-ip': '10.0.0.3' },
          body: JSON.stringify({ token: 'invalid-token', password: 'new-password' }),
        }),
      );
      expect(invalidResponse.status).toBe(400);

      const resetResponse = await resetPassword(
        new Request('http://localhost/api/organization-auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-real-ip': '10.0.0.4' },
          body: JSON.stringify({ token, password: 'new-password' }),
        }),
      );
      expect(resetResponse.status).toBe(200);

      const reusedResponse = await resetPassword(
        new Request('http://localhost/api/organization-auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-real-ip': '10.0.0.5' },
          body: JSON.stringify({ token, password: 'another-password' }),
        }),
      );
      expect(reusedResponse.status).toBe(400);

      await expect(
        session.loginPortalUser({ email: 'admin@org-a.test', password: 'old-password' }),
      ).resolves.toMatchObject({ ok: false });
      await expect(
        session.loginPortalUser({ email: 'admin@org-a.test', password: 'new-password' }),
      ).resolves.toMatchObject({ ok: true });
    });
  });

  it('creates a learner account only after a tenant-scoped access code is validated', async () => {
    await withTempCatalog(baseDataset(), async () => {
      const { POST: signup } = await import('@/app/api/organization-auth/signup/route');
      const data = await import('@/lib/server/course-portal-data');

      const invalidResponse = await signup(
        new Request('http://localhost/api/organization-auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-real-ip': '10.0.1.1' },
          body: JSON.stringify({
            organizationSlug: 'org-a',
            courseSlug: 'tenant-a-course',
            accessCode: 'JOIN-B',
            name: 'Cross Tenant',
            email: 'cross@example.test',
            password: 'student-password',
          }),
        }),
      );
      expect(invalidResponse.status).toBe(400);

      const response = await signup(
        new Request('http://localhost/api/organization-auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-real-ip': '10.0.1.2' },
          body: JSON.stringify({
            organizationSlug: 'org-a',
            courseSlug: 'tenant-a-course',
            accessCode: 'JOIN-A',
            name: 'New Learner',
            email: 'learner@example.test',
            password: 'student-password',
          }),
        }),
      );
      const payload = await response.json();
      expect(response.status).toBe(200);
      expect(payload).toMatchObject({ dashboardUrl: '/dashboard' });
      expect(JSON.stringify(payload)).not.toContain('passwordHash');
      expect(cookieMocks.cookieSet).toHaveBeenCalled();

      const user = await data.getPortalUserByEmail('learner@example.test');
      expect(user).toMatchObject({
        organizationId: 'org-a',
        role: 'student',
        status: 'active',
      });
      const dataset = await data.getCoursePortalDataset();
      expect(dataset.enrollments).toHaveLength(1);
      expect(dataset.enrollments[0]).toMatchObject({
        courseId: 'course-a',
        organizationId: 'org-a',
        accessCodeId: 'code-a',
      });
      expect(dataset.accessCodes.find((code) => code.id === 'code-a')?.currentUses).toBe(1);

      const duplicateResponse = await signup(
        new Request('http://localhost/api/organization-auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-real-ip': '10.0.1.3' },
          body: JSON.stringify({
            organizationSlug: 'org-a',
            courseSlug: 'tenant-a-course',
            accessCode: 'JOIN-A',
            name: 'New Learner',
            email: 'learner@example.test',
            password: 'student-password',
          }),
        }),
      );
      expect(duplicateResponse.status).toBe(400);
    });
  });

  it('enforces invitation role scope and one-time acceptance', async () => {
    await withTempCatalog(baseDataset(), async () => {
      const data = await import('@/lib/server/course-portal-data');
      const futureInvitationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await expect(
        data.createAccountInvitation({
          email: 'new-admin@org-a.test',
          role: 'organization-admin',
          organizationId: 'org-a',
          invitedByUserId: 'user-admin-a',
          tokenHash: 'org-admin-token',
          expiresAt: futureInvitationExpiry,
        }),
      ).resolves.toEqual({ error: 'Only platform admins can invite organization admins.' });

      await expect(
        data.createAccountInvitation({
          email: 'student@org-a.test',
          role: 'student',
          organizationId: 'org-a',
          invitedByUserId: 'user-teacher-a',
          tokenHash: 'teacher-token',
          expiresAt: futureInvitationExpiry,
        }),
      ).resolves.toEqual({ error: 'Only organization admins can invite tenant users.' });

      await expect(
        data.createAccountInvitation({
          email: 'new-admin@org-a.test',
          role: 'organization-admin',
          organizationId: 'org-a',
          invitedByUserId: 'user-platform',
          tokenHash: 'platform-token',
          expiresAt: futureInvitationExpiry,
        }),
      ).resolves.toMatchObject({ email: 'new-admin@org-a.test', role: 'organization-admin' });

      await expect(
        data.createAccountInvitation({
          email: 'teacher2@org-a.test',
          role: 'teacher-manager',
          organizationId: 'org-b',
          invitedByUserId: 'user-admin-a',
          tokenHash: 'cross-org-token',
          expiresAt: futureInvitationExpiry,
        }),
      ).resolves.toEqual({ error: 'Cannot invite users outside your organization.' });

      await expect(
        data.createAccountInvitation({
          email: 'teacher2@org-a.test',
          role: 'teacher-manager',
          organizationId: 'org-a',
          invitedByUserId: 'user-admin-a',
          tokenHash: 'teacher2-token',
          expiresAt: futureInvitationExpiry,
        }),
      ).resolves.toMatchObject({ email: 'teacher2@org-a.test', role: 'teacher-manager' });

      const accepted = await data.acceptAccountInvitation({
        tokenHash: 'teacher2-token',
        name: 'Teacher Two',
        password: 'teacher2-password',
      });
      expect(accepted).toMatchObject({
        user: {
          organizationId: 'org-a',
          email: 'teacher2@org-a.test',
          role: 'teacher-manager',
        },
      });
      await expect(
        data.acceptAccountInvitation({
          tokenHash: 'teacher2-token',
          name: 'Teacher Two',
          password: 'teacher2-password',
        }),
      ).resolves.toEqual({ error: 'Invitation link is invalid or has already been used.' });

      await data.createAccountInvitation({
        email: 'expired@org-a.test',
        role: 'student',
        organizationId: 'org-a',
        invitedByUserId: 'user-admin-a',
        tokenHash: 'expired-token',
        expiresAt: '2020-01-01T00:00:00.000Z',
      });
      await expect(
        data.acceptAccountInvitation({
          tokenHash: 'expired-token',
          name: 'Expired Student',
          password: 'student-password',
        }),
      ).resolves.toEqual({ error: 'Invitation link has expired.' });
    });
  });
});

describe('LMS store selection and persistence', () => {
  it('uses the JSON fallback store when DATABASE_URL is unset', async () => {
    const { getCoursePortalStore, resetCoursePortalStoreCacheForTests } =
      await import('@/lib/server/course-portal-store');
    const fallback = baseDataset();
    delete process.env.DATABASE_URL;
    resetCoursePortalStoreCacheForTests();

    const store = getCoursePortalStore({
      jsonFilePath: path.join(os.tmpdir(), 'missing-openmaic-catalog.json'),
      fallbackDataset: fallback,
      normalizeDataset: (dataset) => ({ ...baseDataset(), ...dataset }),
    });

    await expect(store.readDataset()).resolves.toMatchObject({
      organizations: [{ id: 'org-a' }, { id: 'org-b' }],
    });
  });

  it('writes normalized datasets through the Postgres store with a mocked client', async () => {
    const { PostgresCoursePortalStore } =
      await import('@/lib/server/course-portal-store/postgres-store');
    const calls: Array<{ query?: string; values?: unknown[]; helper?: unknown }> = [];

    function makeSql() {
      const sql = vi.fn((first: unknown, ...values: unknown[]) => {
        if (Array.isArray(first) && 'raw' in first) {
          calls.push({ query: first.join('?'), values });
          return Promise.resolve([]);
        }
        calls.push({ helper: first });
        return { helper: first };
      });
      Object.assign(sql, {
        unsafe: (value: string) => ({ unsafe: value }),
        begin: async (callback: (transactionSql: typeof sql) => Promise<unknown>) => callback(sql),
        end: vi.fn(),
      });
      return sql;
    }

    const sql = makeSql();
    const store = new PostgresCoursePortalStore({
      sql: sql as never,
      normalizeDataset: (dataset) => ({
        ...baseDataset(),
        ...dataset,
        passwordResetTokens: dataset.passwordResetTokens || [],
        accountInvitations: dataset.accountInvitations || [],
        emailVerificationTokens: dataset.emailVerificationTokens || [],
        authAuditEvents: dataset.authAuditEvents || [],
      }),
    });

    await store.writeDataset(baseDataset());

    expect(calls.some((call) => call.query?.includes('delete from portal_users'))).toBe(true);
    expect(
      calls.some((call) =>
        call.values?.some((value) => (value as { unsafe?: string }).unsafe === 'organizations'),
      ),
    ).toBe(true);
    expect(
      calls.some((call) =>
        call.values?.some((value) => (value as { unsafe?: string }).unsafe === 'portal_users'),
      ),
    ).toBe(true);
  });
});
