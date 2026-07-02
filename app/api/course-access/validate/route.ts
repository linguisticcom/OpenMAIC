import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createCourseAccessToken, getCourseAccessCookieName } from '@/lib/server/course-access';
import { consumeCourseAccessGrant } from '@/lib/server/course-portal-data';
import { getCurrentPortalSession, isStudent } from '@/lib/server/organization-session';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  let body: {
    organizationId?: string;
    organizationSlug?: string;
    courseId?: string;
    courseSlug?: string;
    accessCode?: string;
    cohortId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const session = await getCurrentPortalSession();
  const studentId = session && isStudent(session.user) ? session.user.studentId : undefined;

  const result = await consumeCourseAccessGrant({
    organizationId: body.organizationId,
    organizationSlug: body.organizationSlug,
    courseId: body.courseId,
    courseSlug: body.courseSlug,
    accessCode: body.accessCode || '',
    cohortId: body.cohortId,
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
    universityId: grant.organization.id,
    cohortId: grant.assignment.cohortId,
    codeId: grant.accessCode.id,
    codeExpiresAt: grant.accessCode.expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(
    getCourseAccessCookieName(grant.course.id, grant.organization.id, grant.assignment.cohortId),
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
    organizationId: grant.organization.id,
    courseId: grant.course.id,
    redirectUrl: `/u/${grant.organization.slug}/courses/${grant.course.slug}`,
  });
}
