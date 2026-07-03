import type { ReactNode } from 'react';
import { requirePlatformPageSession } from '@/lib/server/tenant-page-auth';

export default async function CourseStudioLayout({ children }: { children: ReactNode }) {
  await requirePlatformPageSession();
  return children;
}
