import Link from 'next/link';

export function AccountAuthShell({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-10 lg:grid-cols-[1fr_420px]">
        <section>
          <Link href="/login" className="inline-block">
            <img
              src="/lc-academy-logo.webp"
              alt="Linguistic Communication Academy"
              className="h-24 w-auto object-contain"
            />
          </Link>
          <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-violet-700">
            {label}
          </p>
          <h1 className="mt-3 max-w-3xl text-5xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
        </section>
        {children}
      </div>
    </main>
  );
}
