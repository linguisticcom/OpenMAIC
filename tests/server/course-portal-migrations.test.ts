import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { runCoursePortalMigrations } from '@/lib/server/course-portal-migrations';

type Sql = ReturnType<typeof postgres>;

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

describe('runCoursePortalMigrations', () => {
  it('records migrations and skips them on later deploys', async () => {
    const migrationsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openmaic-migrations-'));
    tempRoots.push(migrationsDir);
    await fs.writeFile(path.join(migrationsDir, '001_first.sql'), 'create table first_table ();');
    await fs.writeFile(path.join(migrationsDir, '002_second.sql'), 'create table second_table ();');

    const applied = new Set<string>();
    const executedSql: string[] = [];
    const transaction = Object.assign(
      vi.fn(async (_strings: TemplateStringsArray, name: string) => {
        applied.add(name);
      }),
      {
        unsafe: vi.fn(async (migrationSql: string) => {
          executedSql.push(migrationSql);
        }),
      },
    );
    const sql = Object.assign(
      vi.fn(async () => [...applied].map((name) => ({ name }))),
      {
        unsafe: vi.fn(async () => undefined),
        begin: vi.fn(async (callback: (transactionSql: typeof transaction) => Promise<void>) =>
          callback(transaction),
        ),
      },
    ) as unknown as Sql;

    const firstRun = await runCoursePortalMigrations(sql, migrationsDir);
    const secondRun = await runCoursePortalMigrations(sql, migrationsDir);

    expect(firstRun).toEqual({
      applied: ['001_first.sql', '002_second.sql'],
      skipped: [],
    });
    expect(secondRun).toEqual({
      applied: [],
      skipped: ['001_first.sql', '002_second.sql'],
    });
    expect(executedSql).toEqual(['create table first_table ();', 'create table second_table ();']);
    expect(sql.begin).toHaveBeenCalledTimes(2);
  });
});
