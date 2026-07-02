import { readAdminOverview } from '@/lib/server/admin-dashboard';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('AdminOverview');

export async function GET() {
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
