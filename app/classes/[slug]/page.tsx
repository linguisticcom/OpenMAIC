import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock3, Layers, PlayCircle, ShieldAlert } from 'lucide-react';
import { CoursePortalShell } from '@/components/course-portal/portal-shell';
import { classroomPlayHref, getClassLibraryEntry } from '@/lib/server/class-library';

export const dynamic = 'force-dynamic';

function formatDuration(minutes?: number) {
  if (!minutes) return undefined;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins} min`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await getClassLibraryEntry(slug);
  if (!entry) notFound();

  const { course } = entry;
  const duration = formatDuration(course.estimatedDurationMinutes);

  return (
    <CoursePortalShell>
      <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <Link
          href="/classes"
          className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-950"
        >
          <ArrowLeft className="size-4" />
          Back to all classes
        </Link>
      </div>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <article className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            {course.category || 'Linguistic Communication Academy'}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
            {course.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">{course.description}</p>

          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2">
              <Layers className="size-4 text-violet-700" />
              {entry.sceneCount > 0
                ? `${entry.sceneCount} scenes`
                : 'Classroom content in preparation'}
            </span>
            {duration && (
              <span className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2">
                <Clock3 className="size-4 text-violet-700" />
                {duration}
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 capitalize">
              {course.status}
            </span>
          </div>

          {entry.sceneCount > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold tracking-normal text-slate-950">
                In this class
              </h2>
              <ol className="mt-4 grid gap-2">
                {course.modules.map((module, index) => {
                  const href =
                    module.classroomId && entry.isOpen
                      ? classroomPlayHref(module.classroomId)
                      : undefined;
                  const label = `${index + 1}. ${module.title}`;
                  return (
                    <li
                      key={module.id}
                      className="flex items-center justify-between gap-4 rounded-md border border-slate-200 px-4 py-3 text-sm text-slate-700"
                    >
                      <span className="font-medium">{label}</span>
                      {href ? (
                        <Link
                          href={href}
                          className="shrink-0 text-sm font-semibold text-violet-700 hover:text-violet-900"
                        >
                          Play
                        </Link>
                      ) : (
                        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {module.classroomId ? 'Restricted' : 'Planned'}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </article>

        <aside className="h-fit rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
          {entry.isOpen && entry.playHref ? (
            <>
              <h2 className="text-lg font-semibold tracking-normal text-slate-950">
                Play this class
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Opens the full classroom the same way a learner sees it. Nothing to install, no
                access code.
              </p>
              <Link
                href={entry.playHref}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-violet-700 px-4 text-sm font-semibold text-white transition hover:bg-violet-800"
              >
                <PlayCircle className="size-4" />
                Open class
              </Link>
            </>
          ) : entry.isOpen ? (
            <>
              <h2 className="text-lg font-semibold tracking-normal text-slate-950">
                Classroom in preparation
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This class exists in the catalog but its classroom has not been generated yet.
              </p>
            </>
          ) : (
            <>
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-normal text-slate-950">
                <ShieldAlert className="size-4 text-amber-600" />
                Institution access required
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                This class is opted in to access-code protection and is available to the
                institutions it is assigned to.
              </p>
            </>
          )}
          {entry.organizationNames.length > 0 && (
            <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
              Assigned to {entry.organizationNames.join(', ')}.
            </p>
          )}
        </aside>
      </section>
    </CoursePortalShell>
  );
}
