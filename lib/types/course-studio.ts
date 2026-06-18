import type { Scene, Stage } from '@/lib/types/stage';

export type ClassroomEditOperation =
  | 'update_stage'
  | 'update_scene'
  | 'insert_scene_after'
  | 'delete_scene'
  | 'add_teacher_note'
  | 'request_regeneration';

export interface ClassroomEditPatch {
  id: string;
  operation: ClassroomEditOperation;
  targetId?: string;
  afterSceneId?: string;
  title: string;
  rationale: string;
  changes: Record<string, unknown>;
}

export interface ClassroomEditPlan {
  summary: string;
  patches: ClassroomEditPatch[];
  followUpQuestions?: string[];
}

export interface ClassroomEditRequest {
  instruction: string;
  stage: Stage;
  scenes: Scene[];
  currentSceneId?: string | null;
  courseMemory?: CourseMemory;
}

export interface CourseModulePlan {
  id: string;
  order: number;
  title: string;
  durationMinutes: number;
  learningObjectives: string[];
  prerequisiteSummary?: string;
  classroomPrompt: string;
  resourceFocus?: string[];
}

export interface CoursePlan {
  title: string;
  audience?: string;
  totalDurationHours: number;
  moduleDurationMinutes: number;
  modules: CourseModulePlan[];
}

export interface CoursePlanningRequest {
  topic: string;
  totalDurationHours?: number;
  moduleDurationMinutes?: number;
  audience?: string;
  language?: string;
  resourcesSummary?: string;
  resourceIds?: string[];
}

export interface CourseMemory {
  courseId?: string;
  completedModuleIds: string[];
  coveredConcepts: string[];
  recurringExamples: string[];
  learnerQuestions: string[];
  assessmentSignals: string[];
  teacherSummary: string;
  referencesUsed: string[];
}

export interface CourseResource {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  summary: string;
  excerpt: string;
  textLength: number;
  pageCount?: number;
}

export interface PersistedCourseResource extends CourseResource {
  storedFileName: string;
  text: string;
}
