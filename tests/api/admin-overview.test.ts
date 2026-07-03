import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/admin/overview/route';

const mocks = vi.hoisted(() => ({
  getCurrentPortalSession: vi.fn(),
  readAdminOverview: vi.fn(),
}));

vi.mock('@/lib/server/organization-session', () => ({
  getCurrentPortalSession: mocks.getCurrentPortalSession,
  isPlatformAdmin: (user: { role: string }) => user.role === 'platform-admin',
}));

vi.mock('@/lib/server/admin-dashboard', () => ({
  readAdminOverview: mocks.readAdminOverview,
}));

describe('admin overview API', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.readAdminOverview).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Authentication required.',
    });
  });

  it('requires a platform admin session', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-esilv-admin', role: 'organization-admin', organizationId: 'org-esilv' },
    });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mocks.readAdminOverview).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Platform admin required.',
    });
  });

  it('returns the overview for platform admins', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-platform-admin', role: 'platform-admin' },
    });
    mocks.readAdminOverview.mockResolvedValue({
      school: { id: 'school-lc-demo', name: 'LC Academy', plan: 'Pilot cohort' },
      course: {
        id: 'course-ai-intro',
        title: 'Introduction to Artificial Intelligence',
        moduleCount: 0,
        modules: [],
      },
      students: [],
      generatedAt: '2026-07-03T08:00:00.000Z',
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.readAdminOverview).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      overview: {
        school: { id: 'school-lc-demo' },
      },
    });
  });
});
