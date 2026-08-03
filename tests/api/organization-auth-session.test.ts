import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as login } from '@/app/api/organization-auth/login/route';
import { GET as getSession } from '@/app/api/organization-auth/session/route';

const mocks = vi.hoisted(() => ({
  getCurrentPortalSession: vi.fn(),
  loginPortalUser: vi.fn(),
}));

vi.mock('@/lib/server/organization-session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server/organization-session')>();
  return {
    ...actual,
    getCurrentPortalSession: mocks.getCurrentPortalSession,
    loginPortalUser: mocks.loginPortalUser,
  };
});

const organization = {
  id: 'org-esilv',
  name: 'ESILV',
  slug: 'esilv',
  description: 'Engineering school',
  contactEmail: 'learning-admin@esilv.example',
  createdAt: '2026-06-01T09:00:00.000Z',
  updatedAt: '2026-07-02T09:00:00.000Z',
};

const organizationAdmin = {
  id: 'user-esilv-admin',
  organizationId: 'org-esilv',
  name: 'ESILV Learning Admin',
  email: 'admin@esilv.local',
  passwordHash: 'secret-hash',
  role: 'organization-admin' as const,
  createdAt: '2026-06-01T09:15:00.000Z',
  updatedAt: '2026-07-02T09:00:00.000Z',
};

describe('organization auth session API', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns current session user data without password hashes', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: organizationAdmin,
      organization,
    });

    const response = await getSession();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      authenticated: true,
      user: {
        id: 'user-esilv-admin',
        organizationId: 'org-esilv',
        role: 'organization-admin',
      },
      organization: {
        id: 'org-esilv',
      },
    });
    expect(JSON.stringify(payload)).not.toContain('passwordHash');
    expect(JSON.stringify(payload)).not.toContain('secret-hash');
  });

  it('returns unauthenticated state without user data', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);

    const response = await getSession();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      authenticated: false,
    });
  });

  it('rejects malformed login credentials before calling the session helper', async () => {
    const response = await login(
      new Request('http://localhost/api/organization-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: { value: 'admin@esilv.local' },
          password: 'password',
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Email and password are required.',
    });
    expect(mocks.loginPortalUser).not.toHaveBeenCalled();
  });

  it('returns login session data without password hashes and routes org users to dashboard', async () => {
    mocks.loginPortalUser.mockResolvedValue({
      ok: true,
      session: {
        user: organizationAdmin,
        organization,
      },
    });

    const response = await login(
      new Request('http://localhost/api/organization-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@esilv.local',
          password: 'password',
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.loginPortalUser).toHaveBeenCalledWith({
      email: 'admin@esilv.local',
      password: 'password',
    });
    expect(payload).toMatchObject({
      success: true,
      dashboardUrl: '/dashboard',
      user: {
        id: 'user-esilv-admin',
        organizationId: 'org-esilv',
        role: 'organization-admin',
      },
    });
    expect(JSON.stringify(payload)).not.toContain('passwordHash');
    expect(JSON.stringify(payload)).not.toContain('secret-hash');
  });

  it('routes platform admins to platform organization management after login', async () => {
    mocks.loginPortalUser.mockResolvedValue({
      ok: true,
      session: {
        user: {
          ...organizationAdmin,
          id: 'user-platform-admin',
          organizationId: undefined,
          role: 'platform-admin',
        },
      },
    });

    const response = await login(
      new Request('http://localhost/api/organization-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'platform@openmaic.local',
          password: 'password',
        }),
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      success: true,
      dashboardUrl: '/admin',
      user: {
        id: 'user-platform-admin',
        role: 'platform-admin',
      },
    });
  });
});
