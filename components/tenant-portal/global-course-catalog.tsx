'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpenCheck,
  CheckCircle2,
  CircleAlert,
  PlayCircle,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { GlobalCourseStatusForm } from '@/components/tenant-portal/global-course-status-form';
import type { Course, Organization } from '@/lib/types/course-portal';

export interface GlobalCourseCatalogItem {
  course: Course;
  assignedOrganizations: Organization[];
}

function generatedClassroomCount(course: Course): number {
  return (
    (course.classroomId ? 1 : 0) + course.modules.filter((module) => module.classroomId).length
  );
}

export function GlobalCourseCatalog({ items }: { items: GlobalCourseCatalogItem[] }) {
  const [query, setQuery] = useState('');
  const [showDrafts, setShowDrafts] = useState(false);

  const releaseFacingCount = useMemo(
    () =>
      items.filter(
        ({ course, assignedOrganizations }) =>
          course.status !== 'draft' || assignedOrganizations.length > 0,
      ).length,
    [items],
  );
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter(({ course, assignedOrganizations }) => {
      const isReleaseFacing = course.status !== 'draft' || assignedOrganizations.length > 0;
      const matchesQuery = [course.title, course.category, course.description, course.id]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
      return (showDrafts || isReleaseFacing) && matchesQuery;
    });
  }, [items, query, showDrafts]);

  return (
    <section className="p-5 sm:p-8">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700">Release inventory</p>
            <h2 className="mt-1 text-xl font-semibold tracking-normal text-slate-950">
              {releaseFacingCount} published or assigned courses
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Drafts remain available, but are hidden by default so the operational catalog stays
              reviewable.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={showDrafts}
              onChange={(event) => setShowDrafts(event.target.checked)}
              className="size-4 accent-violet-700"
            />
            Show all {items.length} courses, including drafts
          </label>
        </div>

        <label className="relative mt-5 block max-w-xl">
          <span className="sr-only">Search global courses</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, category, or course ID"
            className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-3 focus:ring-violet-100"
          />
        </label>
      </div>

      {filteredItems.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {filteredItems.map(({ course, assignedOrganizations }) => {
            const classroomCount = generatedClassroomCount(course);
            const generatedModuleCount = course.modules.filter(
              (module) => module.classroomId,
            ).length;
            const canTestLearnerJourney =
              course.status === 'active' && assignedOrganizations.length > 0;
            return (
              <article
                key={course.id}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-violet-700">{course.category}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-normal text-slate-950">
                      {course.title}
                    </h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                    {course.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{course.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    {assignedOrganizations.length} organization
                    {assignedOrganizations.length === 1 ? '' : 's'}
                  </span>
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">
                    {classroomCount} generated classroom{classroomCount === 1 ? '' : 's'}
                  </span>
                </div>

                <section className="mt-5 border-y border-slate-200 py-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md ${
                        canTestLearnerJourney
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {canTestLearnerJourney ? (
                        <CheckCircle2 className="size-5" />
                      ) : (
                        <CircleAlert className="size-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-950">
                        {canTestLearnerJourney
                          ? 'Learner journey ready to test'
                          : course.status !== 'active'
                            ? 'Publish before end-to-end testing'
                            : 'Assign an organization before end-to-end testing'}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {generatedModuleCount}/{course.modules.length} modules have generated
                        classrooms. Admin QA does not create learner progress.
                      </p>
                    </div>
                  </div>

                  {canTestLearnerJourney && (
                    <div className="mt-4 grid gap-2">
                      {assignedOrganizations.map((organization, index) => (
                        <Link
                          key={organization.id}
                          href={`/u/${organization.slug}/courses/${course.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className={
                            index === 0
                              ? 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800'
                              : 'inline-flex min-h-10 items-center justify-between gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800'
                          }
                        >
                          <span>
                            {index === 0 ? 'Test full course' : 'Test course'} as{' '}
                            {organization.name}
                          </span>
                          {index === 0 ? (
                            <PlayCircle className="size-4" />
                          ) : (
                            <ArrowUpRight className="size-4" />
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </section>

                {classroomCount > 0 && (
                  <details className="mt-4 rounded-md border border-slate-200 bg-slate-50">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
                      Inspect generated classrooms ({classroomCount})
                    </summary>
                    <div className="flex flex-wrap gap-2 border-t border-slate-200 p-3 text-xs">
                      {course.classroomId && (
                        <Link
                          href={`/classroom/${course.classroomId}?tts=browser`}
                          className="rounded-full border border-violet-200 px-3 py-1 font-semibold text-violet-700 hover:bg-violet-50"
                        >
                          Open generated classroom
                        </Link>
                      )}
                      {course.modules
                        .filter((module) => module.classroomId)
                        .map((module) => (
                          <Link
                            key={module.id}
                            href={`/classroom/${module.classroomId}?tts=browser`}
                            className="rounded-full border border-violet-200 px-3 py-1 font-semibold text-violet-700 hover:bg-violet-50"
                          >
                            Open {module.title}
                          </Link>
                        ))}
                    </div>
                  </details>
                )}
                <GlobalCourseStatusForm course={course} />
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 text-center">
          {showDrafts ? (
            <SlidersHorizontal className="size-8 text-slate-400" />
          ) : (
            <BookOpenCheck className="size-8 text-slate-400" />
          )}
          <h3 className="mt-4 text-lg font-semibold tracking-normal text-slate-950">
            No courses match this view
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            Clear the search or show drafts to inspect the full generation history.
          </p>
        </div>
      )}
    </section>
  );
}
