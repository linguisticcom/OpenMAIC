import { apiSuccess } from '@/lib/server/api-response';
import { getCurrentPortalSession, serializeSession } from '@/lib/server/organization-session';

export async function GET() {
  const session = await getCurrentPortalSession();
  return apiSuccess({
    authenticated: !!session,
    ...(session ? serializeSession(session) : {}),
  });
}
