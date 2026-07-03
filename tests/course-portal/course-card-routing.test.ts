import { describe, expect, it } from 'vitest';
import { getTenantCourseHref } from '@/components/course-portal/course-card';
import type { CoursePortalCardView } from '@/lib/types/course-portal';

describe('course card tenant routing', () => {
  it('links organization course cards to the tenant course detail route', () => {
    const card = {
      course: {
        slug: 'cloud-devsecops-delivery-lab',
      },
      university: {
        slug: 'esilv',
      },
    } as Pick<CoursePortalCardView, 'course' | 'university'>;

    expect(getTenantCourseHref(card)).toBe('/u/esilv/courses/cloud-devsecops-delivery-lab');
  });
});
