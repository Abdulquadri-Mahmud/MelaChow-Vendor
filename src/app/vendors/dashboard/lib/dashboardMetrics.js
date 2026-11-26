import {
  orderId,
  orderReceipt,
  queueGroup,
  scopedItems,
  statusLabel,
  statusOf,
} from "@/app/lib/orderReceipt.mjs";

export const TIMEFRAMES = [
  { id: "7d", label: "7D", longLabel: "Last 7 days", days: 7, granularity: "day" },
  { id: "30d", label: "30D", longLabel: "Last 30 days", days: 30, granularity: "day" },
  { id: "90d", label: "90D", longLabel: "Last 90 days", days: 90, granularity: "week" },
];

const COMPLETED_STATUSES = new Set(["completed", "delivered"]);
const CANCELLED_STATUSES = new Set(["cancelled", "failed", "refunded"]);

export function formatNaira(value, { compact = false } = {}) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "₦0";
  if (compact) {
    if (Math.abs(num) >= 1_000_000) return `₦${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (Math.abs(num) >= 1_000) return `₦${(num / 1_000).toFixed(num >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`;
    return `₦${Math.round(num)}`;
  }
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatRelativeTime(dateInput) {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

function toLocalDayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getOrderVendorRevenue(order) {
  if (!order) return 0;
  if (order.vendorTotal != null && Number.isFinite(Number(order.vendorTotal))) {
    return Number(order.vendorTotal);
  }
  const receipt = orderReceipt(order);
  return Number(receipt.vendorPayout ?? receipt.itemsSubtotal ?? 0) || 0;
}

function computePercentDelta(current, previous) {
  if (previous <= 0) {
    return current > 0 ? { value: null, direction: "new", label: "New activity" } : { value: 0, direction: "flat", label: "No change" };
  }
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct * 10) / 10;
  return {
    value: rounded,
    direction: rounded > 0 ? "up" : rounded < 0 ? "down" : "flat",
    label: `${rounded > 0 ? "+" : ""}${rounded}%`,
  };
}

function getStatusPresentation(status) {
  switch (status) {
    case "pending":
      return {
        label: statusLabel(status),
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
        barClass: "bg-amber-500",
        dotClass: "bg-amber-500",
        progress: 15,
      };
    case "accepted":
      return {
        label: statusLabel(status),
        badgeClass: "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
        barClass: "bg-orange-500",
        dotClass: "bg-orange-500",
        progress: 35,
      };
    case "preparing":
      return {
        label: statusLabel(status),
        badgeClass: "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
        barClass: "bg-orange-500",
        dotClass: "bg-orange-500",
        progress: 60,
      };
    case "ready_for_pickup":
    case "rider_assigned":
      return {
        label: statusLabel(status),
        badgeClass: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
        barClass: "bg-sky-500",
        dotClass: "bg-sky-500",
        progress: 80,
      };
    case "out_for_delivery":
      return {
        label: statusLabel(status),
        badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30",
        barClass: "bg-indigo-500",
        dotClass: "bg-indigo-500",
        progress: 90,
      };
    case "completed":
    case "delivered":
      return {
        label: statusLabel(status),
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
        barClass: "bg-emerald-500",
        dotClass: "bg-emerald-500",
        progress: 100,
      };
    case "cancelled":
    case "failed":
    case "refunded":
      return {
        label: statusLabel(status),
        badgeClass: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
        barClass: "bg-rose-500",
        dotClass: "bg-rose-500",
        progress: 0,
      };
    default:
      return {
        label: statusLabel(status),
        badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
        barClass: "bg-zinc-400",
        dotClass: "bg-zinc-400",
        progress: 25,
      };
  }
}

export function buildMenuHealth(foodsResponse, legacyMenu = []) {
  const stats = foodsResponse?.stats;
  const rawItems = Array.isArray(foodsResponse?.items)
    ? foodsResponse.items
    : Array.isArray(legacyMenu)
      ? legacyMenu
      : [];

  const nonArchived = rawItems.filter((item) => !item?.is_archived);
  const archivedCount = stats?.archived ?? rawItems.filter((item) => !!item?.is_archived).length;
  const availableCount =
    stats?.available ??
    nonArchived.filter((item) => item?.is_available !== false && item?.is_in_stock !== false).length;
  const hiddenCount =
    stats?.hidden ??
    nonArchived.filter((item) => item?.is_available === false || item?.is_in_stock === false).length;
  const totalActiveMenu = stats?.active ?? (availableCount + hiddenCount || nonArchived.length);
  const unpricedCount = nonArchived.filter(
    (item) => item?.portions && typeof item.portions.count === "number" && item.portions.count === 0
  ).length;

  return {
    total: totalActiveMenu,
    available: availableCount,
    unavailable: hiddenCount,
    archived: archivedCount,
    unpriced: unpricedCount,
    items: rawItems,
  };
}

export function buildDashboardMetrics({
  orders = [],
  vendorData = null,
  foodsResponse = null,
  legacyMenu = [],
  timeframeId = "7d",
}) {
  const tf = TIMEFRAMES.find((t) => t.id === timeframeId) || TIMEFRAMES[0];
  const now = new Date();
  const todayStart = startOfDay(now);
  const periodStart = new Date(todayStart);
  periodStart.setDate(periodStart.getDate() - (tf.days - 1));

  const prevPeriodStart = new Date(periodStart);
  prevPeriodStart.setDate(prevPeriodStart.getDate() - tf.days);

  const safeOrders = Array.isArray(orders) ? orders : [];
  const menuHealth = buildMenuHealth(foodsResponse, legacyMenu);

  // Lookup map for menu item images & names
  const foodById = new Map();
  for (const food of menuHealth.items) {
    const id = String(food?._id || food?.id || "");
    if (id) foodById.set(id, food);
  }

  // Pipeline counts
  let incoming = 0;
  let preparing = 0;
  let ready = 0;
  let completedToday = 0;
  let todayRevenue = 0;

  let allTimeCompletedOrders = 0;
  let allTimeRevenue = 0;
  let allTimeCancelledOrders = 0;

  let periodRevenue = 0;
  let periodOrders = 0;
  let periodCancelled = 0;
  let prevPeriodRevenue = 0;
  let prevPeriodOrders = 0;

  const completedOrders = [];

  for (const order of safeOrders) {
    const st = statusOf(order);
    const group = queueGroup(order);
    const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
    const validDate = createdAt && !Number.isNaN(createdAt.getTime());
    const revenue = getOrderVendorRevenue(order);

    if (group === "incoming") incoming += 1;
    else if (group === "preparing") preparing += 1;
    else if (group === "ready" || st === "out_for_delivery") ready += 1;

    if (COMPLETED_STATUSES.has(st)) {
      completedOrders.push(order);
      allTimeCompletedOrders += 1;
      allTimeRevenue += revenue;

      if (validDate) {
        if (createdAt >= todayStart) {
          completedToday += 1;
          todayRevenue += revenue;
        }
        if (createdAt >= periodStart) {
          periodRevenue += revenue;
          periodOrders += 1;
        } else if (createdAt >= prevPeriodStart && createdAt < periodStart) {
          prevPeriodRevenue += revenue;
          prevPeriodOrders += 1;
        }
      }
    } else if (CANCELLED_STATUSES.has(st)) {
      allTimeCancelledOrders += 1;
      if (validDate && createdAt >= periodStart) {
        periodCancelled += 1;
      }
    }
  }

  // Build chart buckets
  const chartBuckets = [];
  if (tf.granularity === "day") {
    const bucketMap = new Map();
    for (let i = 0; i < tf.days; i++) {
      const d = new Date(periodStart);
      d.setDate(periodStart.getDate() + i);
      const key = toLocalDayKey(d);
      const bucket = {
        key,
        label:
          tf.days <= 7
            ? d.toLocaleDateString("en-NG", { weekday: "short" })
            : d.toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
        fullDate: d.toLocaleDateString("en-NG", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        revenue: 0,
        orders: 0,
      };
      chartBuckets.push(bucket);
      bucketMap.set(key, bucket);
    }

    for (const order of completedOrders) {
      if (!order.createdAt) continue;
      const d = new Date(order.createdAt);
      if (Number.isNaN(d.getTime()) || d < periodStart) continue;
      const bucket = bucketMap.get(toLocalDayKey(d));
      if (bucket) {
        bucket.revenue += getOrderVendorRevenue(order);
        bucket.orders += 1;
      }
    }
  } else {
    // 90D grouped into ~13 weekly buckets
    const weekCount = Math.ceil(tf.days / 7);
    for (let w = 0; w < weekCount; w++) {
      const wStart = new Date(periodStart);
      wStart.setDate(periodStart.getDate() + w * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 6);
      wEnd.setHours(23, 59, 59, 999);
      chartBuckets.push({
        key: `w-${w}`,
        startMs: wStart.getTime(),
        endMs: wEnd.getTime(),
        label: wStart.toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
        fullDate: `${wStart.toLocaleDateString("en-NG", { month: "short", day: "numeric" })} – ${wEnd.toLocaleDateString("en-NG", { month: "short", day: "numeric" })}`,
        revenue: 0,
        orders: 0,
      });
    }
    for (const order of completedOrders) {
      if (!order.createdAt) continue;
      const ms = new Date(order.createdAt).getTime();
      if (Number.isNaN(ms) || ms < periodStart.getTime()) continue;
      const bucket = chartBuckets.find((b) => ms >= b.startMs && ms <= b.endMs);
      if (bucket) {
        bucket.revenue += getOrderVendorRevenue(order);
        bucket.orders += 1;
      }
    }
  }

  const bestBucket = chartBuckets.reduce(
    (best, curr) => (curr.revenue > (best?.revenue || 0) ? curr : best),
    null
  );

  // Top selling items across completed orders (prefer period orders if any, else all-time)
  const itemSourceOrders = periodOrders > 0
    ? completedOrders.filter((o) => o.createdAt && new Date(o.createdAt) >= periodStart)
    : completedOrders;
  const itemStatsMap = new Map();

  for (const order of itemSourceOrders) {
    const items = scopedItems(order);
    for (const rawItem of items) {
      if (!rawItem) continue;
      const rawId =
        typeof rawItem.foodId === "object"
          ? String(rawItem.foodId?._id || rawItem.foodId?.id || "")
          : String(rawItem.foodId || rawItem.menuItemId || rawItem._id || "");
      const name =
        rawItem.name ||
        (typeof rawItem.foodId === "object" ? rawItem.foodId?.name : null) ||
        foodById.get(rawId)?.name ||
        "Menu item";
      const key = rawId || name.toLowerCase();
      const qty = Math.max(1, Number(rawItem.quantity) || 1);
      const lineRevenue =
        Number(rawItem.vendorEarning) ||
        Number(rawItem.metadata?.pricing?.final_unit_naira) * qty ||
        Number(rawItem.price) * qty ||
        0;

      const existing = itemStatsMap.get(key) || {
        id: rawId || key,
        name,
        sold: 0,
        revenue: 0,
        image:
          foodById.get(rawId)?.image_url ||
          foodById.get(rawId)?.image ||
          rawItem.image_url ||
          rawItem.image ||
          "",
      };
      existing.sold += qty;
      existing.revenue += Number.isFinite(lineRevenue) ? lineRevenue : 0;
      itemStatsMap.set(key, existing);
    }
  }

  const sortedItems = [...itemStatsMap.values()].sort(
    (a, b) => b.sold - a.sold || b.revenue - a.revenue
  );
  const maxSold = sortedItems[0]?.sold || 1;
  const topItems = sortedItems.slice(0, 5).map((item) => ({
    ...item,
    sharePct: Math.max(8, Math.round((item.sold / maxSold) * 100)),
  }));

  // Recent orders mapped cleanly via orderReceipt
  const recentOrders = [...safeOrders]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 12)
    .map((order) => {
      const receipt = orderReceipt(order);
      const st = statusOf(order);
      const group = queueGroup(order);
      const pres = getStatusPresentation(st);
      const totalUnits = receipt.items.reduce((sum, it) => sum + (it.packs || 1), 0);
      const firstItemName = receipt.items[0]?.name;
      const itemsSummary = firstItemName
        ? `${firstItemName}${receipt.items.length > 1 ? ` +${receipt.items.length - 1} more` : ""}`
        : `${totalUnits || order.items?.length || 0} item${totalUnits === 1 ? "" : "s"}`;

      return {
        id: receipt.id || orderId(order),
        code: receipt.code,
        customer: receipt.customer,
        itemsSummary,
        itemCount: totalUnits || receipt.items.length,
        payout: getOrderVendorRevenue(order),
        status: st,
        group,
        isActive: group !== "history" || st === "out_for_delivery",
        isCompleted: COMPLETED_STATUSES.has(st),
        relativeTime: formatRelativeTime(order.createdAt),
        exactTime: order.createdAt
          ? new Date(order.createdAt).toLocaleTimeString("en-NG", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
        ...pres,
      };
    });

  // Fulfillment rate
  const finalizedCount = periodOrders + periodCancelled;
  const allTimeFinalized = allTimeCompletedOrders + allTimeCancelledOrders;
  const fulfillmentRate =
    finalizedCount > 0
      ? Math.round((periodOrders / finalizedCount) * 100)
      : allTimeFinalized > 0
        ? Math.round((allTimeCompletedOrders / allTimeFinalized) * 100)
        : null;

  // Rating & sentiment
  const rating = Number(vendorData?.rating || 0);
  const ratingCount = Number(vendorData?.ratingCount || 0);
  const sentimentPct = rating > 0 ? Math.round((rating / 5) * 100) : 0;

  let sentimentLabel = "No Reviews Yet";
  let sentimentStroke = "#a1a1aa";
  let sentimentBadgeClass = "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  if (sentimentPct >= 90) {
    sentimentLabel = "Exceptional";
    sentimentStroke = "#10b981";
    sentimentBadgeClass = "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  } else if (sentimentPct >= 75) {
    sentimentLabel = "Positive";
    sentimentStroke = "#f97316";
    sentimentBadgeClass = "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300";
  } else if (sentimentPct >= 60) {
    sentimentLabel = "Good";
    sentimentStroke = "#0ea5e9";
    sentimentBadgeClass = "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300";
  } else if (sentimentPct >= 40) {
    sentimentLabel = "Mixed";
    sentimentStroke = "#f59e0b";
    sentimentBadgeClass = "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
  } else if (sentimentPct > 0) {
    sentimentLabel = "Needs Attention";
    sentimentStroke = "#f43f5e";
    sentimentBadgeClass = "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
  }

  return {
    timeframe: tf,
    pipeline: {
      incoming,
      preparing,
      ready,
      activeTotal: incoming + preparing + ready,
      completedToday,
      todayRevenue,
    },
    kpis: {
      periodRevenue,
      revenueDelta: computePercentDelta(periodRevenue, prevPeriodRevenue),
      allTimeRevenue,
      periodOrders,
      ordersDelta: computePercentDelta(periodOrders, prevPeriodOrders),
      allTimeCompletedOrders,
      avgOrderValue: periodOrders > 0 ? periodRevenue / periodOrders : allTimeCompletedOrders > 0 ? allTimeRevenue / allTimeCompletedOrders : 0,
      fulfillmentRate,
      rating,
      ratingCount,
      isVerified: Boolean(vendorData?.verified),
    },
    chartData: chartBuckets,
    chartSummary: {
      totalRevenue: periodRevenue,
      totalOrders: periodOrders,
      dailyAvg: tf.days > 0 ? periodRevenue / tf.days : 0,
      bestBucket,
    },
    topItems,
    topItemsScope: periodOrders > 0 ? tf.longLabel : "All time",
    recentOrders,
    menuHealth,
    sentiment: {
      percentage: sentimentPct,
      label: sentimentLabel,
      stroke: sentimentStroke,
      badgeClass: sentimentBadgeClass,
      rating,
      ratingCount,
    },
  };
}
