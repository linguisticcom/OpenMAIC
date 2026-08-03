import type { CoursePortalDataset } from '@/lib/types/course-portal';
import { JsonCoursePortalStore, type NormalizeDataset } from './json-store';
import { PostgresCoursePortalStore } from './postgres-store';

export interface CoursePortalStore {
  readDataset(): Promise<CoursePortalDataset>;
  writeDataset(dataset: CoursePortalDataset): Promise<void>;
}

type StoreOptions = {
  jsonFilePath: string;
  fallbackDataset: CoursePortalDataset;
  normalizeDataset: NormalizeDataset;
};

let cachedStore: CoursePortalStore | undefined;
let cachedStoreKey: string | undefined;

export function getCoursePortalStore(options: StoreOptions): CoursePortalStore {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (
    !databaseUrl &&
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_JSON_COURSE_PORTAL !== 'true'
  ) {
    throw new Error(
      'DATABASE_URL is required for the production LC Academy course portal. ' +
        'Set ALLOW_JSON_COURSE_PORTAL=true only for an explicitly isolated demo.',
    );
  }
  const storeKey = databaseUrl ? `postgres:${databaseUrl}` : `json:${options.jsonFilePath}`;
  if (cachedStore && cachedStoreKey === storeKey) return cachedStore;

  cachedStore = databaseUrl
    ? new PostgresCoursePortalStore({ databaseUrl, normalizeDataset: options.normalizeDataset })
    : new JsonCoursePortalStore({
        filePath: options.jsonFilePath,
        fallbackDataset: options.fallbackDataset,
        normalizeDataset: options.normalizeDataset,
      });
  cachedStoreKey = storeKey;
  return cachedStore;
}

export function resetCoursePortalStoreCacheForTests(): void {
  cachedStore = undefined;
  cachedStoreKey = undefined;
}
