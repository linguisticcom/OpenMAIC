import { InvitationCreateForm } from '@/components/tenant-portal/invitation-create-form';
import { PageHeader, TenantShell, formatPortalDate } from '@/components/tenant-portal/tenant-shell';
import { listVisibleAccountInvitations } from '@/lib/server/course-portal-data';
import { requireOrganizationAdminPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function DashboardInvitationsPage() {
  const session = await requireOrganizationAdminPageSession();
  const invitations = await listVisibleAccountInvitations(session.user);

  return (
    <TenantShell user={session.user} organization={session.organization}>
      <PageHeader
        label="Account invitations"
        title="Invite tenant users"
        description="Organization admins can invite teacher managers and learners only within their own tenant."
      />
      <div className="grid gap-6 p-5 sm:p-8">
        <InvitationCreateForm organizationId={session.organization.id} />
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
                  <p className="text-slate-500">{invitation.name || invitation.role}</p>
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
