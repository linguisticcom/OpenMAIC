import { existsSync } from 'fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalStorageDir = process.env.COURSE_RESOURCE_STORAGE_DIR;
let tempRoot: string | undefined;

vi.mock('@/lib/pdf/pdf-providers', () => ({
  parsePDF: vi.fn(async () => ({
    text: 'PDF source text about corporate finance, shares, creditors, and liability.',
    metadata: { pageCount: 2 },
  })),
}));

async function setupTempCwd(options: { storageDir?: string } = {}) {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), 'openmaic-course-resources-'));
  process.chdir(tempRoot);
  delete process.env.DATABASE_URL;
  if (options.storageDir) {
    process.env.COURSE_RESOURCE_STORAGE_DIR = options.storageDir;
  } else {
    delete process.env.COURSE_RESOURCE_STORAGE_DIR;
  }
  vi.resetModules();
  return tempRoot;
}

async function cleanup() {
  process.chdir(originalCwd);
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalStorageDir === undefined) delete process.env.COURSE_RESOURCE_STORAGE_DIR;
  else process.env.COURSE_RESOURCE_STORAGE_DIR = originalStorageDir;
  vi.resetModules();
  if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
  tempRoot = undefined;
}

beforeEach(async () => {
  await cleanup();
});

afterEach(async () => {
  await cleanup();
});

function file(contents: string, name: string, type: string) {
  return new File([contents], name, { type });
}

