"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, PauseCircle, Radio, X } from "lucide-react";

export default function StoreStatusModal({
  open,
  targetLive,
  isUpdating,
  storeName,
  onClose,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !isUpdating) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isUpdating, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="store-status-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isUpdating && onClose()}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div
              className={`h-1.5 w-full ${
                targetLive
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                  : "bg-gradient-to-r from-amber-500 to-orange-500"
              }`}
            />

            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                    targetLive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400"
                      : "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400"
                  }`}
                >
                  {targetLive ? <Radio size={20} /> : <PauseCircle size={20} />}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUpdating}
                  aria-label="Close dialog"
                  className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <X size={18} />
                </button>
              </div>

              <h3
                id="store-status-modal-title"
                className="mt-4 text-lg font-bold tracking-tight text-zinc-900 dark:text-white"
              >
                {targetLive ? "Go live and accept orders?" : "Pause your storefront?"}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {targetLive
                  ? `${storeName || "Your store"} will immediately appear in customer search and nearby listings so customers can place new orders.`
                  : `Customers won't be able to place new orders while ${storeName || "your store"} is paused. Any orders already accepted can still be completed normally.`}
              </p>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUpdating}
                  className="min-h-[42px] rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isUpdating}
                  className={`inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60 ${
                    targetLive
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-zinc-900 hover:bg-zinc-800 dark:bg-amber-600 dark:hover:bg-amber-500"
                  }`}
                >
                  {isUpdating && <Loader2 size={15} className="animate-spin" />}
                  {isUpdating
                    ? "Updating..."
                    : targetLive
                      ? "Yes, Go Live"
                      : "Pause Store"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
