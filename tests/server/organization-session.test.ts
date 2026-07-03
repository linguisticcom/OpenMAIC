import { describe, expect, it } from 'vitest';
import { canManageAccessCodes } from '@/lib/server/organization-session';
import type { PortalUser } from '@/lib/types/course-portal';

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

function user(overrides: Partial<PortalUser>): PortalUser {
  return { ...baseUser, ...overrides };
}

describe('organization session role gates', () => {
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
});
