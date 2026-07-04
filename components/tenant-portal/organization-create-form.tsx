'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function OrganizationCreateForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('trial');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
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
      const response = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          contactEmail,
          logoUrl: logoUrl || undefined,
          description,
          welcomeMessage: welcomeMessage || undefined,
          subscriptionStatus,
          adminName,
          adminEmail,
          adminPassword,
        }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
        organization?: { name: string };
        adminUser?: { email: string };
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to create organization.');
      }
      setMessage(
        `${payload.organization?.name || name} created with admin ${payload.adminUser?.email || adminEmail}.`,
      );
      setName('');
      setSlug('');
      setContactEmail('');
      setLogoUrl('');
      setDescription('');
      setWelcomeMessage('');
      setSubscriptionStatus('trial');
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create organization.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-700">
          <Building2 className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-normal">Create organization account</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Provision a tenant and its first organization-admin login.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Organization name
          <input
            value={name}
            onChange={(event) => {
              const nextName = event.target.value;
              setName(nextName);
              if (!slug) setSlug(slugFromName(nextName));
            }}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Slug
          <input
            value={slug}
            onChange={(event) => setSlug(slugFromName(event.target.value))}
            className="h-11 rounded-md border border-slate-200 px-3 font-mono text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            placeholder="client-school"
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
          Subscription
          <select
            value={subscriptionStatus}
            onChange={(event) => setSubscriptionStatus(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          >
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="past_due">Past due</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
          Logo URL optional
          <input
            value={logoUrl}
            onChange={(event) => setLogoUrl(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            placeholder="/lc-academy-logo.webp"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-24 rounded-md border border-slate-200 px-3 py-2 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
          Portal welcome message optional
          <textarea
            value={welcomeMessage}
            onChange={(event) => setWelcomeMessage(event.target.value)}
            className="min-h-20 rounded-md border border-slate-200 px-3 py-2 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Admin name
          <input
            value={adminName}
            onChange={(event) => setAdminName(event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Admin email
          <input
            value={adminEmail}
            onChange={(event) => setAdminEmail(event.target.value)}
            type="email"
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
          Temporary password
          <input
            value={adminPassword}
            onChange={(event) => setAdminPassword(event.target.value)}
            type="password"
            autoComplete="new-password"
            className="h-11 rounded-md border border-slate-200 px-3 text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            required
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
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Building2 className="size-4" />
        )}
        Create organization
      </Button>
    </form>
  );
}
