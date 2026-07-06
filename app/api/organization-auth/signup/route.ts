import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  createLearnerAccountWithAccessCode,
  recordAuthAuditEvent,
} from '@/lib/server/course-portal-data';
import { setPortalSessionCookie, serializeSession } from '@/lib/server/organization-session';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const name = typeof body.name === 'string' ? body.name : '';
  const email = typeof body.email === 'string' ? body.email : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const accessCode = typeof body.accessCode === 'string' ? body.accessCode : '';
  const organizationId = typeof body.organizationId === 'string' ? body.organizationId : undefined;
  const organizationSlug =
    typeof body.organizationSlug === 'string' ? body.organizationSlug : undefined;
  const courseId = typeof body.courseId === 'string' ? body.courseId : undefined;
  const courseSlug = typeof body.courseSlug === 'string' ? body.courseSlug : undefined;
  const cohortId = typeof body.cohortId === 'string' ? body.cohortId : undefined;

  if (!name.trim() || !email.trim() || !password || !accessCode.trim()) {
    return apiError('INVALID_REQUEST', 400, 'Name, email, password, and access code are required.');
  }
  if ((!organizationId && !organizationSlug) || (!courseId && !courseSlug)) {
    return apiError('INVALID_REQUEST', 400, 'Organization and course are required.');
  }

  const ip = getClientIp(request);
  const emailLimit = checkRateLimit({
    key: `signup:email:${email.trim().toLowerCase()}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  const ipLimit = checkRateLimit({ key: `signup:ip:${ip}`, limit: 30, windowMs: 60 * 60 * 1000 });
  if (!emailLimit.allowed || !ipLimit.allowed) {
    return apiError('RATE_LIMITED', 429, 'Too many signup attempts. Please try again later.');
  }

  const result = await createLearnerAccountWithAccessCode({
    name,
    email,
    password,
    accessCode,
    organizationId,
    organizationSlug,
    courseId,
    courseSlug,
    cohortId,
  });
  if ('error' in result) return apiError('INVALID_REQUEST', 400, result.error);

  await setPortalSessionCookie(result.user);
  await recordAuthAuditEvent({
    userId: result.user.id,
    organizationId: result.organization.id,
    email: result.user.email,
    action: 'account.signup_access_code',
    ip,
    metadata: { courseId: result.course.id },
  });

  return apiSuccess({
    ...serializeSession({ user: result.user, organization: result.organization }),
    dashboardUrl: '/dashboard',
    courseUrl: `/u/${result.organization.slug}/courses/${result.course.slug}`,
  });
}