describe('Course Studio course resources', () => {
  it('uses JSON/filesystem fallback to create, list, read, build context, and delete resources', async () => {
    const root = await setupTempCwd();
    const resources = await import('@/lib/server/course-resources');

    const resource = await resources.createCourseResource({
      file: file(
        'Working capital means current assets minus current liabilities.',
        'finance.md',
        'text/markdown',
      ),
      summary: 'Working capital source summary.',
    });

    expect(resource).toMatchObject({
      name: 'finance.md',
      mimeType: 'text/markdown',
      storageProvider: 'local',
      originalFileName: 'finance.md',
      summary: 'Working capital source summary.',
    });
    expect(resource.textLength).toBeGreaterThan(0);
    expect(resource.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(existsSync(path.join(root, 'data/resources', `${resource.id}.json`))).toBe(true);
    expect(existsSync(path.join(root, 'data/resources/files', resource.storageKey))).toBe(true);

    const publicResource = resources.toPublicCourseResource(resource) as unknown as Record<
      string,
      unknown
    >;
    expect(publicResource.text).toBeUndefined();
    expect(publicResource.storageKey).toBeUndefined();
    expect(publicResource.storageProvider).toBeUndefined();
    expect(publicResource.originalFileName).toBeUndefined();
    expect(publicResource.checksumSha256).toBeUndefined();

    await expect(resources.listCourseResources()).resolves.toHaveLength(1);
    await expect(resources.readCourseResource(resource.id)).resolves.toMatchObject({
      id: resource.id,
      text: expect.stringContaining('Working capital'),
    });
    await expect(resources.buildResourceSummaryBlock([resource.id])).resolves.toContain(
      'Working capital source summary.',
    );
    await expect(resources.buildClassroomResourceContextBlock([resource.id])).resolves.toContain(
      'Extracted source text:',
    );

    await expect(resources.deleteCourseResource(resource.id)).resolves.toBe(true);
    await expect(resources.readCourseResource(resource.id)).resolves.toBeNull();
    expect(existsSync(path.join(root, 'data/resources/files', resource.storageKey))).toBe(false);
  });

  it('keeps legacy JSON fallback metadata compatible without exposing stored filenames', async () => {
    const root = await setupTempCwd();
    const resourcesDir = path.join(root, 'data/resources');
    const filesDir = path.join(resourcesDir, 'files');
    await mkdir(filesDir, { recursive: true });
    await writeFile(path.join(filesDir, 'legacy-1-finance.txt'), 'Legacy source text.', 'utf-8');
    await writeFile(
      path.join(resourcesDir, 'legacy-1.json'),
      JSON.stringify(
        {
          id: 'legacy-1',
          name: 'legacy finance.txt',
          mimeType: 'text/plain',
          size: 19,
          createdAt: '2026-01-01T00:00:00.000Z',
          summary: 'Legacy summary.',
          excerpt: 'Legacy source text.',
          textLength: 19,
          storedFileName: 'legacy-1-finance.txt',
          text: 'Legacy source text.',
        },
        null,
        2,
      ),
      'utf-8',
    );

    const resources = await import('@/lib/server/course-resources');
    const resource = await resources.readCourseResource('legacy-1');

    expect(resource).toMatchObject({
      id: 'legacy-1',
      storageKey: 'legacy-1-finance.txt',
      storageProvider: 'local',
      originalFileName: 'legacy finance.txt',
    });
    const publicResource = resources.toPublicCourseResource(resource!) as unknown as Record<
      string,
      unknown
    >;
    expect(publicResource.storedFileName).toBeUndefined();
    expect(publicResource.storageKey).toBeUndefined();
    expect(publicResource.text).toBeUndefined();

    await expect(resources.deleteCourseResource('legacy-1')).resolves.toBe(true);
    expect(existsSync(path.join(filesDir, 'legacy-1-finance.txt'))).toBe(false);
  });

  it('supports PDF, text, and Markdown uploads', async () => {
    await setupTempCwd();
    const resources = await import('@/lib/server/course-resources');

    const pdf = await resources.createCourseResource({
      file: file('%PDF-1.4 fake fixture', 'finance.pdf', 'application/pdf'),
    });
    const txt = await resources.createCourseResource({
      file: file('Plain text source.', 'notes.txt', 'text/plain'),
    });
    const md = await resources.createCourseResource({
      file: file('# Markdown source', 'notes.md', 'text/markdown'),
    });

    expect(pdf).toMatchObject({ pageCount: 2, text: expect.stringContaining('corporate finance') });
    expect(txt.text).toContain('Plain text source');
    expect(md.text).toContain('Markdown source');
    await expect(resources.listCourseResources()).resolves.toHaveLength(3);
  });

  it('rejects unsupported files safely', async () => {
    await setupTempCwd();
    const resources = await import('@/lib/server/course-resources');

    await expect(
      resources.createCourseResource({
        file: file('{"not":"a resource"}', 'data.json', 'application/json'),
      }),
    ).rejects.toBeInstanceOf(resources.UnsupportedCourseResourceError);
  });

  it('fails invalid selected resource IDs before building classroom context', async () => {
    await setupTempCwd();
    const resources = await import('@/lib/server/course-resources');

    await expect(resources.buildClassroomResourceContextBlock(['../bad'])).rejects.toThrow(
      /Invalid course resource id/,
    );
    await expect(
      resources.buildClassroomResourceContextBlock(['missing-resource']),
    ).rejects.toThrow(/Selected course resource not found/);
  });

  it('respects COURSE_RESOURCE_STORAGE_DIR for uploaded file bytes', async () => {
    const root = await setupTempCwd({
      storageDir: path.join(os.tmpdir(), `openmaic-resource-files-${Date.now()}`),
    });
    const storageDir = process.env.COURSE_RESOURCE_STORAGE_DIR!;
    const resources = await import('@/lib/server/course-resources');

    const resource = await resources.createCourseResource({
      file: file('Persistent file storage source.', 'storage.txt', 'text/plain'),
    });

    expect(existsSync(path.join(storageDir, resource.storageKey))).toBe(true);
    expect(existsSync(path.join(root, 'data/resources/files', resource.storageKey))).toBe(false);
    await expect(readFile(path.join(storageDir, resource.storageKey), 'utf-8')).resolves.toContain(
      'Persistent file storage source.',
    );
    await rm(storageDir, { recursive: true, force: true });
  });

  it('selects the Postgres store when DATABASE_URL exists', async () => {
    await setupTempCwd();
    process.env.DATABASE_URL = 'postgres://example.invalid/openmaic';
    vi.resetModules();
    const { getCourseResourceStore, resetCourseResourceStoreCacheForTests } =
      await import('@/lib/server/course-resource-store');
    const { PostgresCourseResourceStore } =
      await import('@/lib/server/course-resource-store/postgres-store');

    const store = getCourseResourceStore({ metadataDir: path.join(os.tmpdir(), 'unused') });
    expect(store).toBeInstanceOf(PostgresCourseResourceStore);
    resetCourseResourceStoreCacheForTests();
  });

  it('writes resource metadata, not file bytes, through the Postgres store', async () => {
    const calls: Array<{ query?: string; values?: unknown[]; helper?: Record<string, unknown> }> =
      [];
    const sql = vi.fn((first: unknown, ...values: unknown[]) => {
      if (Array.isArray(first) && 'raw' in first) {
        calls.push({ query: first.join('?'), values });
        return Promise.resolve([]);
      }
      calls.push({ helper: first as Record<string, unknown> });
      return { helper: first };
    });
    Object.assign(sql, { end: vi.fn() });
    const { PostgresCourseResourceStore } =
      await import('@/lib/server/course-resource-store/postgres-store');
    const store = new PostgresCourseResourceStore({ sql: sql as never });

    await store.saveResource({
      id: 'res-pg',
      name: 'finance.md',
      mimeType: 'text/markdown',
      size: 128,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      summary: 'Summary.',
      excerpt: 'Excerpt.',
      textLength: 13,
      storageProvider: 'local',
      storageKey: 'res-pg-finance.md',
      originalFileName: 'finance.md',
      checksumSha256: 'a'.repeat(64),
      text: 'Extracted text',
    });

    const insertedRow = calls.find((call) => call.helper)?.helper;
    expect(insertedRow).toMatchObject({
      id: 'res-pg',
      storage_key: 'res-pg-finance.md',
      original_file_name: 'finance.md',
      extracted_text: 'Extracted text',
    });
    expect(insertedRow).not.toHaveProperty('file');
    expect(insertedRow).not.toHaveProperty('buffer');
    expect(calls.some((call) => call.query?.includes('insert into course_resources'))).toBe(true);
  });
});
