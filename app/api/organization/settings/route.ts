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

  let body: Partial<
    Record<
      'organizationId' | 'name' | 'logoUrl' | 'description' | 'contactEmail' | 'welcomeMessage',
      unknown
    >
  >;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const stringField = (field: keyof typeof body): { value?: string; error?: Response } => {
    const value = body[field];
    if (value === undefined) return {};
    if (typeof value !== 'string') {
      return {
        error: apiError('INVALID_REQUEST', 400, 'Organization settings fields must be strings.'),
      };
    }
    return { value };
  };

  const organizationIdField = stringField('organizationId');
  const nameField = stringField('name');
  const logoUrlField = stringField('logoUrl');
  const descriptionField = stringField('description');
  const contactEmailField = stringField('contactEmail');
  const welcomeMessageField = stringField('welcomeMessage');
  const fieldError =
    organizationIdField.error ||
    nameField.error ||
    logoUrlField.error ||
    descriptionField.error ||
    contactEmailField.error ||
    welcomeMessageField.error;
  if (fieldError) return fieldError;

  const organizationId = organizationIdField.value || session.user.organizationId;
  if (!organizationId) return apiError('INVALID_REQUEST', 400, 'organizationId is required.');
  if (!canAccessOrganization(session.user, organizationId)) {
    return apiError('INVALID_REQUEST', 403, 'Organization access denied.');
  }
  if (!isPlatformAdmin(session.user) && !isOrganizationAdmin(session.user)) {
    return apiError('INVALID_REQUEST', 403, 'Organization admin required.');
  }

  const result = await updateOrganizationSettings({
    organizationId,
    name: nameField.value,
    logoUrl: logoUrlField.value,
    description: descriptionField.value,
    contactEmail: contactEmailField.value,
    welcomeMessage: welcomeMessageField.value,
  });

  if ('error' in result) return apiError('INVALID_REQUEST', 400, result.error);
  return apiSuccess({ organization: result });
}
