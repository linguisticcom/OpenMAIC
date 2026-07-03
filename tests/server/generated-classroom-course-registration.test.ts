import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import type { CoursePortalDataset } from '@/lib/types/course-portal';
import type { Scene, Stage } from '@/lib/types/stage';

const now = '2026-07-03T10:00:00.000Z';

function baseDataset(): CoursePortalDataset {
  return {
    organizations: [
      {
        id: 'org-school',
        name: 'School Tenant',
        slug: 'school-tenant',
        description: 'Tenant used to verify generated course assignment.',
        contactEmail: 'admin@school.example',
        createdAt: now,
        updatedAt: now,
      },
    ],
    users: [
      {
        id: 'user-platform-admin',
        name: 'Platform Admin',
        email: 'platform@example.local',
        passwordHash: 'hash',
        role: 'platform-admin',
        createdAt: now,
        updatedAt: now,
      },
    ],
    courses: [],
    assignments: [],
    students: [],
    enrollments: [],
    accessCodes: [],
    cohorts: [],
    activityLogs: [],
  };
}

function generatedStage(overrides: Partial<Stage> = {}): Stage {
  return {
    id: 'classroom-ai-1',
    name: 'Generated AI Classroom',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function generatedScenes(titles = ['Welcome', 'Core concept']): Scene[] {
  return titles.map(
    (title, index) =>
      ({
        id: `scene-${index + 1}`,
        stageId: 'classroom-ai-1',
        type: 'slide',
        title,
        order: index + 1,
        content: { type: 'slide', canvas: {} },
      }) as Scene,
  );
}

async function withTempCatalog(
  dataset: CoursePortalDataset,
  fn: () => Promise<void>,
): Promise<void> {
  const originalCwd = process.cwd();
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-generated-course-'));

  try {
    await mkdir(path.join(tempRoot, 'data', 'course-portal'), { recursive: true });
    await writeFile(
      path.join(tempRoot, 'data', 'course-portal', 'catalog.json'),
      `${JSON.stringify(dataset, null, 2)}\n`,
      'utf-8',
    );
    process.chdir(tempRoot);
    vi.resetModules();
    await fn();
  } finally {
    process.chdir(originalCwd);
    vi.resetModules();
    await rm(tempRoot, { recursive: true, force: true });
  }
}

describe('registerGeneratedClassroomCourse', () => {
  it('creates an assignable LMS course for a generated classroom', async () => {
    await withTempCatalog(baseDataset(), async () => {
      const coursePortalData = await import('@/lib/server/course-portal-data');

      const course = await coursePortalData.registerGeneratedClassroomCourse({
        classroomId: 'classroom-ai-1',
        stage: generatedStage(),
        scenes: generatedScenes(['Welcome', 'Checkpoint']),
        metadata: {
          title: 'AI Foundations: Module 1 - Orientation',
          description: 'Introduce the course goals and first classroom checkpoint.',
          category: 'AI Foundations',
          estimatedDurationMinutes: 30,
        },
      });

      expect(course).toMatchObject({
        id: 'course-classroom-ai-1',
        slug: 'ai-foundations-module-1-orientation',
        title: 'AI Foundations: Module 1 - Orientation',
        category: 'AI Foundations',
        status: 'draft',
        classroomId: 'classroom-ai-1',
        estimatedDurationMinutes: 30,
      });
      expect(course.modules.map((module) => module.title)).toEqual(['Welcome', 'Checkpoint']);

      const assignment = await coursePortalData.assignCourseToOrganization({
        organizationId: 'org-school',
        courseId: course.id,
        assignedByUserId: 'user-platform-admin',
      });
      expect('error' in assignment).toBe(false);

      const persisted = await coursePortalData.getCoursePortalDataset();
      expect(persisted.courses).toHaveLength(1);
      expect(persisted.assignments).toMatchObject([
        { organizationId: 'org-school', courseId: course.id },
      ]);
    });
  });

  it('updates the same generated classroom without resetting admin-managed state', async () => {
    await withTempCatalog(baseDataset(), async () => {
      const coursePortalData = await import('@/lib/server/course-portal-data');

      const firstCourse = await coursePortalData.registerGeneratedClassroomCourse({
        classroomId: 'classroom-ai-1',
        stage: generatedStage(),
        scenes: generatedScenes(['Welcome']),
        metadata: { title: 'AI Foundations: Module 1 - Orientation' },
      });
      await coursePortalData.updateGlobalCourseStatus({
        courseId: firstCourse.id,
        status: 'active',
      });
      await coursePortalData.assignCourseToOrganization({
        organizationId: 'org-school',
        courseId: firstCourse.id,
        assignedByUserId: 'user-platform-admin',
      });

      const updatedCourse = await coursePortalData.registerGeneratedClassroomCourse({
        classroomId: 'classroom-ai-1',
        stage: generatedStage({ name: 'Updated classroom title' }),
        scenes: generatedScenes(['Updated lesson', 'Final recap']),
        metadata: { title: 'AI Foundations: Module 1 - Updated Orientation' },
      });

      const persisted = await coursePortalData.getCoursePortalDataset();
      expect(updatedCourse.id).toBe(firstCourse.id);
      expect(persisted.courses).toHaveLength(1);
      expect(persisted.courses[0]).toMatchObject({
        id: firstCourse.id,
        title: 'AI Foundations: Module 1 - Updated Orientation',
        status: 'active',
        classroomId: 'classroom-ai-1',
      });
      expect(persisted.courses[0].modules.map((module) => module.title)).toEqual([
        'Updated lesson',
        'Final recap',
      ]);
      expect(persisted.assignments).toMatchObject([
        { organizationId: 'org-school', courseId: firstCourse.id },
      ]);
    });
  });
});
