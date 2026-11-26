"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { AlertCircle, Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { requestVendorPickupCode } from "@/app/lib/vendorApi";

export default function PickupCodeControl({
  orderId,
  orderReference,
  compact = false,
}) {
  const [code, setCode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const showCode = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await requestVendorPickupCode(orderId);
      setCode(response.data || response);
    } catch (failure) {
      setError(
        failure?.response?.data?.message ||
          "Pickup code unavailable. Try again shortly."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = () => {
    if (!code?.pickupCode) return;
    navigator.clipboard.writeText(String(code.pickupCode));
    setCopied(true);
    toast.success("Pickup code copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      aria-label={`Rider pickup code for ${orderReference || "this order"}`}
      className={`rounded-xl border border-orange-200/80 bg-orange-50/70 dark:border-orange-500/30 dark:bg-orange-500/10 ${
        compact ? "p-3.5" : "p-5"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
          <KeyRound size={compact ? 15 : 17} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white">
            Rider Pickup Code
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            Match reference{" "}
            <strong className="font-mono font-semibold text-orange-800 dark:text-orange-300">
              {orderReference || "this order"}
            </strong>{" "}
            with the rider before sharing the code.
          </p>
        </div>
      </div>

      {code?.pickupCode && (
        <div
          aria-live="polite"
          className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-orange-200 bg-white px-4 py-3 dark:border-orange-500/30 dark:bg-zinc-900"
        >
          <div>
            <p className="font-mono text-2xl font-bold tracking-[0.18em] text-orange-700 dark:text-orange-400">
              {code.pickupCode}
            </p>
            {code.expiresAt && (
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                Valid until{" "}
                {new Date(code.expiresAt).toLocaleTimeString("en-NG", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Africa/Lagos",
                })}{" "}
                WAT
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={showCode}
        className="mt-3 inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-55"
      >
        {busy ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <KeyRound size={15} />
        )}
        <span>
          {busy
            ? "Loading code..."
            : code
              ? "Refresh Pickup Code"
              : "Show Pickup Code"}
        </span>
      </button>

      {error && (
        <div
          role="alert"
          className="mt-2.5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
        >
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}
