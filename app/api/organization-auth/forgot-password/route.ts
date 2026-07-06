import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  createAuthToken,
  getAppBaseUrl,
  hashAuthToken,
  shouldExposeAuthTokensInResponse,
} from '@/lib/server/auth-tokens';
import {
  createPasswordResetToken,
  getPortalUserByEmail,
  recordAuthAuditEvent,
} from '@/lib/server/course-portal-data';
import { sendAuthEmail } from '@/lib/server/email';
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit';

const RESET_TOKEN_TTL_MS = 45 * 60 * 1000;
const GENERIC_RESET_MESSAGE =
  'If an active account exists for this email, password reset instructions have been sent.';

export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) return apiError('INVALID_REQUEST', 400, 'Email is required.');

  const ip = getClientIp(request);
  const emailLimit = checkRateLimit({
    key: `forgot-password:email:${email}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  const ipLimit = checkRateLimit({
    key: `forgot-password:ip:${ip}`,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!emailLimit.allowed || !ipLimit.allowed) {
    return apiError('RATE_LIMITED', 429, 'Too many reset requests. Please try again later.');
  }

  const user = await getPortalUserByEmail(email);
  let resetUrl: string | undefined;
  if (user && user.status !== 'disabled') {
    const token = createAuthToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
    const created = await createPasswordResetToken({
      userId: user.id,
      tokenHash: hashAuthToken(token),
      expiresAt,
      requestedIp: ip,
    });
    if (!('error' in created)) {
      resetUrl = `${getAppBaseUrl(request)}/reset-password?token=${encodeURIComponent(token)}`;
      await sendAuthEmail({
        to: user.email,
        subject: 'Reset your LC Academy password',
        text: `Use this link to reset your LC Academy password: ${resetUrl}`,
      });
      await recordAuthAuditEvent({
        userId: user.id,
        organizationId: user.organizationId,
        email,
        action: 'password_reset.requested',
        ip,
      });
    }
  }

  return apiSuccess({
    message: GENERIC_RESET_MESSAGE,
    ...(resetUrl && shouldExposeAuthTokensInResponse() ? { resetUrl } : {}),
  });
}
