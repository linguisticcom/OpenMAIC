import { describe, expect, it } from 'vitest';
import { getCourseModuleHref, getCourseStartHref } from '@/components/course-portal/course-detail';
import type { Course, University } from '@/lib/types/course-portal';

const university = {
  id: 'org-esilv',
  name: 'ESILV',
  slug: 'esilv',
  description: 'School',
  contactEmail: 'admin@example.test',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} satisfies University;

function course(overrides: Partial<Course> = {}): Course {
  return {
    id: 'course-lan110-corporate-finance',
    title: 'LAN110 Corporate Finance',
    slug: 'lan110-corporate-finance',
    description: 'Finance course',
    category: 'Finance',
    status: 'active',
    generatedBy: 'OpenMAIC',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    modules: [
      {
        id: 'module-lan110-1',
        title: 'Orientation',
        description: 'Start here',
        durationMinutes: 45,
      },
    ],
    ...overrides,
  };
}

describe('course portal module links', () => {
  it('starts catalog-only courses at the first module page instead of a dead anchor', () => {
    expect(getCourseStartHref(course(), university)).toBe(
      '/u/esilv/courses/lan110-corporate-finance/modules/module-lan110-1',
    );
  });

  it('preserves classroom playback links for generated classroom courses', () => {
    expect(getCourseStartHref(course({ classroomId: 'classroom-123' }), university)).toBe(
      '/classroom/classroom-123?tts=browser',
    );
  });

  it('builds stable public module links inside the organization course catalog', () => {
    expect(getCourseModuleHref(course(), university, 'module-lan110-8')).toBe(
      '/u/esilv/courses/lan110-corporate-finance/modules/module-lan110-8',
    );
  });

  it('opens generated classrooms attached to individual course modules', () => {
    const attachedCourse = course({
      modules: [
        {
          id: 'module-lan110-1',
          title: 'Orientation',
          description: 'Start here',
          durationMinutes: 45,
          classroomId: 'classroom-lan110-1',
        },
      ],
    });

    expect(getCourseStartHref(attachedCourse, university)).toBe(
      '/classroom/classroom-lan110-1?tts=browser',
    );
    expect(getCourseModuleHref(attachedCourse, university, attachedCourse.modules[0])).toBe(
      '/classroom/classroom-lan110-1?tts=browser',
    );
  });
});
