import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { MAX_PDF_CONTENT_CHARS } from '@/lib/constants/generation';
import { parsePDF } from '@/lib/pdf/pdf-providers';
import {
  getCourseResourceStore,
  resetCourseResourceStoreCacheForTests,
} from '@/lib/server/course-resource-store';
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

export class CourseResourceContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CourseResourceContextError';
  }
}

export class UnsupportedCourseResourceError extends Error {
  constructor(message = 'Supported resource files are PDF, text, and Markdown.') {
    super(message);
    this.name = 'UnsupportedCourseResourceError';
  }
}

function getResourceStore() {
  return getCourseResourceStore({ metadataDir: COURSE_RESOURCES_DIR });
}

export function getCourseResourceStorageDir(): string {
  return process.env.COURSE_RESOURCE_STORAGE_DIR?.trim() || COURSE_RESOURCE_FILES_DIR;
}

async function ensureResourceDirs() {
  if (!process.env.DATABASE_URL?.trim()) {
    await fs.mkdir(COURSE_RESOURCES_DIR, { recursive: true });
  }
  await fs.mkdir(getCourseResourceStorageDir(), { recursive: true });
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

function normalizeResourceText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function appendWithinLimit(parts: string[], nextPart: string, maxChars: number): boolean {
  const currentLength = parts.join('\n\n').length;
  const separatorLength = parts.length > 0 ? 2 : 0;
  const remaining = maxChars - currentLength - separatorLength;
  if (remaining <= 0) return false;

  parts.push(nextPart.length <= remaining ? nextPart : nextPart.slice(0, remaining));
  return nextPart.length <= remaining;
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

  throw new UnsupportedCourseResourceError();
}

function filePathForStorageKey(storageKey: string): string {
  return path.join(getCourseResourceStorageDir(), storageKey);
}

export async function createCourseResource(params: {
  file: File;
  summary?: string;
  organizationId?: string;
  uploadedByUserId?: string;
}): Promise<PersistedCourseResource> {
  await ensureResourceDirs();

  const buffer = Buffer.from(await params.file.arrayBuffer());
  const id = nanoid(10);
  const storageKey = `${id}-${sanitizeFileName(params.file.name)}`;
  const storedPath = filePathForStorageKey(storageKey);
  const { text, pageCount } = await extractResourceText(params.file, buffer);
  const summary = params.summary?.trim() || summarizeExtractively(text, params.file.name);
  const now = new Date().toISOString();
  const resource: PersistedCourseResource = {
    id,
    name: params.file.name,
    mimeType: params.file.type || 'application/octet-stream',
    size: params.file.size,
    createdAt: now,
    updatedAt: now,
    summary,
    excerpt: excerptText(text),
    textLength: text.length,
    ...(pageCount ? { pageCount } : {}),
    ...(params.organizationId ? { organizationId: params.organizationId } : {}),
    ...(params.uploadedByUserId ? { uploadedByUserId: params.uploadedByUserId } : {}),
    storageProvider: 'local',
    storageKey,
    originalFileName: params.file.name,
    checksumSha256: createHash('sha256').update(buffer).digest('hex'),
    text,
  };

  await fs.writeFile(storedPath, buffer);
  await getResourceStore().saveResource(resource);
  return resource;
}

export function toPublicCourseResource(resource: PersistedCourseResource): CourseResource {
  const {
    text: _text,
    storageProvider: _storageProvider,
    storageKey: _storageKey,
    storedFileName: _storedFileName,
    originalFileName: _originalFileName,
    checksumSha256: _checksumSha256,
    updatedAt: _updatedAt,
    organizationId: _organizationId,
    uploadedByUserId: _uploadedByUserId,
    ...publicResource
  } = resource;
  return publicResource;
}

export async function listCourseResources(): Promise<CourseResource[]> {
  await ensureResourceDirs();
  const resources = await getResourceStore().listResources();
  return resources.map(toPublicCourseResource);
}

export async function readCourseResource(id: string): Promise<PersistedCourseResource | null> {
  if (!isValidCourseResourceId(id)) return null;
  return getResourceStore().readResource(id);
}

export async function deleteCourseResource(id: string): Promise<boolean> {
  if (!isValidCourseResourceId(id)) return false;
  const resource = await getResourceStore().deleteResource(id);
  if (!resource) return false;

  if (resource.storageKey) {
    await fs.rm(filePathForStorageKey(resource.storageKey), { force: true });
  }
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
    updatedAt: new Date().toISOString(),
  };
  return getResourceStore().saveResource(updated);
}

export async function buildResourceSummaryBlock(resourceIds: string[]): Promise<string> {
  const resources = (await Promise.all(resourceIds.map((id) => readCourseResource(id)))).filter(
    (resource): resource is PersistedCourseResource => Boolean(resource),
  );

  return resources
    .map(
      (resource) =>
        `Resource: ${resource.name}\nSummary: ${resource.summary}\nExcerpt: ${resource.excerpt}`,
    )
    .join('\n\n');
}

export async function buildClassroomResourceContextBlock(
  resourceIds: string[],
  maxChars = MAX_PDF_CONTENT_CHARS,
): Promise<string> {
  const ids = Array.from(new Set(resourceIds.map((id) => id.trim()).filter(Boolean)));
  const invalidId = ids.find((id) => !isValidCourseResourceId(id));
  if (invalidId) {
    throw new CourseResourceContextError(`Invalid course resource id: ${invalidId}`);
  }

  const resolvedResources = await Promise.all(ids.map((id) => readCourseResource(id)));
  const missingIds = ids.filter((_, index) => !resolvedResources[index]);
  if (missingIds.length > 0) {
    throw new CourseResourceContextError(
      `Selected course resource not found: ${missingIds.join(', ')}`,
    );
  }

  const resources = resolvedResources.filter((resource): resource is PersistedCourseResource =>
    Boolean(resource),
  );
  const parts: string[] = [];

  for (const resource of resources) {
    const text = normalizeResourceText(resource.text);
    const block = [
      `Resource: ${resource.name}`,
      `Summary: ${resource.summary}`,
      `Excerpt: ${resource.excerpt}`,
      `Extracted source text:\n${text || 'No readable text was extracted from this resource.'}`,
    ].join('\n');

    if (!appendWithinLimit(parts, block, maxChars)) break;
  }

  return parts.join('\n\n');
}

export function resetCourseResourcesForTests(): void {
  resetCourseResourceStoreCacheForTests();
}
