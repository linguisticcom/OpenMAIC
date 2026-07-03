import { readAdminOverview } from '@/lib/server/admin-dashboard';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';
import { getCurrentPortalSession, isPlatformAdmin } from '@/lib/server/organization-session';

const log = createLogger('AdminOverview');

export async function GET() {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');
  if (!isPlatformAdmin(session.user)) {
    return apiError('INVALID_REQUEST', 403, 'Platform admin required.');
  }

  try {
    const overview = await readAdminOverview();
    return apiSuccess({ overview });
  } catch (error) {
    log.error('Failed to read admin overview:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Failed to read admin overview',
    );
  }
}
