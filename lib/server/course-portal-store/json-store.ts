import { promises as fs } from 'fs';
import path from 'path';
import type { CoursePortalDataset } from '@/lib/types/course-portal';

export type NormalizeDataset = (dataset: Partial<CoursePortalDataset>) => CoursePortalDataset;

export class JsonCoursePortalStore {
  constructor(
    private readonly options: {
      filePath: string;
      fallbackDataset: CoursePortalDataset;
      normalizeDataset: NormalizeDataset;
    },
  ) {}

  async readDataset(): Promise<CoursePortalDataset> {
    try {
      const raw = await fs.readFile(this.options.filePath, 'utf-8');
      return this.options.normalizeDataset(JSON.parse(raw) as Partial<CoursePortalDataset>);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return cloneDataset(this.options.fallbackDataset);
      }
      throw error;
    }
  }

  async writeDataset(dataset: CoursePortalDataset): Promise<void> {
    await fs.mkdir(path.dirname(this.options.filePath), { recursive: true });
    await fs.writeFile(this.options.filePath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf-8');
  }
}

function cloneDataset(dataset: CoursePortalDataset): CoursePortalDataset {
  return JSON.parse(JSON.stringify(dataset)) as CoursePortalDataset;
}
