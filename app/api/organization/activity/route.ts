import { apiError, apiSuccess } from '@/lib/server/api-response';
import { trackStudentActivity } from '@/lib/server/course-portal-data';
import {
  canAccessOrganization,
  getCurrentPortalSession,
  isStudent,
} from '@/lib/server/organization-session';

export async function POST(request: Request) {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');

  let body: {
    organizationId?: string;
    studentId?: string;
    courseId?: string;
    action?: string;
    metadata?: Record<string, unknown>;
    progressPercentage?: number;
  };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const organizationId = body.organizationId || session.user.organizationId;
  if (!organizationId || !body.action) {
    return apiError('INVALID_REQUEST', 400, 'organizationId and action are required.');
  }
  if (!canAccessOrganization(session.user, organizationId)) {
    return apiError('INVALID_REQUEST', 403, 'Organization access denied.');
  }
  if (isStudent(session.user) && body.studentId && body.studentId !== session.user.studentId) {
    return apiError('INVALID_REQUEST', 403, 'Students can only track their own activity.');
  }
  const studentId = isStudent(session.user) ? session.user.studentId : body.studentId;

  const activity = await trackStudentActivity({
    organizationId,
    studentId,
    courseId: body.courseId,
    action: body.action,
    metadata: body.metadata,
    progressPercentage: body.progressPercentage,
  });

  if ('error' in activity) return apiError('INVALID_REQUEST', 400, activity.error);
  return apiSuccess({ activity }, 201);
}
