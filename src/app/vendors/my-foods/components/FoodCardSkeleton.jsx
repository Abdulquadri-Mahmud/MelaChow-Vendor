export default function FoodCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm animate-pulse dark:border-zinc-800 dark:bg-zinc-900">
      <div className="aspect-[16/10] w-full bg-zinc-200/80 dark:bg-zinc-800" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 rounded-lg bg-zinc-200/80 dark:bg-zinc-800" />
        <div className="h-5 w-1/2 rounded-lg bg-zinc-100 dark:bg-zinc-800/70" />
        <div className="h-5 w-1/3 rounded-lg bg-zinc-200/80 dark:bg-zinc-800" />
        <div className="flex items-center justify-between border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
          <div className="flex gap-1.5">
            <div className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          </div>
          <div className="h-9 w-24 rounded-xl bg-zinc-200/80 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
