"use client";
import { useState } from "react";
import { Check, ChevronRight, Loader2, X } from "lucide-react";
import { completeOrder, updateOrderStatus } from "@/app/lib/vendorApi";
import { nextOrderAction, orderId, statusOf } from "@/app/lib/orderReceipt.mjs";

export default function OrderActions({
  order,
  vendor,
  onChanged,
  showCancel = false,
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmCancel, setConfirmCancel] = useState(false);
  const action = nextOrderAction(order, vendor),
    status = statusOf(order);
  const update = async (value) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (value === "completed") await completeOrder(orderId(order));
      else await updateOrderStatus(orderId(order), value);
      setConfirmCancel(false);
      await onChanged?.(value);
      window.dispatchEvent(new CustomEvent("vendor:orders-updated"));
    } catch (failure) {
      setError(
        failure.response?.data?.message ||
          failure.message ||
          "The order could not be updated. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="order-actions">
      {action && (
        <button
          type="button"
          className={`order-button primary ${status === "pending" ? "accept" : ""}`}
          disabled={busy}
          onClick={() => update(action.status)}
        >
          {busy ? (
            <Loader2 size={18} className="animate-spin" />
          ) : status === "pending" ? (
            <Check size={18} />
          ) : (
            <ChevronRight size={18} />
          )}
          {busy ? "Updating…" : action.label}
        </button>
      )}
      {!action && ["ready_for_pickup", "rider_assigned"].includes(status) && (
        <p className="order-waiting">
          <Check size={16} /> Ready. Keep the package available for pickup.
        </p>
      )}
      {!action && status === "pending" && (
        <p className="order-notice">Awaiting payment confirmation.</p>
      )}
      {showCancel &&
        ["pending", "accepted", "preparing"].includes(status) &&
        !confirmCancel && (
          <button
            type="button"
            className="order-button secondary"
            disabled={busy}
            onClick={() => setConfirmCancel(true)}
          >
            <X size={16} />{" "}
            {status === "pending" ? "Decline order" : "Cancel order"}
          </button>
        )}
      {confirmCancel && (
        <div className="order-cancel-confirm" role="alert">
          <p>
            {status === "pending"
              ? "Decline this order?"
              : "Cancel this order?"}{" "}
            This stops preparation and starts the cancellation process.
          </p>
          <div>
            <button
              type="button"
              className="order-button secondary"
              disabled={busy}
              onClick={() => setConfirmCancel(false)}
            >
              Keep order
            </button>
            <button
              type="button"
              className="order-button danger"
              disabled={busy}
              onClick={() => update("cancelled")}
            >
              Confirm {status === "pending" ? "decline" : "cancellation"}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="order-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
