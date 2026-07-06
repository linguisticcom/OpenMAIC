import Link from 'next/link';
import { AccountAuthShell } from '@/components/tenant-portal/account-auth-shell';
import { InviteAcceptForm } from '@/components/tenant-portal/invite-accept-form';
import { hashAuthToken } from '@/lib/server/auth-tokens';
import { getUsableAccountInvitationByTokenHash } from '@/lib/server/course-portal-data';

export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await getUsableAccountInvitationByTokenHash(hashAuthToken(token));

  return (
    <AccountAuthShell
      label="Account invitation"
      title="Join LC Academy."
      description="Accept the invitation with the role and organization selected by your administrator."
    >
      {invitation ? (
        <InviteAcceptForm token={token} defaultName={invitation.name || ''} />
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            This invitation link is invalid, expired, or already used.
          </p>
          <Link
            href="/login"
            className="mt-4 block text-center text-sm font-medium text-violet-700"
          >
            Back to sign in
          </Link>
        </section>
      )}
    </AccountAuthShell>
  );
}
