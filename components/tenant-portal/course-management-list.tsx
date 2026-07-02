'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { KeyRound, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CourseStatus, OrganizationCourseSummary } from '@/lib/types/course-portal';

function progressTone(value: number) {
  if (value >= 80) return 'bg-emerald-600';
  if (value >= 40) return 'bg-violet-600';
  return 'bg-amber-500';
}

export function CourseManagementList({
  courses,
  canGenerateAccessCodes,
}: {
  courses: OrganizationCourseSummary[];
  canGenerateAccessCodes: boolean;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | CourseStatus>('all');
  const [category, setCategory] = useState('all');

  const categories = useMemo(
    () => Array.from(new Set(courses.map((item) => item.course.category))).sort(),
    [courses],
  );

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return courses.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          item.course.title,
          item.course.description,
          item.course.category,
          item.course.level || '',
          item.course.status,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesStatus = status === 'all' || item.course.status === status;
      const matchesCategory = category === 'all' || item.course.category === category;
      return matchesQuery && matchesStatus && matchesCategory;
    });
  }, [category, courses, query, status]);

  return (
    <div className="grid gap-5 p-5 sm:p-8">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_220px]">
          <label className="relative block">
            <span className="sr-only">Search assigned courses</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, category, level, or description"
              className="h-11 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm text-slate-950 outline-none transition focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as 'all' | CourseStatus)}
              className="h-11 rounded-md border border-slate-200 px-3 text-sm font-normal normal-case tracking-normal text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="locked">Locked</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-11 rounded-md border border-slate-200 px-3 text-sm font-normal normal-case tracking-normal text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Showing {filteredCourses.length} of {courses.length} assigned courses.
        </p>
      </div>

      {filteredCourses.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredCourses.map((item) => (
            <article
              key={item.assignmentId}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                  {item.course.category}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                  {item.course.status}
                </span>
                {item.course.level && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {item.course.level}
                  </span>
                )}
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-normal">{item.course.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                {item.course.description}
              </p>
              <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                <div>
                  <p className="font-semibold text-slate-950">{item.enrolledStudents}</p>
                  <p>Enrolled</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-950">{item.completionRate}%</p>
                  <p>Completion</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-950">{item.activeAccessCodes}</p>
                  <p>Active codes</p>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-100">
                <div
                  className={`h-2 rounded-full ${progressTone(item.completionRate)}`}
                  style={{ width: `${item.completionRate}%` }}
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild className="bg-violet-700 text-white hover:bg-violet-800">
                  <Link href={`/dashboard/courses/${item.course.id}`}>View course details</Link>
                </Button>
                {canGenerateAccessCodes && (
                  <Button asChild variant="outline">
                    <Link href={`/dashboard/access-codes/new?courseId=${item.course.id}`}>
                      <KeyRound className="size-4" />
                      Generate code
                    </Link>
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold tracking-normal text-slate-950">
            No assigned courses match these filters
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Adjust the search, status, or category filter to review the courses available to this
            organization.
          </p>
        </div>
      )}
    </div>
  );
}
