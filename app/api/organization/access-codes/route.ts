import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  createOrganizationAccessCode,
  getOrganizationById,
  listOrganizationAccessCodes,
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

  const accessCodes = await listOrganizationAccessCodes(organization.id);
  return apiSuccess({ organization, accessCodes });
}

export async function POST(request: Request) {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');

  let body: {
    organizationId?: string;
    courseId?: string;
    cohortId?: string;
    studentId?: string;
    expiresAt?: string;
    maxUses?: number;
  };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const organizationId = body.organizationId || session.user.organizationId;
  if (!organizationId || !body.courseId) {
    return apiError('INVALID_REQUEST', 400, 'organizationId and courseId are required.');
  }
  if (!canManageAccessCodes(session.user, organizationId)) {
    return apiError('INVALID_REQUEST', 403, 'Access-code management is not allowed.');
  }

  const created = await createOrganizationAccessCode({
    organizationId,
    courseId: body.courseId,
    cohortId: body.cohortId,
    studentId: body.studentId,
    createdByUserId: session.user.id,
    expiresAt: body.expiresAt,
    maxUses: body.maxUses,
  });

  if ('error' in created) {
    return apiError('INVALID_REQUEST', 400, created.error);
  }

  return apiSuccess({ accessCode: created.accessCode, code: created.code }, 201);
}
