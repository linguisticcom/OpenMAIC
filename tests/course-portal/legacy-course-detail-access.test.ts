import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import CoursePage from '@/app/courses/[slug]/page';

const mocks = vi.hoisted(() => ({
  CourseDetail: vi.fn(),
  findCourseAccessAssignment: vi.fn(),
  getCourseDetailContext: vi.fn(),
}));

vi.mock('@/components/course-portal/course-detail', () => ({
  CourseDetail: mocks.CourseDetail,
}));

vi.mock('@/components/course-portal/portal-shell', () => ({
  CoursePortalShell: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/server/course-access', () => ({
  findCourseAccessAssignment: mocks.findCourseAccessAssignment,
}));

vi.mock('@/lib/server/course-portal-data', () => ({
  getCourseDetailContext: mocks.getCourseDetailContext,
}));

function findElementByType(node: React.ReactNode, type: unknown): React.ReactElement | undefined {
  if (React.isValidElement(node)) {
    if (node.type === type) return node;
    const children = (node.props as { children?: React.ReactNode }).children;
    if (Array.isArray(children)) {
      for (const child of children) {
        const match = findElementByType(child, type);
        if (match) return match;
      }
      return undefined;
    }
    return findElementByType(children, type);
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElementByType(child, type);
      if (match) return match;
    }
  }
  return undefined;
}

describe('legacy course detail account access', () => {
  it('uses the unlocked university cohort assignment instead of the first assignment', async () => {
    const alphaAssignment = {
      id: 'assign-alpha',
      organizationId: 'org-school',
      courseId: 'course-cloud',
      cohortId: 'cohort-alpha',
    };
    const betaAssignment = {
      id: 'assign-beta',
      organizationId: 'org-school',
      courseId: 'course-cloud',
      cohortId: 'cohort-beta',
    };
    const otherOrganizationAssignment = {
      id: 'assign-other-beta',
      organizationId: 'org-other',
      courseId: 'course-cloud',
      cohortId: 'cohort-beta',
    };
    mocks.getCourseDetailContext.mockResolvedValue({
      course: { id: 'course-cloud', slug: 'cloud', title: 'Cloud' },
      university: { id: 'org-school', slug: 'school', name: 'School' },
      organization: { id: 'org-school', slug: 'school', name: 'School' },
      assignment: alphaAssignment,
      assignments: [alphaAssignment, betaAssignment, otherOrganizationAssignment],
    });
    mocks.findCourseAccessAssignment.mockResolvedValue(betaAssignment);

    const tree = await CoursePage({
      params: Promise.resolve({ slug: 'cloud' }),
      searchParams: Promise.resolve({ university: 'school' }),
    });

    expect(mocks.findCourseAccessAssignment).toHaveBeenCalledWith({
      courseId: 'course-cloud',
      universityId: 'org-school',
      assignments: [alphaAssignment, betaAssignment],
    });
    const detailElement = findElementByType(tree, mocks.CourseDetail);
    expect(detailElement?.props).toMatchObject({
      assignment: betaAssignment,
      accessGranted: true,
    });
  });
});
