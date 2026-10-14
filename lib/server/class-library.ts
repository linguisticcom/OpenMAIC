import { promises as fs } from 'fs';
import path from 'path';
import { isCourseOpenAccess } from '@/lib/course-access-mode';
import { CLASSROOMS_DIR } from '@/lib/server/classroom-storage';
import { getCoursePortalDataset } from '@/lib/server/course-portal-data';
import type { Course } from '@/lib/types/course-portal';

/**
 * The public "every class LC Academy has generated" surface.
 *
 * Read-only projection over the course dataset: no assignment, organization or
 * cohort is required, because the school-facing library must list classes that
 * were never assigned to a tenant yet.
 */
export interface ClassLibraryEntry {
  course: Course;
  /** Classroom the course resolves to, whether or not its content is on disk. */
  classroomId?: string;
  /** Direct playback URL — set only when the classroom content actually exists. */
  playHref?: string;
  /** The catalog references a classroom with no stored content. */
  classroomMissing: boolean;
  sceneCount: number;
  isOpen: boolean;
  /** Institutions this class is assigned to, for context on the card. */
  organizationNames: string[];
}

export interface ClassLibrary {
  entries: ClassLibraryEntry[];
  /** Entries with an existing, open classroom. */
  playableCount: number;
  /** Entries whose classroom reference has no stored content. */
  missingClassroomCount: number;
  categories: { category: string; count: number }[];
}

function resolveClassroomId(course: Course): string | undefined {
  if (course.classroomId) return course.classroomId;
  const moduleWithClassroom = course.modules.find((module) => module.classroomId);
  return moduleWithClassroom?.classroomId;
}

export function classroomPlayHref(classroomId: string): string {
  return `/classroom/${classroomId}?tts=browser`;
}

/** True when classroom content for this id is actually readable on disk. */
export async function classroomContentExists(classroomId: string): Promise<boolean> {
  try {
    await fs.access(path.join(CLASSROOMS_DIR, `${classroomId}.json`));
    return true;
  } catch {
    return false;
  }
}

export async function toClassLibraryEntry(
  course: Course,
  organizationNames: string[] = [],
): Promise<ClassLibraryEntry> {
  const classroomId = resolveClassroomId(course);
  const isOpen = isCourseOpenAccess(course);
  const classroomMissing = classroomId ? !(await classroomContentExists(classroomId)) : false;

  const entry: ClassLibraryEntry = {
    course,
    sceneCount: course.modules.length,
    isOpen,
    classroomMissing,
    organizationNames,
  };

  if (classroomId) {
    entry.classroomId = classroomId;
    // Offer a play link only when the classroom exists: a class that 404s in
    // the player is worse for a visiting school than one marked unavailable.
    if (isOpen && !classroomMissing) entry.playHref = classroomPlayHref(classroomId);
  }

  return entry;
}

function sortEntries(entries: ClassLibraryEntry[]): ClassLibraryEntry[] {
  const statusWeight: Record<string, number> = { active: 0, draft: 1, locked: 2, completed: 3 };
  return [...entries].sort((left, right) => {
    // Playable classes first — they are what a visitor came for.
    const leftPlayable = left.playHref ? 0 : 1;
    const rightPlayable = right.playHref ? 0 : 1;
    if (leftPlayable !== rightPlayable) return leftPlayable - rightPlayable;

    const leftWeight = statusWeight[left.course.status] ?? 9;
    const rightWeight = statusWeight[right.course.status] ?? 9;
    if (leftWeight !== rightWeight) return leftWeight - rightWeight;

    const leftDate = left.course.updatedAt || left.course.createdAt;
    const rightDate = right.course.updatedAt || right.course.createdAt;
    return rightDate.localeCompare(leftDate);
  });
}

export async function listClassLibrary(options?: {
  includeWithoutClassroom?: boolean;
}): Promise<ClassLibrary> {
  const dataset = await getCoursePortalDataset();
  const includeWithoutClassroom = options?.includeWithoutClassroom ?? true;

  const courses = dataset.courses.filter(
    (course) => includeWithoutClassroom || Boolean(resolveClassroomId(course)),
  );

  const entries = await Promise.all(
    courses.map((course) =>
      toClassLibraryEntry(
        course,
        dataset.organizations
          .filter((organization) =>
            dataset.assignments.some(
              (assignment) =>
                assignment.courseId === course.id &&
                assignment.organizationId === organization.id,
            ),
          )
          .map((organization) => organization.name),
      ),
    ),
  );

  const categories = Array.from(
    entries.reduce((counts, entry) => {
      const category = entry.course.category || 'Uncategorised';
      counts.set(category, (counts.get(category) || 0) + 1);
      return counts;
    }, new Map<string, number>()),
  )
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category));

  return {
    entries: sortEntries(entries),
    playableCount: entries.filter((entry) => Boolean(entry.playHref)).length,
    missingClassroomCount: entries.filter((entry) => entry.classroomMissing).length,
    categories,
  };
}

export async function getClassLibraryEntry(
  slugOrId: string,
): Promise<ClassLibraryEntry | undefined> {
  const library = await listClassLibrary();
  return library.entries.find(
    (entry) => entry.course.slug === slugOrId || entry.course.id === slugOrId,
  );
}
