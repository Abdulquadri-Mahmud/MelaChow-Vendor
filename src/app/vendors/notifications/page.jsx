"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { toast } from "react-hot-toast";
import {
  AlertTriangle,
  Bell,
  BellRing,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  ShoppingBag,
  Timer,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import { useNotificationManager } from "@/app/hooks/useNotificationManager";
import { useVendorProfile } from "@/app/context/VendorProfileContext";
import ClearNotificationsModal from "@/app/components/notifications/ClearNotificationsModal";
import { respondToRemakeRequest } from "@/app/lib/vendorApi";

const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "orders", label: "Orders" },
  { id: "system", label: "System" },
  { id: "read", label: "Read" },
];

function RemakeResponsePanel({ notification, onResponded }) {
  const WINDOW_MS = notification?.remakeWindow || 15 * 60 * 1000;
  const sentAt = notification?.createdAt
    ? new Date(notification.createdAt).getTime()
    : Date.now();
  const expiresAt = sentAt + WINDOW_MS;

  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  );
  const [decision, setDecision] = useState(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) clearInterval(intervalRef.current);
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [expiresAt]);

  const isExpired = secondsLeft === 0;
  const isDecided = Boolean(decision);
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");

  const handleDecision = async (choice) => {
    const vendorOrderId = notification?.orderDatabaseId || notification?.orderId;
    if (!vendorOrderId) {
      toast.error("Order reference missing. Please contact support.");
      return;
    }
    setLoading(true);
    try {
      const res = await respondToRemakeRequest(vendorOrderId, choice);
      setDecision(choice);
      toast.success(
        res?.message ||
          (choice === "yes"
            ? "Confirmed — start preparing the remake."
            : "Declined — admin has been notified.")
      );
      onResponded?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit response.");
    } finally {
      setLoading(false);
    }
  };

  if (isDecided) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
        <CheckCircle2 size={14} className="shrink-0" />
        <span>
          {decision === "yes"
            ? "Response sent — start preparing!"
            : "Declined — admin has been notified."}
        </span>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-100 px-3.5 py-2.5 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
        <Timer size={14} className="shrink-0" />
        <span>Response window expired — escalated to admin.</span>
      </div>
    );
  }

  return (
    <div
      className="mt-3 space-y-3 rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 dark:border-amber-500/30 dark:bg-amber-500/10"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
          <Timer size={14} />
          <span>Can you remake this order?</span>
        </div>
        <span
          className={`rounded-lg px-2.5 py-0.5 text-xs font-bold tabular-nums ${
            secondsLeft < 120
              ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
          }`}
        >
          {mins}:{secs}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => handleDecision("yes")}
          disabled={loading}
          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <CheckCircle2 size={14} />
          )}
          <span>Yes, Remake</span>
        </button>
        <button
          type="button"
          onClick={() => handleDecision("no")}
          disabled={loading}
          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:bg-zinc-900 dark:text-rose-300 dark:hover:bg-rose-500/15"
        >
          <XCircle size={14} />
          <span>No, Can&apos;t Remake</span>
        </button>
      </div>
    </div>
  );
}

