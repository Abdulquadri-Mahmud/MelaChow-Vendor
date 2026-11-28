"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock,
  CreditCard,
  Flame,
  Gauge,
  Inbox,
  Lock,
  Package,
  PauseCircle,
  PlusCircle,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Store,
  TrendingUp,
  Truck,
  UtensilsCrossed,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import IncomingOrders from "@/app/components/order/IncomingOrders";
import VendorLocationNotice from "@/app/components/vendors_component/location/VendorLocationNotice";
import VendorPromoStatus from "@/components/vendor/VendorPromoStatus";
import VendorDashboardSkeleton from "@/app/skeleton/VendorDashboardSkeleton";
import useVendorOrders from "@/app/hooks/useVendorOrders";
import { useVendorFoods } from "@/app/hooks/useVendorFoods";
import { useVendorMenu } from "@/app/hooks/useMenu";
import { useVendorStorage } from "@/app/hooks/vendorStorage";
import { getVendorWallet, setVendorLiveStatus } from "@/app/lib/vendorApi";

import StoreStatusModal from "./components/StoreStatusModal";
import {
  TIMEFRAMES,
  buildDashboardMetrics,
  formatNaira,
} from "./lib/dashboardMetrics";
import { computeClientAnalytics } from "@/app/vendors/analytics/lib/analyticsEngine";
import { evaluateVendorAvailability } from "@/app/lib/vendor-time/vendorTime";

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function getLagosGreetingAndDay() {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Lagos",
      weekday: "long",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .reduce((acc, p) => {
        acc[p.type] = p.value;
        return acc;
      }, {});
    const hour = Number(parts.hour || 12);
    const greeting =
      hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const dayKey = String(parts.weekday || "").toLowerCase();
    return {
      greeting,
      dayKey: DAY_KEYS.includes(dayKey) ? dayKey : DAY_KEYS[new Date().getDay()],
    };
  } catch {
    return { greeting: "Welcome back", dayKey: DAY_KEYS[new Date().getDay()] };
  }
}

