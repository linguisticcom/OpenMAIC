import { redirect } from 'next/navigation';
import {
  canManageAccessCodes,
  canViewStudentManagement,
  getCurrentPortalSession,
  isOrganizationAdmin,
  isPlatformAdmin,
  type PortalSession,
} from '@/lib/server/organization-session';

export async function requireOrganizationPageSession(): Promise<
  PortalSession & { organization: NonNullable<PortalSession['organization']> }
> {
  const session = await getCurrentPortalSession();
  if (!session) redirect('/login');
  if (isPlatformAdmin(session.user)) redirect('/admin/organizations');
  if (!session.organization) redirect('/login');
  return session as PortalSession & { organization: NonNullable<PortalSession['organization']> };
}

export async function requirePlatformPageSession(): Promise<PortalSession> {
  const session = await getCurrentPortalSession();
  if (!session) redirect('/login');
  if (!isPlatformAdmin(session.user)) redirect('/dashboard');
  return session;
}

export async function requireStudentManagementPageSession(): Promise<
  PortalSession & { organization: NonNullable<PortalSession['organization']> }
> {
  const session = await requireOrganizationPageSession();
  if (!canViewStudentManagement(session.user, session.organization.id))
    redirect('/dashboard/courses');
  return session;
}

export async function requireAccessCodeManagerPageSession(): Promise<
  PortalSession & { organization: NonNullable<PortalSession['organization']> }
> {
  const session = await requireOrganizationPageSession();
  if (!canManageAccessCodes(session.user, session.organization.id)) redirect('/dashboard');
  return session;
}

export async function requireOrganizationAdminPageSession(): Promise<
  PortalSession & { organization: NonNullable<PortalSession['organization']> }
> {
  const session = await requireOrganizationPageSession();
  if (!isOrganizationAdmin(session.user)) redirect('/dashboard');
  return session;
}
