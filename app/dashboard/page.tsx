import Link from 'next/link';
import { ArrowRight, GraduationCap, KeyRound, Users } from 'lucide-react';
import {
  MetricCard,
  PageHeader,
  TenantShell,
  formatPortalDate,
  progressTone,
} from '@/components/tenant-portal/tenant-shell';
import { Button } from '@/components/ui/button';
import { getVisibleOrganizationDashboardSummary } from '@/lib/server/course-portal-data';
import { requireOrganizationPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await requireOrganizationPageSession();
  const summary = await getVisibleOrganizationDashboardSummary(
    session.user,
    session.organization.id,
  );
  if (!summary) return null;

  const canGenerateAccessCodes =
    session.user.role === 'organization-admin' || !!session.user.canGenerateAccessCodes;
  const canViewStudents =
    session.user.role === 'organization-admin' || session.user.role === 'teacher-manager';

  return (
    <TenantShell user={session.user} organization={session.organization}>
      <PageHeader
        label="Organization dashboard"
        title={summary.organization.name}
        description="Tenant-scoped course activity, access-code status, and student progress."
        leading={
          <img
            src={summary.organization.logoUrl || '/logo-horizontal.png'}
            alt={`${summary.organization.name} logo`}
            className="max-h-10 max-w-28 object-contain"
          />
        }
        action={
          canGenerateAccessCodes ? (
            <Button asChild className="bg-violet-700 text-white hover:bg-violet-800">
              <Link href="/dashboard/access-codes/new">
                <KeyRound className="size-4" />
                Generate access code
              </Link>
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-6 p-5 sm:p-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Active courses"
            value={summary.activeCourses}
            helper="Assigned and active now"
          />
          <MetricCard
            label="Students"
            value={summary.enrolledStudents}
            helper="Students in this organization"
            tone="blue"
          />
          <MetricCard
            label="Access codes"
            value={summary.activeAccessCodes}
            helper="Currently active codes"
            tone="emerald"
          />
          <MetricCard
            label="Completion"
            value={`${summary.averageCompletionRate}%`}
            helper="Average across assigned courses"
            tone="amber"
          />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-normal">Quick actions</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Jump to the tenant workflows available to your role.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="min-h-10">
                <Link href="/dashboard/courses">
                  <GraduationCap className="size-4" />
                  View courses
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              {canViewStudents && (
                <Button asChild variant="outline" className="min-h-10">
                  <Link href="/dashboard/students">
                    <Users className="size-4" />
                    View students
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
              {canGenerateAccessCodes && (
                <Button asChild className="min-h-10 bg-violet-700 text-white hover:bg-violet-800">
                  <Link href="/dashboard/access-codes/new">
                    <KeyRound className="size-4" />
                    Generate access code
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-normal">Assigned courses</h2>
              <Link className="text-sm font-semibold text-violet-700" href="/dashboard/courses">
                View all
              </Link>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {summary.courses.map((item) => (
                <Link
                  key={item.assignmentId}
                  href={`/dashboard/courses/${item.course.id}`}
                  className="rounded-lg border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50/40"
                >
                  <p className="text-sm font-semibold text-violet-700">{item.course.category}</p>
                  <h3 className="mt-2 text-lg font-semibold tracking-normal">
                    {item.course.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                    {item.course.description}
                  </p>
                  <div className="mt-4 h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${progressTone(item.completionRate)}`}
                      style={{ width: `${item.completionRate}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {item.enrolledStudents} enrolled - {item.completionRate}% average progress
                  </p>
                </Link>
              ))}
            </div>
          </div>
          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold tracking-normal">Recent activity</h2>
            <div className="mt-5 grid gap-3">
              {summary.recentActivity.length > 0 ? (
                summary.recentActivity.map((activity) => (
                  <div key={activity.id} className="rounded-md bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">{activity.action}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatPortalDate(activity.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">
                  No activity has been recorded yet.
                </p>
              )}
            </div>
          </aside>
        </section>
      </div>
    </TenantShell>
  );
}
