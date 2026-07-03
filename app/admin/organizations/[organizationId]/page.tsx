import { notFound } from 'next/navigation';
import { MetricCard, PageHeader, TenantShell } from '@/components/tenant-portal/tenant-shell';
import { OrganizationSettingsForm } from '@/components/tenant-portal/organization-settings-form';
import {
  getOrganizationById,
  getOrganizationDashboardSummary,
  listOrganizationAccessCodes,
  listOrganizationAdminUsers,
  listOrganizationStudents,
} from '@/lib/server/course-portal-data';
import { requirePlatformPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const session = await requirePlatformPageSession();
  const { organizationId } = await params;
  const organization = await getOrganizationById(organizationId);
  if (!organization) notFound();

  const [summary, students, accessCodes, adminUsers] = await Promise.all([
    getOrganizationDashboardSummary(organization.id),
    listOrganizationStudents(organization.id),
    listOrganizationAccessCodes(organization.id),
    listOrganizationAdminUsers(organization.id),
  ]);
  if (!summary) notFound();

  return (
    <TenantShell user={session.user} admin>
      <PageHeader
        label="Organization detail"
        title={organization.name}
        description={organization.description}
      />
      <div className="grid gap-6 p-5 sm:p-8">
        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Courses" value={summary.activeCourses} helper="Active assignments" />
          <MetricCard
            label="Students"
            value={students.length}
            helper="Tenant student records"
            tone="blue"
          />
          <MetricCard
            label="Access codes"
            value={accessCodes.filter((code) => code.isActive).length}
            helper="Active codes"
            tone="emerald"
          />
          <MetricCard
            label="Completion"
            value={`${summary.averageCompletionRate}%`}
            helper="Average progress"
            tone="amber"
          />
        </section>
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold tracking-normal">Assigned courses</h2>
            <div className="mt-5 grid gap-4">
              {summary.courses.map((item) => (
                <div key={item.assignmentId} className="rounded-lg border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-violet-700">{item.course.category}</p>
                  <h3 className="mt-1 text-lg font-semibold">{item.course.title}</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {item.enrolledStudents} enrolled - {item.completionRate}% completion
                  </p>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="sr-only">Organization settings</h2>
            <OrganizationSettingsForm organization={organization} />
          </section>
        </div>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-normal">Organization admins</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Users who can manage this tenant dashboard and account settings.
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-500">{adminUsers.length} admin users</p>
          </div>
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
            {adminUsers.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {adminUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 font-semibold text-slate-950">{user.name}</td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3 text-slate-600">Organization admin</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-sm text-slate-500">
                No organization admin users are registered for this tenant.
              </div>
            )}
          </div>
        </section>
      </div>
    </TenantShell>
  );
}
