import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createCourseAccessToken, getCourseAccessCookieName } from '@/lib/server/course-access';
import { consumeCourseAccessGrant } from '@/lib/server/course-portal-data';
import { getCurrentPortalSession, isStudent } from '@/lib/server/organization-session';
import { cookies } from 'next/headers';

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export async function POST(request: Request) {
  let body: {
    organizationId?: unknown;
    organizationSlug?: unknown;
    courseId?: unknown;
    courseSlug?: unknown;
    accessCode?: unknown;
    cohortId?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const session = await getCurrentPortalSession();
  const studentId = session && isStudent(session.user) ? session.user.studentId : undefined;

  const result = await consumeCourseAccessGrant({
    organizationId: stringField(body.organizationId),
    organizationSlug: stringField(body.organizationSlug),
    courseId: stringField(body.courseId),
    courseSlug: stringField(body.courseSlug),
    accessCode: stringField(body.accessCode) || '',
    cohortId: stringField(body.cohortId),
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
    studentId: grant.enrollment?.studentId,
    enrollmentId: result.enrollmentId,
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
