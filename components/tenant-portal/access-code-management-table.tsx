'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { AccessCodeDisableButton } from '@/components/tenant-portal/access-code-disable-button';
import type { AccessCodeView } from '@/lib/types/course-portal';

function formatPortalDate(value?: string) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function AccessCodeManagementTable({
  organizationId,
  accessCodes,
}: {
  organizationId?: string;
  accessCodes: AccessCodeView[];
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [scope, setScope] = useState('all');
  const [now] = useState(() => Date.now());

  const filteredAccessCodes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return accessCodes.filter((accessCode) => {
      const isExpired = Boolean(
        accessCode.expiresAt && new Date(accessCode.expiresAt).getTime() < now,
      );
      const statusLabel = !accessCode.isActive ? 'disabled' : isExpired ? 'expired' : 'active';
      const scopeLabel =
        accessCode.studentName ||
        accessCode.cohortName ||
        accessCode.cohortId ||
        'Organization-wide';
      const matchesQuery =
        !normalizedQuery ||
        [
          accessCode.courseTitle,
          accessCode.createdByName,
          accessCode.organizationName,
          accessCode.cohortAcademicYear || '',
          accessCode.cohortProgramName || '',
          scopeLabel,
          statusLabel,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesStatus = status === 'all' || status === statusLabel;
      const matchesScope =
        scope === 'all' ||
        (scope === 'student' && !!accessCode.studentId) ||
        (scope === 'cohort' && !!accessCode.cohortId && !accessCode.studentId) ||
        (scope === 'organization' && !accessCode.cohortId && !accessCode.studentId);
      return matchesQuery && matchesStatus && matchesScope;
    });
  }, [accessCodes, now, query, scope, status]);

  return (
    <div className="grid gap-5 p-5 sm:p-8">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_210px]">
          <label className="relative block">
            <span className="sr-only">Search access codes</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by course, creator, cohort, or student"
              className="h-11 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm text-slate-950 outline-none transition focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 rounded-md border border-slate-200 px-3 text-sm font-normal normal-case tracking-normal text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Scope
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              className="h-11 rounded-md border border-slate-200 px-3 text-sm font-normal normal-case tracking-normal text-slate-950 outline-none focus:border-violet-400 focus:ring-3 focus:ring-violet-100"
            >
              <option value="all">All scopes</option>
              <option value="organization">Organization-wide</option>
              <option value="cohort">Cohort</option>
              <option value="student">Student</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Showing {filteredAccessCodes.length} of {accessCodes.length} access codes. Code secrets
          remain hidden after creation.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {filteredAccessCodes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Usage</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAccessCodes.map((accessCode) => (
                  <tr key={accessCode.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">{accessCode.courseTitle}</p>
                      <p className="text-xs text-slate-500">
                        {accessCode.organizationName} · Created by {accessCode.createdByName}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {accessCode.studentName ||
                        accessCode.cohortName ||
                        accessCode.cohortId ||
                        'Organization-wide'}
                      {(accessCode.cohortAcademicYear || accessCode.cohortProgramName) && (
                        <span className="mt-1 block text-xs text-slate-500">
                          {[accessCode.cohortProgramName, accessCode.cohortAcademicYear]
                            .filter(Boolean)
                            .join(' - ')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {accessCode.currentUses}
                      {accessCode.maxUses !== undefined ? `/${accessCode.maxUses}` : ''}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatPortalDate(accessCode.expiresAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                        {!accessCode.isActive
                          ? 'Disabled'
                          : accessCode.expiresAt && new Date(accessCode.expiresAt).getTime() < now
                            ? 'Expired'
                            : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <AccessCodeDisableButton
                        organizationId={organizationId || accessCode.organizationId}
                        accessCodeId={accessCode.id}
                        disabled={!accessCode.isActive}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <h2 className="text-lg font-semibold tracking-normal text-slate-950">
              No access codes match these filters
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Adjust the search, status, or scope filter to review generated access-code metadata.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
