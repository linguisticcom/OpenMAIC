import Link from 'next/link';
import { MetricCard, PageHeader, TenantShell } from '@/components/tenant-portal/tenant-shell';
import { OrganizationCreateForm } from '@/components/tenant-portal/organization-create-form';
import {
  getOrganizationDashboardSummary,
  listOrganizations,
} from '@/lib/server/course-portal-data';
import { requirePlatformPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function AdminOrganizationsPage() {
  const session = await requirePlatformPageSession();
  const organizations = await listOrganizations();
  const summaries = await Promise.all(
    organizations.map((organization) => getOrganizationDashboardSummary(organization.id)),
  );

  return (
    <TenantShell user={session.user} admin>
      <PageHeader
        label="Platform admin"
        title="Organizations"
        description="Global view across client tenants. Organization users cannot access this route."
      />
      <div className="grid gap-6 p-5 sm:p-8">
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Organizations"
            value={organizations.length}
            helper="Client institutions"
          />
          <MetricCard
            label="Students"
            value={summaries.reduce((sum, item) => sum + (item?.enrolledStudents || 0), 0)}
            helper="Across all tenants"
            tone="blue"
          />
          <MetricCard
            label="Active codes"
            value={summaries.reduce((sum, item) => sum + (item?.activeAccessCodes || 0), 0)}
            helper="Across all tenants"
            tone="emerald"
          />
        </section>
        <OrganizationCreateForm />
        <section className="grid gap-4 lg:grid-cols-3">
          {organizations.map((organization) => {
            const summary = summaries.find((item) => item?.organization.id === organization.id);
            return (
              <Link
                key={organization.id}
                href={`/admin/organizations/${organization.id}`}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                    {organization.logoUrl ? (
                      <img src={organization.logoUrl} alt="" className="max-h-8 max-w-24" />
                    ) : (
                      organization.name.slice(0, 2)
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-normal">{organization.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{organization.contactEmail}</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="font-semibold">{summary?.activeCourses || 0}</p>
                    <p className="text-slate-500">Courses</p>
                  </div>
                  <div>
                    <p className="font-semibold">{summary?.enrolledStudents || 0}</p>
                    <p className="text-slate-500">Students</p>
                  </div>
                  <div>
                    <p className="font-semibold">{summary?.activeAccessCodes || 0}</p>
                    <p className="text-slate-500">Codes</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </TenantShell>
  );
}
