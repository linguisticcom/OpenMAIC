import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { GlobalCourseCatalog } from '@/components/tenant-portal/global-course-catalog';
import type { Course, Organization } from '@/lib/types/course-portal';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const organization: Organization = {
  id: 'org-esilv',
  name: 'ESILV',
  slug: 'esilv',
  description: 'Engineering school.',
  contactEmail: 'admin@example.edu',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const course: Course = {
  id: 'course-lan110',
  title: 'LAN110 Corporate Finance',
  slug: 'lan110-corporate-finance',
  description: 'Corporate finance course.',
  category: 'Finance',
  status: 'active',
  generatedBy: 'OpenMAIC',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  modules: [
    {
      id: 'module-1',
      title: 'Finance foundations',
      description: 'Introduction.',
      durationMinutes: 45,
      classroomId: 'classroom-1',
    },
  ],
};

describe('global course catalog testing actions', () => {
  it('launches the complete learner journey in an assigned organization context', () => {
    const html = renderToStaticMarkup(
      createElement(GlobalCourseCatalog, {
        items: [{ course, assignedOrganizations: [organization] }],
      }),
    );

    expect(html).toContain('Learner journey ready to test');
    expect(html).toContain('Admin QA does not create learner progress');
    expect(html).toContain('Test full course');
    expect(html).toContain('/u/esilv/courses/lan110-corporate-finance');
    expect(html).toContain('Inspect generated classrooms (1)');
  });

  it('explains why an unassigned course cannot run end to end', () => {
    const html = renderToStaticMarkup(
      createElement(GlobalCourseCatalog, {
        items: [{ course, assignedOrganizations: [] }],
      }),
    );

    expect(html).toContain('Assign an organization before end-to-end testing');
    expect(html).not.toContain('Test full course');
  });
});
