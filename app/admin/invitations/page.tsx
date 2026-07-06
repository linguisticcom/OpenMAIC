import { InvitationCreateForm } from '@/components/tenant-portal/invitation-create-form';
import { PageHeader, TenantShell, formatPortalDate } from '@/components/tenant-portal/tenant-shell';
import { listOrganizations, listVisibleAccountInvitations } from '@/lib/server/course-portal-data';
import { requirePlatformPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function AdminInvitationsPage() {
  const session = await requirePlatformPageSession();
  const [organizations, invitations] = await Promise.all([
    listOrganizations(),
    listVisibleAccountInvitations(session.user),
  ]);

  return (
    <TenantShell user={session.user} admin>
      <PageHeader
        label="Platform invitations"
        title="Invite organization admins"
        description="Platform admins can issue organization-admin invitations and tenant-scoped user invitations."
      />
      <div className="grid gap-6 p-5 sm:p-8">
        <InvitationCreateForm
          platformAdmin
          organizations={organizations.map((organization) => ({
            id: organization.id,
            name: organization.name,
          }))}
        />
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-normal text-slate-950">
            Recent invitations
          </h2>
          <div className="mt-4 divide-y divide-slate-100">
            {invitations.length === 0 && (
              <p className="py-4 text-sm text-slate-500">No invitations have been created yet.</p>
            )}
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="grid gap-1 py-4 text-sm md:grid-cols-[1fr_160px_140px]"
              >
                <div>
                  <p className="font-medium text-slate-950">{invitation.email}</p>
                  <p className="text-slate-500">{invitation.role}</p>
                </div>
                <p className="capitalize text-slate-600">{invitation.status}</p>
                <p className="text-slate-500">{formatPortalDate(invitation.expiresAt)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </TenantShell>
  );
}
