import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  getOrganizationById,
  listVisibleOrganizationStudentSummaries,
} from '@/lib/server/course-portal-data';
import {
  canAccessOrganization,
  canViewStudentManagement,
  getCurrentPortalSession,
} from '@/lib/server/organization-session';

export async function GET(request: Request) {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');

  const url = new URL(request.url);
  const organizationId = url.searchParams.get('organizationId') || session.user.organizationId;
  if (!organizationId) return apiError('INVALID_REQUEST', 400, 'organizationId is required.');
  if (!canAccessOrganization(session.user, organizationId)) {
    return apiError('INVALID_REQUEST', 403, 'Organization access denied.');
  }

  const organization = await getOrganizationById(organizationId);
  if (!organization) return apiError('INVALID_REQUEST', 404, 'Organization not found.');
  if (!canViewStudentManagement(session.user, organization.id)) {
    return apiError('INVALID_REQUEST', 403, 'Student management is not allowed.');
  }

  const students = await listVisibleOrganizationStudentSummaries(session.user, organization.id);
  return apiSuccess({ organization, students });
}
