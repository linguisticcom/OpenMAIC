import { AccessCodeCreator } from '@/components/tenant-portal/access-code-creator';
import { PageHeader, TenantShell } from '@/components/tenant-portal/tenant-shell';
import {
  getOrganizationById,
  listOrganizations,
  listVisibleOrganizationCohorts,
  listVisibleOrganizationCourseSummaries,
  listVisibleOrganizationStudentSummaries,
} from '@/lib/server/course-portal-data';
import { requirePlatformPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function AdminNewAccessCodePage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string; courseId?: string }>;
}) {
  const session = await requirePlatformPageSession();
  const [{ organizationId: requestedOrganizationId, courseId }, organizations] = await Promise.all([
    searchParams,
    listOrganizations(),
  ]);
  const organizationId = requestedOrganizationId || organizations[0]?.id;
  const organization = organizationId ? await getOrganizationById(organizationId) : undefined;
  const [courses, studentSummaries, cohorts] = organization
    ? await Promise.all([
        listVisibleOrganizationCourseSummaries(session.user, organization.id),
        listVisibleOrganizationStudentSummaries(session.user, organization.id),
        listVisibleOrganizationCohorts(session.user, organization.id),
      ])
    : [[], [], []];

  return (
    <TenantShell user={session.user} admin>
      <PageHeader
        label="Generate access code"
        title="Create a tenant-scoped code"
        description="Choose the organization first, then restrict the code to an assigned course, cohort, or student."
      />
      <div className="grid gap-5 p-5 sm:p-8">
        <form className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <label className="grid min-w-64 flex-1 gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Organization
            <select
              name="organizationId"
              defaultValue={organizationId || ''}
              className="h-11 min-w-0 w-full rounded-md border border-slate-200 px-3 text-sm font-normal normal-case text-slate-950"
            >
              {organizations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button className="h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            Load organization
          </button>
        </form>
        {organization ? (
          <AccessCodeCreator
            key={organization.id}
            organizationId={organization.id}
            courses={courses}
            cohorts={cohorts}
            students={studentSummaries.map((summary) => summary.student)}
            initialCourseId={courseId}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            Create an organization before generating access codes.
          </div>
        )}
      </div>
    </TenantShell>
  );
}