function formatClock(value) {
  if (!value) return null;
  const [rawH, rawM = "00"] = String(value).split(":");
  let h = Number(rawH);
  const m = Number(rawM);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const suffix = h >= 12 ? "PM" : "AM";
  h %= 12;
  return `${h || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function ChartTooltip({ active, payload, metric }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  const aov = point.orders > 0 ? point.revenue / point.orders : 0;

  return (
    <div className="min-w-[170px] rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-900/95">
      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        {point.fullDate}
      </p>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-500 dark:text-zinc-400">Revenue</span>
          <span
            className={`font-bold tabular-nums ${
              metric === "revenue"
                ? "text-orange-600 dark:text-orange-400"
                : "text-zinc-900 dark:text-white"
            }`}
          >
            {formatNaira(point.revenue)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-500 dark:text-zinc-400">Completed</span>
          <span
            className={`font-bold tabular-nums ${
              metric === "orders"
                ? "text-orange-600 dark:text-orange-400"
                : "text-zinc-900 dark:text-white"
            }`}
          >
            {point.orders} order{point.orders === 1 ? "" : "s"}
          </span>
        </div>
        {point.orders > 0 && (
          <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-1 dark:border-zinc-800">
            <span className="text-zinc-500 dark:text-zinc-400">Avg. ticket</span>
            <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
              {formatNaira(aov)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function DeltaPill({ delta, comparisonLabel }) {
  if (!delta) return null;
  if (delta.direction === "up") {
    return (
      <span
        title={`vs. previous ${comparisonLabel}`}
        className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
      >
        <ArrowUpRight size={13} />
        {delta.label}
      </span>
    );
  }
  if (delta.direction === "down") {
    return (
      <span
        title={`vs. previous ${comparisonLabel}`}
        className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
      >
        <ArrowDownRight size={13} />
        {delta.label}
      </span>
    );
  }
  if (delta.direction === "new") {
    return (
      <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
      0%
    </span>
  );
}

export default function VendorDashboard() {
  const [walletLoading, setWalletLoading] = useState(true);
  const [liveWalletBalance, setLiveWalletBalance] = useState(0);
  const [livePendingBalance, setLivePendingBalance] = useState(0);
  const [timeframeId, setTimeframeId] = useState("7d");
  const [chartMetric, setChartMetric] = useState("revenue");
  const [orderFilter, setOrderFilter] = useState("all");
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [isUpdatingLiveStatus, setIsUpdatingLiveStatus] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const { vendorDetails, updateVendor, refetchVendorProfile } = useVendorStorage();
  const vendorData = vendorDetails?.vendor || null;
  const vendorId =
    vendorDetails?.vendor?._id ||
    vendorDetails?.vendor?.id ||
    vendorDetails?._id ||
    vendorDetails?.id;

  const {
    orders: liveOrders,
    isPending: isOrdersPending,
    refetch: refetchOrders,
  } = useVendorOrders();

  const { data: menuData, isLoading: isMenuLoading } = useVendorMenu(vendorId);
  const {
    data: foodsData,
    refetch: refetchFoods,
  } = useVendorFoods(vendorId, { status: "all", limit: 100 });

  const legacyFoods = useMemo(() => {
    const raw = menuData?.data || menuData?.items || menuData || [];
    return Array.isArray(raw) ? raw : [];
  }, [menuData]);

  // Menu eligibility controls Go Live on the backend. Refresh profile when menu loads.
  useEffect(() => {
    if (!isMenuLoading && menuData) refetchVendorProfile();
  }, [isMenuLoading, menuData, refetchVendorProfile]);

  const fetchWallet = useCallback(async () => {
    try {
      const walletResult = await getVendorWallet();
      if (walletResult?.success) {
        setLiveWalletBalance(Number(walletResult.data?.balance || 0));
        setLivePendingBalance(Number(walletResult.data?.pendingBalance || 0));
      }
    } catch (err) {
      console.error("Dashboard wallet fetch error:", err);
    } finally {
      setWalletLoading(false);
      setLastSyncedAt(new Date());
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleRefreshAll = async () => {
    try {
      setIsRefreshingAll(true);
      await Promise.allSettled([
        fetchWallet(),
        refetchOrders(),
        refetchFoods(),
        refetchVendorProfile(),
      ]);
      setLastSyncedAt(new Date());
      toast.success("Dashboard synced");
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const handleConfirmLiveStatus = async () => {
    const nextStatus = !vendorData?.isLive;
    try {
      setIsUpdatingLiveStatus(true);
      const result = await setVendorLiveStatus(nextStatus);
      if (result?.data) updateVendor(result.data);
      setStatusModalOpen(false);
      toast.success(
        nextStatus
          ? "Your store is now live and accepting orders."
          : "Your store has been paused."
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Could not update your store status."
      );
    } finally {
      setIsUpdatingLiveStatus(false);
    }
  };

  // Prefer live React Query orders; fall back to cached profile orders if live feed is empty while loading
  const effectiveOrders = useMemo(() => {
    if (Array.isArray(liveOrders) && liveOrders.length > 0) return liveOrders;
    if (Array.isArray(vendorData?.vendorOrders) && vendorData.vendorOrders.length > 0) {
      return vendorData.vendorOrders;
    }
    return [];
  }, [liveOrders, vendorData?.vendorOrders]);

  const metrics = useMemo(
    () =>
      buildDashboardMetrics({
        orders: effectiveOrders,
        vendorData,
        foodsResponse: foodsData,
        legacyMenu: legacyFoods,
        timeframeId,
      }),
    [effectiveOrders, vendorData, foodsData, legacyFoods, timeframeId]
  );

  const pulseAnalytics = useMemo(
    () =>
      computeClientAnalytics({
        vendor: vendorData,
        orders: effectiveOrders,
        menuItems: foodsData?.items || legacyFoods,
        timeframe: timeframeId === "7d" ? "7d" : timeframeId === "90d" ? "90d" : "30d",
      }),
    [vendorData, effectiveOrders, foodsData, legacyFoods, timeframeId]
  );

  const liveAvailability = useMemo(
    () => evaluateVendorAvailability(vendorData?.openingHours),
    [vendorData?.openingHours]
  );

  const filteredRecentOrders = useMemo(() => {
    if (orderFilter === "active") {
      return metrics.recentOrders.filter((o) => o.isActive);
    }
    if (orderFilter === "completed") {
      return metrics.recentOrders.filter((o) => o.isCompleted);
    }
    return metrics.recentOrders;
  }, [metrics.recentOrders, orderFilter]);

  const { greeting, dayKey } = useMemo(() => getLagosGreetingAndDay(), []);
  const todayHours = vendorData?.openingHours?.[dayKey] || null;
  const todayHoursText = todayHours?.closed
    ? "Closed today"
    : todayHours?.close
      ? `Open today · Closes ${formatClock(todayHours.close)}`
      : null;

  const isLive = Boolean(vendorData?.isLive);
  const canGoLive = isLive || Boolean(vendorData?.liveReadiness?.isReady);
  const storeName = vendorData?.storeName || vendorData?.name || "Your Kitchen";
  const syncedLabel = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString("en-NG", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  if (walletLoading && isOrdersPending && !vendorData) {
    return (
      <div className="mx-auto max-w-[1440px] space-y-5">
        <IncomingOrders />
        <VendorDashboardSkeleton />
      </div>
    );
  }

  const hasChartActivity = metrics.chartData.some((d) =>
    chartMetric === "revenue" ? d.revenue > 0 : d.orders > 0
  );

  // SVG gauge geometry for sentiment ring
  const gaugeRadius = 34;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset =
    gaugeCircumference * (1 - Math.min(100, Math.max(0, metrics.sentiment.percentage)) / 100);

  return (
    <div className="mx-auto max-w-[1440px] pb-8 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="space-y-5">
        {/* ── 1. COMMAND HEADER & QUICK ACTIONS ─────────────────────────────── */}
        <section className="overflow-hidden rounded-2xl border border-orange-200/80 bg-white shadow-sm dark:border-orange-500/25 dark:bg-zinc-900">
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500" />
          <div className="relative bg-gradient-to-br from-orange-50/55 via-white to-white p-5 dark:from-orange-500/10 dark:via-zinc-900 dark:to-zinc-900 sm:p-6">
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-50 dark:opacity-25"
              style={{
                background:
                  "radial-gradient(ellipse at top right, rgba(249,115,22,0.22), transparent 68%)",
              }}
            />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {greeting}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      isLive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isLive ? "animate-pulse bg-emerald-500" : "bg-zinc-400"
                      }`}
                    />
                    {isLive ? "Live · Accepting Orders" : "Store Paused"}
                  </span>

                  {metrics.kpis.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300">
                      <BadgeCheck size={13} />
                      Verified Partner
                    </span>
                  )}

                  {liveAvailability.override && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300">
                      <ShieldAlert size={13} />
                      Admin Override: {liveAvailability.isOpen ? "Forced Open" : "Forced Closed"}
                    </span>
                  )}

                  {!liveAvailability.override && liveAvailability.isBusy && liveAvailability.isOpen && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
                      <Flame size={13} />
                      Busy · ~{liveAvailability.estimatedPrepMinutes}m prep
                    </span>
                  )}

                  {!liveAvailability.override && liveAvailability.state === "orders_paused" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
                      <PauseCircle size={13} />
                      Orders Paused
                    </span>
                  )}

                  {!liveAvailability.override && liveAvailability.state === "temporarily_closed" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
                      <XCircle size={13} />
                      Temporarily Closed
                    </span>
                  )}
                </div>

                <h1 className="truncate text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                  {storeName}
                </h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {todayHoursText && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={13} className="text-zinc-400" />
                      {todayHoursText}
                    </span>
                  )}
                  {syncedLabel && (
                    <span>Synced at {syncedLabel}</span>
                  )}
                  <span className="tabular-nums">
                    Today:{" "}
                    <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatNaira(metrics.pipeline.todayRevenue)}
                    </strong>{" "}
                    ({metrics.pipeline.completedToday} completed)
                  </span>
                </div>
              </div>

              {/* Primary Header Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleRefreshAll}
                  disabled={isRefreshingAll}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  <RefreshCw
                    size={15}
                    className={isRefreshingAll ? "animate-spin" : ""}
                  />
                  <span>{isRefreshingAll ? "Syncing..." : "Refresh"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusModalOpen(true)}
                  disabled={isUpdatingLiveStatus || !canGoLive}
                  className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isLive
                      ? "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {isLive ? <PauseCircle size={16} /> : <Radio size={16} />}
                  <span>
                    {isUpdatingLiveStatus
                      ? "Updating..."
                      : isLive
                        ? "Pause Store"
                        : "Go Live"}
                  </span>
                </button>
              </div>
            </div>

            {!isLive && !vendorData?.liveReadiness?.isReady && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Add at least one priced, in-stock menu item to unlock{" "}
                    <strong>Go Live</strong> and start receiving customer orders.
                  </span>
                </div>
                <Link
                  href="/vendors/create-food"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
                >
                  Add Menu Item
                  <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions Strip */}
          <div className="flex flex-wrap items-center gap-2.5 border-t border-orange-100/80 bg-orange-50/40 px-5 py-3.5 dark:border-zinc-800 dark:bg-zinc-950/50 sm:px-6">
            <Link
              href="/vendors/order"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-orange-600/25 transition hover:bg-orange-700"
            >
              <ClipboardList size={15} />
              <span>Order Desk</span>
              {metrics.pipeline.activeTotal > 0 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold tabular-nums">
                  {metrics.pipeline.activeTotal}
                </span>
              )}
            </Link>

            <Link
              href="/vendors/analytics"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-orange-200/70 bg-white px-4 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-orange-400 hover:bg-orange-50/70 hover:text-orange-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-orange-500/40 dark:hover:text-orange-300"
            >
              <BarChart3 size={15} className="text-orange-600 dark:text-orange-400" />
              <span>Analytics</span>
            </Link>

            <Link
              href="/vendors/availability"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-orange-200/70 bg-white px-4 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-orange-400 hover:bg-orange-50/70 hover:text-orange-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-orange-500/40 dark:hover:text-orange-300"
            >
              <SlidersHorizontal size={15} className="text-orange-600 dark:text-orange-400" />
              <span>Availability</span>
            </Link>

            <Link
              href="/vendors/create-food"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-orange-200/70 bg-white px-4 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-orange-400 hover:bg-orange-50/70 hover:text-orange-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-orange-500/40 dark:hover:text-orange-300"
            >
              <PlusCircle size={15} className="text-orange-600 dark:text-orange-400" />
              <span>Add Food</span>
            </Link>

            <Link
              href="/vendors/my-foods"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-orange-200/70 bg-white px-4 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-orange-400 hover:bg-orange-50/70 hover:text-orange-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-orange-500/40 dark:hover:text-orange-300"
            >
              <UtensilsCrossed size={15} className="text-orange-600 dark:text-orange-400" />
              <span>My Menu</span>
            </Link>

            <Link
              href="/vendors/transactions"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-orange-200/70 bg-white px-4 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-orange-400 hover:bg-orange-50/70 hover:text-orange-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-orange-500/40 dark:hover:text-orange-300"
            >
              <Wallet size={15} className="text-orange-600 dark:text-orange-400" />
              <span>Payouts</span>
            </Link>

            <Link
              href="/vendors/profile"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-orange-200/70 bg-white px-4 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:border-orange-400 hover:bg-orange-50/70 hover:text-orange-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-orange-500/40 dark:hover:text-orange-300"
            >
              <Store size={15} className="text-orange-600 dark:text-orange-400" />
              <span>Store Profile</span>
            </Link>
          </div>
        </section>

        {/* ── 2. PRIORITY NOTICES & INCOMING ORDERS ─────────────────────────── */}
        <VendorLocationNotice
          vendor={vendorData}
          onSaved={(updated) => {
            updateVendor(updated);
            refetchVendorProfile();
          }}
        />
        <VendorPromoStatus />
        <IncomingOrders />

        {/* ── 3. LIVE ORDER PIPELINE (4-STAGE FUNNEL) ───────────────────────── */}
        <section aria-label="Order pipeline">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <PipelineTile
              href="/vendors/order"
              icon={Inbox}
              label="Incoming"
              value={metrics.pipeline.incoming}
              sub={
                metrics.pipeline.incoming > 0
                  ? "Awaiting acceptance"
                  : "Queue clear"
              }
              highlight={metrics.pipeline.incoming > 0 ? "amber" : "neutral"}
            />
            <PipelineTile
              href="/vendors/order"
              icon={ChefHat}
              label="Preparing"
              value={metrics.pipeline.preparing}
              sub="In kitchen now"
              highlight={metrics.pipeline.preparing > 0 ? "orange" : "neutral"}
            />
            <PipelineTile
              href="/vendors/order"
              icon={Truck}
              label="Ready / Dispatch"
              value={metrics.pipeline.ready}
              sub="Pickup & en route"
              highlight={metrics.pipeline.ready > 0 ? "sky" : "neutral"}
            />
            <PipelineTile
              href="/vendors/order"
              icon={CheckCircle2}
              label="Completed Today"
              value={metrics.pipeline.completedToday}
              sub={`${formatNaira(metrics.pipeline.todayRevenue)} earned today`}
              highlight={metrics.pipeline.completedToday > 0 ? "emerald" : "neutral"}
            />
          </div>
        </section>

        {/* ── 3B. OPERATIONS & SALES INTELLIGENCE PULSE ────────────────────── */}
        <section className="rounded-2xl border border-orange-200/75 bg-white p-4 shadow-sm sm:p-5 dark:border-orange-500/20 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="h-8 w-1 rounded-full bg-orange-600" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Kitchen &amp; Sales Pulse
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Live operational metrics across your store
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/vendors/availability"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:border-orange-300 hover:text-orange-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:text-orange-300"
              >
                <SlidersHorizontal size={13} />
                {liveAvailability.isBusy
                  ? `Busy (~${liveAvailability.estimatedPrepMinutes}m)`
                  : `Prep ~${liveAvailability.estimatedPrepMinutes}m`}
              </Link>
              <Link
                href="/vendors/analytics"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:hover:bg-orange-500/25"
              >
                Full Analytics
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Weekly Sales (7D)
              </p>
              <p className="mt-1.5 text-lg font-bold text-zinc-950 tabular-nums dark:text-white">
                {formatNaira(pulseAnalytics.sales.weekly.revenue)}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                {pulseAnalytics.sales.weekly.orders} orders
              </p>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Monthly Sales (30D)
              </p>
              <p className="mt-1.5 text-lg font-bold text-zinc-950 tabular-nums dark:text-white">
                {formatNaira(pulseAnalytics.sales.monthly.revenue)}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                {pulseAnalytics.sales.monthly.orders} orders
              </p>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <p className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                <Gauge size={12} className="text-sky-500" />
                Acceptance Rate
              </p>
              <p className="mt-1.5 text-lg font-bold text-zinc-950 tabular-nums dark:text-white">
                {pulseAnalytics.orders.acceptanceRate != null
                  ? `${pulseAnalytics.orders.acceptanceRate}%`
                  : "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                {pulseAnalytics.orders.acceptedCount} accepted
              </p>
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
              <p className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                <Clock size={12} className="text-amber-500" />
                Avg. Prep Time
              </p>
              <p className="mt-1.5 text-lg font-bold text-zinc-950 tabular-nums dark:text-white">
                {pulseAnalytics.operations.avgPrepTimeMinutes != null
                  ? `${pulseAnalytics.operations.avgPrepTimeMinutes}m`
                  : `~${liveAvailability.estimatedPrepMinutes}m`}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                Target: {pulseAnalytics.operations.targetPrepMinutes}m
              </p>
            </div>

            <div className="col-span-2 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3.5 lg:col-span-1 dark:border-zinc-800 dark:bg-zinc-950/60">
              <p className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                <XCircle size={12} className="text-rose-500" />
                Cancelled Orders
              </p>
              <p className="mt-1.5 text-lg font-bold text-zinc-950 tabular-nums dark:text-white">
                {pulseAnalytics.orders.cancelled}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
                {pulseAnalytics.orders.cancellationRate}% cancel rate
              </p>
            </div>
          </div>
        </section>

        {/* ── 4. PRECISION KPI GRID ─────────────────────────────────────────── */}
        <section
          aria-label="Key performance metrics"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {/* Revenue KPI */}
          <div className="flex flex-col justify-between rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50/50 via-white to-white p-5 shadow-sm dark:border-orange-500/25 dark:from-orange-500/10 dark:via-zinc-900 dark:to-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-orange-700 dark:text-orange-300">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white shadow-sm shadow-orange-600/25">
                  <TrendingUp size={16} />
                </span>
                <span>Revenue ({metrics.timeframe.label})</span>
              </div>
              <DeltaPill
                delta={metrics.kpis.revenueDelta}
                comparisonLabel={metrics.timeframe.longLabel}
              />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-white">
                {formatNaira(metrics.kpis.periodRevenue)}
              </p>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                All-time sales:{" "}
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {formatNaira(metrics.kpis.allTimeRevenue)}
                </span>
              </p>
            </div>
          </div>

          {/* Orders & Fulfillment KPI */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
                  <ShoppingBag size={16} />
                </span>
                <span>Completed ({metrics.timeframe.label})</span>
              </div>
              <DeltaPill
                delta={metrics.kpis.ordersDelta}
                comparisonLabel={metrics.timeframe.longLabel}
              />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-white">
                {metrics.kpis.periodOrders.toLocaleString("en-NG")}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                <span>
                  Avg ticket:{" "}
                  <strong className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {formatNaira(metrics.kpis.avgOrderValue)}
                  </strong>
                </span>
                {metrics.kpis.fulfillmentRate != null && (
                  <span>
                    Fulfillment:{" "}
                    <strong className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {metrics.kpis.fulfillmentRate}%
                    </strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Wallet & Settlement KPI */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <Wallet size={16} />
                </span>
                <span>Available Balance</span>
              </div>
              <Link
                href="/vendors/transactions"
                className="inline-flex items-center gap-0.5 text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
              >
                Ledger
                <ArrowUpRight size={13} />
              </Link>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatNaira(liveWalletBalance)}
              </p>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                Pending settlement:{" "}
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {formatNaira(livePendingBalance)}
                </span>
              </p>
            </div>
          </div>

          {/* Rating & Trust KPI */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                  <Star size={16} />
                </span>
                <span>Store Rating</span>
              </div>
              <Link
                href="/vendors/reviews"
                className="inline-flex items-center gap-0.5 text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
              >
                Reviews
                <ArrowUpRight size={13} />
              </Link>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-white">
                  {metrics.kpis.rating > 0 ? metrics.kpis.rating.toFixed(1) : "—"}
                </p>
                <span className="text-xs font-medium text-zinc-400">/ 5.0</span>
                <div className="ml-auto flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={13}
                      fill={
                        star <= Math.round(metrics.kpis.rating)
                          ? "currentColor"
                          : "none"
                      }
                      className={
                        star <= Math.round(metrics.kpis.rating)
                          ? "text-amber-500"
                          : "text-zinc-300 dark:text-zinc-700"
                      }
                    />
                  ))}
                </div>
              </div>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                {metrics.kpis.ratingCount > 0
                  ? `${metrics.kpis.ratingCount} customer review${metrics.kpis.ratingCount === 1 ? "" : "s"}`
                  : "No customer reviews yet"}
              </p>
            </div>
          </div>
        </section>

        {/* ── 5. MAIN ANALYTICS & LIVE ORDER FEED (12-COL GRID) ─────────────── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* LEFT: PERFORMANCE CHART (8 COLS) */}
          <div className="flex flex-col rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-8">
            <div className="flex flex-col gap-3 border-b border-zinc-100 p-5 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  Sales &amp; Order Performance
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {metrics.timeframe.longLabel} · completed orders &amp; vendor earnings
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Metric switcher */}
                <div
                  role="group"
                  aria-label="Chart metric"
                  className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {[
                    { id: "revenue", label: "Revenue" },
                    { id: "orders", label: "Orders" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setChartMetric(opt.id)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                        chartMetric === opt.id
                          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Timeframe switcher */}
                <div
                  role="group"
                  aria-label="Chart timeframe"
                  className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf.id}
                      type="button"
                      onClick={() => setTimeframeId(tf.id)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                        timeframeId === tf.id
                          ? "bg-orange-600 text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart Canvas */}
            <div className="h-[290px] w-full px-3 pb-2 pt-5 sm:px-5">
              {hasChartActivity ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={metrics.chartData}
                    margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="vendorRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="currentColor"
                      className="text-zinc-200 dark:text-zinc-800"
                    />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      minTickGap={22}
                      tick={{ fontSize: 11, fill: "#71717a" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={54}
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#71717a" }}
                      tickFormatter={(v) =>
                        chartMetric === "revenue"
                          ? formatNaira(v, { compact: true })
                          : String(v)
                      }
                    />
                    <Tooltip
                      content={<ChartTooltip metric={chartMetric} />}
                      cursor={{ stroke: "#f97316", strokeWidth: 1, strokeDasharray: "4 4" }}
                    />
                    <Area
                      type="monotone"
                      dataKey={chartMetric}
                      stroke="#f97316"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#vendorRevenueGrad)"
                      activeDot={{ r: 5, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 text-center dark:border-zinc-800 dark:bg-zinc-950/40">
                  <TrendingUp size={28} className="mb-2 text-zinc-400" />
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                    No completed sales in {metrics.timeframe.longLabel.toLowerCase()}
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                    Completed orders will appear here automatically. Try switching to{" "}
                    <button
                      type="button"
                      onClick={() => setTimeframeId("90d")}
                      className="font-semibold text-orange-600 underline dark:text-orange-400"
                    >
                      90D
                    </button>{" "}
                    or keep your store live to receive new orders.
                  </p>
                </div>
              )}
            </div>

            {/* Chart Summary Footer */}
            <div className="grid grid-cols-2 gap-3 border-t border-zinc-100 bg-zinc-50/70 px-5 py-3.5 dark:border-zinc-800 dark:bg-zinc-950/40 sm:grid-cols-4">
              <div>
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  Period Total
                </p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                  {formatNaira(metrics.chartSummary.totalRevenue)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  Daily Average
                </p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                  {formatNaira(metrics.chartSummary.dailyAvg)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  Best {metrics.timeframe.granularity === "week" ? "Week" : "Day"}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                  {metrics.chartSummary.bestBucket?.revenue > 0
                    ? `${metrics.chartSummary.bestBucket.label} (${formatNaira(
                        metrics.chartSummary.bestBucket.revenue,
                        { compact: true }
                      )})`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  Orders Completed
                </p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                  {metrics.chartSummary.totalOrders}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE ORDER FEED (4 COLS) */}
          <div className="flex max-h-[490px] flex-col rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-4">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 p-5 pb-3.5 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  Recent Order Activity
                </h2>
              </div>
              <Link
                href="/vendors/order"
                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
              >
                Order Desk
                <ArrowRight size={13} />
              </Link>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1.5 border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
              {[
                { id: "all", label: "All", count: metrics.recentOrders.length },
                {
                  id: "active",
                  label: "Active",
                  count: metrics.recentOrders.filter((o) => o.isActive).length,
                },
                {
                  id: "completed",
                  label: "Completed",
                  count: metrics.recentOrders.filter((o) => o.isCompleted).length,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setOrderFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    orderFilter === tab.id
                      ? "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="tabular-nums opacity-75">{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Order List */}
            <div className="custom-scrollbar flex-1 space-y-2.5 overflow-y-auto p-4">
              {filteredRecentOrders.length > 0 ? (
                filteredRecentOrders.map((order) => (
                  <Link
                    key={order.id || order.code}
                    href={order.id ? `/vendors/order/${order.id}` : "/vendors/order"}
                    className="group block rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 transition hover:border-orange-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-orange-500/40 dark:hover:bg-zinc-800/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-bold text-zinc-900 group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-400">
                            #{order.code}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {order.relativeTime || order.exactTime}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-400">
                          {order.customer} · {order.itemsSummary}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                        {formatNaira(order.payout)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${order.badgeClass}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${order.dotClass}`} />
                        {order.label}
                      </span>
                      <span className="text-[11px] font-medium tabular-nums text-zinc-400">
                        {order.progress}%
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${order.barClass}`}
                        style={{ width: `${order.progress}%` }}
                      />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center text-zinc-400">
                  <Package size={32} className="mb-2 opacity-60" />
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                    No {orderFilter === "all" ? "recent" : orderFilter} orders
                  </p>
                  <p className="mt-1 max-w-[210px] text-xs text-zinc-500 dark:text-zinc-400">
                    Orders placed by customers will stream in here automatically.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── 6. OPERATIONAL INSIGHTS ROW (3 CARDS) ─────────────────────────── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Card A: Top Selling Items */}
          <div className="flex flex-col rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  Top Selling Items
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {metrics.topItemsScope} · ranked by units sold
                </p>
              </div>
              <Link
                href="/vendors/my-foods"
                className="text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
              >
                All items
              </Link>
            </div>

            <div className="mt-4 flex-1 space-y-3.5">
              {metrics.topItems.length > 0 ? (
                metrics.topItems.map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center gap-3">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-10 w-10 shrink-0 rounded-xl border border-zinc-200 object-cover dark:border-zinc-700"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-orange-50 text-orange-600 dark:border-zinc-700 dark:bg-orange-500/10 dark:text-orange-400">
                        <UtensilsCrossed size={16} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                          {item.name}
                        </p>
                        <span className="shrink-0 text-xs font-bold tabular-nums text-zinc-800 dark:text-zinc-200">
                          {formatNaira(item.revenue)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-orange-500 transition-all duration-700"
                            style={{ width: `${item.sharePct}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[11px] font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
                          {item.sold} sold
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 p-4 text-center dark:border-zinc-800 dark:bg-zinc-950/40">
                  <UtensilsCrossed size={24} className="mb-2 text-zinc-400" />
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    No item sales recorded yet
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Your bestsellers and dish revenue will rank here once orders complete.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card B: Menu & Inventory Health */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                    Menu &amp; Inventory Health
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Live storefront catalog readiness
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    vendorData?.liveReadiness?.isReady || metrics.menuHealth.available > 0
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                  }`}
                >
                  {vendorData?.liveReadiness?.isReady || metrics.menuHealth.available > 0
                    ? "Ready"
                    : "Setup needed"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    Total
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900 dark:text-white">
                    {metrics.menuHealth.total}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    Available
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                    {metrics.menuHealth.available}
                  </p>
                </div>
                <div
                  className={`rounded-xl border p-3 ${
                    metrics.menuHealth.unavailable > 0
                      ? "border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10"
                      : "border-zinc-200/80 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/50"
                  }`}
                >
                  <p
                    className={`text-[11px] font-medium ${
                      metrics.menuHealth.unavailable > 0
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    Hidden / Out
                  </p>
                  <p
                    className={`mt-1 text-xl font-bold tabular-nums ${
                      metrics.menuHealth.unavailable > 0
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-zinc-900 dark:text-white"
                    }`}
                  >
                    {metrics.menuHealth.unavailable}
                  </p>
                </div>
              </div>

              {metrics.menuHealth.unpriced > 0 && (
                <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                  <AlertTriangle size={14} className="shrink-0" />
                  {metrics.menuHealth.unpriced} item
                  {metrics.menuHealth.unpriced === 1 ? "" : "s"} missing portion pricing.
                </p>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Link
                href="/vendors/my-foods"
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                Manage Menu
              </Link>
              <Link
                href="/vendors/create-food"
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-orange-700"
              >
                <PlusCircle size={14} />
                Add Food
              </Link>
            </div>
          </div>

          {/* Card C: Customer Sentiment & Payout Schedule */}
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  Sentiment &amp; Settlement
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${metrics.sentiment.badgeClass}`}
                >
                  {metrics.sentiment.label}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                  <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r={gaugeRadius}
                      fill="none"
                      strokeWidth="6"
                      className="stroke-zinc-100 dark:stroke-zinc-800"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r={gaugeRadius}
                      fill="none"
                      strokeWidth="6"
                      strokeLinecap="round"
                      stroke={metrics.sentiment.stroke}
                      strokeDasharray={gaugeCircumference}
                      strokeDashoffset={gaugeOffset}
                      className="transition-all duration-700"
                    />
                  </svg>
                  <span className="absolute text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                    {metrics.sentiment.percentage}%
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {metrics.sentiment.ratingCount > 0
                      ? `${metrics.sentiment.rating.toFixed(1)} average from ${metrics.sentiment.ratingCount} review${metrics.sentiment.ratingCount === 1 ? "" : "s"}`
                      : "Waiting on first reviews"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Keep preparation times accurate to maintain top placement.
                  </p>
                  <Link
                    href="/vendors/reviews"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
                  >
                    Read customer feedback
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Settlement Info Footer */}
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/50">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <CreditCard size={14} className="text-orange-600 dark:text-orange-400" />
                  <span>Auto-Payout · Daily 7:30 AM WAT</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-200/70 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  <Lock size={10} />
                  Bank Locked
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Next settlement balance:{" "}
                  <strong className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                    {formatNaira(liveWalletBalance)}
                  </strong>
                </span>
                <Link
                  href="/vendors/transactions"
                  className="shrink-0 text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
                >
                  History →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Store Live/Pause Confirmation Modal */}
      <StoreStatusModal
        open={statusModalOpen}
        targetLive={!isLive}
        isUpdating={isUpdatingLiveStatus}
        storeName={storeName}
        onClose={() => setStatusModalOpen(false)}
        onConfirm={handleConfirmLiveStatus}
      />
    </div>
  );
}

function PipelineTile({ href, icon: Icon, label, value, sub, highlight = "neutral" }) {
  const styles = {
    amber: {
      card: "border-amber-200 bg-amber-50/60 hover:border-amber-300 dark:border-amber-500/30 dark:bg-amber-500/10",
      icon: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
      value: "text-amber-900 dark:text-amber-200",
    },
    orange: {
      card: "border-orange-200 bg-orange-50/60 hover:border-orange-300 dark:border-orange-500/30 dark:bg-orange-500/10",
      icon: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
      value: "text-orange-900 dark:text-orange-200",
    },
    sky: {
      card: "border-sky-200 bg-sky-50/60 hover:border-sky-300 dark:border-sky-500/30 dark:bg-sky-500/10",
      icon: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
      value: "text-sky-900 dark:text-sky-200",
    },
    emerald: {
      card: "border-emerald-200 bg-emerald-50/60 hover:border-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-500/10",
      icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
      value: "text-emerald-900 dark:text-emerald-200",
    },
    neutral: {
      card: "border-zinc-200/90 bg-white hover:border-orange-300/80 hover:bg-orange-50/30 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-500/40",
      icon: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
      value: "text-zinc-900 dark:text-white",
    },
  }[highlight];

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3.5 rounded-2xl border p-4 shadow-sm transition ${styles.card}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          {label}
        </p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className={`text-xl font-bold tabular-nums ${styles.value}`}>
            {value}
          </span>
        </div>
        <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
          {sub}
        </p>
      </div>
    </Link>
  );
}
