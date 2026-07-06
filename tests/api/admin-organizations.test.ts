import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/admin/organizations/route';

const mocks = vi.hoisted(() => ({
  getCurrentPortalSession: vi.fn(),
  createOrganizationWithAdmin: vi.fn(),
  getOrganizationDashboardSummary: vi.fn(),
  listOrganizationAdminUsers: vi.fn(),
  listOrganizations: vi.fn(),
  sendAuthEmail: vi.fn(),
}));

vi.mock('@/lib/server/organization-session', () => ({
  getCurrentPortalSession: mocks.getCurrentPortalSession,
  isPlatformAdmin: (user: { role: string }) => user.role === 'platform-admin',
}));

vi.mock('@/lib/server/course-portal-data', () => ({
  createOrganizationWithAdmin: mocks.createOrganizationWithAdmin,
  getOrganizationDashboardSummary: mocks.getOrganizationDashboardSummary,
  listOrganizationAdminUsers: mocks.listOrganizationAdminUsers,
  listOrganizations: mocks.listOrganizations,
}));

vi.mock('@/lib/server/email', () => ({
  sendAuthEmail: mocks.sendAuthEmail,
}));

function request(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/organizations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin organizations API', () => {
  beforeEach(() => {
    mocks.sendAuthEmail.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requires a platform admin session before listing organizations', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-esilv-admin', role: 'organization-admin', organizationId: 'org-esilv' },
    });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mocks.listOrganizations).not.toHaveBeenCalled();
  });

  it('lists organization accounts with summaries and sanitized admin users', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-platform-admin', role: 'platform-admin' },
    });
    mocks.listOrganizations.mockResolvedValue([
      {
        id: 'org-esilv',
        name: 'ESILV',
        slug: 'esilv',
        contactEmail: 'learning-admin@esilv.example',
      },
    ]);
    mocks.getOrganizationDashboardSummary.mockResolvedValue({
      activeCourses: 2,
      enrolledStudents: 18,
      activeAccessCodes: 4,
      averageCompletionRate: 64,
    });
    mocks.listOrganizationAdminUsers.mockResolvedValue([
      {
        id: 'user-esilv-admin',
        organizationId: 'org-esilv',
        name: 'ESILV Admin',
        email: 'admin@esilv.example',
        role: 'organization-admin',
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.getOrganizationDashboardSummary).toHaveBeenCalledWith('org-esilv');
    expect(mocks.listOrganizationAdminUsers).toHaveBeenCalledWith('org-esilv');
    const payload = await response.json();
    expect(payload).toMatchObject({
      success: true,
      organizations: [
        {
          id: 'org-esilv',
          summary: {
            activeCourses: 2,
            enrolledStudents: 18,
            activeAccessCodes: 4,
            averageCompletionRate: 64,
          },
          adminUsers: [
            {
              id: 'user-esilv-admin',
              role: 'organization-admin',
              email: 'admin@esilv.example',
            },
          ],
        },
      ],
    });
    expect(JSON.stringify(payload)).not.toContain('passwordHash');
    expect(JSON.stringify(payload)).not.toContain('secret-hash');
  });

  it('requires a platform admin session before creating organizations', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-esilv-admin', role: 'organization-admin', organizationId: 'org-esilv' },
    });

    const response = await POST(request({ name: 'New School' }));

    expect(response.status).toBe(403);
    expect(mocks.createOrganizationWithAdmin).not.toHaveBeenCalled();
  });

  it('creates an organization with its first admin user and emails the login details', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-platform-admin', role: 'platform-admin' },
    });
    mocks.createOrganizationWithAdmin.mockResolvedValue({
      organization: {
        id: 'org-new-school',
        name: 'New School',
        slug: 'new-school',
        contactEmail: 'contact@new-school.example',
        subscriptionStatus: 'trial',
      },
      adminUser: {
        id: 'user-new-school-admin',
        organizationId: 'org-new-school',
        name: 'New School Admin',
        email: 'admin@new-school.example',
        role: 'organization-admin',
      },
    });

    const response = await POST(
      request({
        name: 'New School',
        slug: 'new-school',
        description: 'Client institution.',
        contactEmail: 'contact@new-school.example',
        adminName: 'New School Admin',
        adminEmail: 'admin@new-school.example',
        adminPassword: 'temporary-demo-password',
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.createOrganizationWithAdmin).toHaveBeenCalledWith({
      name: 'New School',
      slug: 'new-school',
      logoUrl: undefined,
      description: 'Client institution.',
      contactEmail: 'contact@new-school.example',
      subscriptionStatus: undefined,
      welcomeMessage: undefined,
      adminName: 'New School Admin',
      adminEmail: 'admin@new-school.example',
      adminPassword: 'temporary-demo-password',
    });
    expect(mocks.sendAuthEmail).toHaveBeenCalledWith({
      to: 'admin@new-school.example',
      subject: 'LC Academy admin account for New School',
      text: expect.stringContaining('Temporary password: temporary-demo-password'),
    });
    expect(mocks.sendAuthEmail.mock.calls[0][0].text).toContain(
      'Login URL: http://localhost/login',
    );
    expect(mocks.sendAuthEmail.mock.calls[0][0].text).toContain(
      'Organization portal: http://localhost/u/new-school',
    );
    const payload = await response.json();
    expect(payload).toMatchObject({
      success: true,
      adminWelcomeEmailSent: true,
      organization: { id: 'org-new-school' },
      adminUser: { id: 'user-new-school-admin', role: 'organization-admin' },
    });
    expect(JSON.stringify(payload)).not.toContain('passwordHash');
  });

  it('rejects malformed organization creation fields before calling the data layer', async () => {
    mocks.getCurrentPortalSession.mockResolvedValue({
      user: { id: 'user-platform-admin', role: 'platform-admin' },
    });

    const response = await POST(
      request({
        name: { value: 'New School' },
        description: 'Client institution.',
        contactEmail: 'contact@new-school.example',
        adminName: 'New School Admin',
        adminEmail: 'admin@new-school.example',
        adminPassword: 'temporary-demo-password',
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.createOrganizationWithAdmin).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Organization creation fields must be strings.',
    });
  });
});
