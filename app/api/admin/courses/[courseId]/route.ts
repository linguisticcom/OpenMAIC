import { apiError, apiSuccess } from '@/lib/server/api-response';
import { updateGlobalCourseStatus } from '@/lib/server/course-portal-data';
import { getCurrentPortalSession, isPlatformAdmin } from '@/lib/server/organization-session';

export async function PATCH(request: Request, context: { params: Promise<{ courseId: string }> }) {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');
  if (!isPlatformAdmin(session.user))
    return apiError('INVALID_REQUEST', 403, 'Platform admin required.');

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  if (!body.status) return apiError('INVALID_REQUEST', 400, 'status is required.');

  const { courseId } = await context.params;
  const result = await updateGlobalCourseStatus({ courseId, status: body.status });
  if ('error' in result) return apiError('INVALID_REQUEST', 400, result.error);

  return apiSuccess({ course: result });
}
