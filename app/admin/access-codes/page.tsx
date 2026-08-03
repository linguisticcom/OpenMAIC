import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { AccessCodeManagementTable } from '@/components/tenant-portal/access-code-management-table';
import { PageHeader, TenantShell } from '@/components/tenant-portal/tenant-shell';
import { Button } from '@/components/ui/button';
import { listOrganizationAccessCodes, listOrganizations } from '@/lib/server/course-portal-data';
import { requirePlatformPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function AdminAccessCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string }>;
}) {
  const session = await requirePlatformPageSession();
  const [{ organizationId }, organizations] = await Promise.all([
    searchParams,
    listOrganizations(),
  ]);
  const visibleOrganizations = organizationId
    ? organizations.filter((organization) => organization.id === organizationId)
    : organizations;
  const accessCodes = (
    await Promise.all(
      visibleOrganizations.map((organization) => listOrganizationAccessCodes(organization.id)),
    )
  )
    .flat()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <TenantShell user={session.user} admin>
      <PageHeader
        label="Platform access"
        title="Access codes"
        description="Review code scope, usage, expiry, and status across every organization. Plaintext secrets are shown only once at creation."
        action={
          <Button asChild className="bg-violet-700 text-white hover:bg-violet-800">
            <Link href="/admin/access-codes/new">
              <PlusCircle className="size-4" />
              Generate code
            </Link>
          </Button>
        }
      />
      <form className="mx-5 mt-5 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:mx-8 sm:mt-8">
        <label className="grid min-w-64 gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Organization
          <select
            name="organizationId"
            defaultValue={organizationId || ''}
            className="h-11 min-w-0 w-full rounded-md border border-slate-200 px-3 text-sm font-normal normal-case text-slate-950"
          >
            <option value="">All organizations</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>
        <button className="h-11 rounded-md bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800">
          Apply filter
        </button>
      </form>
      <AccessCodeManagementTable accessCodes={accessCodes} />
    </TenantShell>
  );
}
