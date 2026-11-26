"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownUp,
  CheckCircle2,
  ChefHat,
  History,
  Inbox,
  LayoutDashboard,
  PackageCheck,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import useVendorOrders from "@/app/hooks/useVendorOrders";
import VendorOrderCard from "@/app/components/order/VendorOrderCard";
import {
  money,
  orderId,
  orderReceipt,
  queueGroup,
  statusOf,
} from "@/app/lib/orderReceipt.mjs";

const TABS = [
  {
    key: "incoming",
    label: "Incoming",
    shortDesc: "Needs acceptance",
    icon: Inbox,
    accent: "amber",
  },
  {
    key: "preparing",
    label: "Preparing",
    shortDesc: "In kitchen now",
    icon: ChefHat,
    accent: "orange",
  },
  {
    key: "ready",
    label: "Ready for Pickup",
    shortDesc: "Awaiting handoff",
    icon: PackageCheck,
    accent: "sky",
  },
  {
    key: "history",
    label: "Order History",
    shortDesc: "Transit, done & cancelled",
    icon: History,
    accent: "zinc",
  },
];

const HISTORY_FILTERS = [
  { id: "all", label: "All History" },
  { id: "transit", label: "In Transit" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

function matchesOrderSearch(order, query) {
  if (!query) return true;
  const receipt = orderReceipt(order);
  const hay = [
    receipt.code,
    receipt.customer,
    receipt.phone,
    receipt.items.map((item) => item.name).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(query);
}

function matchesHistoryFilter(order, historyFilter) {
  if (historyFilter === "all") return true;
  const st = statusOf(order);
  if (historyFilter === "transit") return st === "out_for_delivery";
  if (historyFilter === "completed") return st === "completed" || st === "delivered";
  if (historyFilter === "cancelled") {
    return st === "cancelled" || st === "failed" || st === "refunded";
  }
  return true;
}

export default function VendorOrderDesk() {
  const { orders, isPending, isFetching, isError, refetch, dataUpdatedAt } =
    useVendorOrders();
  const [tab, setTab] = useState("incoming");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("default"); // default | oldest | newest
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(12);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Switch automatically to Incoming when a live socket order arrives
  useEffect(() => {
    const onNewOrder = () => {
      setTab("incoming");
      setLimit(12);
    };
    window.addEventListener("vendor:new-order", onNewOrder);
    return () => window.removeEventListener("vendor:new-order", onNewOrder);
  }, []);

  // Tick every second only when there are active incoming/preparing tickets
  const hasActiveTimers = useMemo(
    () =>
      orders.some((o) => {
        const g = queueGroup(o);
        return g === "incoming" || g === "preparing";
      }),
    [orders]
  );

  useEffect(() => {
    if (!hasActiveTimers) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hasActiveTimers]);

  const counts = useMemo(() => {
    const result = { incoming: 0, preparing: 0, ready: 0, history: 0 };
    for (const o of orders) {
      const g = queueGroup(o);
      if (g in result) result[g] += 1;
    }
    return result;
  }, [orders]);

  // Today's live kitchen stats
  const todayStats = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    let completedToday = 0;
    let todayEarnings = 0;
    for (const o of orders) {
      const st = statusOf(o);
      if (st === "completed" || st === "delivered") {
        const d = new Date(o.createdAt);
        if (!Number.isNaN(d.getTime()) && d >= startOfToday) {
          completedToday += 1;
          const r = orderReceipt(o);
          todayEarnings += Number(o.vendorTotal ?? r.vendorPayout ?? r.itemsSubtotal ?? 0) || 0;
        }
      }
    }
    return {
      activeQueue: counts.incoming + counts.preparing + counts.ready,
      completedToday,
      todayEarnings,
    };
  }, [orders, counts]);

  const normalizedQuery = search.trim().toLowerCase();

  // Cross-tab search matches (helpful if user searches an order that moved to another queue)
  const crossTabMatches = useMemo(() => {
    if (!normalizedQuery) return [];
    return TABS.filter((t) => t.key !== tab)
      .map((t) => ({
        key: t.key,
        label: t.label,
        count: orders.filter(
          (o) => queueGroup(o) === t.key && matchesOrderSearch(o, normalizedQuery)
        ).length,
      }))
      .filter((entry) => entry.count > 0);
  }, [orders, tab, normalizedQuery]);

  const effectiveSort =
    sortOrder === "default"
      ? tab === "history"
        ? "newest"
        : "oldest"
      : sortOrder;

  const filtered = useMemo(() => {
    return orders
      .filter((order) => {
        if (queueGroup(order) !== tab) return false;
        if (tab === "history" && !matchesHistoryFilter(order, historyFilter)) {
          return false;
        }
        return matchesOrderSearch(order, normalizedQuery);
      })
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return effectiveSort === "newest" ? bTime - aTime : aTime - bTime;
      });
  }, [orders, tab, historyFilter, normalizedQuery, effectiveSort]);

  const activeTabMeta = TABS.find((t) => t.key === tab) || TABS[0];
  const lastUpdatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-NG", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="mx-auto max-w-[1440px] pb-10 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="space-y-5">
        {/* ── 1. COMMAND HEADER CARD ────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-40 dark:opacity-20"
              style={{
                background:
                  "radial-gradient(ellipse at top right, rgba(249,115,22,0.16), transparent 68%)",
              }}
            />

            <div className="relative space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Kitchen Feed
                </span>
                {lastUpdatedLabel && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {isFetching && !isPending
                      ? "Syncing orders..."
                      : `Synced at ${lastUpdatedLabel}`}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                Order Desk
              </h1>

              {/* Compact 3-Step Kitchen Workflow + Live Today Stats */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
                    1
                  </span>
                  Accept
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
                    2
                  </span>
                  Prepare
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
                    3
                  </span>
                  Mark Ready &amp; Handoff
                </span>
              </div>
            </div>

            {/* Right Controls */}
            <div className="relative flex flex-wrap items-center gap-3">
              <Link
                href="/vendors/dashboard"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <LayoutDashboard size={15} />
                <span>Dashboard</span>
              </Link>

              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-60"
              >
                <RefreshCw
                  size={15}
                  className={isFetching ? "animate-spin" : ""}
                />
                <span>{isFetching ? "Refreshing..." : "Refresh Orders"}</span>
              </button>
            </div>
          </div>

          {/* Operational Snapshot Strip */}
          <div className="grid grid-cols-3 gap-3 border-t border-zinc-100 bg-zinc-50/80 px-5 py-3.5 text-xs dark:border-zinc-800 dark:bg-zinc-950/40 sm:px-6">
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Active Queue</p>
              <p className="mt-0.5 text-base font-bold tabular-nums text-zinc-900 dark:text-white">
                {todayStats.activeQueue}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Completed Today</p>
              <p className="mt-0.5 text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {todayStats.completedToday}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Today&apos;s Earnings</p>
              <p className="mt-0.5 text-base font-bold tabular-nums text-zinc-900 dark:text-white">
                {money(todayStats.todayEarnings)}
              </p>
            </div>
          </div>
        </section>

        {/* ── 2. 4-STAGE QUEUE NAVIGATION TABS ──────────────────────────────── */}
        <nav
          aria-label="Order queues"
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            const count = counts[item.key] || 0;
            const urgentIncoming = item.key === "incoming" && count > 0;

            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setTab(item.key);
                  setSortOrder("default");
                  setLimit(12);
                }}
                className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left shadow-sm transition ${
                  active
                    ? "border-orange-500 bg-orange-50/80 ring-1 ring-orange-500/30 dark:border-orange-500/70 dark:bg-orange-500/15"
                    : "border-zinc-200/90 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    active
                      ? "bg-orange-600 text-white"
                      : urgentIncoming
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-sm font-bold ${
                      active
                        ? "text-orange-950 dark:text-white"
                        : "text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                    {item.shortDesc}
                  </p>
                </div>
                <span
                  className={`inline-flex min-w-[28px] shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                    active
                      ? "bg-orange-600 text-white"
                      : urgentIncoming
                        ? "animate-pulse bg-amber-500 text-white"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* ── 3. TOOLBAR: SEARCH, HISTORY SUB-FILTERS & SORT ────────────────── */}
        <section className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:px-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                {activeTabMeta.label}
              </h2>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {filtered.length}
              </span>

              {tab === "history" && (
                <div className="ml-1 inline-flex flex-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-950">
                  {HISTORY_FILTERS.map((hf) => (
                    <button
                      key={hf.id}
                      type="button"
                      onClick={() => {
                        setHistoryFilter(hf.id);
                        setLimit(12);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        historyFilter === hf.id
                          ? "bg-orange-600 text-white shadow-sm"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      {hf.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Box */}
              <div className="relative flex-1 sm:w-72 sm:flex-none">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  aria-label="Search orders"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setLimit(12);
                  }}
                  placeholder="Search #order, customer, phone, item..."
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-9 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Sort Toggle */}
              <button
                type="button"
                onClick={() =>
                  setSortOrder(effectiveSort === "oldest" ? "newest" : "oldest")
                }
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                title="Toggle sort order"
              >
                <ArrowDownUp size={14} className="text-zinc-400" />
                <span>
                  {effectiveSort === "oldest" ? "Oldest first" : "Newest first"}
                </span>
              </button>
            </div>
          </div>

          {/* Cross-Tab Search Matches Helper */}
          {crossTabMatches.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
              <span className="text-zinc-500 dark:text-zinc-400">
                Also found in other queues:
              </span>
              {crossTabMatches.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setTab(m.key);
                    setLimit(12);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300"
                >
                  <span>{m.count} in {m.label}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Error Alert */}
        {isError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle size={17} className="shrink-0" />
              <span>
                Orders couldn&apos;t refresh.{" "}
                {orders.length
                  ? "Showing the last loaded orders."
                  : "Check your internet connection and retry."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── 4. ORDER CARDS GRID / LOADING / EMPTY ─────────────────────────── */}
        {isPending ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="space-y-4 rounded-2xl border border-zinc-200/90 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="h-5 w-32 animate-pulse rounded-lg bg-zinc-200/80 dark:bg-zinc-800" />
                    <div className="h-3.5 w-40 animate-pulse rounded-lg bg-zinc-200/80 dark:bg-zinc-800" />
                  </div>
                  <div className="h-10 w-16 animate-pulse rounded-xl bg-zinc-200/80 dark:bg-zinc-800" />
                </div>
                <div className="h-28 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/70" />
                <div className="h-11 w-full animate-pulse rounded-xl bg-zinc-200/80 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <>
            <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.slice(0, limit).map((order) => (
                <VendorOrderCard
                  key={orderId(order) || order._id}
                  order={order}
                  nowMs={nowMs}
                  onRefresh={() => refetch()}
                />
              ))}
            </div>

            {filtered.length > limit && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setLimit((val) => val + 12)}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  Show more orders ({filtered.length - limit} remaining)
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
              {tab === "incoming" && !normalizedQuery ? (
                <CheckCircle2 size={24} className="text-emerald-500" />
              ) : (
                <Inbox size={24} />
              )}
            </div>
            <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-white">
              {normalizedQuery
                ? "No matching orders in this queue"
                : tab === "incoming"
                  ? "You’re all caught up"
                  : `No orders in ${activeTabMeta.label.toLowerCase()}`}
            </h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {normalizedQuery
                ? "Try a different order code, customer name, or check the suggested queues above."
                : tab === "incoming"
                  ? "New customer orders stream in here automatically. Keep your store live to receive orders."
                  : "Orders appear here automatically as they progress through your kitchen workflow."}
            </p>
            {(normalizedQuery || (tab === "history" && historyFilter !== "all")) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setHistoryFilter("all");
                }}
                className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        <p
          role="status"
          className="text-center text-xs text-zinc-500 dark:text-zinc-400"
        >
          {isFetching && !isPending
            ? "Syncing latest order updates..."
            : "Orders refresh automatically in real time. Active queues prioritize oldest orders first (FIFO)."}
        </p>
      </div>
    </div>
  );
}
