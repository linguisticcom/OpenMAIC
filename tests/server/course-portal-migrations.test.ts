import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { runCoursePortalMigrations } from '@/lib/server/course-portal-migrations';

type Sql = ReturnType<typeof postgres>;
type MigrationRow = { name: string; checksum: string | null };

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

function createSqlMock(initial: MigrationRow[] = []) {
  const applied = new Map(initial.map((row) => [row.name, row.checksum]));
  const executedSql: string[] = [];
  const transaction = Object.assign(
    vi.fn(async (_strings: TemplateStringsArray, name: string, checksum: string) => {
      applied.set(name, checksum);
    }),
    {
      unsafe: vi.fn(async (migrationSql: string) => {
        executedSql.push(migrationSql);
      }),
    },
  );
  const sql = Object.assign(
    vi.fn(async (strings: TemplateStringsArray, ...values: string[]) => {
      const query = strings.join(' ');
      if (query.includes('select name, checksum')) {
        return [...applied].map(([name, checksum]) => ({ name, checksum }));
      }
      if (query.includes('update course_portal_migrations')) {
        applied.set(values[1], values[0]);
        return [];
      }
      return [];
    }),
    {
      unsafe: vi.fn(async () => undefined),
      begin: vi.fn(async (callback: (transactionSql: typeof transaction) => Promise<void>) =>
        callback(transaction),
      ),
    },
  ) as unknown as Sql;

  return { applied, executedSql, sql };
}

describe('runCoursePortalMigrations', () => {
  it('records checksums and skips unchanged migrations on later deploys', async () => {
    const migrationsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openmaic-migrations-'));
    tempRoots.push(migrationsDir);
    await fs.writeFile(path.join(migrationsDir, '001_first.sql'), 'create table first_table ();');
    await fs.writeFile(path.join(migrationsDir, '002_second.sql'), 'create table second_table ();');
    const { applied, executedSql, sql } = createSqlMock();

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
    expect(applied.get('001_first.sql')).toMatch(/^[a-f0-9]{64}$/);
    expect(sql.begin).toHaveBeenCalledTimes(2);
  });

  it('backfills legacy ledger checksums and fails closed if migration SQL changes', async () => {
    const migrationsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openmaic-migrations-'));
    tempRoots.push(migrationsDir);
    const migrationPath = path.join(migrationsDir, '001_first.sql');
    await fs.writeFile(migrationPath, 'create table first_table ();');
    const { applied, sql } = createSqlMock([{ name: '001_first.sql', checksum: null }]);

    await expect(runCoursePortalMigrations(sql, migrationsDir)).resolves.toEqual({
      applied: [],
      skipped: ['001_first.sql'],
    });
    expect(applied.get('001_first.sql')).toMatch(/^[a-f0-9]{64}$/);

    await fs.writeFile(migrationPath, 'create table changed_table ();');
    await expect(runCoursePortalMigrations(sql, migrationsDir)).rejects.toThrow(
      'Course portal migration checksum mismatch: 001_first.sql',
    );
  });
});
