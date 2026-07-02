import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import {
  getOrganizationById,
  getPortalUserByEmail,
  getPortalUserById,
  hashPortalPassword,
} from '@/lib/server/course-portal-data';
import type { Organization, PortalUser } from '@/lib/types/course-portal';

const ORG_SESSION_COOKIE = 'openmaic_org_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

interface OrganizationSessionPayload {
  userId: string;
  organizationId?: string;
  role: PortalUser['role'];
  issuedAt: number;
  expiresAt: number;
}

export interface PortalSession {
  user: PortalUser;
  organization?: Organization;
}

function getSessionSecret(): string {
  return (
    process.env.ORGANIZATION_SESSION_SECRET ||
    process.env.COURSE_ACCESS_SECRET ||
    process.env.ACCESS_CODE ||
    'openmaic-organization-session-dev-secret'
  );
}

function sign(value: string): string {
  return createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, 'base64url');
    const right = Buffer.from(b, 'base64url');
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function createSessionToken(user: PortalUser): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: OrganizationSessionPayload = {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

async function verifySessionToken(token: string | undefined): Promise<PortalSession | null> {
  if (!token) return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;
  if (!safeEqual(signature, sign(encodedPayload))) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8'),
    ) as OrganizationSessionPayload;
    if (payload.expiresAt < Math.floor(Date.now() / 1000)) return null;

    const user = await getPortalUserById(payload.userId);
    if (!user || user.role !== payload.role || user.organizationId !== payload.organizationId) {
      return null;
    }

    const organization = user.organizationId
      ? await getOrganizationById(user.organizationId)
      : undefined;
    return { user, organization };
  } catch {
    return null;
  }
}

export async function loginPortalUser(params: {
  email: string;
  password: string;
}): Promise<{ ok: true; session: PortalSession } | { ok: false; error: string }> {
  const user = await getPortalUserByEmail(params.email);
  if (!user || user.passwordHash !== hashPortalPassword(params.password)) {
    return { ok: false, error: 'Invalid email or password.' };
  }

  const organization = user.organizationId
    ? await getOrganizationById(user.organizationId)
    : undefined;
  const cookieStore = await cookies();
  cookieStore.set(ORG_SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });

  return { ok: true, session: { user, organization } };
}

export async function logoutPortalUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ORG_SESSION_COOKIE);
}

export async function getCurrentPortalSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(ORG_SESSION_COOKIE)?.value);
}

export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getCurrentPortalSession();
  if (!session) {
    throw new Error('Authentication required.');
  }
  return session;
}

export function isPlatformAdmin(user: PortalUser): boolean {
  return user.role === 'platform-admin';
}

export function isOrganizationAdmin(user: PortalUser): boolean {
  return user.role === 'organization-admin';
}

export function isTeacherManager(user: PortalUser): boolean {
  return user.role === 'teacher-manager';
}

export function isStudent(user: PortalUser): boolean {
  return user.role === 'student';
}

export function canManageAccessCodes(user: PortalUser, organizationId: string): boolean {
  if (isPlatformAdmin(user)) return true;
  if (user.organizationId !== organizationId) return false;
  return user.role === 'organization-admin' || !!user.canGenerateAccessCodes;
}

export function canAccessOrganization(user: PortalUser, organizationId: string): boolean {
  return isPlatformAdmin(user) || user.organizationId === organizationId;
}

export function canViewStudentManagement(user: PortalUser, organizationId: string): boolean {
  if (!canAccessOrganization(user, organizationId)) return false;
  return isPlatformAdmin(user) || isOrganizationAdmin(user) || isTeacherManager(user);
}

export function requireOrganizationScope(user: PortalUser, organizationId: string): void {
  if (!canAccessOrganization(user, organizationId)) {
    throw new Error('Organization access denied.');
  }
}

export function serializeSession(session: PortalSession) {
  return {
    user: {
      id: session.user.id,
      organizationId: session.user.organizationId,
      studentId: session.user.studentId,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      canGenerateAccessCodes: session.user.canGenerateAccessCodes,
    },
    organization: session.organization,
  };
}
