import { apiError, apiSuccess } from '@/lib/server/api-response';
import { deleteOrganization, getOrganizationById } from '@/lib/server/course-portal-data';
import { getCurrentPortalSession, isPlatformAdmin } from '@/lib/server/organization-session';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
) {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');
  if (!isPlatformAdmin(session.user)) {
    return apiError('INVALID_REQUEST', 403, 'Platform admin required.');
  }

  let body: Partial<Record<'confirmationName', unknown>>;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }
  if (typeof body.confirmationName !== 'string') {
    return apiError('INVALID_REQUEST', 400, 'Organization name confirmation is required.');
  }

  const { organizationId } = await context.params;
  const organization = await getOrganizationById(organizationId);
  if (!organization) return apiError('INVALID_REQUEST', 404, 'Organization not found.');
  if (body.confirmationName.trim() !== organization.name) {
    return apiError('INVALID_REQUEST', 400, 'Organization name confirmation does not match.');
  }

  const result = await deleteOrganization(organization.id);
  if ('error' in result) return apiError('INVALID_REQUEST', 400, result.error);
  return apiSuccess({ deletedOrganizationId: result.organization.id });
}
