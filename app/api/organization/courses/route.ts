import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  getOrganizationById,
  listVisibleOrganizationCourseSummaries,
} from '@/lib/server/course-portal-data';
import { canAccessOrganization, getCurrentPortalSession } from '@/lib/server/organization-session';

export async function GET(request: Request) {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');

  const url = new URL(request.url);
  const requestedOrganizationId =
    url.searchParams.get('organizationId') || session.user.organizationId;
  if (!requestedOrganizationId) {
    return apiError('INVALID_REQUEST', 400, 'organizationId is required for platform admins.');
  }

  if (!canAccessOrganization(session.user, requestedOrganizationId)) {
    return apiError('INVALID_REQUEST', 403, 'Organization access denied.');
  }

  const organization = await getOrganizationById(requestedOrganizationId);
  if (!organization) return apiError('INVALID_REQUEST', 404, 'Organization not found.');

  const courses = await listVisibleOrganizationCourseSummaries(session.user, organization.id);
  return apiSuccess({ organization, courses });
}
