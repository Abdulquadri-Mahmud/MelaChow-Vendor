"use client";

import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Search,
  UtensilsCrossed,
  X,
} from "lucide-react";

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Archived", value: "archived" },
];

export default function FoodsFilterBar({
  search,
  onSearch,
  status,
  onStatus,
  sections,
  activeSection,
  onSection,
  stats,
  resultCount = 0,
  isFiltered = false,
  isFetching = false,
  onClearFilters,
}) {
  const statCards = [
    {
      label: "Total Foods",
      value: stats?.total ?? 0,
      icon: UtensilsCrossed,
      iconCls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
      valCls: "text-zinc-900 dark:text-white",
    },
    {
      label: "Active",
      value: stats?.active ?? 0,
      icon: CheckCircle2,
      iconCls:
        "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
      valCls: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Out of Stock",
      value: stats?.out_of_stock ?? 0,
      icon: AlertTriangle,
      iconCls:
        "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
      valCls: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Archived",
      value: stats?.archived ?? 0,
      icon: Archive,
      iconCls: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
      valCls: "text-zinc-600 dark:text-zinc-300",
    },
  ];

  return (
    <div className="space-y-4">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3.5 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.iconCls}`}
            >
              <s.icon size={18} />
            </span>
            <div className="min-w-0">
              <p className={`text-xl font-bold tabular-nums ${s.valCls}`}>
                {s.value}
              </p>
              <p className="truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Unified Search + Status + Section Bar */}
      <div className="space-y-3 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-950">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => onStatus(tab.value)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                    status === tab.value
                      ? "bg-orange-600 text-white shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
              {resultCount} {resultCount === 1 ? "dish" : "dishes"}
              {isFetching ? " · Updating..." : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-72 md:flex-none">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search dishes..."
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-9 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {isFiltered && onClearFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300"
              >
                <X size={14} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Section Filter Pills */}
        {sections?.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => onSection(null)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                !activeSection
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              All Sections
            </button>
            {sections.map((sec) => (
              <button
                key={sec._id}
                type="button"
                onClick={() =>
                  onSection(activeSection === sec._id ? null : sec._id)
                }
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  activeSection === sec._id
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {sec.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
