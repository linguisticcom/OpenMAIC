import { CourseManagementList } from '@/components/tenant-portal/course-management-list';
import { PageHeader, TenantShell } from '@/components/tenant-portal/tenant-shell';
import { listVisibleOrganizationCourseSummaries } from '@/lib/server/course-portal-data';
import { canManageAccessCodes } from '@/lib/server/organization-session';
import { requireOrganizationPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function DashboardCoursesPage() {
  const session = await requireOrganizationPageSession();
  const courses = await listVisibleOrganizationCourseSummaries(
    session.user,
    session.organization.id,
  );

  return (
    <TenantShell user={session.user} organization={session.organization}>
      <PageHeader
        label="Course management"
        title="Assigned courses"
        description="Only courses assigned to this organization are visible here."
      />
      <CourseManagementList
        courses={courses}
        canGenerateAccessCodes={canManageAccessCodes(session.user, session.organization.id)}
      />
    </TenantShell>
  );
}
