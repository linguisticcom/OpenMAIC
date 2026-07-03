'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await fetch('/api/organization-auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isSubmitting}
      onClick={handleLogout}
      className="min-h-9 w-full justify-start border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
    >
      {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      Sign out
    </Button>
  );
}
