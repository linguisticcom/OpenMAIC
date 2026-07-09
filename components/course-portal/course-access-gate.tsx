'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { KeyRound, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CourseAccessGateProps {
  accessGranted: boolean;
  courseId: string;
  universityId: string;
  cohortId?: string;
  courseTitle: string;
  universityName: string;
  children: React.ReactNode;
}

export function CourseAccessGate({
  accessGranted,
  courseId,
  universityId,
  cohortId,
  courseTitle,
  universityName,
  children,
}: CourseAccessGateProps) {
  const router = useRouter();
  const [showGate, setShowGate] = useState(!accessGranted);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When the server says access is now granted (after cookie set), close the gate
  useEffect(() => {
    if (accessGranted) {
      setShowGate(false);
    }
  }, [accessGranted]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const accessCode = code.trim();
      if (!accessCode || isSubmitting) return;

      setError(null);
      setIsSubmitting(true);

      try {
        const response = await fetch('/api/course-access/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            organizationId: universityId,
            cohortId,
            accessCode,
          }),
        });

        const payload = await response.json();

        if (!response.ok || !payload.success) {
          setError(payload.error || 'Unable to validate this access code.');
          return;
        }

        if (!payload.valid) {
          setError(payload.message || 'This access code is not valid for this course.');
          return;
        }

        setSuccess(true);
        setCode('');

        // Refresh the page so the server re-checks access with the new cookie
        // and renders with accessGranted=true
        setTimeout(() => {
          router.refresh();
        }, 600);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to validate this access code.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [code, isSubmitting, courseId, universityId, cohortId, router],
  );

  return (
    <>
      {children}

      <AnimatePresence>
        {showGate && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" aria-hidden="true" />

            {/* Modal card */}
            <motion.div
              className="relative z-10 mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-slate-200"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-violet-50">
                  <KeyRound className="size-6 text-violet-700" />
                </div>
                <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                  Course access required
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Enter the access code provided by {universityName} to unlock{' '}
                  <span className="font-semibold text-slate-900">{courseTitle}</span>.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Access code"
                    autoComplete="off"
                    autoFocus
                    disabled={isSubmitting || success}
                    className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium tracking-normal text-slate-950 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!code.trim() || isSubmitting || success}
                  className="min-h-11 w-full bg-violet-700 text-white hover:bg-violet-800"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : success ? (
                    <CheckCircle2 className="mr-2 size-4" />
                  ) : (
                    <KeyRound className="mr-2 size-4" />
                  )}
                  {success ? 'Access granted' : 'Unlock course'}
                </Button>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
