import Link from 'next/link';
import { Building2, GraduationCap } from 'lucide-react';
import type { ReactNode } from 'react';

export function CoursePortalShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <Link href="/courses" className="flex items-center gap-3">
            <img
              src="/lc-academy-logo.webp"
              alt="Linguistic Communication Academy"
              className="h-12 w-auto object-contain"
            />
            <span className="hidden border-l border-slate-200 pl-3 text-sm font-semibold text-slate-700 sm:inline">
              Academy
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium text-slate-600">
            <Link
              className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-950"
              href="/courses"
            >
              Courses
            </Link>
            <Link
              className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-950"
              href="/login"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </main>
  );
}

export function CoursePortalIntro({
  title,
  description,
  label = 'Linguistic Communication Academy Course Portal',
}: {
  title: string;
  description: string;
  label?: string;
}) {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-700">
            <GraduationCap className="size-4" />
            {label}
          </div>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-normal text-slate-950 md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-violet-50 text-violet-700">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Institution-aware access</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Courses are scoped by university and unlocked with server-validated codes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
