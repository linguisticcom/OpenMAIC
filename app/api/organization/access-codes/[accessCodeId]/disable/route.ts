import { apiError, apiSuccess } from '@/lib/server/api-response';
import { disableOrganizationAccessCode } from '@/lib/server/course-portal-data';
import { canManageAccessCodes, getCurrentPortalSession } from '@/lib/server/organization-session';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ accessCodeId: string }> },
) {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');

  let body: Partial<Record<'organizationId', unknown>> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }
  if (body.organizationId !== undefined && typeof body.organizationId !== 'string') {
    return apiError('INVALID_REQUEST', 400, 'organizationId must be a string.');
  }

  const organizationId = body.organizationId || session.user.organizationId;
  if (!organizationId) return apiError('INVALID_REQUEST', 400, 'organizationId is required.');
  if (!canManageAccessCodes(session.user, organizationId)) {
    return apiError('INVALID_REQUEST', 403, 'Access-code management is not allowed.');
  }

  const { accessCodeId } = await context.params;
  const accessCode = await disableOrganizationAccessCode({
    organizationId,
    accessCodeId,
    disabledByUserId: session.user.id,
  });
  if (!accessCode) return apiError('INVALID_REQUEST', 404, 'Access code not found.');
  if ('error' in accessCode) return apiError('INVALID_REQUEST', 403, accessCode.error);

  return apiSuccess({ accessCode });
}
