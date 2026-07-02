import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getVisibleOrganizationCourseDetail } from '@/lib/server/course-portal-data';
import { canAccessOrganization, getCurrentPortalSession } from '@/lib/server/organization-session';

export async function GET(request: Request, context: { params: Promise<{ courseId: string }> }) {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');

  const { courseId } = await context.params;
  const url = new URL(request.url);
  const organizationId = url.searchParams.get('organizationId') || session.user.organizationId;
  if (!organizationId) return apiError('INVALID_REQUEST', 400, 'organizationId is required.');
  if (!canAccessOrganization(session.user, organizationId)) {
    return apiError('INVALID_REQUEST', 403, 'Organization access denied.');
  }

  const detail = await getVisibleOrganizationCourseDetail(session.user, organizationId, courseId);
  if (!detail) return apiError('INVALID_REQUEST', 404, 'Course not found for this organization.');

  return apiSuccess({ detail });
}
