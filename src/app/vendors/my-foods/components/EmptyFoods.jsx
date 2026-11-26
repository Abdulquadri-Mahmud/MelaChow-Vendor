import { Plus, UtensilsCrossed } from "lucide-react";

export default function EmptyFoods({ isFiltered, onClearFilters, onAddFood }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
        <UtensilsCrossed size={22} />
      </div>
      <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-white">
        {isFiltered ? "No dishes match your filters" : "Your menu is empty"}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
        {isFiltered
          ? "Try clearing your search, switching tabs, or choosing All Sections."
          : "Publish your first priced dish so customers can start ordering from your kitchen."}
      </p>
      {isFiltered ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-5 inline-flex min-h-[42px] items-center rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          Clear Filters
        </button>
      ) : (
        <button
          type="button"
          onClick={onAddFood}
          className="mt-5 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-700"
        >
          <Plus size={15} />
          <span>Add First Food</span>
        </button>
      )}
    </div>
  );
}
