import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3 } from 'lucide-react';
import { CoursePortalShell } from '@/components/course-portal/portal-shell';
import { Button } from '@/components/ui/button';
import { findCourseAccessAssignment } from '@/lib/server/course-access';
import { getCourseDetailContext } from '@/lib/server/course-portal-data';

export const dynamic = 'force-dynamic';

function buildDiscussionPrompt(title: string) {
  return `Explain ${title.toLowerCase()} in plain English, then connect it to one realistic company example.`;
}

function buildPracticeTask(title: string) {
  return `Write 5-7 sentences using the key finance vocabulary from "${title}". Include one definition, one business example, and one risk or reporting implication.`;
}

export default async function PublicOrganizationCourseModulePage({
  params,
}: {
  params: Promise<{ organizationSlug: string; courseSlug: string; moduleId: string }>;
}) {
  const { organizationSlug, courseSlug, moduleId } = await params;
  const context = await getCourseDetailContext({ organizationSlug, courseSlug });
  if (!context) notFound();

  const accessAssignment = await findCourseAccessAssignment({
    courseId: context.course.id,
    universityId: context.organization.id,
    assignments: context.assignments,
  });

  if (!accessAssignment) {
    redirect(`/u/${context.organization.slug}/courses/${context.course.slug}`);
  }

  const moduleIndex = context.course.modules.findIndex((item) => item.id === moduleId);
  if (moduleIndex < 0) notFound();

  const currentModule = context.course.modules[moduleIndex];
  const previousModule = context.course.modules[moduleIndex - 1];
  const nextModule = context.course.modules[moduleIndex + 1];
  const courseHref = `/u/${context.organization.slug}/courses/${context.course.slug}`;
  const moduleHref = (id: string) => `${courseHref}/modules/${id}`;

  if (currentModule.classroomId) {
    redirect(`/classroom/${currentModule.classroomId}?tts=browser`);
  }

  return (
    <CoursePortalShell>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={courseHref}
          className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-950"
        >
          <ArrowLeft className="size-4" />
          Back to {context.course.title}
        </Link>

        <article className="mt-6 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
          <header className="border-b border-slate-200 bg-slate-50 px-6 py-6">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-violet-700">
              <span>{context.organization.name}</span>
              <span aria-hidden="true">/</span>
              <span>{context.course.title}</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
              Module {moduleIndex + 1}: {currentModule.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                <Clock3 className="size-4 text-violet-700" />
                {currentModule.durationMinutes} min
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                Course unlocked
              </span>
            </div>
          </header>

          <div className="grid gap-6 px-6 py-6">
            <section>
              <h2 className="text-xl font-semibold tracking-normal text-slate-950">Lesson brief</h2>
              <p className="mt-3 text-base leading-7 text-slate-700">{currentModule.description}</p>
            </section>

            <section className="grid gap-3 rounded-lg border border-violet-100 bg-violet-50/60 p-4">
              <h2 className="text-lg font-semibold tracking-normal text-slate-950">
                Learning goals
              </h2>
              <ul className="grid gap-2 text-sm leading-6 text-slate-700">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-violet-700" />
                  Define the core finance terms used in this module in clear business English.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-violet-700" />
                  Apply the idea to a concrete company, reporting, or management situation.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-violet-700" />
                  Prepare a short spoken or written explanation suitable for the LAN110 assessment.
                </li>
              </ul>
            </section>

            <section className="grid gap-3 rounded-lg border border-slate-200 p-4">
              <h2 className="text-lg font-semibold tracking-normal text-slate-950">
                Discussion prompt
              </h2>
              <p className="text-sm leading-6 text-slate-700">
                {buildDiscussionPrompt(currentModule.title)}
              </p>
            </section>

            <section className="grid gap-3 rounded-lg border border-slate-200 p-4">
              <h2 className="text-lg font-semibold tracking-normal text-slate-950">
                Practice task
              </h2>
              <p className="text-sm leading-6 text-slate-700">
                {buildPracticeTask(currentModule.title)}
              </p>
            </section>
          </div>
        </article>

        <nav className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {previousModule ? (
            <Button asChild variant="outline">
              <Link href={moduleHref(previousModule.id)}>
                <ArrowLeft className="size-4" />
                Previous module
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {nextModule ? (
            <Button asChild className="bg-violet-700 text-white hover:bg-violet-800">
              <Link href={moduleHref(nextModule.id)}>
                Next module
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild className="bg-violet-700 text-white hover:bg-violet-800">
              <Link href={courseHref}>Finish course outline</Link>
            </Button>
          )}
        </nav>
      </main>
    </CoursePortalShell>
  );
}
