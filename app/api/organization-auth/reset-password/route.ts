import { apiError, apiSuccess } from '@/lib/server/api-response';
import { hashAuthToken } from '@/lib/server/auth-tokens';
import { consumePasswordResetToken, recordAuthAuditEvent } from '@/lib/server/course-portal-data';
import { hashPortalPasswordScrypt } from '@/lib/server/password-hashing';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

export async function POST(request: Request) {
  let body: { token?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!token || !password)
    return apiError('INVALID_REQUEST', 400, 'Token and password are required.');
  if (password.length < 8) {
    return apiError('INVALID_REQUEST', 400, 'Password must be at least 8 characters.');
  }

  const ip = getClientIp(request);
  const limit = checkRateLimit({
    key: `reset-password:ip:${ip}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return apiError('RATE_LIMITED', 429, 'Too many reset attempts. Please try again later.');
  }

  const result = await consumePasswordResetToken({
    tokenHash: hashAuthToken(token),
    passwordHash: hashPortalPasswordScrypt(password),
  });
  if ('error' in result) return apiError('INVALID_REQUEST', 400, result.error);

  await recordAuthAuditEvent({
    userId: result.user.id,
    organizationId: result.user.organizationId,
    email: result.user.email,
    action: 'password_reset.completed',
    ip,
  });
  return apiSuccess({ message: 'Password reset. You can sign in with your new password.' });
}
