"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Flame,
  Gauge,
  RefreshCw,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  TrendingDown,
  TrendingUp,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import useVendorOrders from "@/app/hooks/useVendorOrders";
import { useVendorFoods } from "@/app/hooks/useVendorFoods";
import { useVendorMenu } from "@/app/hooks/useMenu";
import { useVendorStorage } from "@/app/hooks/vendorStorage";
import { getVendorAnalytics, getVendorReviews } from "@/app/lib/vendorApi";
import { formatNaira } from "@/app/vendors/dashboard/lib/dashboardMetrics";
import { ANALYTICS_TIMEFRAMES, computeClientAnalytics } from "./lib/analyticsEngine";

function DeltaBadge({ delta, suffix = "" }) {
  if (!delta) return null;
  if (delta.direction === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
        <ArrowUpRight size={13} />
        {delta.label}
        {suffix ? ` ${suffix}` : ""}
      </span>
    );
  }
  if (delta.direction === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
        <ArrowDownRight size={13} />
        {delta.label}
        {suffix ? ` ${suffix}` : ""}
      </span>
    );
  }
  if (delta.direction === "new") {
    return (
      <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
      0%
    </span>
  );
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;
  return (
    <div className="min-w-[180px] rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-900/95">
      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{pt.fullDate}</p>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-500 dark:text-zinc-400">Sales</span>
          <span className="font-bold tabular-nums text-orange-600 dark:text-orange-400">
            {formatNaira(pt.revenue)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-500 dark:text-zinc-400">Completed</span>
          <span className="font-semibold tabular-nums text-zinc-900 dark:text-white">
            {pt.orders}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-500 dark:text-zinc-400">Cancelled</span>
          <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
            {pt.cancelled}
          </span>
        </div>
      </div>
    </div>
  );
}

function downloadAnalyticsCsv(analytics, storeName) {
  const rows = [
    ["MelaChow Vendor Business Analytics Report"],
    ["Store", storeName || "Vendor Store"],
    ["Timeframe", analytics.timeframe?.label || "Last 30 Days"],
    ["Generated At", new Date().toISOString()],
    [],
    ["Key Metric", "Value"],
    ["Daily Sales (Today)", analytics.sales.daily.revenue],
    ["Weekly Sales (7D)", analytics.sales.weekly.revenue],
    ["Monthly Sales (30D)", analytics.sales.monthly.revenue],
    ["Selected Period Sales", analytics.sales.period.revenue],
    ["Total Completed Orders", analytics.orders.totalCompleted],
    ["Average Order Value", analytics.orders.avgOrderValue],
    ["Order Acceptance Rate (%)", analytics.orders.acceptanceRate ?? "N/A"],
    ["Cancelled Orders", analytics.orders.cancelled],
    ["Cancellation Rate (%)", analytics.orders.cancellationRate],
    ["Average Prep Time (min)", analytics.operations.avgPrepTimeMinutes ?? "N/A"],
    ["Customer Rating", analytics.ratings.average],
    ["Total Reviews", analytics.ratings.totalReviews],
    [],
    ["Best-Selling Meals", "Units Sold", "Revenue (NGN)"],
    ...analytics.meals.bestSelling.map((m) => [m.name, m.sold, Math.round(m.revenue)]),
    [],
    ["Least-Selling Meals", "Units Sold", "Revenue (NGN)"],
    ...analytics.meals.leastSelling.map((m) => [m.name, m.sold, Math.round(m.revenue)]),
  ];

  const csv = rows
    .map((r) => r.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `melachow-analytics-${analytics.timeframe?.id || "30d"}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function VendorAnalyticsPage() {
  const [timeframe, setTimeframe] = useState("30d");
  const [chartView, setChartView] = useState("revenue");
  const [serverData, setServerData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { vendorDetails } = useVendorStorage();
  const vendor = vendorDetails?.vendor || null;
  const vendorId = vendor?._id || vendor?.id;

  const { orders: liveOrders, isPending: ordersLoading, refetch: refetchOrders } = useVendorOrders();
  const { data: foodsRes, isLoading: foodsLoading, refetch: refetchFoods } = useVendorFoods(vendorId, {
    limit: 200,
    is_archived: false,
  });
  const { data: legacyMenu } = useVendorMenu(vendorId);

  const fetchBackendExtras = useCallback(
    async (tf) => {
      try {
        const [analyticsRes, reviewsRes] = await Promise.allSettled([
          getVendorAnalytics(tf),
          getVendorReviews(),
        ]);

        if (analyticsRes.status === "fulfilled" && analyticsRes.value?.data) {
          setServerData(analyticsRes.value.data);
        } else {
          setServerData(null);
        }

        if (reviewsRes.status === "fulfilled") {
          const list = reviewsRes.value?.reviews || reviewsRes.value?.data || [];
          setReviews(Array.isArray(list) ? list : []);
        }
      } catch {
        setServerData(null);
      }
    },
    []
  );

  useEffect(() => {
    if (!vendorId) return;
    fetchBackendExtras(timeframe);
  }, [vendorId, timeframe, fetchBackendExtras]);

  const menuItems = useMemo(() => {
    if (Array.isArray(foodsRes?.items) && foodsRes.items.length > 0) return foodsRes.items;
    if (Array.isArray(legacyMenu)) return legacyMenu;
    return [];
  }, [foodsRes, legacyMenu]);

  const clientAnalytics = useMemo(
    () =>
      computeClientAnalytics({
        vendor,
        orders: liveOrders || vendor?.vendorOrders || [],
        menuItems,
        reviews,
        timeframe,
      }),
    [vendor, liveOrders, menuItems, reviews, timeframe]
  );

  // Prefer server-computed analytics when backend endpoint is deployed, otherwise use seamless client computation
  const analytics = serverData || clientAnalytics;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([refetchOrders(), refetchFoods(), fetchBackendExtras(timeframe)]);
      toast.success("Analytics refreshed");
    } finally {
      setIsRefreshing(false);
    }
  };

  const isLoading = ordersLoading && foodsLoading && !serverData && !(liveOrders?.length);

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-12">
      {/* Header */}
      <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              <BarChart3 size={14} />
              Restaurant Intelligence
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-white">
              Sales & Performance Analytics
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Track daily, weekly, and monthly revenue, best and least-selling meals, prep speed, acceptance rate, and ratings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-950">
              {ANALYTICS_TIMEFRAMES.map((tf) => {
                const active = timeframe === tf.id;
                return (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => setTimeframe(tf.id)}
                    className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? "bg-white text-orange-600 shadow-xs dark:bg-zinc-800 dark:text-orange-400"
                        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    }`}
                  >
                    {tf.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                downloadAnalyticsCsv(analytics, vendor?.storeName);
                toast.success("Analytics CSV exported");
              }}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700"
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Row 1: Sales Cadence (Daily, Weekly, Monthly, All-Time) */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Daily Sales (Today)
                </span>
                <DeltaBadge delta={analytics.sales.daily.delta} />
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-950 tabular-nums sm:text-3xl dark:text-white">
                {formatNaira(analytics.sales.daily.revenue)}
              </p>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {analytics.sales.daily.orders} completed today · Yesterday:{" "}
                {formatNaira(analytics.sales.daily.previousRevenue)}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Weekly Sales (7D)
                </span>
                <DeltaBadge delta={analytics.sales.weekly.delta} />
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-950 tabular-nums sm:text-3xl dark:text-white">
                {formatNaira(analytics.sales.weekly.revenue)}
              </p>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {analytics.sales.weekly.orders} completed · Prev 7D:{" "}
                {formatNaira(analytics.sales.weekly.previousRevenue)}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Monthly Sales (30D)
                </span>
                <DeltaBadge delta={analytics.sales.monthly.delta} />
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-950 tabular-nums sm:text-3xl dark:text-white">
                {formatNaira(analytics.sales.monthly.revenue)}
              </p>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {analytics.sales.monthly.orders} completed · Prev 30D:{" "}
                {formatNaira(analytics.sales.monthly.previousRevenue)}
              </p>
            </div>

            <div className="rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50 via-white to-white p-5 shadow-sm dark:border-orange-500/20 dark:from-orange-500/10 dark:via-zinc-900 dark:to-zinc-900">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-300">
                  All-Time Sales
                </span>
                <Calendar size={16} className="text-orange-600 dark:text-orange-400" />
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-950 tabular-nums sm:text-3xl dark:text-white">
                {formatNaira(analytics.sales.allTimeRevenue)}
              </p>
              <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
                {analytics.orders.allTimeCompleted.toLocaleString()} lifetime completed orders
              </p>
            </div>
          </section>

          {/* Row 2: Order, Kitchen & Quality Metrics (6 core KPIs) */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Total Completed Orders */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Completed Orders
                    </p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {analytics.timeframe?.longLabel || analytics.timeframe?.label}
                    </p>
                  </div>
                </div>
                <DeltaBadge delta={analytics.orders.completedDelta} />
              </div>
              <p className="mt-4 text-3xl font-bold text-zinc-950 tabular-nums dark:text-white">
                {analytics.orders.totalCompleted.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                Out of {analytics.orders.totalReceived.toLocaleString()} orders received in period
              </p>
            </div>

            {/* Average Order Value */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Average Order Value
                    </p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      Net vendor basket
                    </p>
                  </div>
                </div>
                <DeltaBadge delta={analytics.orders.aovDelta} />
              </div>
              <p className="mt-4 text-3xl font-bold text-zinc-950 tabular-nums dark:text-white">
                {formatNaira(analytics.orders.avgOrderValue)}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                Previous period: {formatNaira(analytics.orders.previousAvgOrderValue)}
              </p>
            </div>

            {/* Order Acceptance Rate */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
                    <Gauge size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Order Acceptance Rate
                    </p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      Accepted vs. declined
                    </p>
                  </div>
                </div>
                {analytics.orders.acceptanceRate != null && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      analytics.orders.acceptanceRate >= 90
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : analytics.orders.acceptanceRate >= 75
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                    }`}
                  >
                    {analytics.orders.acceptanceRate >= 90
                      ? "Excellent"
                      : analytics.orders.acceptanceRate >= 75
                        ? "Good"
                        : "Needs attention"}
                  </span>
                )}
              </div>
              <p className="mt-4 text-3xl font-bold text-zinc-950 tabular-nums dark:text-white">
                {analytics.orders.acceptanceRate != null ? `${analytics.orders.acceptanceRate}%` : "—"}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {analytics.orders.acceptedCount} accepted · {analytics.orders.declinedBeforeAcceptCount}{" "}
                missed/declined
              </p>
            </div>

            {/* Cancelled Orders */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                    <XCircle size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Cancelled Orders
                    </p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {analytics.orders.cancellationRate}% cancellation rate
                    </p>
                  </div>
                </div>
                {analytics.orders.cancelled > 0 && (
                  <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 tabular-nums dark:bg-rose-500/15 dark:text-rose-300">
                    -{formatNaira(analytics.orders.cancelledValueLost, { compact: true })}
                  </span>
                )}
              </div>
              <p className="mt-4 text-3xl font-bold text-zinc-950 tabular-nums dark:text-white">
                {analytics.orders.cancelled.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                All-time cancelled: {analytics.orders.allTimeCancelled.toLocaleString()} · Tip: pause
                orders during rushes
              </p>
            </div>

            {/* Average Preparation Time */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Avg. Preparation Time
                    </p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      Accept → Ready for pickup
                    </p>
                  </div>
                </div>
                <Link
                  href="/vendors/availability"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
                >
                  Target: {analytics.operations.targetPrepMinutes}m
                </Link>
              </div>
              <p className="mt-4 text-3xl font-bold text-zinc-950 tabular-nums dark:text-white">
                {analytics.operations.avgPrepTimeMinutes != null
                  ? `${analytics.operations.avgPrepTimeMinutes} min`
                  : "No samples yet"}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {analytics.operations.prepSampleCount > 0
                  ? `${analytics.operations.onTimePrepRate}% within ${analytics.operations.targetPrepMinutes}m target · Range ${analytics.operations.fastestPrepMinutes}–${analytics.operations.slowestPrepMinutes}m`
                  : "Calculated automatically as orders move from Accepted to Ready"}
              </p>
            </div>

            {/* Customer Ratings */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400">
                    <Star size={18} className="fill-current" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Customer Ratings
                    </p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      Verified storefront feedback
                    </p>
                  </div>
                </div>
                <Link
                  href="/vendors/reviews"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
                >
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <p className="text-3xl font-bold text-zinc-950 tabular-nums dark:text-white">
                  {analytics.ratings.average > 0 ? analytics.ratings.average.toFixed(1) : "—"}
                </p>
                <span className="text-sm font-medium text-zinc-400">/ 5.0</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {analytics.ratings.totalReviews} review{analytics.ratings.totalReviews === 1 ? "" : "s"}
                {analytics.ratings.positivePct != null
                  ? ` · ${analytics.ratings.positivePct}% positive (4★–5★)`
                  : ""}
              </p>
            </div>
          </section>

          {/* Row 3: Sales Trend Chart + Ratings Breakdown */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm lg:col-span-8 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                    Sales & Order Trend
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Daily revenue and completed vs. cancelled order volume
                  </p>
                </div>

                <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-950">
                  <button
                    type="button"
                    onClick={() => setChartView("revenue")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      chartView === "revenue"
                        ? "bg-white text-orange-600 shadow-xs dark:bg-zinc-800 dark:text-orange-400"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    Revenue (₦)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView("orders")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      chartView === "orders"
                        ? "bg-white text-orange-600 shadow-xs dark:bg-zinc-800 dark:text-orange-400"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    Orders
                  </button>
                </div>
              </div>

              <div className="mt-5 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === "revenue" ? (
                    <AreaChart
                      data={analytics.dailySeries}
                      margin={{ top: 10, right: 10, left: -12, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="analyticsRevGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ea580c" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.35} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => formatNaira(v, { compact: true })}
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<TrendTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#ea580c"
                        strokeWidth={2.5}
                        fill="url(#analyticsRevGrad)"
                      />
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={analytics.dailySeries}
                      margin={{ top: 10, right: 10, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.35} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<TrendTooltip />} />
                      <Bar dataKey="orders" name="Completed" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="cancelled" name="Cancelled" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ratings Distribution & Actionable Callout */}
            <div className="flex flex-col justify-between gap-5 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm lg:col-span-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                  Rating Breakdown
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Distribution across {analytics.ratings.totalReviews} customer ratings
                </p>

                <div className="mt-5 space-y-3">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = analytics.ratings.distribution?.[star] || 0;
                    const total = Object.values(analytics.ratings.distribution || {}).reduce(
                      (a, b) => a + b,
                      0
                    );
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-3 text-xs">
                        <span className="flex w-9 shrink-0 items-center gap-1 font-semibold text-zinc-700 tabular-nums dark:text-zinc-300">
                          {star}
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-amber-400 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-14 shrink-0 text-right text-zinc-500 tabular-nums dark:text-zinc-400">
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-orange-200/80 bg-orange-50/70 p-4 dark:border-orange-500/20 dark:bg-orange-500/10">
                <div className="flex items-start gap-3">
                  <SlidersHorizontal
                    size={18}
                    className="mt-0.5 shrink-0 text-orange-600 dark:text-orange-400"
                  />
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">
                      Protect ratings during rush hour
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                      Turn on Busy Mode to add prep time or pause new orders for 15–30 min instead of cancelling.
                    </p>
                    <Link
                      href="/vendors/availability"
                      className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
                    >
                      Open Availability Controls <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Row 4: Best-Selling Meals vs. Least-Selling Meals */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Best-Selling Meals */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                    <Flame size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                      Best-Selling Meals
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Top performers in {analytics.timeframe?.longLabel || analytics.timeframe?.label}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  Top {analytics.meals.bestSelling.length}
                </span>
              </div>

              {analytics.meals.bestSelling.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800">
                  <TrendingUp size={24} className="mx-auto text-zinc-400" />
                  <p className="mt-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    No completed meal sales in this period yet
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Try expanding the timeframe to 90D or All Time.
                  </p>
                </div>
              ) : (
                <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {analytics.meals.bestSelling.map((meal, idx) => (
                    <div key={`${meal.id}-${idx}`} className="flex items-center gap-3 py-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-600 tabular-nums dark:bg-zinc-800 dark:text-zinc-300">
                        #{idx + 1}
                      </span>
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
                        {meal.image ? (
                          <img
                            src={meal.image}
                            alt={meal.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-400">
                            <UtensilsCrossed size={16} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                            {meal.name}
                          </p>
                          <p className="shrink-0 text-sm font-bold text-zinc-950 tabular-nums dark:text-white">
                            {formatNaira(meal.revenue)}
                          </p>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${meal.sharePct || 10}%` }}
                            />
                          </div>
                          <span className="shrink-0 text-xs font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
                            {meal.sold} sold
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Least-Selling & Zero-Sale Meals */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                    <TrendingDown size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                      Least-Selling Meals
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Slow movers & zero-order menu dishes ({analytics.meals.zeroSaleCount} with 0 sales)
                    </p>
                  </div>
                </div>
                <Link
                  href="/vendors/my-foods"
                  className="text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
                >
                  Optimize menu
                </Link>
              </div>

              {analytics.meals.leastSelling.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800">
                  <AlertTriangle size={24} className="mx-auto text-zinc-400" />
                  <p className="mt-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    No active menu items to compare yet
                  </p>
                  <Link
                    href="/vendors/create-food"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
                  >
                    Add your first menu item <ArrowRight size={13} />
                  </Link>
                </div>
              ) : (
                <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
                  {analytics.meals.leastSelling.map((meal, idx) => (
                    <div key={`${meal.id}-${idx}`} className="flex items-center gap-3 py-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
                        {meal.image ? (
                          <img
                            src={meal.image}
                            alt={meal.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-400">
                            <UtensilsCrossed size={16} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                            {meal.name}
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                              meal.sold === 0
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                            }`}
                          >
                            {meal.sold} sold
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="tabular-nums">
                            {meal.revenue > 0
                              ? `${formatNaira(meal.revenue)} earned`
                              : meal.price > 0
                                ? `Listed at ${formatNaira(meal.price)}`
                                : "No orders in period"}
                          </span>
                          {meal.onMenu && meal.id && (
                            <Link
                              href={`/vendors/my-foods/${meal.id}`}
                              className="font-semibold text-orange-600 hover:underline dark:text-orange-400"
                            >
                              Improve dish →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
