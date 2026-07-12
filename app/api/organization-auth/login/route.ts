import { apiError, apiSuccess } from '@/lib/server/api-response';
import { loginPortalUser, serializeSession } from '@/lib/server/organization-session';

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return apiError('INVALID_REQUEST', 400, 'Email and password are required.');
  }

  const result = await loginPortalUser({ email, password });
  if (!result.ok) {
    return apiError('INVALID_REQUEST', 401, result.error);
  }

  const dashboardUrl = result.session.user.role === 'platform-admin' ? '/admin' : '/dashboard';

  return apiSuccess({
    ...serializeSession(result.session),
    dashboardUrl,
  });
}
