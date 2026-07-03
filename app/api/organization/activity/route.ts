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
  let body: {
    organizationId?: string;
    studentId?: string;
    courseId?: string;
    cohortId?: string;
    action?: string;
    metadata?: Record<string, unknown>;
    progressPercentage?: number;
  };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const session = await getCurrentPortalSession();
  const organizationId = body.organizationId || session?.user.organizationId;
  if (!organizationId || !body.action) {
    return apiError('INVALID_REQUEST', 400, 'organizationId and action are required.');
  }

  let studentId: string | undefined;

  if (session) {
    if (!canAccessOrganization(session.user, organizationId)) {
      return apiError('INVALID_REQUEST', 403, 'Organization access denied.');
    }
    if (isStudent(session.user) && body.studentId && body.studentId !== session.user.studentId) {
      return apiError('INVALID_REQUEST', 403, 'Students can only track their own activity.');
    }
    studentId = isStudent(session.user) ? session.user.studentId : body.studentId;
    if (isTeacherManager(session.user)) {
      if (body.courseId) {
        const courseDetail = await getVisibleOrganizationCourseDetail(
          session.user,
          organizationId,
          body.courseId,
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
    if (!body.courseId) {
      return apiError('INVALID_REQUEST', 401, 'Authentication or course access is required.');
    }

    const cookieStore = await cookies();
    const accessPayload = verifyCourseAccessToken(
      cookieStore.get(getCourseAccessCookieName(body.courseId, organizationId, body.cohortId))
        ?.value,
      {
        courseId: body.courseId,
        universityId: organizationId,
        cohortId: body.cohortId,
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
      courseId: body.courseId,
      cohortId: body.cohortId,
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
    courseId: body.courseId,
    action: body.action,
    metadata: body.metadata,
    progressPercentage: body.progressPercentage,
  });

  if ('error' in activity) return apiError('INVALID_REQUEST', 400, activity.error);
  return apiSuccess({ activity }, 201);
}
