import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getVisibleOrganizationStudentDetail } from '@/lib/server/course-portal-data';
import { canAccessOrganization, getCurrentPortalSession } from '@/lib/server/organization-session';

export async function GET(request: Request, context: { params: Promise<{ studentId: string }> }) {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');

  const { studentId } = await context.params;
  const url = new URL(request.url);
  const organizationId = url.searchParams.get('organizationId') || session.user.organizationId;
  if (!organizationId) return apiError('INVALID_REQUEST', 400, 'organizationId is required.');
  if (!canAccessOrganization(session.user, organizationId)) {
    return apiError('INVALID_REQUEST', 403, 'Organization access denied.');
  }

  const detail = await getVisibleOrganizationStudentDetail(session.user, organizationId, studentId);
  if (!detail) return apiError('INVALID_REQUEST', 404, 'Student not found for this organization.');

  return apiSuccess({ detail });
}
