import { apiError, apiSuccess } from '@/lib/server/api-response';
import { hashAuthToken } from '@/lib/server/auth-tokens';
import { acceptAccountInvitation, recordAuthAuditEvent } from '@/lib/server/course-portal-data';
import { setPortalSessionCookie, serializeSession } from '@/lib/server/organization-session';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

export async function POST(request: Request) {
  let body: { token?: unknown; name?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const name = typeof body.name === 'string' ? body.name : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!token || !name.trim() || !password) {
    return apiError('INVALID_REQUEST', 400, 'Token, name, and password are required.');
  }

  const ip = getClientIp(request);
  const limit = checkRateLimit({
    key: `invitation-accept:ip:${ip}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return apiError('RATE_LIMITED', 429, 'Too many invitation attempts. Please try again later.');
  }

  const result = await acceptAccountInvitation({
    tokenHash: hashAuthToken(token),
    name,
    password,
  });
  if ('error' in result) return apiError('INVALID_REQUEST', 400, result.error);

  await setPortalSessionCookie(result.user);
  await recordAuthAuditEvent({
    userId: result.user.id,
    organizationId: result.user.organizationId,
    email: result.user.email,
    action: 'invitation.accepted',
    ip,
  });

  const dashboardUrl =
    result.user.role === 'platform-admin' ? '/admin/organizations' : '/dashboard';
  return apiSuccess({
    ...serializeSession({ user: result.user }),
    dashboardUrl,
  });
}
