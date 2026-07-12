import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, KeyRound, Users } from 'lucide-react';
import { AccessCodeManagementTable } from '@/components/tenant-portal/access-code-management-table';
import { OrganizationDeleteDialog } from '@/components/tenant-portal/organization-delete-dialog';
import { MetricCard, PageHeader, TenantShell } from '@/components/tenant-portal/tenant-shell';
import { OrganizationSettingsForm } from '@/components/tenant-portal/organization-settings-form';
import {
  getCoursePortalDataset,
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
  const dataset = await getCoursePortalDataset();
  const teachers = dataset.users.filter(
    (user) => user.organizationId === organization.id && user.role === 'teacher-manager',
  );

  return (
    <TenantShell user={session.user} admin>
      <PageHeader
        label="Organization detail"
        title={organization.name}
        description={organization.description}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/u/${organization.slug}`}
              target="_blank"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <ExternalLink className="size-4" />
              Public portal
            </Link>
            <Link
              href={`/admin/access-codes/new?organizationId=${organization.id}`}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800"
            >
              <KeyRound className="size-4" />
              Generate code
            </Link>
          </div>
        }
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
            value={summary.activeAccessCodes}
            helper="Usable codes"
            tone="emerald"
          />
          <MetricCard
            label="Completion"
            value={`${summary.averageCompletionRate}%`}
            helper="Average progress"
            tone="amber"
          />
        </section>
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold tracking-normal">Assigned courses</h2>
            <div className="mt-5 grid gap-4">
              {summary.courses.map((item) => (
                <div
                  key={item.assignmentId}
                  className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-violet-700">{item.course.category}</p>
                    <h3 className="mt-1 text-lg font-semibold">{item.course.title}</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {item.enrolledStudents} enrolled - {item.completionRate}% completion
                    </p>
                  </div>
                  <Link
                    href={`/u/${organization.slug}/courses/${item.course.slug}`}
                    target="_blank"
                    className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900"
                  >
                    Test course <ExternalLink className="size-4" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="sr-only">Organization settings</h2>
            <OrganizationSettingsForm organization={organization} />
          </section>
        </div>
        <section className="grid gap-4 md:grid-cols-2">
          <Link
            href={`/admin/students?organizationId=${organization.id}`}
            className="flex items-center justify-between border-y border-slate-200 bg-white p-5 hover:bg-violet-50/40"
          >
            <div>
              <p className="text-sm font-semibold text-violet-700">Learners</p>
              <h2 className="mt-1 text-lg font-semibold">{students.length} student records</h2>
              <p className="mt-1 text-sm text-slate-500">View enrollment and cohort context.</p>
            </div>
            <Users className="size-5 text-slate-400" />
          </Link>
          <Link
            href={`/admin/teachers?organizationId=${organization.id}`}
            className="flex items-center justify-between border-y border-slate-200 bg-white p-5 hover:bg-violet-50/40"
          >
            <div>
              <p className="text-sm font-semibold text-violet-700">Teaching team</p>
              <h2 className="mt-1 text-lg font-semibold">{teachers.length} teacher accounts</h2>
              <p className="mt-1 text-sm text-slate-500">View permissions and assignments.</p>
            </div>
            <Users className="size-5 text-slate-400" />
          </Link>
        </section>
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
        <section>
          <div className="px-1">
            <h2 className="text-xl font-semibold tracking-normal">Access-code activity</h2>
            <p className="mt-1 text-sm text-slate-500">
              Usage and status for every code created in this tenant.
            </p>
          </div>
          <div className="-mx-5 sm:-mx-8">
            <AccessCodeManagementTable organizationId={organization.id} accessCodes={accessCodes} />
          </div>
        </section>
        <section className="rounded-lg border border-red-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-950">Danger zone</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Deleting a tenant removes its people, assignments, enrollments, codes, and activity
            while preserving the global course catalog.
          </p>
          <div className="mt-4">
            <OrganizationDeleteDialog
              organizationId={organization.id}
              organizationName={organization.name}
            />
          </div>
        </section>
      </div>
    </TenantShell>
  );
}
