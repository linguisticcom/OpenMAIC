import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getCoursePortalStore,
  resetCoursePortalStoreCacheForTests,
} from '@/lib/server/course-portal-store';
import type { CoursePortalDataset } from '@/lib/types/course-portal';

const options = {
  jsonFilePath: '/tmp/lc-academy-production-store-guard.json',
  fallbackDataset: {} as CoursePortalDataset,
  normalizeDataset: (dataset: Partial<CoursePortalDataset>) => dataset as CoursePortalDataset,
};

afterEach(() => {
  resetCoursePortalStoreCacheForTests();
  vi.unstubAllEnvs();
});

describe('course portal production store guard', () => {
  it('refuses inherited JSON demo accounts when production has no database', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('ALLOW_JSON_COURSE_PORTAL', '');

    expect(() => getCoursePortalStore(options)).toThrow(/DATABASE_URL is required/);
  });

  it('allows JSON storage only when an isolated production demo opts in explicitly', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('ALLOW_JSON_COURSE_PORTAL', 'true');

    expect(getCoursePortalStore(options)).toBeDefined();
  });
});
