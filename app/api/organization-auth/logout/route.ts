import { apiSuccess } from '@/lib/server/api-response';
import { logoutPortalUser } from '@/lib/server/organization-session';

export async function POST() {
  await logoutPortalUser();
  return apiSuccess({ loggedOut: true });
}
