import Link from 'next/link';
import { PageHeader, TenantShell, formatPortalDate } from '@/components/tenant-portal/tenant-shell';
import { getCoursePortalDataset } from '@/lib/server/course-portal-data';
import { requirePlatformPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string }>;
}) {
  const session = await requirePlatformPageSession();
  const [{ organizationId }, dataset] = await Promise.all([searchParams, getCoursePortalDataset()]);
  const students = dataset.students.filter(
    (student) => !organizationId || student.organizationId === organizationId,
  );

  return (
    <TenantShell user={session.user} admin>
      <PageHeader
        label="People"
        title="Students"
        description="Platform-wide learner visibility with tenant and enrollment context."
      />
      <div className="grid gap-5 p-5 sm:p-8">
        <form className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <label className="grid min-w-64 gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Organization
            <select
              name="organizationId"
              defaultValue={organizationId || ''}
              className="h-11 min-w-0 w-full rounded-md border border-slate-200 px-3 text-sm font-normal normal-case text-slate-950"
            >
              <option value="">All organizations</option>
              {dataset.organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
          <button className="h-11 rounded-md bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800">
            Apply filter
          </button>
        </form>
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4 text-sm text-slate-600">
            Showing {students.length} of {dataset.students.length} students
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Organization</th>
                  <th className="px-5 py-3">Program / cohort</th>
                  <th className="px-5 py-3">Enrollments</th>
                  <th className="px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((student) => {
                  const organization = dataset.organizations.find(
                    (item) => item.id === student.organizationId,
                  );
                  const cohort = dataset.cohorts.find((item) => item.id === student.cohortId);
                  return (
                    <tr key={student.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-950">{student.name}</p>
                        <p className="text-xs text-slate-500">
                          {student.email || student.externalStudentId || 'Access-code learner'}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          className="font-medium text-violet-700"
                          href={`/admin/organizations/${student.organizationId}`}
                        >
                          {organization?.name || student.organizationId}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {student.programName || cohort?.name || 'Not assigned'}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {
                          dataset.enrollments.filter(
                            (enrollment) => enrollment.studentId === student.id,
                          ).length
                        }
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {formatPortalDate(student.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </TenantShell>
  );
}
