import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  assignCourseToOrganization,
  getCoursePortalDataset,
} from '@/lib/server/course-portal-data';
import { getCurrentPortalSession, isPlatformAdmin } from '@/lib/server/organization-session';

export async function GET() {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');
  if (!isPlatformAdmin(session.user))
    return apiError('INVALID_REQUEST', 403, 'Platform admin required.');

  const dataset = await getCoursePortalDataset();
  return apiSuccess({
    assignments: dataset.assignments,
    organizations: dataset.organizations,
    courses: dataset.courses,
    cohorts: dataset.cohorts,
  });
}

export async function POST(request: Request) {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');
  if (!isPlatformAdmin(session.user))
    return apiError('INVALID_REQUEST', 403, 'Platform admin required.');

  let body: {
    organizationId?: string;
    courseId?: string;
    cohortId?: string;
    teacherUserId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  if (!body.organizationId || !body.courseId) {
    return apiError('INVALID_REQUEST', 400, 'organizationId and courseId are required.');
  }

  const assignment = await assignCourseToOrganization({
    organizationId: body.organizationId,
    courseId: body.courseId,
    cohortId: body.cohortId || undefined,
    teacherUserId: body.teacherUserId || undefined,
    assignedByUserId: session.user.id,
  });

  if ('error' in assignment) return apiError('INVALID_REQUEST', 400, assignment.error);
  return apiSuccess({ assignment }, 201);
}
