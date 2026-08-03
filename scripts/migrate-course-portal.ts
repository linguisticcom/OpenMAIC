import { promises as fs } from 'fs';
import path from 'path';
import postgres from 'postgres';
import { PostgresCoursePortalStore } from '@/lib/server/course-portal-store/postgres-store';
import { runCoursePortalMigrations } from '@/lib/server/course-portal-migrations';
import type { CoursePortalDataset } from '@/lib/types/course-portal';

const EMPTY_DATASET: CoursePortalDataset = {
  organizations: [],
  users: [],
  courses: [],
  assignments: [],
  students: [],
  enrollments: [],
  accessCodes: [],
  cohorts: [],
  activityLogs: [],
  passwordResetTokens: [],
  accountInvitations: [],
  emailVerificationTokens: [],
  authAuditEvents: [],
};

async function loadDotenvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  try {
    const raw = await fs.readFile(envPath, 'utf-8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...rest] = trimmed.split('=');
      if (!key || process.env[key] !== undefined) continue;
      process.env[key] = rest.join('=').replace(/^['"]|['"]$/g, '');
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

function normalizeDataset(input: Partial<CoursePortalDataset>): CoursePortalDataset {
  return {
    ...EMPTY_DATASET,
    ...input,
    organizations: Array.isArray(input.organizations) ? input.organizations : [],
    users: Array.isArray(input.users)
      ? input.users.map((user) => ({
          ...user,
          status: user.status || 'active',
          sessionVersion: user.sessionVersion || 1,
        }))
      : [],
    courses: Array.isArray(input.courses) ? input.courses : [],
    assignments: Array.isArray(input.assignments) ? input.assignments : [],
    students: Array.isArray(input.students) ? input.students : [],
    enrollments: Array.isArray(input.enrollments) ? input.enrollments : [],
    accessCodes: Array.isArray(input.accessCodes) ? input.accessCodes : [],
    cohorts: Array.isArray(input.cohorts) ? input.cohorts : [],
    activityLogs: Array.isArray(input.activityLogs) ? input.activityLogs : [],
    passwordResetTokens: Array.isArray(input.passwordResetTokens) ? input.passwordResetTokens : [],
    accountInvitations: Array.isArray(input.accountInvitations) ? input.accountInvitations : [],
    emailVerificationTokens: Array.isArray(input.emailVerificationTokens)
      ? input.emailVerificationTokens
      : [],
    authAuditEvents: Array.isArray(input.authAuditEvents) ? input.authAuditEvents : [],
  };
}

async function readCatalogDataset(): Promise<CoursePortalDataset | undefined> {
  const catalogPath = path.join(process.cwd(), 'data', 'course-portal', 'catalog.json');
  try {
    const raw = await fs.readFile(catalogPath, 'utf-8');
    return normalizeDataset(JSON.parse(raw) as Partial<CoursePortalDataset>);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

async function main() {
  await loadDotenvLocal();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.log('[course-portal:migrate] DATABASE_URL is not set; skipping Postgres migration.');
    return;
  }

  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const migrationResult = await runCoursePortalMigrations(sql);
    for (const file of migrationResult.applied) {
      console.log(`[course-portal:migrate] applied ${file}`);
    }
    if (migrationResult.skipped.length > 0) {
      console.log(
        `[course-portal:migrate] skipped ${migrationResult.skipped.length} previously applied migration(s).`,
      );
    }
    const [{ count }] = await sql<
      { count: string }[]
    >`select count(*)::text as count from organizations`;
    const shouldImportSeed = process.env.COURSE_PORTAL_SEED_IMPORT === 'true';
    if (!shouldImportSeed) {
      console.log(
        `[course-portal:migrate] catalog import disabled; database contains ${count} organization(s).`,
      );
      return;
    }

    const dataset = await readCatalogDataset();
    if (!dataset) {
      console.log('[course-portal:migrate] no data/course-portal/catalog.json found to import.');
      return;
    }

    const store = new PostgresCoursePortalStore({ sql, normalizeDataset });
    await store.writeDataset(dataset);
    console.log(
      `[course-portal:migrate] imported catalog: ${dataset.organizations.length} orgs, ${dataset.users.length} users, ${dataset.courses.length} courses.`,
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
