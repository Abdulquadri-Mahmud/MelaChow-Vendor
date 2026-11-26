"use client";

import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  Clock,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";

const DIETARY_BADGE = {
  halal: {
    label: "Halal",
    color:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  veg: {
    label: "Veg",
    color:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30",
  },
  vegan: {
    label: "Vegan",
    color:
      "bg-green-50 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/30",
  },
  kosher: {
    label: "Kosher",
    color:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30",
  },
  "non-veg": {
    label: "Non-Veg",
    color:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30",
  },
  mixed: null,
};

export default function FoodCard({
  item,
  onToggleAvailability,
  onArchive,
  onEdit,
  onDelete,
}) {
  const dietary = DIETARY_BADGE[item.dietary_type];
  const portionCount = item.portions?.count ?? 0;

  const priceDisplay =
    portionCount === 0
      ? "No price set"
      : item.portions.min_price_naira === item.portions.max_price_naira
        ? `₦${Number(item.portions.min_price_naira || 0).toLocaleString("en-NG")}`
        : `₦${Number(item.portions.min_price_naira || 0).toLocaleString("en-NG")} – ₦${Number(item.portions.max_price_naira || 0).toLocaleString("en-NG")}`;

  const statusPill = item.is_archived
    ? {
        label: "Archived",
        cls: "bg-zinc-900/80 text-white",
      }
    : !item.is_available
      ? {
          label: "Hidden",
          cls: "bg-amber-500/95 text-white",
        }
      : {
          label: "Live",
          cls: "bg-emerald-600/95 text-white",
        };

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm transition hover:border-orange-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-500/40 ${
        item.is_archived ? "opacity-75" : ""
      }`}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-400">
            <UtensilsCrossed size={32} />
          </div>
        )}

        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-sm ${statusPill.cls}`}
        >
          {statusPill.label}
        </span>

        {dietary && (
          <span
            className={`absolute right-3 top-3 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-sm ${dietary.color}`}
          >
            {dietary.label}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-base font-bold text-zinc-900 dark:text-white">
              {item.name}
            </h3>
            {item.prep_time_minutes ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                <Clock size={11} />
                {item.prep_time_minutes}m
              </span>
            ) : null}
          </div>

          {item.category && (
            <p className="inline-flex max-w-full truncate rounded-lg border border-orange-200/70 bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-300">
              {item.section
                ? `${item.section.name} · ${item.category.name}`
                : item.category.name}
            </p>
          )}

          <div className="flex items-baseline justify-between pt-1">
            <span
              className={`text-base font-bold tabular-nums ${
                portionCount === 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-zinc-900 dark:text-white"
              }`}
            >
              {priceDisplay}
            </span>
            {portionCount > 0 && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {portionCount} {portionCount === 1 ? "portion" : "portions"}
              </span>
            )}
          </div>
        </div>

        {/* Action Row */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggleAvailability(item._id)}
              title={
                item.is_available
                  ? "Hide from customers"
                  : "Make available to customers"
              }
              aria-label={item.is_available ? "Hide dish" : "Show dish"}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                item.is_available
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {item.is_available ? (
                <ToggleRight size={17} />
              ) : (
                <ToggleLeft size={17} />
              )}
            </button>

            <button
              type="button"
              onClick={() => onArchive(item._id)}
              disabled={item.combos?.length > 0 && !item.is_archived}
              title={item.is_archived ? "Restore dish" : "Archive dish"}
              aria-label={item.is_archived ? "Restore dish" : "Archive dish"}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-100 disabled:opacity-35 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {item.is_archived ? (
                <ArchiveRestore size={15} />
              ) : (
                <Archive size={15} />
              )}
            </button>

            {(!item.combos || item.combos.length === 0) && (
              <button
                type="button"
                onClick={() => onDelete(item._id, item.name)}
                title="Delete permanently"
                aria-label="Delete dish"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-rose-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-rose-400 dark:hover:bg-rose-500/15"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onEdit(item._id)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-700"
          >
            <Edit2 size={13} />
            <span>Manage</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}
