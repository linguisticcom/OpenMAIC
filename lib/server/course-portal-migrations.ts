import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import type postgres from 'postgres';

type CoursePortalSql = ReturnType<typeof postgres>;

const MIGRATION_LEDGER_SQL = `
  create table if not exists course_portal_migrations (
    name text primary key,
    checksum text,
    applied_at timestamptz not null default now()
  )
`;

const MIGRATION_LEDGER_CHECKSUM_SQL = `
  alter table course_portal_migrations add column if not exists checksum text
`;

/** Apply each SQL migration once and record it atomically with its schema change. */
export async function runCoursePortalMigrations(
  sql: CoursePortalSql,
  migrationsDir = path.join(process.cwd(), 'db', 'migrations'),
): Promise<{ applied: string[]; skipped: string[] }> {
  await sql.unsafe(MIGRATION_LEDGER_SQL);
  await sql.unsafe(MIGRATION_LEDGER_CHECKSUM_SQL);

  const appliedRows = await sql<{ name: string; checksum: string | null }[]>`
    select name, checksum from course_portal_migrations
  `;
  const appliedChecksums = new Map(appliedRows.map((row) => [row.name, row.checksum]));
  const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
  const result = { applied: [] as string[], skipped: [] as string[] };

  for (const file of files) {
    const migrationSql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
    const checksum = createHash('sha256').update(migrationSql).digest('hex');
    if (appliedChecksums.has(file)) {
      const appliedChecksum = appliedChecksums.get(file);
      if (appliedChecksum && appliedChecksum !== checksum) {
        throw new Error(`Course portal migration checksum mismatch: ${file}`);
      }
      if (!appliedChecksum) {
        await sql`
          update course_portal_migrations set checksum = ${checksum} where name = ${file}
        `;
        appliedChecksums.set(file, checksum);
      }
      result.skipped.push(file);
      continue;
    }

    await sql.begin(async (transaction) => {
      await transaction.unsafe(migrationSql);
      await transaction`
        insert into course_portal_migrations (name, checksum) values (${file}, ${checksum})
      `;
    });
    appliedChecksums.set(file, checksum);
    result.applied.push(file);
  }

  return result;
}
