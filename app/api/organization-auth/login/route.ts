import { apiError, apiSuccess } from '@/lib/server/api-response';
import { loginPortalUser, serializeSession } from '@/lib/server/organization-session';

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  if (!body.email || !body.password) {
    return apiError('INVALID_REQUEST', 400, 'Email and password are required.');
  }

  const result = await loginPortalUser({ email: body.email, password: body.password });
  if (!result.ok) {
    return apiError('INVALID_REQUEST', 401, result.error);
  }

  const dashboardUrl =
    result.session.user.role === 'platform-admin' ? '/admin/organizations' : '/dashboard';

  return apiSuccess({
    ...serializeSession(result.session),
    dashboardUrl,
  });
}
