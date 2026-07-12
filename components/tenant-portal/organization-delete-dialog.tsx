'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OrganizationDeleteDialog({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationName, setConfirmationName] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canDelete = confirmationName === organizationName && acknowledged && !isSubmitting;

  async function handleDelete() {
    if (!canDelete) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/organizations/${organizationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationName }),
      });
      const payload = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to delete organization.');
      }
      router.push('/admin/organizations');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete organization.');
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
      >
        <Trash2 className="size-4" />
        Delete organization
      </Button>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-organization-title"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-red-700">Permanent action</p>
                <h2 id="delete-organization-title" className="mt-1 text-xl font-semibold">
                  Delete {organizationName}?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close delete confirmation"
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              This removes the organization, its users, students, assignments, enrollments, access
              codes, and activity. Global Academy courses are not deleted.
            </p>
            <label className="mt-5 grid gap-2 text-sm font-medium text-slate-700">
              Type <span className="font-semibold text-slate-950">{organizationName}</span> to
              confirm
              <input
                value={confirmationName}
                onChange={(event) => setConfirmationName(event.target.value)}
                autoComplete="off"
                className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-red-400 focus:ring-3 focus:ring-red-100"
              />
            </label>
            <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="mt-1 size-4 accent-red-700"
              />
              I understand this tenant data cannot be restored from the admin panel.
            </label>
            {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!canDelete}
                onClick={handleDelete}
                className="bg-red-700 text-white hover:bg-red-800"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Delete permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
