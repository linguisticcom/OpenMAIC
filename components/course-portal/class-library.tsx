'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  Clock3,
  Layers,
  PlayCircle,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourseStatus } from '@/lib/types/course-portal';

export interface ClassLibraryCard {
  slug: string;
  title: string;
  description: string;
  category: string;
  status: CourseStatus;
  level?: string;
  sceneCount: number;
  durationMinutes?: number;
  coverTone?: 'violet' | 'blue' | 'emerald' | 'amber' | 'rose';
  coverAsset?: string;
  playHref?: string;
  detailHref: string;
  organizationNames: string[];
  requiresCode?: boolean;
  classroomMissing?: boolean;
}

const toneClasses: Record<NonNullable<ClassLibraryCard['coverTone']>, string> = {
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
  if (!minutes) return undefined;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins} min`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export function ClassLibrary({
  cards,
  categories,
}: {
  cards: ClassLibraryCard[];
  categories: { category: string; count: number }[];
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return cards.filter((card) => {
      const searchable = [
        card.title,
        card.description,
        card.category,
        card.level || '',
        card.organizationNames.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return (
        (!normalized || searchable.includes(normalized)) &&
        (category === 'all' || card.category === category)
      );
    });
  }, [cards, category, query]);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="sticky top-20 z-20 -mx-4 border-b border-slate-200 bg-slate-100/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search classes, subjects, modules"
              className="h-11 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-950 outline-none transition focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            />
          </label>
          <p className="text-sm font-medium text-slate-500">
            {filtered.length} of {cards.length} classes
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <CategoryChip
            active={category === 'all'}
            onClick={() => setCategory('all')}
            label={`All subjects (${cards.length})`}
          />
          {categories.map((item) => (
            <CategoryChip
              key={item.category}
              active={category === item.category}
              onClick={() => setCategory(item.category)}
              label={`${item.category} (${item.count})`}
            />
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((card) => (
            <ClassLibraryCardItem key={card.slug} card={card} />
          ))}
        </div>
      ) : (
        <div className="mt-6 flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 text-center">
          <BookOpenCheck className="size-8 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold tracking-normal text-slate-950">
            No classes match that search
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            Clear the search or pick another subject to see the full library.
          </p>
        </div>
      )}
    </section>
  );
}

function CategoryChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition',
        active
          ? 'bg-violet-700 text-white ring-violet-700'
          : 'bg-white text-slate-600 ring-slate-200 hover:text-violet-800 hover:ring-violet-200',
      )}
    >
      {label}
    </button>
  );
}

function ClassLibraryCardItem({ card }: { card: ClassLibraryCard }) {
  const tone = toneClasses[card.coverTone || 'violet'];
  const duration = formatDuration(card.durationMinutes);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={cn('relative h-28 overflow-hidden bg-gradient-to-br', tone)}>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0)_45%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.8),rgba(255,255,255,0)_34%)]" />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1',
              statusClasses[card.status],
            )}
          >
            {card.status}
          </span>
          {card.sceneCount > 0 && (
            <span className="rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {card.sceneCount} {card.sceneCount === 1 ? 'scene' : 'scenes'}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
          {card.category}
        </p>
        <h3 className="mt-2 text-lg font-semibold leading-snug tracking-normal text-slate-950">
          {card.playHref ? (
            <Link href={card.playHref} className="outline-none">
              <span className="absolute inset-0" aria-hidden="true" />
              {card.title}
            </Link>
          ) : (
            card.title
          )}
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{card.description}</p>

        <div className="mt-4 grid gap-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Layers className="size-3.5 text-violet-700" />
            <span>
              {card.sceneCount > 0
                ? `${card.sceneCount} scenes in the classroom`
                : 'Classroom in preparation'}
            </span>
          </div>
          {duration && (
            <div className="flex items-center gap-2">
              <Clock3 className="size-3.5 text-violet-700" />
              <span>{duration}</span>
            </div>
          )}
          {card.organizationNames.length > 0 && (
            <div className="flex items-center gap-2">
              <Building2 className="size-3.5 text-violet-700" />
              <span className="truncate">{card.organizationNames.join(', ')}</span>
            </div>
          )}
        </div>

        <div className="relative z-10 mt-auto flex gap-2 pt-5">
          {card.playHref ? (
            <Link
              href={card.playHref}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md bg-violet-700 px-3 text-sm font-semibold text-white transition hover:bg-violet-800"
            >
              <PlayCircle className="size-4" />
              Open class
            </Link>
          ) : (
            <span className="inline-flex min-h-10 flex-1 items-center justify-center rounded-md bg-slate-100 px-3 text-center text-sm font-semibold text-slate-500">
              {card.requiresCode
                ? 'Institution code required'
                : card.classroomMissing
                  ? 'Classroom unavailable'
                  : 'Content in preparation'}
            </span>
          )}
          <Link
            href={card.detailHref}
            className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-200 hover:text-violet-800"
          >
            Details
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
