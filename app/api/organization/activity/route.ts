import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getCourseAccessCookieName, verifyCourseAccessToken } from '@/lib/server/course-access';
import {
  getVisibleOrganizationCourseDetail,
  getVisibleOrganizationStudentDetail,
  isCourseAccessSessionValid,
  trackStudentActivity,
} from '@/lib/server/course-portal-data';
import {
  canAccessOrganization,
  getCurrentPortalSession,
  isTeacherManager,
  isStudent,
} from '@/lib/server/organization-session';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  let body: Partial<
    Record<
      | 'organizationId'
      | 'studentId'
      | 'courseId'
      | 'cohortId'
      | 'action'
      | 'metadata'
      | 'progressPercentage',
      unknown
    >
  >;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const stringField = (field: keyof typeof body): { value?: string; error?: Response } => {
    const value = body[field];
    if (value === undefined) return {};
    if (typeof value !== 'string') {
      return {
        error: apiError('INVALID_REQUEST', 400, 'Activity reference fields must be strings.'),
      };
    }
    return { value };
  };
  const organizationIdField = stringField('organizationId');
  const studentIdField = stringField('studentId');
  const courseIdField = stringField('courseId');
  const cohortIdField = stringField('cohortId');
  const fieldError =
    organizationIdField.error || studentIdField.error || courseIdField.error || cohortIdField.error;
  if (fieldError) return fieldError;

  if (
    body.progressPercentage !== undefined &&
    (typeof body.progressPercentage !== 'number' || !Number.isFinite(body.progressPercentage))
  ) {
    return apiError('INVALID_REQUEST', 400, 'Progress percentage must be a finite number.');
  }
  const progressPercentage =
    typeof body.progressPercentage === 'number' ? body.progressPercentage : undefined;

  const session = await getCurrentPortalSession();
  const organizationId = organizationIdField.value || session?.user.organizationId;
  if (!organizationId || body.action === undefined) {
    return apiError('INVALID_REQUEST', 400, 'organizationId and action are required.');
  }

  let studentId: string | undefined;

  if (session) {
    if (!canAccessOrganization(session.user, organizationId)) {
      return apiError('INVALID_REQUEST', 403, 'Organization access denied.');
    }
    if (
      isStudent(session.user) &&
      studentIdField.value &&
      studentIdField.value !== session.user.studentId
    ) {
      return apiError('INVALID_REQUEST', 403, 'Students can only track their own activity.');
    }
    studentId = isStudent(session.user) ? session.user.studentId : studentIdField.value;
    if (isTeacherManager(session.user)) {
      if (courseIdField.value) {
        const courseDetail = await getVisibleOrganizationCourseDetail(
          session.user,
          organizationId,
          courseIdField.value,
        );
        if (!courseDetail) {
          return apiError(
            'INVALID_REQUEST',
            403,
            'Course is not assigned to this teacher manager.',
          );
        }
      }
      if (studentId) {
        const studentDetail = await getVisibleOrganizationStudentDetail(
          session.user,
          organizationId,
          studentId,
        );
        if (!studentDetail) {
          return apiError(
            'INVALID_REQUEST',
            403,
            'Student is not assigned to this teacher manager.',
          );
        }
      }
    }
  } else {
    if (!courseIdField.value) {
      return apiError('INVALID_REQUEST', 401, 'Authentication or course access is required.');
    }

    const cookieStore = await cookies();
    const accessPayload = verifyCourseAccessToken(
      cookieStore.get(
        getCourseAccessCookieName(courseIdField.value, organizationId, cohortIdField.value),
      )?.value,
      {
        courseId: courseIdField.value,
        universityId: organizationId,
        cohortId: cohortIdField.value,
      },
    );

    if (!accessPayload) {
      return apiError('INVALID_REQUEST', 401, 'Authentication or course access is required.');
    }
    if (!accessPayload.studentId) {
      return apiError('INVALID_REQUEST', 403, 'Course access session cannot track a student.');
    }
    const accessSessionIsCurrent = await isCourseAccessSessionValid({
      organizationId,
      courseId: courseIdField.value,
      cohortId: cohortIdField.value,
      codeId: accessPayload.codeId,
      studentId: accessPayload.studentId,
      enrollmentId: accessPayload.enrollmentId,
    });
    if (!accessSessionIsCurrent) {
      return apiError('INVALID_REQUEST', 401, 'Authentication or course access is required.');
    }
    studentId = accessPayload.studentId;
  }

  const activity = await trackStudentActivity({
    organizationId,
    studentId,
    courseId: courseIdField.value,
    action: body.action,
    metadata: body.metadata,
    progressPercentage,
  });

  if ('error' in activity) return apiError('INVALID_REQUEST', 400, activity.error);
  return apiSuccess({ activity }, 201);
}
