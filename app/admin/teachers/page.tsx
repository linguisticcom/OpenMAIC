import Link from 'next/link';
import { PageHeader, TenantShell, formatPortalDate } from '@/components/tenant-portal/tenant-shell';
import { getCoursePortalDataset } from '@/lib/server/course-portal-data';
import { requirePlatformPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function AdminTeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string }>;
}) {
  const session = await requirePlatformPageSession();
  const [{ organizationId }, dataset] = await Promise.all([searchParams, getCoursePortalDataset()]);
  const teachers = dataset.users.filter(
    (user) =>
      user.role === 'teacher-manager' &&
      (!organizationId || user.organizationId === organizationId),
  );

  return (
    <TenantShell user={session.user} admin>
      <PageHeader
        label="People"
        title="Teachers"
        description="Teacher-manager accounts, permissions, and assigned course scope across every tenant."
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
            Showing {teachers.length} teacher accounts
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Teacher</th>
                  <th className="px-5 py-3">Organization</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Assigned courses</th>
                  <th className="px-5 py-3">Access codes</th>
                  <th className="px-5 py-3">Last login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {teachers.map((teacher) => {
                  const organization = dataset.organizations.find(
                    (item) => item.id === teacher.organizationId,
                  );
                  return (
                    <tr key={teacher.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-950">{teacher.name}</p>
                        <p className="text-xs text-slate-500">{teacher.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        {teacher.organizationId ? (
                          <Link
                            href={`/admin/organizations/${teacher.organizationId}`}
                            className="font-medium text-violet-700"
                          >
                            {organization?.name || teacher.organizationId}
                          </Link>
                        ) : (
                          'Unscoped'
                        )}
                      </td>
                      <td className="px-5 py-4 capitalize text-slate-600">
                        {teacher.status || 'active'}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {
                          dataset.assignments.filter(
                            (assignment) => assignment.teacherUserId === teacher.id,
                          ).length
                        }
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {teacher.canGenerateAccessCodes ? 'Allowed' : 'Not allowed'}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {formatPortalDate(teacher.lastLoginAt)}
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
