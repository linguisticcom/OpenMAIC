import { AccountAuthShell } from '@/components/tenant-portal/account-auth-shell';
import { ForgotPasswordForm } from '@/components/tenant-portal/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <AccountAuthShell
      label="Account recovery"
      title="Reset access to your LC Academy account."
      description="Enter the email address attached to your organization account and LC Academy will send a reset link when the account is eligible."
    >
      <ForgotPasswordForm />
    </AccountAuthShell>
  );
}
