import { cookies } from 'next/headers';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createCourseAccessToken, getCourseAccessCookieName } from '@/lib/server/course-access';
import { consumeCourseAccessGrant } from '@/lib/server/course-portal-data';
import { getCurrentPortalSession, isStudent } from '@/lib/server/organization-session';
import type { CourseAccessValidationInput } from '@/lib/types/course-portal';
import { createLogger } from '@/lib/logger';

const log = createLogger('CourseAccess');

export async function POST(req: Request) {
  let courseId: string | undefined;
  let universityId: string | undefined;
  try {
    const body = (await req.json()) as Partial<CourseAccessValidationInput>;
    courseId = body.courseId;
    universityId = body.universityId;
    const session = await getCurrentPortalSession();
    const studentId = session && isStudent(session.user) ? session.user.studentId : undefined;

    const result = await consumeCourseAccessGrant({
      organizationId: body.organizationId,
      organizationSlug: body.organizationSlug,
      courseId: body.courseId,
      courseSlug: body.courseSlug,
      universityId: body.universityId,
      cohortId: body.cohortId || undefined,
      accessCode: body.accessCode || '',
      studentId,
    });

    if (!result.valid) {
      return apiSuccess({
        valid: false,
        reason: result.reason,
        message: result.message,
      });
    }

    const { grant } = result;
    const { token, maxAge } = createCourseAccessToken({
      courseId: grant.course.id,
      universityId: grant.university.id,
      cohortId: grant.assignment.cohortId,
      codeId: grant.accessCode.id,
      studentId: grant.enrollment?.studentId,
      enrollmentId: result.enrollmentId,
      codeExpiresAt: grant.accessCode.expiresAt,
    });

    const cookieStore = await cookies();
    cookieStore.set(
      getCourseAccessCookieName(grant.course.id, grant.university.id, grant.assignment.cohortId),
      token,
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge,
      },
    );

    return apiSuccess({
      valid: true,
      accessSession: result.accessSession,
      enrollmentId: result.enrollmentId,
      courseId: grant.course.id,
      universityId: grant.university.id,
      organizationId: grant.organization.id,
      cohortId: grant.assignment.cohortId,
      redirectUrl: `/u/${grant.organization.slug}/courses/${grant.course.slug}`,
    });
  } catch (error) {
    log.error(
      `Course access validation failed [courseId=${courseId ?? 'unknown'}, universityId=${universityId ?? 'unknown'}]:`,
      error,
    );
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to validate course access',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
