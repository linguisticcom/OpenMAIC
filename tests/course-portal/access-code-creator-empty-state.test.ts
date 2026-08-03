import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AccessCodeCreator } from '@/components/tenant-portal/access-code-creator';

describe('AccessCodeCreator empty state', () => {
  it('renders a clear empty state when no courses are assignable', () => {
    const html = renderToStaticMarkup(
      createElement(AccessCodeCreator, {
        organizationId: 'org-empty',
        courses: [],
        cohorts: [],
        students: [],
      }),
    );

    expect(html).toContain('No assignable courses available');
    expect(html).toContain('Access codes can only be generated after a platform admin assigns');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('Generate access code</button>');
  });
});
