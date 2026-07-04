import { LoginForm } from '@/components/tenant-portal/login-form';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-10 lg:grid-cols-[1fr_420px]">
        <section>
          <img
            src="/lc-academy-logo.webp"
            alt="Linguistic Communication Academy"
            className="h-24 w-auto object-contain"
          />
          <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-violet-700">
            Institutional LMS
          </p>
          <h1 className="mt-3 max-w-3xl text-5xl font-semibold tracking-normal">
            Organization dashboards for Linguistic Communication Academy courses.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            Schools and training institutions can manage assigned courses, students, access codes,
            and usage data from a tenant-scoped account.
          </p>
        </section>
        <LoginForm />
      </div>
    </main>
  );
}
