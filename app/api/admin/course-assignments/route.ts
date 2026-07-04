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

  let body: Partial<Record<'organizationId' | 'courseId' | 'cohortId' | 'teacherUserId', unknown>>;
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
        error: apiError('INVALID_REQUEST', 400, 'Course assignment fields must be strings.'),
      };
    }
    return { value };
  };

  const organizationIdField = stringField('organizationId');
  const courseIdField = stringField('courseId');
  const cohortIdField = stringField('cohortId');
  const teacherUserIdField = stringField('teacherUserId');
  const fieldError =
    organizationIdField.error ||
    courseIdField.error ||
    cohortIdField.error ||
    teacherUserIdField.error;
  if (fieldError) return fieldError;

  if (!organizationIdField.value || !courseIdField.value) {
    return apiError('INVALID_REQUEST', 400, 'organizationId and courseId are required.');
  }

  const assignment = await assignCourseToOrganization({
    organizationId: organizationIdField.value,
    courseId: courseIdField.value,
    cohortId: cohortIdField.value || undefined,
    teacherUserId: teacherUserIdField.value || undefined,
    assignedByUserId: session.user.id,
  });

  if ('error' in assignment) return apiError('INVALID_REQUEST', 400, assignment.error);
  return apiSuccess({ assignment }, 201);
}
