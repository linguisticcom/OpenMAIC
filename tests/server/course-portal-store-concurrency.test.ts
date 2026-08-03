import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { JsonCoursePortalStore } from '@/lib/server/course-portal-store/json-store';
import type { CoursePortalDataset } from '@/lib/types/course-portal';

const tempRoots: string[] = [];

const emptyDataset: CoursePortalDataset = {
  organizations: [],
  users: [],
  students: [],
  cohorts: [],
  courses: [],
  assignments: [],
  accessCodes: [],
  enrollments: [],
  activityLogs: [],
  passwordResetTokens: [],
  accountInvitations: [],
  emailVerificationTokens: [],
  authAuditEvents: [],
};

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

describe('JsonCoursePortalStore mutations', () => {
  it('serializes concurrent mutations and commits each dataset with an atomic rename', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'lc-portal-store-'));
    tempRoots.push(root);
    const filePath = path.join(root, 'catalog.json');
    const store = new JsonCoursePortalStore({
      filePath,
      fallbackDataset: emptyDataset,
      normalizeDataset: (dataset) => ({ ...emptyDataset, ...dataset }),
    });

    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        store.mutateDataset(async (dataset) => {
          await new Promise((resolve) => setTimeout(resolve, index % 3));
          dataset.activityLogs.push({
            id: `activity-${index}`,
            organizationId: 'org-test',
            action: 'test.concurrent-mutation',
            metadata: { index },
            createdAt: new Date(2026, 0, 1, 0, 0, index).toISOString(),
          });
        }),
      ),
    );

    const persisted = await store.readDataset();
    expect(persisted.activityLogs).toHaveLength(20);
    expect(new Set(persisted.activityLogs.map((entry) => entry.id)).size).toBe(20);
    expect((await fs.readdir(root)).filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });
});
