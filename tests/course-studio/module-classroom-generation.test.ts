import { describe, expect, it } from 'vitest';
import {
  buildModuleClassroomGenerationRequest,
  resolveAttachModuleForCourseStudio,
} from '@/lib/course-studio/module-classroom-generation';
import type { Course } from '@/lib/types/course-portal';
import type { CourseModulePlan, CoursePlan } from '@/lib/types/course-studio';

const now = '2026-07-06T10:00:00.000Z';

function course(overrides: Partial<Course> = {}): Course {
  return {
    id: 'course-lan110-corporate-finance',
    title: 'LAN110 Corporate Finance',
    slug: 'lan110-corporate-finance',
    description: 'Corporate finance shell.',
    category: 'Corporate Finance',
    status: 'draft',
    generatedBy: 'LC Academy',
    createdAt: now,
    updatedAt: now,
    modules: [
      {
        id: 'module-lan110-2',
        title: 'Company law and forms of business',
        description: 'Compare business structures.',
        durationMinutes: 45,
      },
      {
        id: 'module-lan110-1',
        title: 'Course orientation: finance language and reporting goals',
        description: 'Start here.',
        durationMinutes: 45,
      },
    ],
    ...overrides,
  };
}

function modulePlan(overrides: Partial<CourseModulePlan> = {}): CourseModulePlan {
  return {
    id: 'module-lan110-1',
    order: 2,
    title: 'Course orientation: finance language and reporting goals',
    durationMinutes: 45,
    learningObjectives: ['Use precise business-English vocabulary'],
    prerequisiteSummary: 'No prior module required.',
    classroomPrompt: 'Teach LAN110 finance language and reporting goals.',
    resourceFocus: ['LAN110 source pack'],
    ...overrides,
  };
}

function plan(module: CourseModulePlan = modulePlan()): CoursePlan {
  return {
    title: 'LAN110 Corporate Finance',
    audience: 'ESILV M2 learners',
    totalDurationHours: 9,
    moduleDurationMinutes: 45,
    modules: [module],
  };
}

describe('Course Studio module classroom generation helpers', () => {
  it('matches attach targets by module id instead of array order', () => {
    const attachModule = resolveAttachModuleForCourseStudio(modulePlan(), course());

    expect(attachModule?.id).toBe('module-lan110-1');
  });

  it('matches attach targets by normalized title when generated ids differ', () => {
    const attachModule = resolveAttachModuleForCourseStudio(
      modulePlan({
        id: 'generated-module-1',
        order: 1,
        title: 'Company law and forms of business',
      }),
      course(),
    );

    expect(attachModule?.id).toBe('module-lan110-2');
  });

  it('fails before attachment when neither identity nor title can be validated', () => {
    expect(() =>
      resolveAttachModuleForCourseStudio(
        modulePlan({
          id: 'generated-module-3',
          order: 1,
          title: 'Unrelated treasury management topic',
        }),
        course(),
      ),
    ).toThrow(/Could not safely attach module/);
  });

  it('builds grounded generation requests with selected resources and stable attachment metadata', () => {
    const courseModule = modulePlan();
    const request = buildModuleClassroomGenerationRequest({
      coursePlan: plan(courseModule),
      courseModule,
      audience: 'business English learners',
      courseResourceIds: ['res-lan110', 'res-lan110'],
      attachCourse: course(),
      publishToDashboard: true,
      publishOrganizationId: 'org-esilv',
      publishCohortId: 'cohort-esilv-m2',
      enableImageGeneration: false,
      enableVideoGeneration: false,
      enableTTS: true,
    });

    expect(request.courseResourceIds).toEqual(['res-lan110']);
    expect(request.requirement).toContain('Use the selected course resources');
    expect(request.requirement).toContain('Stay inside this module topic');
    expect(request.portalCourse).toMatchObject({
      attachToCourseId: 'course-lan110-corporate-finance',
      attachToModuleId: 'module-lan110-1',
      publishToOrganizationId: 'org-esilv',
      publishToCohortId: 'cohort-esilv-m2',
      publishStatus: 'draft',
    });
  });

  it('can fall back to a separate generated course when an attach target is incompatible', () => {
    const courseModule = modulePlan({
      id: 'generated-module-3',
      order: 3,
      title: 'Enterprise AI Adoption Patterns in 2026',
      classroomPrompt: 'Teach practical enterprise AI adoption patterns.',
    });

    const request = buildModuleClassroomGenerationRequest({
      coursePlan: plan(courseModule),
      courseModule,
      audience: 'professional learners',
      courseResourceIds: [],
      attachCourse: course({ title: 'AI Foundations for Higher Education' }),
      publishToDashboard: true,
      publishOrganizationId: 'org-esilv',
      enableImageGeneration: false,
      enableVideoGeneration: false,
      enableTTS: false,
      allowSeparateGeneratedCourseOnAttachMismatch: true,
    });

    expect(request.attachWarning).toMatch(/Could not safely attach module/);
    expect(request.portalCourse.attachToCourseId).toBeUndefined();
    expect(request.portalCourse.attachToModuleId).toBeUndefined();
    expect(request.portalCourse).toMatchObject({
      publishToOrganizationId: 'org-esilv',
      publishStatus: 'draft',
    });
  });
});
