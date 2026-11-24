"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { requestVendorPickupCode } from "@/app/lib/vendorApi";

export default function PickupCodeControl({
  orderId,
  orderReference,
  compact = false,
}) {
  const [code, setCode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const showCode = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await requestVendorPickupCode(orderId);
      setCode(response.data || response);
    } catch (failure) {
      setError(failure.response?.data?.message || "Pickup code unavailable. Try again shortly.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className={`order-pickup-panel ${compact ? "is-compact" : ""}`}
      aria-label={`Rider pickup code for ${orderReference || "this order"}`}
    >
      <div className="order-pickup-intro">
        <KeyRound size={compact ? 18 : 21} />
        <div>
          <h2>Rider pickup code</h2>
          <p>
            For order <strong>{orderReference || "this order"}</strong>. Match
            this reference with the rider’s delivery before sharing the code.
          </p>
        </div>
      </div>
      {code?.pickupCode && (
        <div className="order-pickup-code" aria-live="polite">
          <strong>{code.pickupCode}</strong>
          {code.expiresAt && <small>Valid until {new Date(code.expiresAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" })}</small>}
        </div>
      )}
      <button type="button" className="order-button primary" disabled={busy} onClick={showCode}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
        {busy ? "Loading code…" : code ? "Refresh pickup code" : "Show pickup code"}
      </button>
      {error && <p className="order-error" role="alert">{error}</p>}
    </section>
  );
}
