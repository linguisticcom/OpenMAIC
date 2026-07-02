import { notFound } from 'next/navigation';
import {
  PageHeader,
  TenantShell,
  formatPortalDate,
  progressTone,
} from '@/components/tenant-portal/tenant-shell';
import { getVisibleOrganizationStudentDetail } from '@/lib/server/course-portal-data';
import { requireStudentManagementPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function DashboardStudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const session = await requireStudentManagementPageSession();
  const { studentId } = await params;
  const detail = await getVisibleOrganizationStudentDetail(
    session.user,
    session.organization.id,
    studentId,
  );
  if (!detail) notFound();

  return (
    <TenantShell user={session.user} organization={session.organization}>
      <PageHeader
        label="Student profile"
        title={detail.student.name}
        description={detail.student.email || detail.student.externalStudentId || 'Student account'}
      />
      <div className="grid gap-6 p-5 sm:p-8 xl:grid-cols-[1fr_340px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold tracking-normal">Course progress</h2>
          <div className="mt-5 grid gap-4">
            {detail.progress.map((item) => (
              <div key={item.course.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-violet-700">{item.course.category}</p>
                    <h3 className="mt-1 text-lg font-semibold">{item.course.title}</h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                    {(item.enrollment?.status || 'not_started').replace('_', ' ')}
                  </span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${progressTone(item.enrollment?.progressPercentage || 0)}`}
                    style={{ width: `${item.enrollment?.progressPercentage || 0}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {item.enrollment?.progressPercentage || 0}% progress - Last activity{' '}
                  {formatPortalDate(item.enrollment?.lastActivityAt)}
                </p>
              </div>
            ))}
          </div>
        </section>
        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold tracking-normal">Activity</h2>
          <div className="mt-5 grid gap-3">
            {detail.activity.map((activity) => (
              <div key={activity.id} className="rounded-md bg-slate-50 p-3">
                <p className="text-sm font-semibold">{activity.action}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatPortalDate(activity.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </TenantShell>
  );
}
