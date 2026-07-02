import { notFound } from 'next/navigation';
import { MetricCard, PageHeader, TenantShell } from '@/components/tenant-portal/tenant-shell';
import {
  getOrganizationById,
  getOrganizationDashboardSummary,
  listOrganizationAccessCodes,
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

  const [summary, students, accessCodes] = await Promise.all([
    getOrganizationDashboardSummary(organization.id),
    listOrganizationStudents(organization.id),
    listOrganizationAccessCodes(organization.id),
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
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold tracking-normal">Assigned courses</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
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
      </div>
    </TenantShell>
  );
}
