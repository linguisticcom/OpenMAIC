import type { PersistedCourseResource } from '@/lib/types/course-studio';
import { JsonCourseResourceStore } from './json-store';
import { PostgresCourseResourceStore } from './postgres-store';

export interface CourseResourceStore {
  listResources(): Promise<PersistedCourseResource[]>;
  readResource(id: string): Promise<PersistedCourseResource | null>;
  saveResource(resource: PersistedCourseResource): Promise<PersistedCourseResource>;
  deleteResource(id: string): Promise<PersistedCourseResource | null>;
}

type StoreOptions = {
  metadataDir: string;
};

let cachedStore: CourseResourceStore | undefined;
let cachedStoreKey: string | undefined;

export function getCourseResourceStore(options: StoreOptions): CourseResourceStore {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const storeKey = databaseUrl ? `postgres:${databaseUrl}` : `json:${options.metadataDir}`;
  if (cachedStore && cachedStoreKey === storeKey) return cachedStore;

  cachedStore = databaseUrl
    ? new PostgresCourseResourceStore({ databaseUrl })
    : new JsonCourseResourceStore({ metadataDir: options.metadataDir });
  cachedStoreKey = storeKey;
  return cachedStore;
}

export function resetCourseResourceStoreCacheForTests(): void {
  cachedStore = undefined;
  cachedStoreKey = undefined;
}
