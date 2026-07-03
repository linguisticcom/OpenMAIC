import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  createOrganizationWithAdmin,
  getOrganizationDashboardSummary,
  listOrganizationAdminUsers,
  listOrganizations,
} from '@/lib/server/course-portal-data';
import { getCurrentPortalSession, isPlatformAdmin } from '@/lib/server/organization-session';

export async function GET() {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');
  if (!isPlatformAdmin(session.user)) {
    return apiError('INVALID_REQUEST', 403, 'Platform admin required.');
  }

  const organizations = await listOrganizations();
  const [summaries, adminUsersByOrganization] = await Promise.all([
    Promise.all(
      organizations.map((organization) => getOrganizationDashboardSummary(organization.id)),
    ),
    Promise.all(organizations.map((organization) => listOrganizationAdminUsers(organization.id))),
  ]);

  return apiSuccess({
    organizations: organizations.map((organization, index) => ({
      ...organization,
      summary: summaries[index]
        ? {
            activeCourses: summaries[index].activeCourses,
            enrolledStudents: summaries[index].enrolledStudents,
            activeAccessCodes: summaries[index].activeAccessCodes,
            averageCompletionRate: summaries[index].averageCompletionRate,
          }
        : undefined,
      adminUsers: adminUsersByOrganization[index],
    })),
  });
}

export async function POST(request: Request) {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');
  if (!isPlatformAdmin(session.user)) {
    return apiError('INVALID_REQUEST', 403, 'Platform admin required.');
  }

  let body: {
    name?: string;
    slug?: string;
    logoUrl?: string;
    description?: string;
    contactEmail?: string;
    subscriptionStatus?: string;
    welcomeMessage?: string;
    adminName?: string;
    adminEmail?: string;
    adminPassword?: string;
  };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const result = await createOrganizationWithAdmin({
    name: body.name,
    slug: body.slug,
    logoUrl: body.logoUrl,
    description: body.description,
    contactEmail: body.contactEmail,
    subscriptionStatus: body.subscriptionStatus,
    welcomeMessage: body.welcomeMessage,
    adminName: body.adminName,
    adminEmail: body.adminEmail,
    adminPassword: body.adminPassword,
  });

  if ('error' in result) return apiError('INVALID_REQUEST', 400, result.error);
  return apiSuccess(result, 201);
}
