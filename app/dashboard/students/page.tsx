import { StudentManagementTable } from '@/components/tenant-portal/student-management-table';
import { PageHeader, TenantShell } from '@/components/tenant-portal/tenant-shell';
import { listVisibleOrganizationStudentSummaries } from '@/lib/server/course-portal-data';
import { requireStudentManagementPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function DashboardStudentsPage() {
  const session = await requireStudentManagementPageSession();
  const students = await listVisibleOrganizationStudentSummaries(
    session.user,
    session.organization.id,
  );

  return (
    <TenantShell user={session.user} organization={session.organization}>
      <PageHeader
        label="Student management"
        title="Students"
        description="Students are tenant-scoped and cannot be viewed across organizations."
      />
      <StudentManagementTable students={students} />
    </TenantShell>
  );
}
