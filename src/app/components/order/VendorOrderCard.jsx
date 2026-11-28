"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  Clock,
  MapPin,
  PackageCheck,
  Phone,
  ReceiptText,
  StickyNote,
  Timer,
  User,
} from "lucide-react";
import { useVendorProfile } from "@/app/context/VendorProfileContext";
import {
  money,
  orderReceipt,
  statusLabel,
  statusOf,
} from "@/app/lib/orderReceipt.mjs";
import OrderActions from "./OrderActions";
import PickupCodeControl from "./PickupCodeControl";

function formatAddressSnippet(address) {
  if (!address) return "";
  if (typeof address === "string") return address;
  return [
    address.street || address.address || address.formattedAddress,
    address.city?.name || address.city,
  ]
    .filter((v) => typeof v === "string" && v.trim())
    .join(", ");
}

function getElapsedMeta(createdAt, nowMs) {
  const ts = new Date(createdAt).getTime();
  if (!ts || Number.isNaN(ts)) {
    return { valid: false, label: "—", minutes: 0, seconds: 0 };
  }
  const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  if (mins >= 1440) {
    const days = Math.floor(mins / 1440);
    return { valid: true, label: `${days}d ago`, minutes: mins, seconds: diffSec };
  }
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return { valid: true, label: `${hrs}h ${rem}m`, minutes: mins, seconds: diffSec };
  }
  return {
    valid: true,
    label: `${mins}:${String(secs).padStart(2, "0")}`,
    minutes: mins,
    seconds: diffSec,
  };
}

function getStatusPillClasses(status) {
  switch (status) {
    case "pending":
      return {
        pill: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
        dot: "bg-amber-500",
      };
    case "accepted":
    case "preparing":
      return {
        pill: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300",
        dot: "bg-orange-500",
      };
    case "ready_for_pickup":
    case "rider_assigned":
      return {
        pill: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300",
        dot: "bg-sky-500",
      };
    case "out_for_delivery":
      return {
        pill: "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300",
        dot: "bg-indigo-500",
      };
    case "delivered":
    case "completed":
      return {
        pill: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300",
        dot: "bg-emerald-500",
      };
    case "cancelled":
    case "failed":
    case "refunded":
      return {
        pill: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300",
        dot: "bg-rose-500",
      };
    default:
      return {
        pill: "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        dot: "bg-zinc-400",
      };
  }
}

