import { AccountAuthShell } from '@/components/tenant-portal/account-auth-shell';
import { ResetPasswordForm } from '@/components/tenant-portal/reset-password-form';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const query = await searchParams;
  const token = Array.isArray(query.token) ? query.token[0] : query.token;

  return (
    <AccountAuthShell
      label="Password reset"
      title="Choose a new LC Academy password."
      description="A successful reset invalidates older organization sessions and upgrades the account to the current password hash format."
    >
      <ResetPasswordForm token={token} />
    </AccountAuthShell>
  );
}
