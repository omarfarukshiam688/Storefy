
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-violet-200/80 bg-white/60 p-6 sm:p-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="h-6 w-32 animate-pulse rounded-full bg-violet-100" />
            <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-5 w-96 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-24 w-64 animate-pulse rounded-[22px] bg-white/70" />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl border border-violet-100 bg-white/60" />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4">
          <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-64 animate-pulse rounded-[26px] border border-violet-100 bg-white/60" />
        </div>
        <div className="space-y-4">
          <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-48 animate-pulse rounded-2xl border border-violet-100 bg-white/60" />
        </div>
      </section>
    </div>
  );
}
