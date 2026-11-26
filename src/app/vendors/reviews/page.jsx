"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownUp,
  Calendar,
  LayoutDashboard,
  MessageSquare,
  RefreshCw,
  Search,
  Star,
  ThumbsUp,
  User,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { getVendorReviews } from "@/app/lib/vendorApi";

const STAR_FILTERS = [
  { id: "all", label: "All Ratings" },
  { id: "5", label: "5 ★" },
  { id: "4", label: "4 ★" },
  { id: "3", label: "3 ★" },
  { id: "low", label: "1–2 ★" },
];

export default function VendorReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [starFilter, setStarFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest"); // newest | highest | lowest
  const [searchQuery, setSearchQuery] = useState("");

  const fetchReviews = useCallback(async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError("");
      const data = await getVendorReviews();
      const list = data?.reviews || (Array.isArray(data) ? data : []);
      setReviews(list);
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
      setError("Failed to load reviews. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews(false);
  }, [fetchReviews]);

  const analytics = useMemo(() => {
    const total = reviews.length;
    const avg =
      total > 0
        ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / total
        : 0;
    const positiveCount = reviews.filter((r) => Number(r.rating) >= 4).length;
    const positivePct = total > 0 ? Math.round((positiveCount / total) * 100) : 0;

    const breakdown = [5, 4, 3, 2, 1].map((star) => {
      const count = reviews.filter((r) => Math.round(Number(r.rating)) === star).length;
      return {
        star,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    });

    // Most reviewed dish
    const dishCounts = new Map();
    for (const r of reviews) {
      const name = r.foodId?.name;
      if (name) dishCounts.set(name, (dishCounts.get(name) || 0) + 1);
    }
    let topDish = null;
    for (const [name, count] of dishCounts.entries()) {
      if (!topDish || count > topDish.count) topDish = { name, count };
    }

    return { total, avg, positivePct, breakdown, topDish };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reviews
      .filter((r) => {
        const rating = Math.round(Number(r.rating || 0));
        if (starFilter === "low") {
          if (rating > 2) return false;
        } else if (starFilter !== "all" && rating !== Number(starFilter)) {
          return false;
        }
        if (q) {
          const customer = r.userId
            ? `${r.userId.firstname || ""} ${r.userId.lastname || ""}`
            : "";
          const hay = `${customer} ${r.comment || ""} ${r.foodId?.name || ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "highest") return Number(b.rating || 0) - Number(a.rating || 0);
        if (sortBy === "lowest") return Number(a.rating || 0) - Number(b.rating || 0);
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [reviews, starFilter, searchQuery, sortBy]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1440px] space-y-5 pb-10">
        <div className="h-32 animate-pulse rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="h-52 animate-pulse rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-5" />
          <div className="h-52 animate-pulse rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-7" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] pb-10 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="space-y-5">
        {/* ── 1. HEADER CARD ── */}
        <section className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-40 dark:opacity-20"
              style={{
                background:
                  "radial-gradient(ellipse at top right, rgba(245,158,11,0.16), transparent 68%)",
              }}
            />
            <div className="relative space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                Customer Reviews
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Track diner satisfaction, spot top-rated dishes, and act quickly
                on feedback.
              </p>
            </div>
            <div className="relative flex flex-wrap items-center gap-2.5">
              <Link
                href="/vendors/dashboard"
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <LayoutDashboard size={15} />
                <span>Dashboard</span>
              </Link>
              <button
                type="button"
                onClick={() => fetchReviews(true)}
                disabled={isRefreshing}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-55"
              >
                <RefreshCw
                  size={15}
                  className={isRefreshing ? "animate-spin" : ""}
                />
                <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── 2. RATING ANALYTICS & HISTOGRAM ── */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Summary KPI Panel */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-7">
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                <Star size={18} className="fill-current" />
              </span>
              <div className="mt-4">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Average Rating
                </p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">
                    {analytics.total > 0 ? analytics.avg.toFixed(1) : "—"}
                  </span>
                  <span className="text-xs text-zinc-400">/ 5.0</span>
                </div>
                <div className="mt-2 flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={13}
                      fill={
                        s <= Math.round(analytics.avg) ? "currentColor" : "none"
                      }
                      className={
                        s <= Math.round(analytics.avg)
                          ? "text-amber-500"
                          : "text-zinc-300 dark:text-zinc-700"
                      }
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <ThumbsUp size={18} />
              </span>
              <div className="mt-4">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Positive (4–5 ★)
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {analytics.positivePct}%
                </p>
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  From {analytics.total} total review
                  {analytics.total === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                <UtensilsCrossed size={18} />
              </span>
              <div className="mt-4">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Most Reviewed Dish
                </p>
                <p className="mt-1 line-clamp-2 text-base font-bold text-zinc-900 dark:text-white">
                  {analytics.topDish?.name || "No dish data yet"}
                </p>
                {analytics.topDish && (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {analytics.topDish.count} review
                    {analytics.topDish.count === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 5★ to 1★ Interactive Breakdown */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                Rating Breakdown
              </h2>
              <span className="text-xs text-zinc-400">Click a bar to filter</span>
            </div>
            <div className="mt-3.5 space-y-2">
              {analytics.breakdown.map((row) => {
                const key = row.star <= 2 ? "low" : String(row.star);
                const selected = starFilter === key;
                return (
                  <button
                    key={row.star}
                    type="button"
                    onClick={() =>
                      setStarFilter(selected ? "all" : key)
                    }
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-1 text-xs transition ${
                      selected
                        ? "bg-orange-50 dark:bg-orange-500/15"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <span className="w-8 shrink-0 font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                      {row.star} ★
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
                      {row.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 3. FILTER & SEARCH TOOLBAR ── */}
        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-950">
            {STAR_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStarFilter(f.id)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  starFilter === f.id
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-64 sm:flex-none">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reviews or dishes..."
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-9 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:text-zinc-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setSortBy((prev) =>
                  prev === "newest"
                    ? "highest"
                    : prev === "highest"
                      ? "lowest"
                      : "newest"
                )
              }
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <ArrowDownUp size={14} className="text-zinc-400" />
              <span>
                {sortBy === "newest"
                  ? "Newest"
                  : sortBy === "highest"
                    ? "Highest Rated"
                    : "Lowest Rated"}
              </span>
            </button>
          </div>
        </section>

        {/* ── 4. REVIEWS GRID ── */}
        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            <span className="inline-flex items-center gap-2">
              <AlertCircle size={17} />
              {error}
            </span>
            <button
              type="button"
              onClick={() => fetchReviews(true)}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
              <MessageSquare size={22} />
            </div>
            <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-white">
              {reviews.length === 0 ? "No reviews yet" : "No reviews match your filter"}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
              {reviews.length === 0
                ? "Once customers rate their delivered orders, their comments will appear here."
                : "Try selecting a different star rating or clearing your search."}
            </p>
            {(starFilter !== "all" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setStarFilter("all");
                  setSearchQuery("");
                }}
                className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredReviews.map((review) => {
              const name = review.userId
                ? `${review.userId.firstname || ""} ${review.userId.lastname || ""}`.trim() ||
                  "Customer"
                : "Verified Customer";
              const rating = Number(review.rating || 0);
              const badgeColor =
                rating >= 4
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : rating === 3
                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300"
                    : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300";

              return (
                <article
                  key={review._id}
                  className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm transition hover:border-orange-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-500/30"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          <User size={17} />
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-zinc-900 dark:text-white">
                            {name}
                          </h3>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                            <Calendar size={11} />
                            {formatDate(review.createdAt)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums ${badgeColor}`}
                      >
                        <Star size={11} className="fill-current" />
                        {rating.toFixed(1)}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {review.comment
                        ? `“${review.comment}”`
                        : "Rated without a written comment."}
                    </p>
                  </div>

                  {review.foodId?.name && (
                    <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        <UtensilsCrossed size={12} className="text-orange-500" />
                        <span className="truncate">{review.foodId.name}</span>
                      </span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
