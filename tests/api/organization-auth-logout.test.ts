import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/organization-auth/logout/route';

const mocks = vi.hoisted(() => ({
  logoutPortalUser: vi.fn(),
}));

vi.mock('@/lib/server/organization-session', () => ({
  logoutPortalUser: mocks.logoutPortalUser,
}));

describe('organization auth logout API', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('clears the current organization session', async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(mocks.logoutPortalUser).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      loggedOut: true,
    });
  });
});
