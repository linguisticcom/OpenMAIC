import { afterEach, describe, expect, it, vi } from 'vitest';
import { PATCH } from '@/app/api/organization/settings/route';

const mocks = vi.hoisted(() => ({
  getCurrentPortalSession: vi.fn(),
  updateOrganizationSettings: vi.fn(),
}));

vi.mock('@/lib/server/organization-session', () => ({
  getCurrentPortalSession: mocks.getCurrentPortalSession,
  canAccessOrganization: (
    user: { role: string; organizationId?: string },
    organizationId: string,
  ) => user.role === 'platform-admin' || user.organizationId === organizationId,
  isOrganizationAdmin: (user: { role: string }) => user.role === 'organization-admin',
  isPlatformAdmin: (user: { role: string }) => user.role === 'platform-admin',
}));

vi.mock('@/lib/server/course-portal-data', () => ({
  updateOrganizationSettings: mocks.updateOrganizationSettings,
}));

function request(body: Record<string, unknown>) {
  return new Request('http://localhost/api/organization/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('organization settings API', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('allows platform admins to update organization settings for any tenant', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: {
        id: 'user-platform-admin',
        name: 'Linguistic Communication Academy Platform Admin',
        email: 'platform@openmaic.local',
        role: 'platform-admin',
      },
    });
    mocks.updateOrganizationSettings.mockResolvedValue({
      id: 'org-psb',
      name: 'Paris School of Business',
      slug: 'psb',
      contactEmail: 'faculty-success@psb.example',
      description: 'Business-focused AI literacy and product strategy courses.',
    });

    const response = await PATCH(
      request({
        organizationId: 'org-psb',
        name: 'Paris School of Business',
        contactEmail: 'faculty-success@psb.example',
        description: 'Business-focused AI literacy and product strategy courses.',
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.updateOrganizationSettings).toHaveBeenCalledWith({
      organizationId: 'org-psb',
      name: 'Paris School of Business',
      logoUrl: undefined,
      description: 'Business-focused AI literacy and product strategy courses.',
      contactEmail: 'faculty-success@psb.example',
      welcomeMessage: undefined,
    });
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      organization: {
        id: 'org-psb',
        name: 'Paris School of Business',
      },
    });
  });

  it('rejects malformed settings fields before updating the tenant', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: {
        id: 'user-psb-admin',
        name: 'PSB Learning Admin',
        email: 'admin@psb.local',
        role: 'organization-admin',
        organizationId: 'org-psb',
      },
    });

    const response = await PATCH(
      request({
        organizationId: 'org-psb',
        name: 'Paris School of Business',
        contactEmail: { address: 'faculty-success@psb.example' },
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.updateOrganizationSettings).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Organization settings fields must be strings.',
    });
  });

  it('rejects malformed organization ids before the access check', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: {
        id: 'user-platform-admin',
        name: 'Linguistic Communication Academy Platform Admin',
        email: 'platform@openmaic.local',
        role: 'platform-admin',
      },
    });

    const response = await PATCH(
      request({
        organizationId: ['org-psb'],
        name: 'Paris School of Business',
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.updateOrganizationSettings).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Organization settings fields must be strings.',
    });
  });
});
