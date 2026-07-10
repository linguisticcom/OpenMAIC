import { promises as fs } from 'fs';
import path from 'path';
import type postgres from 'postgres';

type CoursePortalSql = ReturnType<typeof postgres>;

const MIGRATION_LEDGER_SQL = `
  create table if not exists course_portal_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )
`;

/** Apply each SQL migration once and record it atomically with its schema change. */
export async function runCoursePortalMigrations(
  sql: CoursePortalSql,
  migrationsDir = path.join(process.cwd(), 'db', 'migrations'),
): Promise<{ applied: string[]; skipped: string[] }> {
  await sql.unsafe(MIGRATION_LEDGER_SQL);

  const appliedRows = await sql<{ name: string }[]>`
    select name from course_portal_migrations
  `;
  const appliedNames = new Set(appliedRows.map((row) => row.name));
  const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
  const result = { applied: [] as string[], skipped: [] as string[] };

  for (const file of files) {
    if (appliedNames.has(file)) {
      result.skipped.push(file);
      continue;
    }

    const migrationSql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
    await sql.begin(async (transaction) => {
      await transaction.unsafe(migrationSql);
      await transaction`
        insert into course_portal_migrations (name) values (${file})
      `;
    });
    appliedNames.add(file);
    result.applied.push(file);
  }

  return result;
}
