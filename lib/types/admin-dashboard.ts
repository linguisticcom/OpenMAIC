export type StudentModuleStatus = 'not_started' | 'in_progress' | 'completed';

export interface AdminModuleProgress {
  moduleId: string;
  status: StudentModuleStatus;
  progressPercent: number;
  scorePercent?: number;
  completedAt?: string;
  lastActivityAt?: string;
  timeSpentMinutes: number;
}

export interface AdminStudent {
  id: string;
  name: string;
  email: string;
  group: string;
  accountStatus: 'active' | 'invited' | 'inactive';
  createdAt: string;
  lastSeenAt?: string;
  moduleProgress: AdminModuleProgress[];
}

export interface AdminCourseModule {
  id: string;
  order: number;
  title: string;
  durationMinutes: number;
}

export interface AdminCourse {
  id: string;
  title: string;
  moduleCount: number;
  modules: AdminCourseModule[];
}

export interface AdminSchoolOverview {
  school: {
    id: string;
    name: string;
    plan: string;
  };
  course: AdminCourse;
  students: AdminStudent[];
  generatedAt: string;
}

export interface AdminMetrics {
  totalStudents: number;
  activeAccounts: number;
  invitedAccounts: number;
  inactiveAccounts: number;
  completedStudents: number;
  inProgressStudents: number;
  notStartedStudents: number;
  averageProgressPercent: number;
  averageScorePercent: number;
  totalCompletedModules: number;
  totalPossibleModules: number;
  moduleCompletionRate: number;
  certificatesReady: number;
  atRiskStudents: number;
}
