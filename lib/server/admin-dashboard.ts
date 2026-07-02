import { promises as fs } from 'fs';
import path from 'path';
import type { AdminSchoolOverview } from '@/lib/types/admin-dashboard';

const DATA_DIR = path.join(process.cwd(), 'data', 'admin');
const OVERVIEW_FILE = path.join(DATA_DIR, 'overview.json');

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

const modules = [
  'Introduction to AI Concepts',
  'Types of AI',
  'Applications of AI',
  'Ethics in AI',
  'Machine Learning Basics',
  'Final Knowledge Check',
].map((title, index) => ({
  id: `module-${index + 1}`,
  order: index + 1,
  title,
  durationMinutes: 30,
}));

function buildProgress(completed: number, currentProgress = 0) {
  return modules.map((module, index) => {
    if (index < completed) {
      return {
        moduleId: module.id,
        status: 'completed' as const,
        progressPercent: 100,
        scorePercent: 76 + ((index * 7) % 18),
        completedAt: daysAgo(8 - index),
        lastActivityAt: daysAgo(8 - index),
        timeSpentMinutes: 28 + ((index * 5) % 14),
      };
    }
    if (index === completed && currentProgress > 0) {
      return {
        moduleId: module.id,
        status: 'in_progress' as const,
        progressPercent: currentProgress,
        lastActivityAt: daysAgo(1),
        timeSpentMinutes: Math.max(5, Math.round((module.durationMinutes * currentProgress) / 100)),
      };
    }
    return {
      moduleId: module.id,
      status: 'not_started' as const,
      progressPercent: 0,
      timeSpentMinutes: 0,
    };
  });
}

function seedOverview(): AdminSchoolOverview {
  return {
    school: {
      id: 'school-lc-demo',
      name: 'Linguistic Communication Academy',
      plan: 'Pilot cohort',
    },
    course: {
      id: 'course-ai-intro',
      title: 'Introduction to Artificial Intelligence',
      moduleCount: modules.length,
      modules,
    },
    students: [
      {
        id: 'student-001',
        name: 'Amina Benali',
        email: 'amina.benali@example.edu',
        group: 'AI Beginners A',
        accountStatus: 'active',
        createdAt: daysAgo(18),
        lastSeenAt: daysAgo(0),
        moduleProgress: buildProgress(6),
      },
      {
        id: 'student-002',
        name: 'Lucas Martin',
        email: 'lucas.martin@example.edu',
        group: 'AI Beginners A',
        accountStatus: 'active',
        createdAt: daysAgo(18),
        lastSeenAt: daysAgo(1),
        moduleProgress: buildProgress(4, 65),
      },
      {
        id: 'student-003',
        name: 'Sara Diallo',
        email: 'sara.diallo@example.edu',
        group: 'AI Beginners B',
        accountStatus: 'active',
        createdAt: daysAgo(16),
        lastSeenAt: daysAgo(2),
        moduleProgress: buildProgress(3, 40),
      },
      {
        id: 'student-004',
        name: 'Noah Garcia',
        email: 'noah.garcia@example.edu',
        group: 'AI Beginners B',
        accountStatus: 'active',
        createdAt: daysAgo(15),
        lastSeenAt: daysAgo(6),
        moduleProgress: buildProgress(1, 30),
      },
      {
        id: 'student-005',
        name: 'Ines Robert',
        email: 'ines.robert@example.edu',
        group: 'AI Beginners A',
        accountStatus: 'invited',
        createdAt: daysAgo(3),
        moduleProgress: buildProgress(0),
      },
      {
        id: 'student-006',
        name: 'Yanis Haddad',
        email: 'yanis.haddad@example.edu',
        group: 'AI Beginners B',
        accountStatus: 'inactive',
        createdAt: daysAgo(20),
        lastSeenAt: daysAgo(14),
        moduleProgress: buildProgress(0, 10),
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}

export async function readAdminOverview(): Promise<AdminSchoolOverview> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(OVERVIEW_FILE, 'utf-8');
    return JSON.parse(raw) as AdminSchoolOverview;
  } catch {
    const overview = seedOverview();
    await fs.writeFile(OVERVIEW_FILE, JSON.stringify(overview, null, 2), 'utf-8');
    return overview;
  }
}
