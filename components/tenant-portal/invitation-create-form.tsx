'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PortalUserRole } from '@/lib/types/course-portal';

type OrganizationOption = {
  id: string;
  name: string;
};

export function InvitationCreateForm({
  organizations = [],
  organizationId,
  platformAdmin,
}: {
  organizations?: OrganizationOption[];
  organizationId?: string;
  platformAdmin?: boolean;
}) {
  const roleOptions: Array<{ value: PortalUserRole; label: string }> = platformAdmin
    ? [
        { value: 'organization-admin', label: 'Organization admin' },
        { value: 'teacher-manager', label: 'Teacher manager' },
        { value: 'student', label: 'Student' },
      ]
    : [
        { value: 'teacher-manager', label: 'Teacher manager' },
        { value: 'student', label: 'Student' },
      ];
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    organizationId || organizations[0]?.id || '',
  );
  const [role, setRole] = useState<PortalUserRole>(roleOptions[0].value);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setMessage(null);
    setInviteUrl(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/organization/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: selectedOrganizationId,
          role,
          name,
          email,
        }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
        inviteUrl?: string;
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to create invitation.');
      }
      setName('');
      setEmail('');
      setInviteUrl(payload.inviteUrl || null);
      setMessage('Invitation created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create invitation.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {!organizationId && (
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Organization
            <select
              value={selectedOrganizationId}
              onChange={(event) => setSelectedOrganizationId(event.target.value)}
              className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as PortalUserRole)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Name
          <input
            value={name}
            autoComplete="name"
            onChange={(event) => setName(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Email
          <input
            value={email}
            type="email"
            required
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          />
        </label>
      </div>
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      )}
      {inviteUrl && (
        <Link
          href={inviteUrl}
          className="mt-3 block rounded-md bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700"
        >
          Open development invitation link
        </Link>
      )}
      <Button
        type="submit"
        disabled={isSubmitting || !email.trim() || !selectedOrganizationId}
        className="mt-5 min-h-10 bg-violet-700 text-white hover:bg-violet-800"
      >
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Send invitation
      </Button>
    </form>
  );
}
