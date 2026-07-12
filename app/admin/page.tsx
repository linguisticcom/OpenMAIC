import Link from 'next/link';
import { ArrowRight, Building2, GraduationCap, KeyRound } from 'lucide-react';
import { MetricCard, PageHeader, TenantShell } from '@/components/tenant-portal/tenant-shell';
import { Button } from '@/components/ui/button';
import { getCoursePortalDataset } from '@/lib/server/course-portal-data';
import { requirePlatformPageSession } from '@/lib/server/tenant-page-auth';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const session = await requirePlatformPageSession();
  const dataset = await getCoursePortalDataset();
  const teachers = dataset.users.filter((user) => user.role === 'teacher-manager');
  const activeCodes = dataset.accessCodes.filter((code) => code.isActive);

  const quickLinks = [
    {
      href: '/admin/organizations',
      title: 'Manage organizations',
      description: 'Create, edit, inspect, and remove university tenants.',
      icon: Building2,
    },
    {
      href: '/admin/access-codes/new',
      title: 'Generate access code',
      description: 'Create a tenant, course, cohort, or student-scoped code.',
      icon: KeyRound,
    },
    {
      href: '/admin/courses',
      title: 'Test global courses',
      description: 'Review publishing state and open generated classrooms.',
      icon: GraduationCap,
    },
  ];

  return (
    <TenantShell user={session.user} admin>
      <PageHeader
        label="Platform operations"
        title="Academy overview"
        description="One operational view across every organization, learner, teacher, course, assignment, and access code."
      />
      <div className="grid gap-6 p-5 sm:p-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Organizations"
            value={dataset.organizations.length}
            helper="University tenants"
          />
          <MetricCard
            label="Students"
            value={dataset.students.length}
            helper="Across all organizations"
            tone="blue"
          />
          <MetricCard
            label="Teachers"
            value={teachers.length}
            helper="Teacher-manager accounts"
            tone="amber"
          />
          <MetricCard
            label="Active codes"
            value={activeCodes.length}
            helper="Enabled code records"
            tone="emerald"
          />
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="grid lg:grid-cols-3 lg:divide-x lg:divide-slate-200">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex gap-4 p-5 hover:bg-violet-50/50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-700">
                  <item.icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-950">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-violet-700">
                    Open <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold">Organization portfolio</h2>
              <p className="mt-1 text-sm text-slate-500">
                Current tenant subscription and people footprint.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/admin/organizations">Manage all</Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Organization</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Students</th>
                  <th className="px-5 py-3">Teachers</th>
                  <th className="px-5 py-3">Assignments</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dataset.organizations.map((organization) => (
                  <tr key={organization.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-950">{organization.name}</p>
                      <p className="text-xs text-slate-500">{organization.contactEmail}</p>
                    </td>
                    <td className="px-5 py-4 capitalize text-slate-600">
                      {organization.subscriptionStatus?.replace('_', ' ') || 'trial'}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {
                        dataset.students.filter(
                          (student) => student.organizationId === organization.id,
                        ).length
                      }
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {
                        teachers.filter((teacher) => teacher.organizationId === organization.id)
                          .length
                      }
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {
                        dataset.assignments.filter(
                          (assignment) => assignment.organizationId === organization.id,
                        ).length
                      }
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/organizations/${organization.id}`}
                        className="font-semibold text-violet-700 hover:text-violet-900"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </TenantShell>
  );
}
