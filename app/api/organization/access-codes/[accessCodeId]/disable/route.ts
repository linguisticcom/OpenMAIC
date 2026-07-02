import { apiError, apiSuccess } from '@/lib/server/api-response';
import { disableOrganizationAccessCode } from '@/lib/server/course-portal-data';
import { canManageAccessCodes, getCurrentPortalSession } from '@/lib/server/organization-session';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ accessCodeId: string }> },
) {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');

  let body: { organizationId?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const organizationId = body.organizationId || session.user.organizationId;
  if (!organizationId) return apiError('INVALID_REQUEST', 400, 'organizationId is required.');
  if (!canManageAccessCodes(session.user, organizationId)) {
    return apiError('INVALID_REQUEST', 403, 'Access-code management is not allowed.');
  }

  const { accessCodeId } = await context.params;
  const accessCode = await disableOrganizationAccessCode({ organizationId, accessCodeId });
  if (!accessCode) return apiError('INVALID_REQUEST', 404, 'Access code not found.');

  return apiSuccess({ accessCode });
}
