import { apiError } from '@/lib/server/api-response';
import { getCurrentPortalSession, isPlatformAdmin } from '@/lib/server/organization-session';

export async function requirePlatformApiSession() {
  const session = await getCurrentPortalSession();
  if (!session) return apiError('INVALID_REQUEST', 401, 'Authentication required.');
  if (!isPlatformAdmin(session.user)) {
    return apiError('INVALID_REQUEST', 403, 'Platform admin required.');
  }
  return null;
}
