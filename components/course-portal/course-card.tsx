'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Building2, Clock3, LockKeyhole, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CourseAccessForm } from '@/components/course-portal/course-access-form';
import { cn } from '@/lib/utils';
import type { CoursePortalCardView, CourseStatus } from '@/lib/types/course-portal';

const toneClasses: Record<NonNullable<CoursePortalCardView['course']['coverTone']>, string> = {
  violet: 'from-violet-100 via-white to-fuchsia-100 text-violet-700',
  blue: 'from-sky-100 via-white to-indigo-100 text-sky-700',
  emerald: 'from-emerald-100 via-white to-teal-100 text-emerald-700',
  amber: 'from-amber-100 via-white to-orange-100 text-amber-700',
  rose: 'from-rose-100 via-white to-pink-100 text-rose-700',
};

const statusClasses: Record<CourseStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  draft: 'bg-amber-50 text-amber-700 ring-amber-200',
  locked: 'bg-slate-100 text-slate-700 ring-slate-200',
  completed: 'bg-blue-50 text-blue-700 ring-blue-200',
};

function formatDuration(minutes?: number) {
  if (!minutes) return 'Duration pending';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins} min`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export function getTenantCourseHref(card: Pick<CoursePortalCardView, 'course' | 'university'>) {
  return `/u/${card.university.slug}/courses/${card.course.slug}`;
}

export function CourseCard({ card }: { card: CoursePortalCardView }) {
  const [open, setOpen] = useState(false);
  const { course, university } = card;
  const tone = toneClasses[course.coverTone || 'violet'];
  const detailHref = getTenantCourseHref(card);
  const needsCode = !card.accessGranted;

  return (
    <>
      <article
        data-course-id={course.id}
        data-university-id={university.id}
        className="group flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className={cn('relative h-44 overflow-hidden bg-gradient-to-br', tone)}>
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0)_45%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.8),rgba(255,255,255,0)_34%)]" />
          <div className="absolute left-5 top-5 rounded-md bg-white/90 px-3 py-2 text-sm font-semibold text-violet-900 shadow-sm">
            {course.category}
          </div>
          <div className="absolute bottom-5 right-5 flex size-20 items-center justify-center rounded-xl bg-white/80 shadow-sm">
            {course.coverAsset ? (
              <img src={course.coverAsset} alt="" className="size-12 object-contain" />
            ) : (
              <Sparkles className="size-10" />
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1',
                statusClasses[course.status],
              )}
            >
              {course.status}
            </span>
            {course.level && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {course.level}
              </span>
            )}
            {needsCode && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">
                <LockKeyhole className="size-3" />
                Locked
              </span>
            )}
          </div>

          <h3 className="mt-4 text-xl font-semibold leading-tight tracking-normal text-slate-950">
            {course.title}
          </h3>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{course.description}</p>

          <div className="mt-5 grid gap-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-violet-700" />
              <span>{university.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-violet-700" />
              <span>{formatDuration(course.estimatedDurationMinutes)}</span>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            {needsCode ? (
              <Button
                type="button"
                onClick={() => setOpen(true)}
                className="min-h-10 flex-1 bg-violet-700 text-white hover:bg-violet-800"
              >
                <LockKeyhole className="size-4" />
                Enter code
              </Button>
            ) : (
              <Button
                asChild
                className="min-h-10 flex-1 bg-violet-700 text-white hover:bg-violet-800"
              >
                <Link href={detailHref}>
                  Enter course
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" className="min-h-10">
              <Link href={detailHref}>Preview</Link>
            </Button>
          </div>
        </div>
      </article>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-normal text-slate-950">
              Unlock course access
            </DialogTitle>
            <DialogDescription>
              Codes are checked against the selected course, university, and cohort.
            </DialogDescription>
          </DialogHeader>
          <CourseAccessForm
            compact
            courseId={course.id}
            universityId={university.id}
            cohortId={card.cohortId}
            courseTitle={course.title}
            universityName={university.name}
            redirectUrl={detailHref}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
