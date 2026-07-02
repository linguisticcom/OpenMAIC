'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Organization } from '@/lib/types/course-portal';

export function OrganizationSettingsForm({ organization }: { organization: Organization }) {
  const router = useRouter();
  const [name, setName] = useState(organization.name);
  const [contactEmail, setContactEmail] = useState(organization.contactEmail);
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl || '');
  const [description, setDescription] = useState(organization.description);
  const [welcomeMessage, setWelcomeMessage] = useState(organization.welcomeMessage || '');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setMessage(null);
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/organization/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          name,
          contactEmail,
          logoUrl,
          description,
          welcomeMessage,
        }),
      });
      const payload = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to update organization settings.');
      }
      setMessage('Organization settings saved.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update organization settings.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Organization name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Contact email
          <input
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            type="email"
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Logo URL optional
          <input
            value={logoUrl}
            onChange={(event) => setLogoUrl(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            placeholder="/logo-horizontal.png"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-28 rounded-md border border-slate-200 px-3 py-2 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Portal welcome message
          <textarea
            value={welcomeMessage}
            onChange={(event) => setWelcomeMessage(event.target.value)}
            className="min-h-24 rounded-md border border-slate-200 px-3 py-2 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            placeholder="Optional message shown on the public organization portal"
          />
        </label>
      </div>
      {message && (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 min-h-10 bg-violet-700 text-white hover:bg-violet-800"
      >
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save settings
      </Button>
    </form>
  );
}
