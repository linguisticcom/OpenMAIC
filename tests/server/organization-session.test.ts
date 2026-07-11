import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canManageAccessCodes,
  loginPortalUser,
  verifyPortalPasswordHash,
} from '@/lib/server/organization-session';
import { hashLegacyPortalPassword } from '@/lib/server/password-hashing';
import type { PortalUser } from '@/lib/types/course-portal';

const mocks = vi.hoisted(() => ({
  cookieSet: vi.fn(),
  getOrganizationById: vi.fn(),
  getPortalUserByEmail: vi.fn(),
  getPortalUserById: vi.fn(),
  markPortalUserLoggedIn: vi.fn(),
  updatePortalUserPasswordHash: vi.fn(),
}));

vi.mock('@/lib/server/course-portal-data', () => ({
  getOrganizationById: mocks.getOrganizationById,
  getPortalUserByEmail: mocks.getPortalUserByEmail,
  getPortalUserById: mocks.getPortalUserById,
  markPortalUserLoggedIn: mocks.markPortalUserLoggedIn,
  updatePortalUserPasswordHash: mocks.updatePortalUserPasswordHash,
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: mocks.cookieSet,
    delete: vi.fn(),
    get: vi.fn(),
  })),
}));

const baseUser: PortalUser = {
  id: 'user-test',
  organizationId: 'org-school',
  name: 'Test User',
  email: 'user@example.edu',
  passwordHash: 'hashed',
  role: 'organization-admin',
  createdAt: '2026-07-03T08:00:00.000Z',
  updatedAt: '2026-07-03T08:00:00.000Z',
};

const originalOrganizationSessionSecret = process.env.ORGANIZATION_SESSION_SECRET;
const originalCourseAccessSecret = process.env.COURSE_ACCESS_SECRET;
const originalAccessCode = process.env.ACCESS_CODE;

function user(overrides: Partial<PortalUser>): PortalUser {
  return { ...baseUser, ...overrides };
}

function clearOrganizationSessionSecrets() {
  delete process.env.ORGANIZATION_SESSION_SECRET;
  delete process.env.COURSE_ACCESS_SECRET;
  delete process.env.ACCESS_CODE;
}

describe('organization session role gates', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    if (originalOrganizationSessionSecret === undefined) {
      delete process.env.ORGANIZATION_SESSION_SECRET;
    } else {
      process.env.ORGANIZATION_SESSION_SECRET = originalOrganizationSessionSecret;
    }
    if (originalCourseAccessSecret === undefined) {
      delete process.env.COURSE_ACCESS_SECRET;
    } else {
      process.env.COURSE_ACCESS_SECRET = originalCourseAccessSecret;
    }
    if (originalAccessCode === undefined) {
      delete process.env.ACCESS_CODE;
    } else {
      process.env.ACCESS_CODE = originalAccessCode;
    }
  });

  it('limits access-code management to admins and permitted teacher managers', () => {
    expect(
      canManageAccessCodes(user({ role: 'platform-admin', organizationId: undefined }), 'org-psb'),
    ).toBe(true);
    expect(canManageAccessCodes(user({ role: 'organization-admin' }), 'org-school')).toBe(true);
    expect(
      canManageAccessCodes(
        user({ role: 'teacher-manager', canGenerateAccessCodes: true }),
        'org-school',
      ),
    ).toBe(true);

    expect(canManageAccessCodes(user({ role: 'teacher-manager' }), 'org-school')).toBe(false);
    expect(
      canManageAccessCodes(user({ role: 'student', canGenerateAccessCodes: true }), 'org-school'),
    ).toBe(false);
    expect(
      canManageAccessCodes(
        user({ role: 'teacher-manager', canGenerateAccessCodes: true }),
        'org-other',
      ),
    ).toBe(false);
  });

  it('verifies portal passwords with fixed-length hex password hashes', () => {
    const passwordHash = hashLegacyPortalPassword('openmaic-demo');

    expect(verifyPortalPasswordHash(passwordHash, 'openmaic-demo')).toBe(true);
    expect(verifyPortalPasswordHash(passwordHash, 'wrong-password')).toBe(false);
    expect(verifyPortalPasswordHash('not-a-valid-hash', 'openmaic-demo')).toBe(false);
    expect(verifyPortalPasswordHash(`${passwordHash}00`, 'openmaic-demo')).toBe(false);
  });

  it('issues a session for valid credentials and rejects invalid passwords', async () => {
    process.env.ORGANIZATION_SESSION_SECRET = 'test-organization-session-secret';
    const esilvAdmin = user({
      id: 'user-esilv-admin',
      organizationId: 'org-esilv',
      email: 'admin@esilv.local',
      passwordHash: hashLegacyPortalPassword('openmaic-demo'),
    });
    mocks.getPortalUserByEmail.mockResolvedValue(esilvAdmin);
    mocks.markPortalUserLoggedIn.mockResolvedValue(esilvAdmin);
    mocks.getOrganizationById.mockResolvedValue({ id: 'org-esilv', name: 'ESILV' });

    const valid = await loginPortalUser({
      email: 'admin@esilv.local',
      password: 'openmaic-demo',
    });

    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.session.user.id).toBe('user-esilv-admin');
      expect(valid.session.organization?.id).toBe('org-esilv');
    }
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      'openmaic_org_session',
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );

    mocks.cookieSet.mockClear();

    await expect(
      loginPortalUser({
        email: 'admin@esilv.local',
        password: 'wrong-password',
      }),
    ).resolves.toEqual({ ok: false, error: 'Invalid email or password.' });
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it('requires a real signing secret before issuing production organization sessions', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    clearOrganizationSessionSecrets();
    const esilvAdmin = user({
      id: 'user-esilv-admin',
      organizationId: 'org-esilv',
      email: 'admin@esilv.local',
      passwordHash: hashLegacyPortalPassword('openmaic-demo'),
    });
    mocks.getPortalUserByEmail.mockResolvedValue(esilvAdmin);
    mocks.markPortalUserLoggedIn.mockResolvedValue(esilvAdmin);
    mocks.getOrganizationById.mockResolvedValue({ id: 'org-esilv', name: 'ESILV' });

    await expect(
      loginPortalUser({
        email: 'admin@esilv.local',
        password: 'openmaic-demo',
      }),
    ).rejects.toThrow(
      'ORGANIZATION_SESSION_SECRET, COURSE_ACCESS_SECRET, or ACCESS_CODE must be set',
    );
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });
});
