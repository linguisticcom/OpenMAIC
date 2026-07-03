import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CourseStudioLayout from '@/app/course-studio/layout';

const mocks = vi.hoisted(() => ({
  requirePlatformPageSession: vi.fn(),
}));

vi.mock('@/lib/server/tenant-page-auth', () => ({
  requirePlatformPageSession: mocks.requirePlatformPageSession,
}));

describe('Course Studio platform route guard', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requires a platform page session before rendering Course Studio', async () => {
    const child = createElement('main', null, 'Course Studio');
    mocks.requirePlatformPageSession.mockResolvedValue({
      user: { id: 'user-platform-admin', role: 'platform-admin' },
    });

    await expect(CourseStudioLayout({ children: child })).resolves.toBe(child);
    expect(mocks.requirePlatformPageSession).toHaveBeenCalledTimes(1);
  });

  it('does not render Course Studio when the platform page guard redirects', async () => {
    const redirect = new Error('NEXT_REDIRECT');
    mocks.requirePlatformPageSession.mockRejectedValue(redirect);

    await expect(
      CourseStudioLayout({ children: createElement('main', null, 'Course Studio') }),
    ).rejects.toBe(redirect);
  });
});
