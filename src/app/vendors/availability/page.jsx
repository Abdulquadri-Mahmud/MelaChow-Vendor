"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Copy,
  Flame,
  Info,
  Loader2,
  PauseCircle,
  PlayCircle,
  Power,
  RefreshCw,
  Save,
  ShieldAlert,
  SlidersHorizontal,
  Timer,
  XCircle,
} from "lucide-react";

import { useVendorStorage } from "@/app/hooks/vendorStorage";
import { setVendorLiveStatus, updateVendorAvailability } from "@/app/lib/vendorApi";
import { updateVendor, updateVendorTodayHours } from "@/app/lib/vendorProfileApi";
import {
  evaluateVendorAvailability,
  formatTimeInLagos,
} from "@/app/lib/vendor-time/vendorTime";

const WEEK_DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const EXTRA_PREP_PRESETS = [10, 15, 20, 30, 45];
const BUSY_DURATION_PRESETS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "Until off", minutes: null },
];
const PAUSE_PRESETS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "Manual", minutes: null },
];

function getLagosTodayKey() {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  try {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Lagos",
      weekday: "long",
    })
      .format(new Date())
      .toLowerCase();
    return days.includes(weekday) ? weekday : days[new Date().getDay()];
  } catch {
    return days[new Date().getDay()];
  }
}

function formatCountdown(isoTarget, nowMs) {
  if (!isoTarget) return null;
  const targetMs = new Date(isoTarget).getTime();
  if (Number.isNaN(targetMs)) return null;
  const diffSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  if (diffSec === 0) return "Expiring now";
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  if (hrs > 0) return `${hrs}h ${mins}m remaining`;
  if (mins > 0) return `${mins}m ${String(secs).padStart(2, "0")}s remaining`;
  return `${secs}s remaining`;
}

function getEndOfTodayIso() {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
}

function getTomorrowMorningIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function VendorAvailabilityPage() {
  const { vendorDetails, updateVendor: updateCachedVendor, refetchVendorProfile } = useVendorStorage();
  const vendor = vendorDetails?.vendor || null;
  const openingHours = vendor?.openingHours || {};
  const availability = openingHours?.availability || {};
  const todayKey = useMemo(() => getLagosTodayKey(), []);

  // Live clock tick every second for crisp countdowns
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Prep time & Busy mode local controls
  const [basePrepTime, setBasePrepTime] = useState(25);
  const [busyExtraMinutes, setBusyExtraMinutes] = useState(15);
  const [busyDurationMin, setBusyDurationMin] = useState(60);
  const [busyReason, setBusyReason] = useState("");

  // Pause & Temporary closure local controls
  const [pauseReason, setPauseReason] = useState("");
  const [closureReason, setClosureReason] = useState("");
  const [customReopenAt, setCustomReopenAt] = useState("");

  // Today's quick override & Weekly schedule
  const [todayOpen, setTodayOpen] = useState("09:00");
  const [todayClose, setTodayClose] = useState("21:00");
  const [todayClosed, setTodayClosed] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState({});

  const [savingKey, setSavingKey] = useState(null);

  useEffect(() => {
    if (!vendor) return;
    const avail = vendor.openingHours?.availability || {};
    setBasePrepTime(Number(avail.basePrepTimeMinutes) || 25);
    setBusyExtraMinutes(Number(avail.busyMode?.extraPrepMinutes) || 15);
    setBusyReason(avail.busyMode?.reason || "");
    setPauseReason(avail.orderPause?.reason || "");
    setClosureReason(avail.temporaryClosure?.reason || "");
    if (avail.temporaryClosure?.until) {
      setCustomReopenAt(toDatetimeLocalValue(avail.temporaryClosure.until));
    }

    const hrs = vendor.openingHours || {};
    const t = hrs[todayKey] || {};
    setTodayOpen(t.open || "09:00");
    setTodayClose(t.close || "21:00");
    setTodayClosed(Boolean(t.closed));

    const nextWeek = {};
    for (const { key } of WEEK_DAYS) {
      nextWeek[key] = {
        open: hrs[key]?.open || "09:00",
        close: hrs[key]?.close || "21:00",
        closed: Boolean(hrs[key]?.closed),
      };
    }
    setWeeklySchedule(nextWeek);
  }, [vendor, todayKey]);

  const liveStatus = useMemo(
    () => evaluateVendorAvailability(openingHours, new Date(nowMs)),
    [openingHours, nowMs]
  );

  const isLive = Boolean(vendor?.isLive);
  const adminOverrideStatus = openingHours?.adminOverride?.status || "schedule";
  const hasAdminOverride = adminOverrideStatus === "open" || adminOverrideStatus === "closed";

  const saveAvailabilityPatch = async (patch, key, successMsg) => {
    try {
      setSavingKey(key);
      const res = await updateVendorAvailability(patch, openingHours);
      if (res?.data) {
        updateCachedVendor(res.data);
      } else {
        await refetchVendorProfile();
      }
      toast.success(successMsg || "Availability settings saved");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update availability settings");
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggleAutoSchedule = () => {
    const next = !liveStatus.autoScheduleEnabled;
    saveAvailabilityPatch(
      { autoScheduleEnabled: next },
      "autoSchedule",
      next
        ? "Automatic schedule closure enabled"
        : "Automatic schedule disabled — store stays open unless paused or closed"
    );
  };

  const handleSavePrepTime = () => {
    const clamped = Math.min(180, Math.max(5, Number(basePrepTime) || 25));
    setBasePrepTime(clamped);
    saveAvailabilityPatch(
      { basePrepTimeMinutes: clamped },
      "prepTime",
      `Base preparation time updated to ${clamped} min`
    );
  };

  const handleEnableBusyMode = () => {
    const until = busyDurationMin
      ? new Date(Date.now() + busyDurationMin * 60000).toISOString()
      : null;
    saveAvailabilityPatch(
      {
        busyMode: {
          active: true,
          extraPrepMinutes: busyExtraMinutes,
          until,
          reason: busyReason.trim(),
        },
      },
      "busyMode",
      `Busy mode active (+${busyExtraMinutes} min prep time)`
    );
  };

  const handleDisableBusyMode = () => {
    saveAvailabilityPatch(
      { busyMode: { active: false, extraPrepMinutes: busyExtraMinutes, until: null, reason: "" } },
      "busyMode",
      "Busy mode turned off — standard prep time restored"
    );
  };

  const handlePauseOrders = (minutes) => {
    const until = minutes ? new Date(Date.now() + minutes * 60000).toISOString() : null;
    saveAvailabilityPatch(
      {
        orderPause: {
          active: true,
          until,
          reason: pauseReason.trim(),
        },
      },
      "orderPause",
      minutes
        ? `Incoming orders paused for ${minutes} minutes`
        : "Incoming orders paused until you resume"
    );
  };

  const handleResumeOrders = () => {
    saveAvailabilityPatch(
      { orderPause: { active: false, until: null, reason: "" } },
      "orderPause",
      "Incoming orders resumed"
    );
  };

  const handleTemporaryClosure = (untilIso, label) => {
    saveAvailabilityPatch(
      {
        temporaryClosure: {
          active: true,
          until: untilIso,
          reason: closureReason.trim(),
        },
      },
      "tempClosure",
      `Store temporarily closed (${label})`
    );
  };

  const handleReopenFromClosure = () => {
    saveAvailabilityPatch(
      { temporaryClosure: { active: false, until: null, reason: "" } },
      "tempClosure",
      "Temporary closure cleared — store reopened"
    );
  };

  const handleSaveTodayHours = async (overrideClosed) => {
    try {
      setSavingKey("todayHours");
      const closedVal = typeof overrideClosed === "boolean" ? overrideClosed : todayClosed;
      const res = await updateVendorTodayHours({
        open: todayOpen,
        close: todayClose,
        closed: closedVal,
      });
      if (res?.data) updateCachedVendor(res.data);
      setTodayClosed(closedVal);
      toast.success(res?.message || "Today's operating hours updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update today's hours");
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveWeeklySchedule = async () => {
    try {
      setSavingKey("weeklySchedule");
      const res = await updateVendor({
        data: {
          openingHours: {
            ...openingHours,
            ...weeklySchedule,
          },
        },
      });
      if (res?.data) updateCachedVendor(res.data);
      else await refetchVendorProfile();
      toast.success("Weekly operating schedule saved");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save weekly schedule");
    } finally {
      setSavingKey(null);
    }
  };

  const handleCopyMondayToWeekdays = () => {
    const mon = weeklySchedule.monday || { open: "09:00", close: "21:00", closed: false };
    setWeeklySchedule((prev) => ({
      ...prev,
      tuesday: { ...mon },
      wednesday: { ...mon },
      thursday: { ...mon },
      friday: { ...mon },
    }));
    toast.success("Copied Monday hours to Tue–Fri (click Save to apply)");
  };

  const handleToggleStoreLive = async () => {
    try {
      setSavingKey("liveToggle");
      const next = !isLive;
      const res = await setVendorLiveStatus(next);
      if (res?.data) updateCachedVendor(res.data);
      else await refetchVendorProfile();
      toast.success(next ? "Storefront published live" : "Storefront unpublished");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not toggle live publication");
    } finally {
      setSavingKey(null);
    }
  };

  const statusMeta = (() => {
    if (!isLive) {
      return {
        label: "Storefront Offline (Unpublished)",
        badge: "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        dot: "bg-zinc-400",
      };
    }
    switch (liveStatus.state) {
      case "admin_closed":
        return {
          label: "Closed by Admin Override",
          badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300",
          dot: "bg-rose-500",
        };
      case "admin_open":
        return {
          label: "Open by Admin Override",
          badge: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300",
          dot: "bg-indigo-500",
        };
      case "temporarily_closed":
        return {
          label: "Temporarily Closed",
          badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300",
          dot: "bg-rose-500",
        };
      case "orders_paused":
        return {
          label: "Incoming Orders Paused",
          badge: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
          dot: "bg-amber-500",
        };
      case "busy":
        return {
          label: `Open · Busy Mode (~${liveStatus.estimatedPrepMinutes}m prep)`,
          badge: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300",
          dot: "bg-orange-500 animate-pulse",
        };
      case "open":
        return {
          label: "Open & Accepting Orders",
          badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
          dot: "bg-emerald-500 animate-pulse",
        };
      default:
        return {
          label: "Closed by Operating Schedule",
          badge: "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
          dot: "bg-zinc-400",
        };
    }
  })();

  const lagosTimeDisplay = new Date(nowMs).toLocaleTimeString("en-NG", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const busyCountdown = liveStatus.isBusy ? formatCountdown(liveStatus.busyUntil, nowMs) : null;
  const pauseCountdown =
    liveStatus.state === "orders_paused" ? formatCountdown(liveStatus.resumeAt, nowMs) : null;
  const closureCountdown =
    liveStatus.state === "temporarily_closed" ? formatCountdown(liveStatus.reopenAt, nowMs) : null;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-12">
      {/* Live Status Command Header */}
      <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                <SlidersHorizontal size={14} />
                Availability Automation
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-xs font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
                Lagos (WAT): {lagosTimeDisplay}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-white">
              Store Availability & Kitchen Controls
            </h1>
            <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              Prevent missed or late orders with timed pauses, busy-mode prep buffers, temporary closures, and automatic operating-hour enforcement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold ${statusMeta.badge}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${statusMeta.dot}`} />
              {statusMeta.label}
            </span>

            <button
              type="button"
              onClick={handleToggleStoreLive}
              disabled={savingKey === "liveToggle"}
              className={`inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                isLive
                  ? "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {savingKey === "liveToggle" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Power size={15} />
              )}
              {isLive ? "Unpublish Store" : "Go Live"}
            </button>
          </div>
        </div>

        {/* Customer-facing live preview strip */}
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-start gap-3">
            <Info size={17} className="mt-0.5 shrink-0 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                What Customers See Right Now
              </p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-white">
                {isLive ? liveStatus.message : "Store is currently unpublished and hidden from customer search."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-zinc-600 tabular-nums dark:text-zinc-300">
            <Timer size={15} className="text-orange-500" />
            Est. Prep: ~{liveStatus.estimatedPrepMinutes} min
          </div>
        </div>

        {/* Admin Override Banner (Priority #1) */}
        {hasAdminOverride && (
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-indigo-200 bg-indigo-50/90 p-4 text-sm text-indigo-950 sm:flex-row sm:items-center sm:justify-between dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
            <div className="flex items-start gap-3">
              <ShieldAlert size={18} className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <div>
                <p className="font-semibold">
                  MelaChow Admin Override Active: Store Forced{" "}
                  {adminOverrideStatus === "open" ? "Open" : "Closed"}
                </p>
                <p className="mt-0.5 text-xs opacity-90">
                  Admin overrides take priority over your schedule, pauses, and closures.
                  {openingHours?.adminOverride?.changedAt
                    ? ` Updated ${formatTimeInLagos(openingHours.adminOverride.changedAt)}.`
                    : ""}{" "}
                  Contact MelaChow Support if you need normal scheduling restored.
                </p>
              </div>
            </div>
            <Link
              href="/vendors/faqs"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Contact Support
            </Link>
          </div>
        )}
      </section>

      {/* Main 2-Column Automation Controls Grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1. Busy Mode & Estimated Preparation Time Adjustment */}
        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                  <Flame size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                    Busy Mode & Prep Time ETA
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Keep accepting orders during rushes with extra prep buffer
                  </p>
                </div>
              </div>
              {liveStatus.isBusy && (
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-500/20 dark:text-orange-300">
                  Active{busyCountdown ? ` · ${busyCountdown}` : ""}
                </span>
              )}
            </div>

            {/* Base Prep Time Adjustment */}
            <div className="mt-5 rounded-xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="base-prep-range"
                  className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Standard Preparation Time
                </label>
                <span className="text-sm font-bold text-orange-600 tabular-nums dark:text-orange-400">
                  {basePrepTime} min
                </span>
              </div>
              <input
                id="base-prep-range"
                type="range"
                min={5}
                max={90}
                step={5}
                value={basePrepTime}
                onChange={(e) => setBasePrepTime(Number(e.target.value))}
                className="mt-3 w-full accent-orange-600"
              />
              <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
                <span>5 min (fast)</span>
                <span>30 min (typical)</span>
                <span>90 min</span>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePrepTime}
                  disabled={savingKey === "prepTime"}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  {savingKey === "prepTime" ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Save size={13} />
                  )}
                  Save Base Prep Time
                </button>
              </div>
            </div>

            {/* Busy Mode Buffer + Duration */}
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Extra Prep Buffer When Busy
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EXTRA_PREP_PRESETS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setBusyExtraMinutes(mins)}
                      className={`min-h-[38px] rounded-xl border px-3.5 py-2 text-xs font-semibold tabular-nums transition ${
                        busyExtraMinutes === mins
                          ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      +{mins} min
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Auto-Turn Off Busy Mode After
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {BUSY_DURATION_PRESETS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setBusyDurationMin(opt.minutes)}
                      className={`min-h-[38px] rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                        busyDurationMin === opt.minutes
                          ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                Effective customer ETA while busy:{" "}
                <strong className="text-zinc-900 dark:text-white">
                  ~{basePrepTime + busyExtraMinutes} minutes
                </strong>
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleEnableBusyMode}
              disabled={savingKey === "busyMode"}
              className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
            >
              {savingKey === "busyMode" ? <Loader2 size={15} className="animate-spin" /> : <Flame size={15} />}
              {liveStatus.isBusy ? "Update Busy Mode" : "Activate Busy Mode"}
            </button>
            {liveStatus.isBusy && (
              <button
                type="button"
                onClick={handleDisableBusyMode}
                disabled={savingKey === "busyMode"}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                Turn Off
              </button>
            )}
          </div>
        </div>

        {/* 2. Pause Incoming Orders (Timed Auto-Resume) */}
        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                  <PauseCircle size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                    Pause Incoming Orders
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Temporarily hold new checkouts while your kitchen catches up
                  </p>
                </div>
              </div>
              {liveStatus.state === "orders_paused" && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                  Paused
                </span>
              )}
            </div>

            {liveStatus.state === "orders_paused" && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  New orders are currently paused
                </p>
                <p className="mt-1 text-xs text-amber-800/90 tabular-nums dark:text-amber-300">
                  {liveStatus.resumeAt
                    ? `Auto-resumes at ${formatTimeInLagos(liveStatus.resumeAt)} (${pauseCountdown})`
                    : "Will remain paused until you manually click Resume."}
                </p>
              </div>
            )}

            <div className="mt-5">
              <label
                htmlFor="pause-reason"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Optional Note (Internal / Customer Info)
              </label>
              <input
                id="pause-reason"
                type="text"
                maxLength={120}
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="e.g., High dine-in rush, catching up on orders"
                className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                One-Tap Timed Pause
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {PAUSE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={savingKey === "orderPause"}
                    onClick={() => handlePauseOrders(preset.minutes)}
                    className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            {liveStatus.state === "orders_paused" ? (
              <button
                type="button"
                onClick={handleResumeOrders}
                disabled={savingKey === "orderPause"}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingKey === "orderPause" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <PlayCircle size={16} />
                )}
                Resume Incoming Orders Now
              </button>
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tip: Pausing keeps your store visible while preventing new orders you can&apos;t fulfill on time — protecting your acceptance rate and rating.
              </p>
            )}
          </div>
        </div>

        {/* 3. Temporary Closure (Auto-Reopening) */}
        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                  <XCircle size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                    Temporary Closure
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Close for emergencies, restocking, or holidays with automatic reopening
                  </p>
                </div>
              </div>
              {liveStatus.state === "temporarily_closed" && (
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                  Closed
                </span>
              )}
            </div>

            {liveStatus.state === "temporarily_closed" && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
                <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                  Store is temporarily closed
                </p>
                <p className="mt-1 text-xs text-rose-800/90 tabular-nums dark:text-rose-300">
                  {liveStatus.reopenAt
                    ? `Scheduled to reopen ${formatTimeInLagos(liveStatus.reopenAt)} (${closureCountdown})`
                    : "Closed until manually reopened."}
                </p>
                {liveStatus.closureReason && (
                  <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                    Reason: {liveStatus.closureReason}
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="closure-reason"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Closure Reason (Shown to Customers)
                </label>
                <input
                  id="closure-reason"
                  type="text"
                  maxLength={140}
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  placeholder="e.g., Restocking fresh ingredients / Power maintenance"
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={savingKey === "tempClosure"}
                  onClick={() =>
                    handleTemporaryClosure(
                      new Date(Date.now() + 2 * 3600000).toISOString(),
                      "2 hours"
                    )
                  }
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                >
                  Close 2 Hours
                </button>
                <button
                  type="button"
                  disabled={savingKey === "tempClosure"}
                  onClick={() => handleTemporaryClosure(getEndOfTodayIso(), "rest of today")}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                >
                  Rest of Today
                </button>
                <button
                  type="button"
                  disabled={savingKey === "tempClosure"}
                  onClick={() => handleTemporaryClosure(getTomorrowMorningIso(), "until tomorrow 9 AM")}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                >
                  Until Tomorrow 9 AM
                </button>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="flex-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Custom Reopen Date & Time
                  <input
                    type="datetime-local"
                    value={customReopenAt}
                    onChange={(e) => setCustomReopenAt(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </label>
                <button
                  type="button"
                  disabled={savingKey === "tempClosure" || !customReopenAt}
                  onClick={() => {
                    const parsed = new Date(customReopenAt);
                    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
                      return toast.error("Please select a future reopen date and time");
                    }
                    handleTemporaryClosure(parsed.toISOString(), "custom schedule");
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                >
                  Set Custom Closure
                </button>
              </div>
            </div>
          </div>

          {liveStatus.state === "temporarily_closed" && (
            <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleReopenFromClosure}
                disabled={savingKey === "tempClosure"}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingKey === "tempClosure" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                Reopen Store Early
              </button>
            </div>
          )}
        </div>

        {/* 4. Automatic Closure Based on Operating Hours & Today's Override */}
        <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <CalendarClock size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                    Automatic Hours & Today&apos;s Override
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Automatically open and close checkout based on your Lagos schedule
                  </p>
                </div>
              </div>
            </div>

            {/* Auto-schedule toggle card */}
            <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Automatic Closure by Operating Hours
                </p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {liveStatus.autoScheduleEnabled
                    ? "Enabled — orders are automatically blocked outside your scheduled hours."
                    : "Disabled — store accepts orders 24/7 unless paused or closed manually."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={liveStatus.autoScheduleEnabled}
                disabled={savingKey === "autoSchedule"}
                onClick={handleToggleAutoSchedule}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                  liveStatus.autoScheduleEnabled
                    ? "bg-emerald-600"
                    : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    liveStatus.autoScheduleEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Today's Quick Hours Adjustment */}
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Quick Override for Today ({todayKey})
                </p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    todayClosed
                      ? "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  }`}
                >
                  {todayClosed ? "Marked Closed Today" : "Open Today"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Opens at
                  <input
                    type="time"
                    value={todayOpen}
                    disabled={todayClosed || savingKey === "todayHours"}
                    onChange={(e) => setTodayOpen(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-900 disabled:opacity-45 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </label>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Closes at
                  <input
                    type="time"
                    value={todayClose}
                    disabled={todayClosed || savingKey === "todayHours"}
                    onChange={(e) => setTodayClose(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-900 disabled:opacity-45 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <button
              type="button"
              disabled={savingKey === "todayHours"}
              onClick={() => handleSaveTodayHours(!todayClosed)}
              className={`inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                todayClosed
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
              }`}
            >
              {todayClosed ? "Reopen for Today" : "Mark Closed Today"}
            </button>
            <button
              type="button"
              disabled={savingKey === "todayHours" || todayClosed}
              onClick={() => handleSaveTodayHours(false)}
              className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
            >
              {savingKey === "todayHours" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save Today&apos;s Hours
            </button>
          </div>
        </div>
      </section>

      {/* Weekly Open / Closed Schedule Editor */}
      <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
              Weekly Open / Closed Schedule
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Set recurring daily opening and closing times (Africa/Lagos timezone)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyMondayToWeekdays}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              <Copy size={14} />
              Copy Mon → Tue–Fri
            </button>
            <button
              type="button"
              onClick={handleSaveWeeklySchedule}
              disabled={savingKey === "weeklySchedule"}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-orange-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
            >
              {savingKey === "weeklySchedule" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save Weekly Schedule
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {WEEK_DAYS.map(({ key, label }) => {
            const row = weeklySchedule[key] || { open: "09:00", close: "21:00", closed: false };
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={`rounded-xl border p-4 transition ${
                  isToday
                    ? "border-orange-300 bg-orange-50/40 dark:border-orange-500/40 dark:bg-orange-500/5"
                    : "border-zinc-200/80 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-950/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{label}</span>
                    {isToday && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
                        Today
                      </span>
                    )}
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    <input
                      type="checkbox"
                      checked={!row.closed}
                      onChange={(e) =>
                        setWeeklySchedule((prev) => ({
                          ...prev,
                          [key]: { ...row, closed: !e.target.checked },
                        }))
                      }
                      className="h-4 w-4 accent-orange-600"
                    />
                    {row.closed ? "Closed" : "Open"}
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    Open
                    <input
                      type="time"
                      disabled={row.closed}
                      value={row.open || "09:00"}
                      onChange={(e) =>
                        setWeeklySchedule((prev) => ({
                          ...prev,
                          [key]: { ...row, open: e.target.value },
                        }))
                      }
                      className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-900 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </label>
                  <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                    Close
                    <input
                      type="time"
                      disabled={row.closed}
                      value={row.close || "21:00"}
                      onChange={(e) =>
                        setWeeklySchedule((prev) => ({
                          ...prev,
                          [key]: { ...row, close: e.target.value },
                        }))
                      }
                      className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-900 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
