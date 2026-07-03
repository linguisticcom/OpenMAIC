import { notFound } from 'next/navigation';
import {
  PageHeader,
  TenantShell,
  formatPortalDate,
  progressTone,
} from '@/components/tenant-portal/tenant-shell';
import { getVisibleOrganizationCourseDetail } from '@/lib/server/course-portal-data';
import { requireOrganizationPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function DashboardCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await requireOrganizationPageSession();
  const { courseId } = await params;
  const detail = await getVisibleOrganizationCourseDetail(
    session.user,
    session.organization.id,
    courseId,
  );
  if (!detail) notFound();

  return (
    <TenantShell user={session.user} organization={session.organization}>
      <PageHeader
        label="Course detail"
        title={detail.course.title}
        description={detail.course.description}
      />
      <div className="grid gap-6 p-5 sm:p-8 xl:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold tracking-normal">Student progress</h2>
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {detail.enrollments.length > 0 ? (
                  detail.enrollments.map((enrollment) => {
                    const student = detail.students.find(
                      (item) => item.id === enrollment.studentId,
                    );
                    return (
                      <tr key={enrollment.id}>
                        <td className="px-4 py-3 font-medium text-slate-950">
                          {student?.name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-2 w-28 rounded-full bg-slate-100">
                            <div
                              className={`h-2 rounded-full ${progressTone(enrollment.progressPercentage)}`}
                              style={{ width: `${enrollment.progressPercentage}%` }}
                            />
                          </div>
                          <span className="mt-1 block text-xs text-slate-500">
                            {enrollment.progressPercentage}%
                          </span>
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-600">
                          {enrollment.status.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatPortalDate(enrollment.lastActivityAt || enrollment.startedAt)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={4}>
                      No student enrollments have been recorded for this course.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold tracking-normal">Course metrics</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Enrolled students</dt>
                <dd className="font-semibold">{detail.enrollments.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Completion rate</dt>
                <dd className="font-semibold">{detail.completionRate}%</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Access codes</dt>
                <dd className="font-semibold">{detail.accessCodes.length}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold tracking-normal">Modules</h2>
            <div className="mt-4 grid gap-3">
              {detail.course.modules.map((module, index) => (
                <div key={module.id} className="rounded-md bg-slate-50 p-3">
                  <p className="text-sm font-semibold">
                    {index + 1}. {module.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {module.durationMinutes} min
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </TenantShell>
  );
}
