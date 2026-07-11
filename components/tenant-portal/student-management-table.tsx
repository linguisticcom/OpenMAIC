'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import type { EnrollmentStatus, StudentManagementSummary } from '@/lib/types/course-portal';

function formatPortalDate(value?: string) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function progressTone(value: number) {
  if (value >= 80) return 'bg-emerald-600';
  if (value >= 40) return 'bg-violet-600';
  return 'bg-amber-500';
}

export function StudentManagementTable({ students }: { students: StudentManagementSummary[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | EnrollmentStatus>('all');
  const [progressBand, setProgressBand] = useState('all');

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return students.filter((summary) => {
      const identifier =
        summary.student.email || summary.student.externalStudentId || summary.student.id;
      const matchesQuery =
        !normalizedQuery ||
        [
          summary.student.name,
          identifier,
          summary.student.programName || '',
          summary.student.academicYear || '',
          summary.accessCodeUsed || '',
          summary.learnerType,
          summary.completionStatus,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesStatus = status === 'all' || summary.completionStatus === status;
      const matchesProgress =
        progressBand === 'all' ||
        (progressBand === 'low' && summary.averageProgress < 40) ||
        (progressBand === 'mid' && summary.averageProgress >= 40 && summary.averageProgress < 80) ||
        (progressBand === 'high' && summary.averageProgress >= 80);
      return matchesQuery && matchesStatus && matchesProgress;
    });
  }, [progressBand, query, status, students]);

  return (
    <div className="grid gap-5 p-5 sm:p-8">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_190px_190px]">
          <label className="relative block">
            <span className="sr-only">Search students</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, program, or access code"
              className="h-11 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm text-slate-950 outline-none transition focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Completion
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as 'all' | EnrollmentStatus)}
              className="h-11 rounded-md border border-slate-200 px-3 text-sm font-normal normal-case tracking-normal text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            >
              <option value="all">All statuses</option>
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Progress
            <select
              value={progressBand}
              onChange={(event) => setProgressBand(event.target.value)}
              className="h-11 rounded-md border border-slate-200 px-3 text-sm font-normal normal-case tracking-normal text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            >
              <option value="all">All progress</option>
              <option value="low">Below 40%</option>
              <option value="mid">40-79%</option>
              <option value="high">80% and above</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Showing {filteredStudents.length} of {students.length} enrolled learners. Access-code
          guests are kept separate from registered student records.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Courses enrolled</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Last activity</th>
                  <th className="px-4 py-3">Access code used</th>
                  <th className="px-4 py-3">Completion</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.map((summary) => (
                  <tr key={summary.student.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">{summary.student.name}</p>
                      <p className="text-xs text-slate-500">
                        {summary.student.email ||
                          summary.student.externalStudentId ||
                          'No identifier'}
                      </p>
                      <p className="mt-1 text-xs font-medium text-violet-700">
                        {summary.learnerType === 'access-code-guest'
                          ? 'Access-code guest'
                          : 'Registered student'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{summary.coursesEnrolled}</td>
                    <td className="px-4 py-3">
                      <div className="h-2 w-28 rounded-full bg-slate-100">
                        <div
                          className={`h-2 rounded-full ${progressTone(summary.averageProgress)}`}
                          style={{ width: `${summary.averageProgress}%` }}
                        />
                      </div>
                      <span className="mt-1 block text-xs text-slate-500">
                        {summary.averageProgress}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatPortalDate(summary.lastActivityAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {summary.accessCodeUsed || 'Account access'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">
                      {summary.completionStatus.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        className="font-semibold text-violet-700"
                        href={`/dashboard/students/${summary.student.id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <h2 className="text-lg font-semibold tracking-normal text-slate-950">
              No students match these filters
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Adjust the search, completion status, or progress filter to review learners in this
              organization.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
