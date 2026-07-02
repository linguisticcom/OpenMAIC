export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[270px_1fr]">
        <aside className="border-b border-slate-200 bg-white lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-200 p-5">
            <div className="h-10 w-40 animate-pulse rounded-md bg-slate-200" />
            <div className="mt-5 rounded-lg bg-slate-50 p-4">
              <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-4 w-36 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
          <div className="grid gap-2 p-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-md bg-slate-100" />
            ))}
          </div>
        </aside>
        <section className="min-w-0">
          <header className="border-b border-slate-200 bg-white px-5 py-6 sm:px-8">
            <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-9 w-full max-w-md animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-slate-100" />
          </header>
          <div className="grid gap-5 p-5 sm:p-8">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-lg border border-slate-200 bg-white"
                />
              ))}
            </div>
            <div className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white" />
          </div>
        </section>
      </div>
    </main>
  );
}
