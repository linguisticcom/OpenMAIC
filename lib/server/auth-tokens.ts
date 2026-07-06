import { createHash, randomBytes } from 'crypto';

export function createAuthToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function hashAuthToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function shouldExposeAuthTokensInResponse(): boolean {
  return process.env.AUTH_DEV_EXPOSE_TOKENS === 'true' && process.env.NODE_ENV !== 'production';
}

export function getAppBaseUrl(request?: Request): string {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (request) {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  }
  return 'http://localhost:3000';
}
