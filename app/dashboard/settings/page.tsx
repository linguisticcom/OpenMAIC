import { OrganizationSettingsForm } from '@/components/tenant-portal/organization-settings-form';
import { PageHeader, TenantShell, formatPortalDate } from '@/components/tenant-portal/tenant-shell';
import { requireOrganizationAdminPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function DashboardSettingsPage() {
  const session = await requireOrganizationAdminPageSession();
  const organization = session.organization;

  return (
    <TenantShell user={session.user} organization={organization}>
      <PageHeader
        label="Organization settings"
        title={organization.name}
        description="Branding and account metadata for this tenant."
      />
      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_360px]">
        <section className="grid gap-6">
          <OrganizationSettingsForm organization={organization} />
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold tracking-normal">Profile</h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <div>
                <dt className="font-semibold text-slate-950">Slug</dt>
                <dd className="mt-1 text-slate-600">{organization.slug}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-950">Contact email</dt>
                <dd className="mt-1 text-slate-600">{organization.contactEmail}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-950">Description</dt>
                <dd className="mt-1 max-w-3xl text-slate-600">{organization.description}</dd>
              </div>
            </dl>
          </div>
        </section>
        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold tracking-normal">Subscription</h2>
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold capitalize text-emerald-800">
            {organization.subscriptionStatus || 'Unspecified'}
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Created {formatPortalDate(organization.createdAt)}. Last updated{' '}
            {formatPortalDate(organization.updatedAt)}.
          </p>
        </aside>
      </div>
    </TenantShell>
  );
}
