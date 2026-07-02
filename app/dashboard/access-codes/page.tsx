import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccessCodeManagementTable } from '@/components/tenant-portal/access-code-management-table';
import { PageHeader, TenantShell } from '@/components/tenant-portal/tenant-shell';
import { listOrganizationAccessCodes } from '@/lib/server/course-portal-data';
import { requireAccessCodeManagerPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function DashboardAccessCodesPage() {
  const session = await requireAccessCodeManagerPageSession();
  const accessCodes = await listOrganizationAccessCodes(session.organization.id);

  return (
    <TenantShell user={session.user} organization={session.organization}>
      <PageHeader
        label="Access-code management"
        title="Access codes"
        description="Code secrets are hashed server-side and are not exposed in this list."
        action={
          <Button asChild className="bg-violet-700 text-white hover:bg-violet-800">
            <Link href="/dashboard/access-codes/new">
              <PlusCircle className="size-4" />
              Generate code
            </Link>
          </Button>
        }
      />
      <AccessCodeManagementTable
        organizationId={session.organization.id}
        accessCodes={accessCodes}
      />
    </TenantShell>
  );
}
