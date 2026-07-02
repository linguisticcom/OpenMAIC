import { apiError, apiSuccess } from '@/lib/server/api-response';
import { updateOrganizationSettings } from '@/lib/server/course-portal-data';
import {
  canAccessOrganization,
  getCurrentPortalSession,
  isOrganizationAdmin,
  isPlatformAdmin,
} from '@/lib/server/organization-session';

export async function PATCH(request: Request) {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');

  let body: {
    organizationId?: string;
    name?: string;
    logoUrl?: string;
    description?: string;
    contactEmail?: string;
    welcomeMessage?: string;
  };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const organizationId = body.organizationId || session.user.organizationId;
  if (!organizationId) return apiError('INVALID_REQUEST', 400, 'organizationId is required.');
  if (!canAccessOrganization(session.user, organizationId)) {
    return apiError('INVALID_REQUEST', 403, 'Organization access denied.');
  }
  if (!isPlatformAdmin(session.user) && !isOrganizationAdmin(session.user)) {
    return apiError('INVALID_REQUEST', 403, 'Organization admin required.');
  }

  const result = await updateOrganizationSettings({
    organizationId,
    name: body.name,
    logoUrl: body.logoUrl,
    description: body.description,
    contactEmail: body.contactEmail,
    welcomeMessage: body.welcomeMessage,
  });

  if ('error' in result) return apiError('INVALID_REQUEST', 400, result.error);
  return apiSuccess({ organization: result });
}
