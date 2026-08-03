import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { UpstreamCourseGenerator } from '@/components/tenant-portal/upstream-course-generator';
import { PageHeader, TenantShell } from '@/components/tenant-portal/tenant-shell';
import { Button } from '@/components/ui/button';
import { listOrganizations } from '@/lib/server/course-portal-data';
import { requirePlatformPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function AdminGenerateCoursePage() {
  const [session, organizations] = await Promise.all([
    requirePlatformPageSession(),
    listOrganizations(),
  ]);

  return (
    <TenantShell user={session.user} admin>
      <PageHeader
        label="Course production"
        title="Generate with the current OpenMAIC engine"
        description="Create a source-backed classroom with upstream OpenMAIC, then register it in the LC Academy catalog. New courses remain drafts unless you explicitly publish them."
        action={
          <Button asChild variant="outline">
            <Link href="/admin/courses">
              <ArrowLeft className="size-4" />
              Course catalog
            </Link>
          </Button>
        }
      />
      <UpstreamCourseGenerator
        organizations={organizations.map((organization) => ({
          id: organization.id,
          name: organization.name,
        }))}
      />
    </TenantShell>
  );
}
