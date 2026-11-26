"use client";

export default function VendorDashboardSkeleton() {
  const pulse = "animate-pulse rounded-lg bg-zinc-200/80 dark:bg-zinc-800";

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 pb-8">
      {/* Command Header Skeleton */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className={`h-4 w-24 ${pulse}`} />
              <div className={`h-5 w-32 rounded-full ${pulse}`} />
            </div>
            <div className={`h-8 w-56 ${pulse}`} />
            <div className={`h-3.5 w-64 ${pulse}`} />
          </div>
          <div className="flex gap-2.5">
            <div className={`h-10 w-24 rounded-xl ${pulse}`} />
            <div className={`h-10 w-32 rounded-xl ${pulse}`} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-zinc-100 bg-zinc-50/70 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950/40 sm:px-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-9 w-24 rounded-xl ${pulse}`} />
          ))}
        </div>
      </div>

      {/* Pipeline Strip Skeleton */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 rounded-2xl border border-zinc-200/90 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className={`h-10 w-10 shrink-0 rounded-xl ${pulse}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-3 w-20 ${pulse}`} />
              <div className={`h-6 w-10 ${pulse}`} />
              <div className={`h-3 w-24 ${pulse}`} />
            </div>
          </div>
        ))}
      </div>

      {/* KPI Grid Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="space-y-4 rounded-2xl border border-zinc-200/90 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between">
              <div className={`h-4 w-28 ${pulse}`} />
              <div className={`h-5 w-14 rounded-full ${pulse}`} />
            </div>
            <div className="space-y-2">
              <div className={`h-8 w-36 ${pulse}`} />
              <div className={`h-3.5 w-40 ${pulse}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Analytics + Live Feed Skeleton */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="space-y-2">
              <div className={`h-5 w-44 ${pulse}`} />
              <div className={`h-3 w-56 ${pulse}`} />
            </div>
            <div className={`h-8 w-32 rounded-xl ${pulse}`} />
          </div>
          <div className={`h-[260px] w-full rounded-xl ${pulse}`} />
        </div>

        <div className="space-y-3 rounded-2xl border border-zinc-200/90 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-4">
          <div className={`h-5 w-36 ${pulse}`} />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-24 w-full rounded-xl ${pulse}`} />
          ))}
        </div>
      </div>

      {/* Operational Insights Skeleton */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="space-y-3 rounded-2xl border border-zinc-200/90 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className={`h-5 w-40 ${pulse}`} />
            <div className={`h-36 w-full rounded-xl ${pulse}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
