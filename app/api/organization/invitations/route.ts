import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  createAuthToken,
  getAppBaseUrl,
  hashAuthToken,
  shouldExposeAuthTokensInResponse,
} from '@/lib/server/auth-tokens';
import {
  createAccountInvitation,
  listVisibleAccountInvitations,
  recordAuthAuditEvent,
} from '@/lib/server/course-portal-data';
import { sendAuthEmail } from '@/lib/server/email';
import { requirePortalSession } from '@/lib/server/organization-session';
import { getClientIp } from '@/lib/server/rate-limit';
import type { PortalUserRole } from '@/lib/types/course-portal';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const invitationRoles = new Set<PortalUserRole>([
  'organization-admin',
  'teacher-manager',
  'student',
]);

export async function GET() {
  try {
    const session = await requirePortalSession();
    const invitations = await listVisibleAccountInvitations(session.user);
    return apiSuccess({
      invitations: invitations.map(({ tokenHash: _tokenHash, ...invitation }) => invitation),
    });
  } catch {
    return apiError('INVALID_REQUEST', 401, 'Authentication required.');
  }
}

export async function POST(request: Request) {
  let session;
  try {
    session = await requirePortalSession();
  } catch {
    return apiError('INVALID_REQUEST', 401, 'Authentication required.');
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const name = typeof body.name === 'string' ? body.name : undefined;
  const role = typeof body.role === 'string' ? body.role : '';
  const organizationId =
    typeof body.organizationId === 'string'
      ? body.organizationId
      : session.user.role === 'platform-admin'
        ? undefined
        : session.user.organizationId;

  if (!email || !invitationRoles.has(role as PortalUserRole)) {
    return apiError('INVALID_REQUEST', 400, 'Email and supported role are required.');
  }

  const token = createAuthToken();
  const invitation = await createAccountInvitation({
    email,
    name,
    role: role as PortalUserRole,
    organizationId,
    invitedByUserId: session.user.id,
    tokenHash: hashAuthToken(token),
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS).toISOString(),
  });
  if ('error' in invitation) return apiError('INVALID_REQUEST', 400, invitation.error);

  const inviteUrl = `${getAppBaseUrl(request)}/invite/${encodeURIComponent(token)}`;
  const emailDelivery = await sendAuthEmail({
    to: invitation.email,
    subject: 'You are invited to LC Academy',
    text: `Use this link to accept your LC Academy invitation: ${inviteUrl}`,
  });
  await recordAuthAuditEvent({
    userId: session.user.id,
    organizationId: invitation.organizationId,
    email: invitation.email,
    action: 'invitation.created',
    ip: getClientIp(request),
    metadata: { role: invitation.role, emailDelivered: emailDelivery.ok },
  });

  const { tokenHash: _tokenHash, ...safeInvitation } = invitation;
  const exposeToken = shouldExposeAuthTokensInResponse();
  if (!emailDelivery.ok && !exposeToken) {
    return apiError(
      'EMAIL_DELIVERY_FAILED',
      502,
      'Invitation created, but email delivery failed. Verify email configuration before retrying.',
    );
  }
  return apiSuccess(
    {
      invitation: safeInvitation,
      emailDelivered: emailDelivery.ok,
      ...(exposeToken ? { inviteUrl } : {}),
    },
    201,
  );
}
