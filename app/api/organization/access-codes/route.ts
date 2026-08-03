import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  createOrganizationAccessCode,
  getOrganizationById,
  listVisibleOrganizationAccessCodes,
} from '@/lib/server/course-portal-data';
import { canManageAccessCodes, getCurrentPortalSession } from '@/lib/server/organization-session';

export async function GET(request: Request) {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');

  const url = new URL(request.url);
  const organizationId = url.searchParams.get('organizationId') || session.user.organizationId;
  if (!organizationId) return apiError('INVALID_REQUEST', 400, 'organizationId is required.');
  if (!canManageAccessCodes(session.user, organizationId)) {
    return apiError('INVALID_REQUEST', 403, 'Access-code management is not allowed.');
  }

  const organization = await getOrganizationById(organizationId);
  if (!organization) return apiError('INVALID_REQUEST', 404, 'Organization not found.');

  const accessCodes = await listVisibleOrganizationAccessCodes(session.user, organization.id);
  return apiSuccess({ organization, accessCodes });
}

export async function POST(request: Request) {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');

  let body: Partial<
    Record<
      'organizationId' | 'courseId' | 'cohortId' | 'studentId' | 'expiresAt' | 'maxUses',
      unknown
    >
  >;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const stringField = (field: keyof typeof body): { value?: string; error?: Response } => {
    const value = body[field];
    if (value === undefined) return {};
    if (typeof value !== 'string') {
      return {
        error: apiError('INVALID_REQUEST', 400, 'Access-code fields must be strings.'),
      };
    }
    return { value };
  };
  const organizationIdField = stringField('organizationId');
  const courseIdField = stringField('courseId');
  const cohortIdField = stringField('cohortId');
  const studentIdField = stringField('studentId');
  const expiresAtField = stringField('expiresAt');
  const fieldError =
    organizationIdField.error ||
    courseIdField.error ||
    cohortIdField.error ||
    studentIdField.error ||
    expiresAtField.error;
  if (fieldError) return fieldError;

  if (
    body.maxUses !== undefined &&
    (typeof body.maxUses !== 'number' || !Number.isFinite(body.maxUses))
  ) {
    return apiError('INVALID_REQUEST', 400, 'Maximum uses must be a finite number.');
  }
  const maxUses = typeof body.maxUses === 'number' ? body.maxUses : undefined;

  const organizationId = organizationIdField.value || session.user.organizationId;
  if (!organizationId || !courseIdField.value) {
    return apiError('INVALID_REQUEST', 400, 'organizationId and courseId are required.');
  }
  if (!canManageAccessCodes(session.user, organizationId)) {
    return apiError('INVALID_REQUEST', 403, 'Access-code management is not allowed.');
  }

  const created = await createOrganizationAccessCode({
    organizationId,
    courseId: courseIdField.value,
    cohortId: cohortIdField.value,
    studentId: studentIdField.value,
    createdByUserId: session.user.id,
    expiresAt: expiresAtField.value,
    maxUses,
  });

  if ('error' in created) {
    return apiError('INVALID_REQUEST', 400, created.error);
  }

  return apiSuccess({ accessCode: created.accessCode, code: created.code }, 201);
}
