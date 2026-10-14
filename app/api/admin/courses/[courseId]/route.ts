import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  deleteGlobalCourse,
  updateGlobalCourseAccessMode,
  updateGlobalCourseStatus,
} from '@/lib/server/course-portal-data';
import { getCurrentPortalSession, isPlatformAdmin } from '@/lib/server/organization-session';

export async function PATCH(request: Request, context: { params: Promise<{ courseId: string }> }) {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');
  if (!isPlatformAdmin(session.user))
    return apiError('INVALID_REQUEST', 403, 'Platform admin required.');

  let body: Partial<Record<'status' | 'accessMode', unknown>>;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  if (body.status !== undefined && typeof body.status !== 'string') {
    return apiError('INVALID_REQUEST', 400, 'status must be a string.');
  }
  if (
    body.accessMode !== undefined &&
    (typeof body.accessMode !== 'string' || !['open', 'code'].includes(body.accessMode))
  ) {
    return apiError('INVALID_REQUEST', 400, 'accessMode must be "open" or "code".');
  }
  if (!body.status && !body.accessMode) {
    return apiError('INVALID_REQUEST', 400, 'status is required.');
  }

  const { courseId } = await context.params;

  // Learner access is independent of publishing state: a course can be active
  // and open, or active and code-protected. Only the fields actually supplied
  // are written, so the two controls never clobber each other.
  let result: Awaited<ReturnType<typeof updateGlobalCourseStatus>> = { error: 'Course not found.' };
  if (body.accessMode) {
    result = await updateGlobalCourseAccessMode({
      courseId,
      accessMode: body.accessMode as string,
    });
    if ('error' in result) return apiError('INVALID_REQUEST', 400, result.error);
  }
  if (body.status) {
    result = await updateGlobalCourseStatus({ courseId, status: body.status as string });
    if ('error' in result) return apiError('INVALID_REQUEST', 400, result.error);
  }

  return apiSuccess({ course: result });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ courseId: string }> },
) {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');
  if (!isPlatformAdmin(session.user))
    return apiError('INVALID_REQUEST', 403, 'Platform admin required.');

  const { courseId } = await context.params;
  const result = await deleteGlobalCourse({ courseId });
  if ('error' in result) return apiError('INVALID_REQUEST', 400, result.error);

  return apiSuccess(result);
}
