'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AccessCodeDisableButton({
  organizationId,
  accessCodeId,
  disabled,
}: {
  organizationId: string;
  accessCodeId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function disableCode() {
    if (disabled || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/organization/access-codes/${accessCodeId}/disable`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || 'Unable to disable this access code.');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to disable this access code.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={disabled || isSubmitting}
        onClick={disableCode}
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <XCircle className="size-4" />
        )}
        Disable
      </Button>
      {error && (
        <p role="alert" className="max-w-48 text-xs leading-5 text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
