import Link from 'next/link';
import { GlobalCourseCatalog } from '@/components/tenant-portal/global-course-catalog';
import { PageHeader, TenantShell } from '@/components/tenant-portal/tenant-shell';
import { Button } from '@/components/ui/button';
import { getCoursePortalDataset } from '@/lib/server/course-portal-data';
import { requirePlatformPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function AdminCoursesPage() {
  const session = await requirePlatformPageSession();
  const dataset = await getCoursePortalDataset();
  const courses = [...dataset.courses].sort((a, b) =>
    (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt),
  );

  return (
    <TenantShell user={session.user} admin>
      <PageHeader
        label="Global courses"
        title="Linguistic Communication Academy courses"
        description="Academy courses can be assigned to one or more organizations."
        action={
          <Button asChild className="bg-violet-700 text-white hover:bg-violet-800">
            <Link href="/course-studio">Course Studio</Link>
          </Button>
        }
      />
      <GlobalCourseCatalog
        items={courses.map((course) => ({
          course,
          assignedOrganizationCount: new Set(
            dataset.assignments
              .filter((assignment) => assignment.courseId === course.id)
              .map((assignment) => assignment.organizationId),
          ).size,
        }))}
      />
    </TenantShell>
  );
}