export default function VendorNotificationsPage() {
  const { vendorProfile } = useVendorProfile();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const {
    notifications,
    loading,
    hasMore,
    loadMore,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    unreadCount,
    total,
    isPushEnabled,
    subscribe,
  } = useNotificationManager({
    restaurantId: vendorProfile?._id,
    role: "vendor",
  });

  const orderCount = useMemo(
    () =>
      notifications.filter(
        (n) =>
          n.type?.includes("order") ||
          n.type === "new_order" ||
          n.type === "vendor_new_order"
      ).length,
    [notifications]
  );

  const systemCount = notifications.length - orderCount;

  const filteredNotifications = useMemo(() => {
    let list = notifications;
    if (activeTab === "orders") {
      list = notifications.filter(
        (n) =>
          n.type?.includes("order") ||
          n.type === "new_order" ||
          n.type === "vendor_new_order"
      );
    } else if (activeTab === "system") {
      list = notifications.filter(
        (n) =>
          !n.type?.includes("order") &&
          n.type !== "new_order" &&
          n.type !== "vendor_new_order"
      );
    } else if (activeTab === "unread") {
      list = notifications.filter((n) => !n.read);
    } else if (activeTab === "read") {
      list = notifications.filter((n) => n.read);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.body?.toLowerCase().includes(q) ||
          n.customerName?.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (a.read === b.read) return 0;
      return a.read ? 1 : -1;
    });
  }, [notifications, activeTab, searchQuery]);

  const groupedNotifications = useMemo(() => {
    if (!filteredNotifications.length) return {};
    return filteredNotifications.reduce((groups, notification) => {
      const date = parseISO(notification.createdAt || "");
      if (Number.isNaN(date.getTime())) {
        (groups.Earlier ||= []).push(notification);
        return groups;
      }
      const key = isToday(date)
        ? "Today"
        : isYesterday(date)
          ? "Yesterday"
          : format(date, "MMMM d, yyyy");
      (groups[key] ||= []).push(notification);
      return groups;
    }, {});
  }, [filteredNotifications]);

  const getIconMeta = (type) => {
    switch (type) {
      case "order_placed":
      case "new_order":
      case "vendor_new_order":
        return {
          icon: ShoppingBag,
          cls: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
        };
      case "order_cancelled":
        return {
          icon: XCircle,
          cls: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
        };
      case "order_ready":
      case "order_completed":
        return {
          icon: CheckCircle2,
          cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
        };
      case "order_remake_request":
        return {
          icon: AlertTriangle,
          cls: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
        };
      default:
        return {
          icon: Bell,
          cls: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
        };
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) await markAsRead(notification._id);
    if (notification.url) {
      const sanitizedUrl = notification.url.replace(
        "/vendors/orders/",
        "/vendors/order/"
      );
      router.push(sanitizedUrl);
    } else if (notification.orderId) {
      router.push(
        `/vendors/order/${notification.orderDatabaseId || notification.orderId}`
      );
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      toast.success("Notification removed");
    } catch {
      toast.error("Failed to remove notification");
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] pb-10 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="space-y-5">
        {/* ── 1. HEADER CARD ── */}
        <section className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-40 dark:opacity-20"
              style={{
                background:
                  "radial-gradient(ellipse at top right, rgba(249,115,22,0.14), transparent 68%)",
              }}
            />

            <div className="relative space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-orange-600 px-2.5 py-0.5 text-xs font-bold tabular-nums text-white">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Real-time order alerts, remake requests, and store updates in
                one organized inbox.
              </p>
            </div>

            <div className="relative flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={refreshNotifications}
                disabled={loading}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-55 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>

              {notifications.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-45"
                  >
                    <CheckCircle2 size={15} />
                    <span>Mark All Read</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsClearModalOpen(true)}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25"
                  >
                    <Trash2 size={15} />
                    <span>Clear All</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── 2. STATS STRIP ── */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Total Messages",
              value: total || notifications.length,
              icon: Bell,
              cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
            },
            {
              label: "Unread",
              value: unreadCount,
              icon: Clock,
              cls: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
            },
            {
              label: "Order Alerts",
              value: orderCount,
              icon: ShoppingBag,
              cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
            },
            {
              label: "System Updates",
              value: systemCount,
              icon: CheckCircle2,
              cls: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3.5 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.cls}`}
              >
                <stat.icon size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-xl font-bold tabular-nums text-zinc-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* ── 3. PUSH OPT-IN BANNER ── */}
        {!isPushEnabled && (
          <div className="flex flex-col gap-4 rounded-2xl border border-orange-200 bg-orange-50/80 p-5 dark:border-orange-500/30 dark:bg-orange-500/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-sm">
                <BellRing size={20} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Enable instant push alerts
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                  Receive immediate notifications whenever a customer places an
                  order or sends a remake request.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={subscribe}
              className="inline-flex min-h-[42px] shrink-0 items-center justify-center rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-orange-600 dark:hover:bg-orange-500"
            >
              Enable Notifications
            </button>
          </div>
        )}

        {/* ── 4. FILTER & SEARCH BAR ── */}
        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-950">
            {FILTER_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                  activeTab === t.id
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-9 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </section>

        {/* ── 5. GROUPED INBOX LIST ── */}
        <div className="space-y-6">
          {loading && notifications.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 rounded-2xl border border-zinc-200/90 bg-white p-5 animate-pulse dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="h-11 w-11 shrink-0 rounded-xl bg-zinc-200/80 dark:bg-zinc-800" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-4 w-1/3 rounded bg-zinc-200/80 dark:bg-zinc-800" />
                    <div className="h-3.5 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800/70" />
                    <div className="h-3 w-1/4 rounded bg-zinc-100 dark:bg-zinc-800/70" />
                  </div>
                </div>
              ))}
            </div>
          ) : Object.keys(groupedNotifications).length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                <Bell size={22} />
              </div>
              <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-white">
                You&apos;re all caught up
              </h3>
              <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
                {searchQuery || activeTab !== "all"
                  ? "No notifications match this filter."
                  : "New order alerts and store updates will appear here."}
              </p>
              {(searchQuery || activeTab !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveTab("all");
                  }}
                  className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  Show All Messages
                </button>
              )}
            </div>
          ) : (
            Object.entries(groupedNotifications).map(([group, items]) => (
              <section key={group} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    <Calendar size={13} />
                    {group}
                  </span>
                  <div className="h-px flex-1 bg-zinc-200/80 dark:bg-zinc-800" />
                </div>

                <div className="space-y-2.5">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {items.map((notification) => {
                      const iconMeta = getIconMeta(notification.type);
                      const Icon = iconMeta.icon;
                      const createdDate = new Date(notification.createdAt);
                      const timeStr = Number.isNaN(createdDate.getTime())
                        ? "Earlier"
                        : format(createdDate, "h:mm a");

                      return (
                        <motion.div
                          key={notification._id}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          role="button"
                          tabIndex={0}
                          aria-label={notification.title || "Open notification"}
                          onClick={() => handleNotificationClick(notification)}
                          onKeyDown={(e) => {
                            if (
                              e.target === e.currentTarget &&
                              (e.key === "Enter" || e.key === " ")
                            ) {
                              e.preventDefault();
                              handleNotificationClick(notification);
                            }
                          }}
                          className={`group relative flex cursor-pointer items-start gap-3.5 overflow-hidden rounded-2xl border p-4 shadow-sm transition sm:p-5 ${
                            !notification.read
                              ? "border-orange-200 bg-white hover:border-orange-300 dark:border-orange-500/35 dark:bg-zinc-900"
                              : "border-zinc-200/80 bg-white/80 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/70"
                          }`}
                        >
                          {!notification.read && (
                            <span className="absolute inset-y-0 left-0 w-1 bg-orange-500" />
                          )}

                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconMeta.cls}`}
                          >
                            <Icon size={18} />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <h3
                                className={`text-sm font-bold leading-snug ${
                                  !notification.read
                                    ? "text-zinc-900 dark:text-white"
                                    : "text-zinc-600 dark:text-zinc-300"
                                }`}
                              >
                                {notification.title}
                              </h3>
                              <span className="shrink-0 rounded-lg bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                {timeStr}
                              </span>
                            </div>

                            {notification.body && (
                              <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                {notification.body}
                              </p>
                            )}

                            {(notification.customerName ||
                              notification.location) && (
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                {notification.customerName && (
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300">
                                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                                    {notification.customerName}
                                  </span>
                                )}
                                {notification.location && (
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300">
                                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                                    {notification.location}
                                  </span>
                                )}
                              </div>
                            )}

                            {notification.type === "order_remake_request" && (
                              <RemakeResponsePanel
                                notification={notification}
                                onResponded={() => markAsRead(notification._id)}
                              />
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, notification._id)}
                              aria-label="Delete notification"
                              title="Delete notification"
                              className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-400"
                            >
                              <Trash2 size={15} />
                            </button>
                            <ChevronRight
                              size={16}
                              className={`hidden sm:block ${
                                !notification.read
                                  ? "text-orange-500"
                                  : "text-zinc-300 dark:text-zinc-700"
                              }`}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </section>
            ))
          )}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {loading ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  "Load More Messages"
                )}
              </button>
            </div>
          )}
        </div>

        <ClearNotificationsModal
          isOpen={isClearModalOpen}
          onClose={() => setIsClearModalOpen(false)}
          onConfirm={clearAll}
          title="Empty Inbox?"
          message="Are you sure you want to clear all notification logs? This action is permanent."
        />
      </div>
    </div>
  );
}
