import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import {
  hasPortalAccountCourseAccess,
  isCourseAccessSessionValid,
} from '@/lib/server/course-portal-data';
import { getCurrentPortalSession } from '@/lib/server/organization-session';

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface CourseAccessTokenPayload {
  courseId: string;
  universityId: string;
  cohortId?: string;
  codeId: string;
  studentId?: string;
  enrollmentId?: string;
  issuedAt: number;
  expiresAt: number;
}

function getSecret(): string {
  return (
    process.env.COURSE_ACCESS_SECRET ||
    process.env.ACCESS_CODE ||
    'openmaic-course-access-dev-secret'
  );
}

function sign(value: string): string {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, 'base64url');
    const right = Buffer.from(b, 'base64url');
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function getCourseAccessCookieName(
  courseId: string,
  universityId: string,
  cohortId?: string,
): string {
  const safeCourseId = courseId.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeUniversityId = universityId.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeCohortId = cohortId?.replace(/[^a-zA-Z0-9_-]/g, '');
  return ['openmaic_course_access', safeCourseId, safeUniversityId, safeCohortId]
    .filter(Boolean)
    .join('_');
}

export function createCourseAccessToken(params: {
  courseId: string;
  universityId: string;
  cohortId?: string;
  codeId: string;
  studentId?: string;
  enrollmentId?: string;
  codeExpiresAt?: string;
}): { token: string; maxAge: number } {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const codeExpirySeconds = params.codeExpiresAt
    ? Math.floor(new Date(params.codeExpiresAt).getTime() / 1000)
    : undefined;
  const expiresAt = Math.min(
    codeExpirySeconds || nowSeconds + DEFAULT_TOKEN_TTL_SECONDS,
    nowSeconds + DEFAULT_TOKEN_TTL_SECONDS,
  );
  const payload: CourseAccessTokenPayload = {
    courseId: params.courseId,
    universityId: params.universityId,
    cohortId: params.cohortId,
    codeId: params.codeId,
    studentId: params.studentId,
    enrollmentId: params.enrollmentId,
    issuedAt: nowSeconds,
    expiresAt,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  return {
    token: `${encodedPayload}.${sign(encodedPayload)}`,
    maxAge: Math.max(0, expiresAt - nowSeconds),
  };
}

export function verifyCourseAccessToken(
  token: string | undefined,
  expected: { courseId: string; universityId: string; cohortId?: string },
): CourseAccessTokenPayload | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;
  if (!safeEqual(signature, sign(encodedPayload))) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8'),
    ) as CourseAccessTokenPayload;
    if (payload.courseId !== expected.courseId) return null;
    if (payload.universityId !== expected.universityId) return null;
    if ((expected.cohortId || payload.cohortId) && payload.cohortId !== expected.cohortId) {
      return null;
    }
    if (payload.expiresAt < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function hasCourseAccess(params: {
  courseId: string;
  universityId: string;
  cohortId?: string;
}): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(
    getCourseAccessCookieName(params.courseId, params.universityId, params.cohortId),
  )?.value;
  const payload = verifyCourseAccessToken(token, params);
  if (!payload) return false;

  return isCourseAccessSessionValid({
    organizationId: payload.universityId,
    courseId: payload.courseId,
    cohortId: payload.cohortId,
    codeId: payload.codeId,
    studentId: payload.studentId,
    enrollmentId: payload.enrollmentId,
  });
}

export async function hasCourseAccessOrAccount(params: {
  courseId: string;
  universityId: string;
  cohortId?: string;
}): Promise<boolean> {
  if (await hasCourseAccess(params)) return true;

  const session = await getCurrentPortalSession();
  if (!session) return false;

  return hasPortalAccountCourseAccess(session.user, {
    organizationId: params.universityId,
    courseId: params.courseId,
    cohortId: params.cohortId,
  });
}

export async function findCourseAccessAssignment<
  TAssignment extends { cohortId?: string },
>(params: {
  courseId: string;
  universityId: string;
  assignments: TAssignment[];
}): Promise<TAssignment | undefined> {
  for (const assignment of params.assignments) {
    const hasAccess = await hasCourseAccessOrAccount({
      courseId: params.courseId,
      universityId: params.universityId,
      cohortId: assignment.cohortId,
    });
    if (hasAccess) return assignment;
  }
  return undefined;
}
