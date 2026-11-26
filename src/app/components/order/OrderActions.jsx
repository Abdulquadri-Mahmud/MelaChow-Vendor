"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { AlertCircle, Check, ChevronRight, Loader2, X } from "lucide-react";
import { completeOrder, updateOrderStatus } from "@/app/lib/vendorApi";
import {
  nextOrderAction,
  orderId,
  statusLabel,
  statusOf,
} from "@/app/lib/orderReceipt.mjs";

export default function OrderActions({
  order,
  vendor,
  onChanged,
  showCancel = false,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  const action = nextOrderAction(order, vendor);
  const status = statusOf(order);
  const canCancel =
    showCancel && ["pending", "accepted", "preparing"].includes(status);

  const update = async (value) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (value === "completed") await completeOrder(orderId(order));
      else await updateOrderStatus(orderId(order), value);
      setConfirmCancel(false);
      toast.success(
        value === "cancelled"
          ? "Order cancelled"
          : `Order marked as ${statusLabel(value).toLowerCase()}`
      );
      await onChanged?.(value);
      window.dispatchEvent(new CustomEvent("vendor:orders-updated"));
    } catch (failure) {
      const msg =
        failure?.response?.data?.message ||
        failure?.message ||
        "The order could not be updated. Try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {action && (
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => update(action.status)}
            className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-55 ${
              status === "pending"
                ? "bg-orange-600 hover:bg-orange-700"
                : status === "preparing"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-zinc-900 hover:bg-zinc-800 dark:bg-orange-600 dark:hover:bg-orange-500"
            }`}
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : status === "pending" ? (
              <Check size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
            <span>{busy ? "Updating..." : action.label}</span>
          </button>

          {canCancel && !confirmCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmCancel(true)}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
            >
              <X size={15} />
              <span>{status === "pending" ? "Decline" : "Cancel"}</span>
            </button>
          )}
        </div>
      )}

      {!action && ["ready_for_pickup", "rider_assigned"].includes(status) && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <Check size={15} className="shrink-0" />
          <span>Ready for pickup. Keep this package handy for rider handoff.</span>
        </div>
      )}

      {!action && status === "pending" && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <span>Awaiting customer payment confirmation before acceptance.</span>
          {canCancel && !confirmCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmCancel(true)}
              className="shrink-0 font-semibold text-rose-700 underline dark:text-rose-300"
            >
              Decline
            </button>
          )}
        </div>
      )}

      {confirmCancel && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
        >
          <p className="font-semibold">
            {status === "pending" ? "Decline this order?" : "Cancel this order?"}
          </p>
          <p className="mt-0.5 text-rose-700 dark:text-rose-300/90">
            This stops kitchen preparation and starts the customer refund/cancellation flow.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmCancel(false)}
              className="min-h-[38px] rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              Keep order
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => update("cancelled")}
              className="min-h-[38px] rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
            >
              Confirm {status === "pending" ? "decline" : "cancellation"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
