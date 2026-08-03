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
  it('creates one draft parent course and nests generated classrooms by module', async () => {
    await withTempCatalog(baseDataset(), async () => {
      const coursePortalData = await import('@/lib/server/course-portal-data');
      const course = await coursePortalData.createPlannedCourseDraft({
        title: 'Practical English for a Paris Cafe',
        audience: 'hospitality learners',
        totalDurationHours: 1,
        moduleDurationMinutes: 30,
        modules: [
          {
            id: 'ordering',
            order: 1,
            title: 'Ordering and Paying',
            durationMinutes: 30,
            learningObjectives: ['Handle an order and payment'],
            classroomPrompt: 'Teach ordering and paying.',
          },
          {
            id: 'problems',
            order: 2,
            title: 'Handling Problems',
            durationMinutes: 30,
            learningObjectives: ['Resolve a customer problem'],
            classroomPrompt: 'Teach complaint handling.',
          },
        ],
      });

      expect(course).toMatchObject({
        status: 'draft',
        title: 'Practical English for a Paris Cafe',
        modules: [{ id: 'ordering' }, { id: 'problems' }],
      });

      const attached = await coursePortalData.registerGeneratedClassroomCourse({
        classroomId: 'classroom-ordering',
        stage: generatedStage({ id: 'classroom-ordering', name: 'Ordering and Paying' }),
        scenes: generatedScenes(['Welcome', 'Practice']),
        metadata: {
          attachToCourseId: course.id,
          attachToModuleId: 'ordering',
          publishStatus: 'draft',
        },
      });

      const persisted = await coursePortalData.getCoursePortalDataset();
      expect(persisted.courses).toHaveLength(1);
      expect(attached.modules[0]).toMatchObject({
        id: 'ordering',
        classroomId: 'classroom-ordering',
      });
      expect(attached.modules[1]).toMatchObject({ id: 'problems' });
      expect(attached.modules[1]?.classroomId).toBeUndefined();
      expect(attached.status).toBe('draft');

      await expect(
        coursePortalData.updateGlobalCourseStatus({ courseId: course.id, status: 'active' }),
      ).resolves.toEqual({
        error: 'Course cannot be published until every planned module has a generated classroom.',
      });

      await coursePortalData.registerGeneratedClassroomCourse({
        classroomId: 'classroom-problems',
        stage: generatedStage({ id: 'classroom-problems', name: 'Handling Problems' }),
        scenes: generatedScenes(['Scenario', 'Recap']),
        metadata: {
          attachToCourseId: course.id,
          attachToModuleId: 'problems',
        },
      });
      await expect(
        coursePortalData.updateGlobalCourseStatus({ courseId: course.id, status: 'active' }),
      ).resolves.toMatchObject({ id: course.id, status: 'active' });
    });
  });

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

  it('can immediately publish a generated classroom to a client dashboard', async () => {
    await withTempCatalog(baseDataset(), async () => {
      const coursePortalData = await import('@/lib/server/course-portal-data');

      const course = await coursePortalData.registerGeneratedClassroomCourse({
        classroomId: 'classroom-ai-2',
        stage: generatedStage({ id: 'classroom-ai-2', name: 'Client-visible AI Course' }),
        scenes: generatedScenes(['Kickoff', 'Practice']),
        metadata: {
          title: 'Client-visible AI Course',
          description: 'A course that should appear in the tenant dashboard immediately.',
          publishToOrganizationId: 'org-school',
          publishStatus: 'active',
        },
      });

      const persisted = await coursePortalData.getCoursePortalDataset();
      expect(course).toMatchObject({
        id: 'course-classroom-ai-2',
        status: 'active',
        classroomId: 'classroom-ai-2',
      });
      expect(persisted.courses).toHaveLength(1);
      expect(persisted.assignments).toMatchObject([
        {
          organizationId: 'org-school',
          courseId: course.id,
          assignedByUserId: 'user-platform-admin',
        },
      ]);
    });
  });

  it('attaches a generated classroom to an existing course module instead of creating an orphan course', async () => {
    const dataset = baseDataset();
    dataset.courses.push({
      id: 'course-lan110-corporate-finance',
      title: 'LAN110 Corporate Finance',
      slug: 'lan110-corporate-finance',
      description: 'Corporate finance course shell.',
      category: 'Corporate Finance',
      status: 'draft',
      generatedBy: 'OpenMAIC',
      createdAt: now,
      updatedAt: now,
      modules: [
        {
          id: 'module-lan110-1',
          title: 'Course orientation',
          description: 'Start here.',
          durationMinutes: 45,
        },
      ],
    });

    await withTempCatalog(dataset, async () => {
      const coursePortalData = await import('@/lib/server/course-portal-data');

      const course = await coursePortalData.registerGeneratedClassroomCourse({
        classroomId: 'classroom-lan110-1',
        stage: generatedStage({ id: 'classroom-lan110-1', name: 'LAN110 module 1' }),
        scenes: generatedScenes(['Orientation', 'Vocabulary practice']),
        metadata: {
          attachToCourseId: 'course-lan110-corporate-finance',
          attachToModuleId: 'module-lan110-1',
          estimatedDurationMinutes: 45,
          publishToOrganizationId: 'org-school',
          publishStatus: 'active',
        },
      });

      const persisted = await coursePortalData.getCoursePortalDataset();
      expect(course.id).toBe('course-lan110-corporate-finance');
      expect(persisted.courses).toHaveLength(1);
      expect(persisted.courses[0]).toMatchObject({
        id: 'course-lan110-corporate-finance',
        status: 'active',
        modules: [
          {
            id: 'module-lan110-1',
            classroomId: 'classroom-lan110-1',
          },
        ],
      });
      expect(persisted.assignments).toMatchObject([
        { organizationId: 'org-school', courseId: 'course-lan110-corporate-finance' },
      ]);
      await expect(
        coursePortalData.getClassroomCourseAccessContext('classroom-lan110-1'),
      ).resolves.toMatchObject({
        course: { id: 'course-lan110-corporate-finance' },
        assignments: [{ organizationId: 'org-school' }],
      });
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
