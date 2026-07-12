import { afterEach, describe, expect, it, vi } from 'vitest';
import { DELETE } from '@/app/api/admin/organizations/[organizationId]/route';

const mocks = vi.hoisted(() => ({
  deleteOrganization: vi.fn(),
  getCurrentPortalSession: vi.fn(),
  getOrganizationById: vi.fn(),
}));

vi.mock('@/lib/server/organization-session', () => ({
  getCurrentPortalSession: mocks.getCurrentPortalSession,
  isPlatformAdmin: (user: { role: string }) => user.role === 'platform-admin',
}));

vi.mock('@/lib/server/course-portal-data', () => ({
  deleteOrganization: mocks.deleteOrganization,
  getOrganizationById: mocks.getOrganizationById,
}));

function request(confirmationName: unknown) {
  return new Request('http://localhost/api/admin/organizations/org-esilv', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmationName }),
  });
}

const context = { params: Promise.resolve({ organizationId: 'org-esilv' }) };

describe('admin organization deletion API', () => {
  afterEach(() => vi.clearAllMocks());

  it('requires a platform admin', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-esilv-admin', role: 'organization-admin', organizationId: 'org-esilv' },
    });

    const response = await DELETE(request('ESILV'), context);

    expect(response.status).toBe(403);
    expect(mocks.deleteOrganization).not.toHaveBeenCalled();
  });

  it('requires an exact organization name confirmation', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-platform-admin', role: 'platform-admin' },
    });
    mocks.getOrganizationById.mockResolvedValue({ id: 'org-esilv', name: 'ESILV' });

    const response = await DELETE(request('esilv'), context);

    expect(response.status).toBe(400);
    expect(mocks.deleteOrganization).not.toHaveBeenCalled();
  });

  it('deletes a confirmed organization', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-platform-admin', role: 'platform-admin' },
    });
    const organization = { id: 'org-esilv', name: 'ESILV' };
    mocks.getOrganizationById.mockResolvedValue(organization);
    mocks.deleteOrganization.mockResolvedValue({ organization });

    const response = await DELETE(request('ESILV'), context);

    expect(response.status).toBe(200);
    expect(mocks.deleteOrganization).toHaveBeenCalledWith('org-esilv');
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      deletedOrganizationId: 'org-esilv',
    });
  });
});
