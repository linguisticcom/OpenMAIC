import { promises as fs } from 'fs';
import path from 'path';
import type { CoursePortalDataset } from '@/lib/types/course-portal';

export type NormalizeDataset = (dataset: Partial<CoursePortalDataset>) => CoursePortalDataset;

export class JsonCoursePortalStore {
  private mutationQueue: Promise<void> = Promise.resolve();

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
    await this.withMutationLock(() => this.writeDatasetUnlocked(dataset));
  }

  async mutateDataset<T>(mutator: (dataset: CoursePortalDataset) => T | Promise<T>): Promise<T> {
    return this.withMutationLock(async () => {
      const dataset = await this.readDataset();
      const result = await mutator(dataset);
      await this.writeDatasetUnlocked(this.options.normalizeDataset(dataset));
      return result;
    });
  }

  private async writeDatasetUnlocked(dataset: CoursePortalDataset): Promise<void> {
    await fs.mkdir(path.dirname(this.options.filePath), { recursive: true });
    const temporaryPath = `${this.options.filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(temporaryPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf-8');
    await fs.rename(temporaryPath, this.options.filePath);
  }

  private async withMutationLock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.mutationQueue;
    let release!: () => void;
    this.mutationQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }
}

function cloneDataset(dataset: CoursePortalDataset): CoursePortalDataset {
  return JSON.parse(JSON.stringify(dataset)) as CoursePortalDataset;
}
