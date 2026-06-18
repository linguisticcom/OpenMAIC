import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { parsePDF } from '@/lib/pdf/pdf-providers';
import type { CourseResource, PersistedCourseResource } from '@/lib/types/course-studio';

export const COURSE_RESOURCES_DIR = path.join(process.cwd(), 'data', 'resources');
export const COURSE_RESOURCE_FILES_DIR = path.join(COURSE_RESOURCES_DIR, 'files');

const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.markdown']);
const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/markdown',
]);

async function ensureResourceDirs() {
  await fs.mkdir(COURSE_RESOURCE_FILES_DIR, { recursive: true });
}

function metadataPath(id: string) {
  return path.join(COURSE_RESOURCES_DIR, `${id}.json`);
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'resource';
}

export function isValidCourseResourceId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

function summarizeExtractively(text: string, name: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return `No readable text could be extracted from ${name}.`;
  return normalized.length <= 900 ? normalized : `${normalized.slice(0, 900).trim()}...`;
}

function excerptText(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length <= 420 ? normalized : `${normalized.slice(0, 420).trim()}...`;
}

async function extractResourceText(file: File, buffer: Buffer) {
  const extension = path.extname(file.name).toLowerCase();
  const mimeType = file.type || 'application/octet-stream';

  if (mimeType === 'application/pdf' || extension === '.pdf') {
    const parsed = await parsePDF({ providerId: 'unpdf' }, buffer);
    return {
      text: parsed.text || '',
      pageCount: parsed.metadata?.pageCount,
    };
  }

  if (TEXT_MIME_TYPES.has(mimeType) || TEXT_EXTENSIONS.has(extension)) {
    return {
      text: new TextDecoder('utf-8').decode(buffer),
      pageCount: undefined,
    };
  }

  throw new Error('Supported resource files are PDF, text, and Markdown.');
}

export async function createCourseResource(params: {
  file: File;
  summary?: string;
}): Promise<PersistedCourseResource> {
  await ensureResourceDirs();

  const buffer = Buffer.from(await params.file.arrayBuffer());
  const id = nanoid(10);
  const storedFileName = `${id}-${sanitizeFileName(params.file.name)}`;
  const storedPath = path.join(COURSE_RESOURCE_FILES_DIR, storedFileName);
  const { text, pageCount } = await extractResourceText(params.file, buffer);
  const summary = params.summary?.trim() || summarizeExtractively(text, params.file.name);
  const resource: PersistedCourseResource = {
    id,
    name: params.file.name,
    mimeType: params.file.type || 'application/octet-stream',
    size: params.file.size,
    createdAt: new Date().toISOString(),
    summary,
    excerpt: excerptText(text),
    textLength: text.length,
    ...(pageCount ? { pageCount } : {}),
    storedFileName,
    text,
  };

  await fs.writeFile(storedPath, buffer);
  await fs.writeFile(metadataPath(id), JSON.stringify(resource, null, 2), 'utf-8');
  return resource;
}

export function toPublicCourseResource(resource: PersistedCourseResource): CourseResource {
  const { storedFileName: _storedFileName, text: _text, ...publicResource } = resource;
  return publicResource;
}

export async function listCourseResources(): Promise<CourseResource[]> {
  await ensureResourceDirs();
  const entries = await fs.readdir(COURSE_RESOURCES_DIR, { withFileTypes: true });
  const resources = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map(async (entry) => {
        const content = await fs.readFile(path.join(COURSE_RESOURCES_DIR, entry.name), 'utf-8');
        return toPublicCourseResource(JSON.parse(content) as PersistedCourseResource);
      }),
  );

  return resources.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readCourseResource(id: string): Promise<PersistedCourseResource | null> {
  if (!isValidCourseResourceId(id)) return null;

  try {
    const content = await fs.readFile(metadataPath(id), 'utf-8');
    return JSON.parse(content) as PersistedCourseResource;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function deleteCourseResource(id: string): Promise<boolean> {
  const resource = await readCourseResource(id);
  if (!resource) return false;

  await fs.rm(metadataPath(id), { force: true });
  await fs.rm(path.join(COURSE_RESOURCE_FILES_DIR, resource.storedFileName), { force: true });
  return true;
}

export async function updateCourseResourceSummary(
  id: string,
  summary: string,
): Promise<PersistedCourseResource | null> {
  const resource = await readCourseResource(id);
  if (!resource) return null;

  const updated = {
    ...resource,
    summary,
  };
  await fs.writeFile(metadataPath(id), JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export async function buildResourceSummaryBlock(resourceIds: string[]): Promise<string> {
  const resources = (
    await Promise.all(resourceIds.map((id) => readCourseResource(id)))
  ).filter((resource): resource is PersistedCourseResource => Boolean(resource));

  return resources
    .map(
      (resource) =>
        `Resource: ${resource.name}\nSummary: ${resource.summary}\nExcerpt: ${resource.excerpt}`,
    )
    .join('\n\n');
}
