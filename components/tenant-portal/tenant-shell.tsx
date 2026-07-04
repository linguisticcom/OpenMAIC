import Link from 'next/link';
import {
  BarChart3,
  Building2,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';
import { LogoutButton } from '@/components/tenant-portal/logout-button';
import { cn } from '@/lib/utils';
import { canManageAccessCodes } from '@/lib/server/organization-session';
import type { Organization, PortalUser } from '@/lib/types/course-portal';

const dashboardLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/courses', label: 'Courses', icon: GraduationCap },
  { href: '/dashboard/students', label: 'Students', icon: Users },
  { href: '/dashboard/access-codes', label: 'Access codes', icon: KeyRound },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

const adminLinks = [
  { href: '/admin/organizations', label: 'Organizations', icon: Building2 },
  { href: '/admin/courses', label: 'Global courses', icon: GraduationCap },
  { href: '/admin/course-assignments', label: 'Assignments', icon: BarChart3 },
];

export function TenantShell({
  user,
  organization,
  children,
  admin,
}: {
  user: PortalUser;
  organization?: Organization;
  children: React.ReactNode;
  admin?: boolean;
}) {
  const links = admin
    ? adminLinks
    : dashboardLinks.filter((link) => {
        if (user.role === 'student') {
          return link.href === '/dashboard' || link.href === '/dashboard/courses';
        }
        if (link.href === '/dashboard/access-codes') {
          return organization ? canManageAccessCodes(user, organization.id) : false;
        }
        if (link.href === '/dashboard/settings') {
          return user.role === 'organization-admin';
        }
        return true;
      });

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[270px_1fr]">
        <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 p-5">
              <Link
                href={admin ? '/admin/organizations' : '/dashboard'}
                className="flex items-center gap-3"
              >
                <img
                  src="/lc-academy-logo.webp"
                  alt="Linguistic Communication Academy"
                  className="h-14 w-auto object-contain"
                />
                <span className="max-w-36 text-sm font-semibold leading-tight text-slate-950">
                  Linguistic Communication Academy
                </span>
              </Link>
              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                  {admin ? 'Platform admin' : 'Organization account'}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {organization?.name || 'Linguistic Communication Academy'}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{user.name}</p>
              </div>
            </div>
            <nav className="grid gap-1 p-3">
              {links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-violet-50 hover:text-violet-800"
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto border-t border-slate-200 p-4 pb-16">
              <LogoutButton />
            </div>
          </div>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}

export function PageHeader({
  label,
  title,
  description,
  action,
  leading,
}: {
  label: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  leading?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-6 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-start gap-4">
        {leading && (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-2">
            {leading}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">{label}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">{title}</h1>
          {description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
          )}
        </div>
      </div>
      {action}
    </header>
  );
}

export function MetricCard({
  label,
  value,
  helper,
  tone = 'violet',
}: {
  label: string;
  value: string | number;
  helper: string;
  tone?: 'violet' | 'emerald' | 'blue' | 'amber';
}) {
  const toneClass = {
    violet: 'bg-violet-50 text-violet-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className={cn('inline-flex rounded-md px-2.5 py-1 text-xs font-semibold', toneClass)}>
        {label}
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

export function formatPortalDate(value?: string) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function progressTone(value: number) {
  if (value >= 80) return 'bg-emerald-600';
  if (value >= 40) return 'bg-violet-600';
  return 'bg-amber-500';
}
