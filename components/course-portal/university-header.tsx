import { Building2 } from 'lucide-react';
import type { University } from '@/lib/types/course-portal';

export function UniversityHeader({ university }: { university: University }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:grid-cols-[1fr_320px] lg:items-center">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
            {university.logoUrl ? (
              <img src={university.logoUrl} alt="" className="max-h-10 max-w-28 object-contain" />
            ) : (
              <Building2 className="size-7 text-violet-700" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">
              University portal
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-normal text-slate-950">
              {university.name}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              {university.welcomeMessage || university.description}
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          {university.description}
        </div>
      </div>
    </section>
  );
}
