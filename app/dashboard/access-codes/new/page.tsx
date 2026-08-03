import { AccessCodeCreator } from '@/components/tenant-portal/access-code-creator';
import { PageHeader, TenantShell } from '@/components/tenant-portal/tenant-shell';
import {
  listVisibleOrganizationCohorts,
  listVisibleOrganizationCourseSummaries,
  listVisibleOrganizationStudentSummaries,
} from '@/lib/server/course-portal-data';
import { requireAccessCodeManagerPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function NewAccessCodePage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const session = await requireAccessCodeManagerPageSession();
  const [{ courseId: initialCourseId }, courses, studentSummaries, cohorts] = await Promise.all([
    searchParams,
    listVisibleOrganizationCourseSummaries(session.user, session.organization.id),
    listVisibleOrganizationStudentSummaries(session.user, session.organization.id),
    listVisibleOrganizationCohorts(session.user, session.organization.id),
  ]);

  return (
    <TenantShell user={session.user} organization={session.organization}>
      <PageHeader
        label="Generate access code"
        title="Create a tenant-scoped code"
        description="Codes can be linked to this organization, a course, a cohort, and optionally a student."
      />
      <div className="p-5 sm:p-8">
        <AccessCodeCreator
          organizationId={session.organization.id}
          courses={courses}
          cohorts={cohorts}
          students={studentSummaries.map((summary) => summary.student)}
          initialCourseId={initialCourseId}
        />
      </div>
    </TenantShell>
  );
}
