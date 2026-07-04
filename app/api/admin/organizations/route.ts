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

  let body: Partial<
    Record<
      | 'name'
      | 'slug'
      | 'logoUrl'
      | 'description'
      | 'contactEmail'
      | 'subscriptionStatus'
      | 'welcomeMessage'
      | 'adminName'
      | 'adminEmail'
      | 'adminPassword',
      unknown
    >
  >;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const stringField = (field: keyof typeof body): { value?: string; error?: Response } => {
    const value = body[field];
    if (value === undefined) return {};
    if (typeof value !== 'string') {
      return {
        error: apiError('INVALID_REQUEST', 400, 'Organization creation fields must be strings.'),
      };
    }
    return { value };
  };

  const nameField = stringField('name');
  const slugField = stringField('slug');
  const logoUrlField = stringField('logoUrl');
  const descriptionField = stringField('description');
  const contactEmailField = stringField('contactEmail');
  const subscriptionStatusField = stringField('subscriptionStatus');
  const welcomeMessageField = stringField('welcomeMessage');
  const adminNameField = stringField('adminName');
  const adminEmailField = stringField('adminEmail');
  const adminPasswordField = stringField('adminPassword');
  const fieldError =
    nameField.error ||
    slugField.error ||
    logoUrlField.error ||
    descriptionField.error ||
    contactEmailField.error ||
    subscriptionStatusField.error ||
    welcomeMessageField.error ||
    adminNameField.error ||
    adminEmailField.error ||
    adminPasswordField.error;
  if (fieldError) return fieldError;

  const result = await createOrganizationWithAdmin({
    name: nameField.value,
    slug: slugField.value,
    logoUrl: logoUrlField.value,
    description: descriptionField.value,
    contactEmail: contactEmailField.value,
    subscriptionStatus: subscriptionStatusField.value,
    welcomeMessage: welcomeMessageField.value,
    adminName: adminNameField.value,
    adminEmail: adminEmailField.value,
    adminPassword: adminPasswordField.value,
  });

  if ('error' in result) return apiError('INVALID_REQUEST', 400, result.error);
  return apiSuccess(result, 201);
}
