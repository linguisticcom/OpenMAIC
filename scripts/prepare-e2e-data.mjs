import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outputRoot = path.join(root, 'output', 'playwright');
const target = path.join(outputRoot, 'course-portal', 'catalog.json');

await rm(outputRoot, { recursive: true, force: true });
await rm(path.join(root, '.next-e2e'), { recursive: true, force: true });
await mkdir(path.dirname(target), { recursive: true });
await cp(path.join(root, 'data', 'course-portal', 'catalog.json'), target);

console.log(`[e2e] isolated course portal data: ${target}`);