export default function VendorOrderCard({ order, onRefresh, nowMs, autoCancelMinutes }) {
  const { vendorProfile } = useVendorProfile();
  const receipt = orderReceipt(order);
  const status = statusOf(order);
  const pillMeta = getStatusPillClasses(status);

  const created = new Date(order.createdAt);
  const validDate = !Number.isNaN(created.getTime());
  const effectiveNow = typeof nowMs === "number" ? nowMs : Date.now();
  const elapsed = getElapsedMeta(order.createdAt, effectiveNow);

  const isPending = status === "pending";
  const isActiveKitchen = ["pending", "accepted", "preparing"].includes(status);

  // Sync SLA countdown & warning states directly with backend auto-cancel config
  const parsedSlaMinutes = Number(order?.autoCancelMinutes ?? autoCancelMinutes ?? 10);
  const slaMinutes =
    Number.isFinite(parsedSlaMinutes) && parsedSlaMinutes > 0
      ? Math.round(parsedSlaMinutes)
      : 10;
  const slaSeconds = slaMinutes * 60;
  const parsedAutoCancelAt = order?.autoCancelAt
    ? new Date(order.autoCancelAt).getTime()
    : NaN;
  const autoCancelAtMs = Number.isFinite(parsedAutoCancelAt)
    ? parsedAutoCancelAt
    : validDate
      ? created.getTime() + slaSeconds * 1000
      : NaN;
  const remainingSeconds = Number.isFinite(autoCancelAtMs)
    ? Math.max(0, Math.ceil((autoCancelAtMs - effectiveNow) / 1000))
    : Math.max(0, slaSeconds - elapsed.seconds);
  const remainingLabel = `${Math.floor(remainingSeconds / 60)}:${String(
    remainingSeconds % 60
  ).padStart(2, "0")}`;

  const warningThresholdSec = Math.max(60, Math.round(slaSeconds * 0.5));
  const urgentThresholdSec = Math.max(warningThresholdSec + 30, slaSeconds - 120);
  const isSlaExpired = isPending && elapsed.valid && remainingSeconds === 0;
  const isSlaUrgent =
    isPending && !isSlaExpired && elapsed.seconds >= urgentThresholdSec;
  const isSlaWarning =
    isPending &&
    !isSlaExpired &&
    !isSlaUrgent &&
    elapsed.seconds >= warningThresholdSec;

  const totalPacks = receipt.items.reduce((sum, it) => sum + (it.packs || 1), 0);
  const addressSnippet = formatAddressSnippet(receipt.address);
  const riderName =
    receipt.rider?.name ||
    `${receipt.rider?.firstname || ""} ${receipt.rider?.lastname || ""}`.trim();

  return (
    <article
      aria-label={`Order ${receipt.code}`}
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md dark:bg-zinc-900 ${
        isSlaUrgent || isSlaExpired
          ? "border-rose-300 ring-2 ring-rose-500/20 dark:border-rose-500/50"
          : isPending
            ? "border-orange-300 ring-1 ring-orange-500/15 dark:border-orange-500/40"
            : isActiveKitchen
              ? "border-orange-200/90 dark:border-orange-500/30"
              : "border-zinc-200/90 dark:border-zinc-800"
      }`}
    >
      {/* Top primary / urgency bar */}
      {isActiveKitchen && (
        <div
          className={`h-1.5 w-full ${
            isSlaUrgent || isSlaExpired
              ? "bg-gradient-to-r from-rose-600 to-red-500"
              : isSlaWarning
                ? "bg-gradient-to-r from-amber-500 to-orange-600"
                : "bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500"
          }`}
        />
      )}

      {/* ── HEADER ── */}
      <header className="flex items-start justify-between gap-2.5 border-b border-zinc-100 p-4 dark:border-zinc-800">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/vendors/order/${receipt.id}`}
              className="truncate text-base font-bold tracking-tight text-zinc-900 hover:text-orange-600 dark:text-white dark:hover:text-orange-400"
            >
              #{receipt.code || "Order"}
            </Link>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${pillMeta.pill}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${pillMeta.dot}`} />
              {statusLabel(status)}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {validDate
                ? created.toLocaleTimeString("en-NG", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Africa/Lagos",
                  })
                : "—"}
              {validDate && (
                <span className="text-zinc-400">
                  {" "}
                  ·{" "}
                  {created.toLocaleDateString("en-NG", {
                    month: "short",
                    day: "numeric",
                    timeZone: "Africa/Lagos",
                  })}
                </span>
              )}
            </span>

            {receipt.paymentStatus === "paid" ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={12} />
                Paid
              </span>
            ) : receipt.paymentStatus ? (
              <span className="font-medium capitalize text-amber-700 dark:text-amber-400">
                Payment: {receipt.paymentStatus}
              </span>
            ) : null}
          </div>
        </div>

        {/* Live timer / elapsed badge */}
        {elapsed.valid && (
          <div
            className={`shrink-0 rounded-xl border px-3 py-1.5 text-right ${
              isSlaUrgent
                ? "animate-pulse border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300"
                : isSlaWarning
                  ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300"
                  : isActiveKitchen
                    ? "border-orange-200 bg-orange-50/80 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            <p className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-75">
              <Timer size={10} />
              {isPending ? "Waiting" : isActiveKitchen ? "Elapsed" : "Placed"}
            </p>
            <p className="text-sm font-bold tabular-nums">{elapsed.label}</p>
          </div>
        )}
      </header>

      {/* SLA warning callout */}
      {(isSlaWarning || isSlaUrgent || isSlaExpired) && (
        <div
          className={`flex items-start gap-2.5 border-b px-4 py-2.5 text-xs sm:px-5 ${
            isSlaUrgent || isSlaExpired
              ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200"
              : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          }`}
        >
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            {isSlaExpired
              ? `Auto-cancel window (${slaMinutes}m) reached — syncing order status...`
              : isSlaUrgent
                ? `Urgent: accept within ${remainingLabel} before the ${slaMinutes}-minute auto-cancel SLA expires.`
                : `Please accept soon — ${remainingLabel} left in the ${slaMinutes}-minute auto-cancel window.`}
          </span>
        </div>
      )}

      {/* ── CUSTOMER & LOGISTICS META ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-zinc-100 bg-zinc-50/70 px-4 py-3 text-xs dark:border-zinc-800 dark:bg-zinc-950/40 sm:px-5">
        <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200">
          <User size={13} className="text-zinc-400" />
          {receipt.customer}
        </span>

        {receipt.phone && (
          <a
            href={`tel:${receipt.phone}`}
            className="inline-flex items-center gap-1 font-medium text-orange-700 hover:underline dark:text-orange-400"
          >
            <Phone size={12} />
            {receipt.phone}
          </a>
        )}

        {addressSnippet && (
          <span className="inline-flex min-w-0 max-w-full items-center gap-1 text-zinc-500 dark:text-zinc-400">
            <MapPin size={12} className="shrink-0 text-zinc-400" />
            <span className="truncate">{addressSnippet}</span>
          </span>
        )}

        {riderName && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
            <Bike size={12} />
            Rider: {riderName}
          </span>
        )}
      </div>

      {/* ── ALERTS: CUSTOMER NOTE & MULTI-PERSON PACKING ── */}
      {(receipt.note || receipt.packingGroups.length > 1) && (
        <div className="space-y-2 px-4 pt-3.5 sm:px-5">
          {receipt.note && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <StickyNote size={14} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="leading-relaxed">
                <strong className="font-semibold">Customer note:</strong>{" "}
                {receipt.note}
              </p>
            </div>
          )}

          {receipt.packingGroups.length > 1 && (
            <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/80 px-3.5 py-2.5 text-xs text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
              <PackageCheck size={15} className="shrink-0 text-orange-600 dark:text-orange-400" />
              <span>
                <strong>{receipt.packingGroups.length} separate packs</strong> ·
                Label each person&apos;s food before handoff.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── KITCHEN TICKET ITEMS ── */}
      <div className="flex-1 space-y-3 p-4 sm:p-5">
        {receipt.items.length === 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            Item details haven&apos;t loaded yet. Refresh before preparing.
          </p>
        ) : (
          receipt.packingGroups.map((pack) => (
            <div key={pack.label} className="space-y-2.5">
              {pack.label !== "Order items" && (
                <div className="flex items-center justify-between rounded-lg border border-orange-200/80 bg-orange-50/80 px-3 py-1.5 text-xs dark:border-orange-500/30 dark:bg-orange-500/15">
                  <strong className="font-bold text-orange-900 dark:text-orange-200">
                    {pack.label}
                  </strong>
                  <span className="font-medium text-orange-700 dark:text-orange-300">
                    Pack separately · {pack.items.length}{" "}
                    {pack.items.length === 1 ? "item" : "items"}
                  </span>
                </div>
              )}

              <div className="divide-y divide-dashed divide-zinc-200 dark:divide-zinc-800">
                {pack.items.map((item, idx) => (
                  <div
                    key={`${pack.label}-${idx}`}
                    className="py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span className="mt-0.5 inline-flex h-6 min-w-[28px] shrink-0 items-center justify-center rounded-lg bg-orange-600 px-1.5 text-xs font-bold tabular-nums text-white">
                          ×{item.packs}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold leading-snug text-zinc-900 dark:text-white">
                            {item.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {item.portion} × {item.portionCount}
                            {item.packs > 1 && item.portionsPerPack > 1
                              ? ` (${item.portionsPerPack} per pack)`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                        {money(item.total)}
                      </span>
                    </div>

                    {item.groups.length > 0 && (
                      <div className="mt-2 ml-9 space-y-1.5 border-l-2 border-orange-200 pl-3 dark:border-orange-500/30">
                        {item.groups.map((group) => (
                          <div key={group.name} className="text-xs">
                            <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                              {group.name}:{" "}
                            </span>
                            <span className="text-zinc-700 dark:text-zinc-300">
                              {group.options
                                .map(
                                  (opt) =>
                                    `${opt.name} ×${opt.quantity}${
                                      opt.total ? ` (${money(opt.total)})` : ""
                                    }`
                                )
                                .join(", ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {item.note && (
                      <p className="mt-2 ml-9 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                        <strong className="font-semibold">Item note:</strong>{" "}
                        {item.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── TOTALS STRIP ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40 sm:px-5">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            {totalPacks} {totalPacks === 1 ? "pack" : "packs"}
          </span>{" "}
          · Subtotal{" "}
          <strong className="font-bold tabular-nums text-zinc-900 dark:text-white">
            {money(receipt.itemsSubtotal)}
          </strong>
        </div>

        {receipt.vendorPayout != null && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Your payout{" "}
            <strong className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {money(receipt.vendorPayout)}
            </strong>
          </div>
        )}
      </div>

      {/* ── ACTIONS FOOTER ── */}
      <footer className="space-y-3 border-t border-zinc-100 p-4 dark:border-zinc-800 sm:p-5">
        <OrderActions
          order={order}
          vendor={vendorProfile}
          onChanged={onRefresh}
          showCancel={isActiveKitchen}
        />

        {["ready_for_pickup", "rider_assigned"].includes(status) &&
          vendorProfile?.deliveryManagedBy === "admin" && (
            <PickupCodeControl
              orderId={receipt.id}
              orderReference={`${receipt.code}:${String(receipt.id || "").slice(0, 8)}`}
              compact
            />
          )}

        <Link
          href={`/vendors/order/${receipt.id}`}
          className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-orange-300 hover:bg-orange-50/60 hover:text-orange-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300 dark:hover:border-orange-500/40 dark:hover:text-orange-300"
        >
          <ReceiptText size={14} />
          <span>Open Full Receipt &amp; Print</span>
        </Link>
      </footer>
    </article>
  );
}
