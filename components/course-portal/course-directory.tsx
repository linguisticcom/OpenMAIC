'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { CourseCard } from '@/components/course-portal/course-card';
import type { CoursePortalCardView, University } from '@/lib/types/course-portal';

interface CourseDirectoryProps {
  cards: CoursePortalCardView[];
  universities: University[];
  fixedUniversityId?: string;
}

export function CourseDirectory({ cards, universities, fixedUniversityId }: CourseDirectoryProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [level, setLevel] = useState('all');
  const [universityId, setUniversityId] = useState(fixedUniversityId || 'all');

  const categories = useMemo(
    () => Array.from(new Set(cards.map((card) => card.course.category))).sort(),
    [cards],
  );
  const levels = useMemo(
    () =>
      Array.from(
        new Set(cards.map((card) => card.course.level).filter(Boolean)),
      ).sort() as string[],
    [cards],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return cards.filter((card) => {
      const searchable = [
        card.course.title,
        card.course.description,
        card.course.category,
        card.course.level || '',
        card.university.name,
      ]
        .join(' ')
        .toLowerCase();
      return (
        (!normalized || searchable.includes(normalized)) &&
        (category === 'all' || card.course.category === category) &&
        (level === 'all' || card.course.level === level) &&
        (fixedUniversityId || universityId === 'all' || card.university.id === universityId)
      );
    });
  }, [cards, category, fixedUniversityId, level, query, universityId]);

  return (
    <section className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
            Available courses
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Search assigned OpenMAIC courses and unlock restricted classrooms with your institution
            code.
          </p>
        </div>
        <div className="text-sm font-medium text-slate-500">
          {filtered.length} course assignments
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_180px_160px_190px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search courses"
            className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-3 focus:ring-violet-100"
          />
        </label>

        <FilterSelect label="Category" value={category} onChange={setCategory}>
          <option value="all">All subjects</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Level" value={level} onChange={setLevel}>
          <option value="all">All levels</option>
          {levels.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </FilterSelect>

        {!fixedUniversityId && (
          <FilterSelect label="University" value={universityId} onChange={setUniversityId}>
            <option value="all">All universities</option>
            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}
              </option>
            ))}
          </FilterSelect>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((card) => (
            <CourseCard key={card.assignmentId} card={card} />
          ))}
        </div>
      ) : (
        <div className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
          <SlidersHorizontal className="size-8 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold tracking-normal text-slate-950">
            No courses found
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            Adjust the search or filters. If your institution expected a course here, confirm that
            the course is assigned to the correct university and cohort.
          </p>
        </div>
      )}
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-3 focus:ring-violet-100"
      >
        {children}
      </select>
    </label>
  );
}
