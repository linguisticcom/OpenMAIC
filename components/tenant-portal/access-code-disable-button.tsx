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

  async function disableCode() {
    if (disabled || isSubmitting) return;
    setIsSubmitting(true);
    await fetch(`/api/organization/access-codes/${accessCodeId}/disable`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId }),
    });
    router.refresh();
    setIsSubmitting(false);
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || isSubmitting}
      onClick={disableCode}
    >
      {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
      Disable
    </Button>
  );
}
