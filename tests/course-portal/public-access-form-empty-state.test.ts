import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PublicAccessForm } from '@/components/tenant-portal/public-access-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe('PublicAccessForm empty state', () => {
  it('renders a clear empty state when an organization has no assigned courses', () => {
    const html = renderToStaticMarkup(
      createElement(PublicAccessForm, {
        organizationSlug: 'empty-school',
        courses: [],
      }),
    );

    expect(html).toContain('No courses are available yet');
    expect(html).toContain('at least one assigned OpenMAIC course');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('Unlock course</button>');
  });
});
