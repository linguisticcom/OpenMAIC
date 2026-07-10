import postgres from 'postgres';
import type { PersistedCourseResource } from '@/lib/types/course-studio';

type SqlClient = postgres.Sql;

type PostgresCourseResourceStoreOptions = {
  databaseUrl?: string;
  sql?: SqlClient;
};

export class PostgresCourseResourceStore {
  private readonly sql: SqlClient;
  private readonly ownsClient: boolean;

  constructor(options: PostgresCourseResourceStoreOptions) {
    if (options.sql) {
      this.sql = options.sql;
      this.ownsClient = false;
    } else {
      if (!options.databaseUrl) {
        throw new Error('DATABASE_URL is required for the Postgres course resource store.');
      }
      this.sql = postgres(options.databaseUrl, { max: 5 });
      this.ownsClient = true;
    }
  }

  async listResources(): Promise<PersistedCourseResource[]> {
    const rows = await this.sql`select * from course_resources order by created_at desc, id`;
    return (rows as Record<string, unknown>[]).map(rowToResource);
  }

  async readResource(id: string): Promise<PersistedCourseResource | null> {
    const rows = await this.sql`select * from course_resources where id = ${id} limit 1`;
    const row = (rows as Record<string, unknown>[])[0];
    return row ? rowToResource(row) : null;
  }

  async saveResource(resource: PersistedCourseResource): Promise<PersistedCourseResource> {
    const row = resourceToRow(resource);
    await this.sql`
      insert into course_resources ${this.sql(row)}
      on conflict (id) do update set
        organization_id = excluded.organization_id,
        uploaded_by_user_id = excluded.uploaded_by_user_id,
        name = excluded.name,
        mime_type = excluded.mime_type,
        size_bytes = excluded.size_bytes,
        storage_provider = excluded.storage_provider,
        storage_key = excluded.storage_key,
        original_file_name = excluded.original_file_name,
        checksum_sha256 = excluded.checksum_sha256,
        summary = excluded.summary,
        excerpt = excluded.excerpt,
        text_length = excluded.text_length,
        page_count = excluded.page_count,
        extracted_text = excluded.extracted_text,
        updated_at = excluded.updated_at
    `;
    return resource;
  }

  async deleteResource(id: string): Promise<PersistedCourseResource | null> {
    const existing = await this.readResource(id);
    if (!existing) return null;
    await this.sql`delete from course_resources where id = ${id}`;
    return existing;
  }

  async close(): Promise<void> {
    if (this.ownsClient) await this.sql.end();
  }
}

function optionalString(value: unknown): string | undefined {
  return value == null ? undefined : String(value);
}

function optionalNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function rowToResource(row: Record<string, unknown>): PersistedCourseResource {
  return {
    id: String(row.id),
    name: String(row.name),
    mimeType: String(row.mime_type),
    size: Number(row.size_bytes || 0),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    summary: String(row.summary || ''),
    excerpt: String(row.excerpt || ''),
    textLength: Number(row.text_length || 0),
    ...(optionalNumber(row.page_count) ? { pageCount: optionalNumber(row.page_count) } : {}),
    storageProvider: String(row.storage_provider || 'local'),
    storageKey: String(row.storage_key),
    originalFileName: String(row.original_file_name || row.name),
    checksumSha256: String(row.checksum_sha256 || ''),
    text: String(row.extracted_text || ''),
    ...(optionalString(row.organization_id)
      ? { organizationId: optionalString(row.organization_id) }
      : {}),
    ...(optionalString(row.uploaded_by_user_id)
      ? { uploadedByUserId: optionalString(row.uploaded_by_user_id) }
      : {}),
  };
}

function resourceToRow(resource: PersistedCourseResource): Record<string, unknown> {
  return {
    id: resource.id,
    organization_id: resource.organizationId ?? null,
    uploaded_by_user_id: resource.uploadedByUserId ?? null,
    name: resource.name,
    mime_type: resource.mimeType,
    size_bytes: resource.size,
    storage_provider: resource.storageProvider,
    storage_key: resource.storageKey,
    original_file_name: resource.originalFileName,
    checksum_sha256: resource.checksumSha256,
    summary: resource.summary,
    excerpt: resource.excerpt,
    text_length: resource.textLength,
    page_count: resource.pageCount ?? null,
    extracted_text: resource.text,
    created_at: resource.createdAt,
    updated_at: resource.updatedAt ?? resource.createdAt,
  };
}
