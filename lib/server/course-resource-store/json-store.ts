import { promises as fs } from 'fs';
import path from 'path';
import type { PersistedCourseResource } from '@/lib/types/course-studio';

type RawCourseResource = Partial<PersistedCourseResource> & {
  storedFileName?: string;
};

export class JsonCourseResourceStore {
  constructor(private readonly options: { metadataDir: string }) {}

  private metadataPath(id: string) {
    return path.join(this.options.metadataDir, `${id}.json`);
  }

  private async ensureMetadataDir() {
    await fs.mkdir(this.options.metadataDir, { recursive: true });
  }

  async listResources(): Promise<PersistedCourseResource[]> {
    await this.ensureMetadataDir();
    const entries = await fs.readdir(this.options.metadataDir, { withFileTypes: true });
    const resources = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map(async (entry) => {
          const content = await fs.readFile(
            path.join(this.options.metadataDir, entry.name),
            'utf-8',
          );
          return normalizeResource(JSON.parse(content) as RawCourseResource);
        }),
    );

    return resources.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async readResource(id: string): Promise<PersistedCourseResource | null> {
    try {
      const content = await fs.readFile(this.metadataPath(id), 'utf-8');
      return normalizeResource(JSON.parse(content) as RawCourseResource);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async saveResource(resource: PersistedCourseResource): Promise<PersistedCourseResource> {
    await this.ensureMetadataDir();
    await fs.writeFile(this.metadataPath(resource.id), JSON.stringify(resource, null, 2), 'utf-8');
    return resource;
  }

  async deleteResource(id: string): Promise<PersistedCourseResource | null> {
    const resource = await this.readResource(id);
    if (!resource) return null;
    await fs.rm(this.metadataPath(id), { force: true });
    return resource;
  }
}

function normalizeResource(raw: RawCourseResource): PersistedCourseResource {
  const storageKey = raw.storageKey || raw.storedFileName || '';
  return {
    id: String(raw.id || ''),
    name: String(raw.name || raw.originalFileName || 'Untitled resource'),
    mimeType: String(raw.mimeType || 'application/octet-stream'),
    size: Number(raw.size || 0),
    createdAt: String(raw.createdAt || new Date(0).toISOString()),
    updatedAt: raw.updatedAt,
    summary: String(raw.summary || ''),
    excerpt: String(raw.excerpt || ''),
    textLength: Number(raw.textLength || raw.text?.length || 0),
    ...(typeof raw.pageCount === 'number' ? { pageCount: raw.pageCount } : {}),
    ...(raw.organizationId ? { organizationId: raw.organizationId } : {}),
    ...(raw.uploadedByUserId ? { uploadedByUserId: raw.uploadedByUserId } : {}),
    storageProvider: raw.storageProvider || 'local',
    storageKey,
    ...(raw.storedFileName ? { storedFileName: raw.storedFileName } : {}),
    originalFileName: raw.originalFileName || raw.name || storageKey,
    checksumSha256: raw.checksumSha256 || '',
    text: String(raw.text || ''),
  };
}
