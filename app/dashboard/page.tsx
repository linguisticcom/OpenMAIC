import Link from 'next/link';
import { ArrowRight, GraduationCap, KeyRound, Library, Users } from 'lucide-react';
import {
  MetricCard,
  PageHeader,
  TenantShell,
  formatPortalDate,
  progressTone,
} from '@/components/tenant-portal/tenant-shell';
import {
  ClassLibraryPanel,
  classLibraryToCards,
} from '@/components/tenant-portal/class-library-panel';
import { Button } from '@/components/ui/button';
import { getVisibleOrganizationDashboardSummary } from '@/lib/server/course-portal-data';
import { listClassLibrary } from '@/lib/server/class-library';
import { canManageAccessCodes } from '@/lib/server/organization-session';
import { requireOrganizationPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await requireOrganizationPageSession();
  const [summary, library] = await Promise.all([
    getVisibleOrganizationDashboardSummary(session.user, session.organization.id),
    listClassLibrary(),
  ]);
  if (!summary) return null;

  const canGenerateAccessCodes = canManageAccessCodes(session.user, session.organization.id);
  const canViewStudents =
    session.user.role === 'organization-admin' || session.user.role === 'teacher-manager';
  const libraryCards = classLibraryToCards(library.entries);

  return (
    <TenantShell user={session.user} organization={session.organization}>
      <PageHeader
        label="Organization dashboard"
        title={summary.organization.name}
        description="Start from the class library to show everything the academy teaches, then manage this organization's cohorts, codes and progress below."
        leading={
          <img
            src={summary.organization.logoUrl || '/lc-academy-logo.webp'}
            alt={`${summary.organization.name} logo`}
            className="max-h-10 max-w-28 object-contain"
          />
        }
        action={
          <Button asChild className="bg-violet-700 text-white hover:bg-violet-800">
            <Link href="/classes">
              <Library className="size-4" />
              Browse class library
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 p-5 sm:p-8">
        <ClassLibraryPanel cards={libraryCards} />

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-normal">Assigned to this organization</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Courses mapped to {summary.organization.name} with their learner progress.
              </p>
            </div>
            <Link className="text-sm font-semibold text-violet-700" href="/dashboard/courses">
              View all
            </Link>
          </div>
          {summary.courses.length > 0 ? (
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
          ) : (
            <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">
              No course is assigned to this organization yet. Everything in the class library above
              is still open to explore.
            </p>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Active courses"
            value={summary.activeCourses}
            helper="Assigned and active now"
          />
          <MetricCard
            label="Enrolled learners"
            value={summary.enrolledStudents}
            helper="Registered students and access-code guests"
            tone="blue"
          />
          <MetricCard
            label="Access codes"
            value={summary.activeAccessCodes}
            helper="Optional codes currently active"
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
          <h2 className="text-xl font-semibold tracking-normal">Administration</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Only needed once a school wants codes, cohorts and accounts. Exploring classes requires
            none of it.
          </p>
          <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="min-h-10">
                <Link href="/dashboard/courses">
                  <GraduationCap className="size-4" />
                  Course management
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              {canViewStudents && (
                <Button asChild variant="outline" className="min-h-10">
                  <Link href="/dashboard/students">
                    <Users className="size-4" />
                    Students
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
              {canGenerateAccessCodes && (
                <Button asChild variant="outline" className="min-h-10">
                  <Link href="/dashboard/access-codes/new">
                    <KeyRound className="size-4" />
                    Generate access code
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Recent activity
              </h3>
              <div className="mt-3 grid gap-2">
                {summary.recentActivity.length > 0 ? (
                  summary.recentActivity.slice(0, 4).map((activity) => (
                    <div key={activity.id} className="rounded-md bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">{activity.action}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatPortalDate(activity.createdAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">
                    No activity has been recorded yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </TenantShell>
  );
}
