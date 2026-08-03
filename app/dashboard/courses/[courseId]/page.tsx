import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  PageHeader,
  TenantShell,
  formatPortalDate,
  progressTone,
} from '@/components/tenant-portal/tenant-shell';
import { getVisibleOrganizationCourseDetail } from '@/lib/server/course-portal-data';
import { canManageAccessCodes } from '@/lib/server/organization-session';
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
  const canGenerateAccessCodes = canManageAccessCodes(session.user, session.organization.id);
  const accessCodeGuests = detail.students.filter((student) =>
    student.id.startsWith('student-access-'),
  ).length;

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
          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-normal">People and access</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Review who can manage the course, which audience scopes are assigned, and how
                  access codes are being used.
                </p>
              </div>
              {canGenerateAccessCodes && (
                <Link
                  href={`/dashboard/access-codes/new?courseId=${detail.course.id}`}
                  className="rounded-md bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
                >
                  Generate access code
                </Link>
              )}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-950">Teachers</h3>
                {detail.teachers.length > 0 ? (
                  <ul className="mt-2 grid gap-1 text-sm text-slate-600">
                    {detail.teachers.map((teacher) => (
                      <li key={teacher.id}>
                        {teacher.name} - {teacher.email}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-amber-700">
                    Unassigned. A platform admin must assign a teacher before teacher-scoped tools
                    become available.
                  </p>
                )}
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-950">Audience scope</h3>
                <ul className="mt-2 grid gap-1 text-sm text-slate-600">
                  {detail.assignments.some((assignment) => !assignment.cohortId) && (
                    <li>Entire organization</li>
                  )}
                  {detail.cohorts.map((cohort) => (
                    <li key={cohort.id}>Cohort: {cohort.name}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-950">Enrolled learners</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {detail.students.length - accessCodeGuests} registered students
                </p>
                <p className="text-sm text-slate-600">{accessCodeGuests} access-code guests</p>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-950">Access codes</h3>
                {detail.accessCodes.length > 0 ? (
                  <ul className="mt-2 grid gap-1 text-sm text-slate-600">
                    {detail.accessCodes.map((accessCode) => (
                      <li key={accessCode.id}>
                        {accessCode.studentName
                          ? `Student: ${accessCode.studentName}`
                          : accessCode.cohortName
                            ? `Cohort: ${accessCode.cohortName}`
                            : 'Organization-wide'}{' '}
                        - {accessCode.currentUses}/{accessCode.maxUses ?? 'unlimited'} uses
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">No access codes created.</p>
                )}
              </div>
            </div>
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
