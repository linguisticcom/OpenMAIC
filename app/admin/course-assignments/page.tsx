import { PageHeader, TenantShell, formatPortalDate } from '@/components/tenant-portal/tenant-shell';
import { CourseAssignmentForm } from '@/components/tenant-portal/course-assignment-form';
import { getCoursePortalDataset } from '@/lib/server/course-portal-data';
import { requirePlatformPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function AdminCourseAssignmentsPage() {
  const session = await requirePlatformPageSession();
  const dataset = await getCoursePortalDataset();

  return (
    <TenantShell user={session.user} admin>
      <PageHeader
        label="Course assignments"
        title="Organization course assignments"
        description="Platform admins can inspect which generated courses are assigned to each tenant."
      />
      <div className="grid gap-6 p-5 sm:p-8">
        <CourseAssignmentForm
          organizations={dataset.organizations}
          courses={dataset.courses}
          cohorts={dataset.cohorts}
        />
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Cohort</th>
                <th className="px-4 py-3">Assigned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {dataset.assignments.map((assignment) => {
                const organization = dataset.organizations.find(
                  (item) => item.id === assignment.organizationId,
                );
                const course = dataset.courses.find((item) => item.id === assignment.courseId);
                const cohort = assignment.cohortId
                  ? dataset.cohorts.find((item) => item.id === assignment.cohortId)
                  : undefined;
                return (
                  <tr key={assignment.id}>
                    <td className="px-4 py-3 font-semibold text-slate-950">
                      {organization?.name || assignment.organizationId}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {course?.title || assignment.courseId}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{cohort?.name || 'All students'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatPortalDate(assignment.assignedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </TenantShell>
  );
}
