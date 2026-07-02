'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  Search,
  Users,
} from 'lucide-react';
import type {
  AdminMetrics,
  AdminSchoolOverview,
  AdminStudent,
} from '@/lib/types/admin-dashboard';

function latestActivity(student: AdminStudent): string {
  return (
    student.lastSeenAt ||
    student.moduleProgress
      .map((item) => item.lastActivityAt || item.completedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ||
    student.createdAt
  );
}

function studentProgress(student: AdminStudent): number {
  if (student.moduleProgress.length === 0) return 0;
  const total = student.moduleProgress.reduce((sum, item) => sum + item.progressPercent, 0);
  return Math.round(total / student.moduleProgress.length);
}

function studentStatus(student: AdminStudent): 'completed' | 'in_progress' | 'not_started' {
  const completed = student.moduleProgress.filter((item) => item.status === 'completed').length;
  if (completed === student.moduleProgress.length && completed > 0) return 'completed';
  if (student.moduleProgress.some((item) => item.progressPercent > 0)) return 'in_progress';
  return 'not_started';
}

function computeMetrics(overview: AdminSchoolOverview): AdminMetrics {
  const totalPossibleModules = overview.students.length * overview.course.moduleCount;
  const totalCompletedModules = overview.students.reduce(
    (sum, student) => sum + student.moduleProgress.filter((item) => item.status === 'completed').length,
    0,
  );
  const progressValues = overview.students.map(studentProgress);
  const scores = overview.students.flatMap((student) =>
    student.moduleProgress
      .map((item) => item.scorePercent)
      .filter((value): value is number => typeof value === 'number'),
  );
  const statuses = overview.students.map(studentStatus);
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return {
    totalStudents: overview.students.length,
    activeAccounts: overview.students.filter((student) => student.accountStatus === 'active').length,
    invitedAccounts: overview.students.filter((student) => student.accountStatus === 'invited').length,
    inactiveAccounts: overview.students.filter((student) => student.accountStatus === 'inactive').length,
    completedStudents: statuses.filter((status) => status === 'completed').length,
    inProgressStudents: statuses.filter((status) => status === 'in_progress').length,
    notStartedStudents: statuses.filter((status) => status === 'not_started').length,
    averageProgressPercent:
      progressValues.length > 0
        ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
        : 0,
    averageScorePercent:
      scores.length > 0 ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0,
    totalCompletedModules,
    totalPossibleModules,
    moduleCompletionRate:
      totalPossibleModules > 0 ? Math.round((totalCompletedModules / totalPossibleModules) * 100) : 0,
    certificatesReady: statuses.filter((status) => status === 'completed').length,
    atRiskStudents: overview.students.filter((student) => {
      if (studentStatus(student) === 'completed') return false;
      return now - new Date(latestActivity(student)).getTime() > sevenDaysMs;
    }).length,
  };
}

function formatDate(value?: string) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function KpiCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{value}</p>
        </div>
        <div className="rounded-md bg-slate-950 p-2 text-white">
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

export default function AcademyAdminPage() {
  const [overview, setOverview] = useState<AdminSchoolOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('All groups');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/admin/overview');
        const json = await response.json();
        if (!response.ok || !json.success) {
          throw new Error(json.details || json.error || 'Failed to load admin dashboard');
        }
        setOverview(json.overview);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    void load();
  }, []);

  const metrics = useMemo(() => (overview ? computeMetrics(overview) : null), [overview]);
  const groups = useMemo(
    () => ['All groups', ...Array.from(new Set(overview?.students.map((student) => student.group) || []))],
    [overview],
  );
  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (overview?.students || []).filter((student) => {
      const matchesGroup = group === 'All groups' || student.group === group;
      const matchesQuery =
        !normalized ||
        student.name.toLowerCase().includes(normalized) ||
        student.email.toLowerCase().includes(normalized);
      return matchesGroup && matchesQuery;
    });
  }, [group, overview, query]);

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-950">
        <div className="rounded-lg border border-red-200 bg-white p-6 text-red-700">{error}</div>
      </main>
    );
  }

  if (!overview || !metrics) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Loading admin dashboard
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/lc-academy-logo.webp"
              alt="Linguistic Communication"
              className="size-20 shrink-0 rounded-md border border-slate-200 bg-white p-1.5 object-contain shadow-sm"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Linguistic Communication
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal text-slate-950">LC Academy</h1>
              <p className="mt-2 text-sm text-slate-600">
                {overview.course.title} · {overview.school.plan}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
            Last updated {formatDate(overview.generatedAt)}
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={Users}
            label="Student accounts"
            value={`${metrics.totalStudents}`}
            helper={`${metrics.activeAccounts} active · ${metrics.invitedAccounts} invited · ${metrics.inactiveAccounts} inactive`}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Module completion"
            value={`${metrics.moduleCompletionRate}%`}
            helper={`${metrics.totalCompletedModules}/${metrics.totalPossibleModules} module completions`}
          />
          <KpiCard
            icon={GraduationCap}
            label="Average progress"
            value={`${metrics.averageProgressPercent}%`}
            helper={`${metrics.completedStudents} completed · ${metrics.inProgressStudents} in progress`}
          />
          <KpiCard
            icon={Award}
            label="Certificates ready"
            value={`${metrics.certificatesReady}`}
            helper={`Average quiz score ${metrics.averageScorePercent || 0}%`}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Module Completion</h2>
                <p className="text-sm text-slate-500">Completion by module across all student accounts.</p>
              </div>
              <BarChart3 className="size-5 text-slate-900" />
            </div>
            <div className="space-y-4">
              {overview.course.modules.map((module) => {
                const completed = overview.students.filter((student) =>
                  student.moduleProgress.some(
                    (item) => item.moduleId === module.id && item.status === 'completed',
                  ),
                ).length;
                const percent = Math.round((completed / overview.students.length) * 100);
                return (
                  <div key={module.id}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-800">
                        {module.order}. {module.title}
                      </span>
                      <span className="text-slate-500">{percent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-slate-950" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Attention Needed</h2>
                <p className="text-sm text-slate-500">Students who may need follow-up from the school admin.</p>
              </div>
              <AlertTriangle className="size-5 text-amber-600" />
            </div>
            <div className="space-y-3">
              {overview.students
                .filter((student) => studentStatus(student) !== 'completed')
                .sort((a, b) => studentProgress(a) - studentProgress(b))
                .slice(0, 4)
                .map((student) => (
                  <div key={student.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <div>
                      <p className="font-medium text-slate-900">{student.name}</p>
                      <p className="text-xs text-slate-500">
                        {student.group} · Last activity {formatDate(latestActivity(student))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{studentProgress(student)}%</p>
                      <p className="text-xs text-slate-500">progress</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold">Student Details</h2>
              <p className="text-sm text-slate-500">Account status, completion state, scores, and recent activity.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search students"
                  className="h-10 rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-900"
                />
              </label>
              <select
                value={group}
                onChange={(event) => setGroup(event.target.value)}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-900"
              >
                {groups.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-3 pr-4 font-medium">Student</th>
                  <th className="py-3 pr-4 font-medium">Account</th>
                  <th className="py-3 pr-4 font-medium">Progress</th>
                  <th className="py-3 pr-4 font-medium">Completed</th>
                  <th className="py-3 pr-4 font-medium">Average score</th>
                  <th className="py-3 pr-4 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const completed = student.moduleProgress.filter((item) => item.status === 'completed').length;
                  const scores = student.moduleProgress
                    .map((item) => item.scorePercent)
                    .filter((value): value is number => typeof value === 'number');
                  const avgScore =
                    scores.length > 0
                      ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
                      : null;
                  const progress = studentProgress(student);
                  return (
                    <tr key={student.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-slate-900">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.email}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
                          {student.accountStatus}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-slate-950" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="tabular-nums">{progress}%</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {completed}/{overview.course.moduleCount} modules
                      </td>
                      <td className="py-3 pr-4">{avgScore ? `${avgScore}%` : 'No score yet'}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock3 className="size-3.5" />
                          {formatDate(latestActivity(student))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
          This is the first admin-dashboard prototype. The next production step is to connect these
          metrics to real school login, student accounts, module playback events, quiz scores, and
          certificate issuance.
        </section>
      </div>
    </main>
  );
}
