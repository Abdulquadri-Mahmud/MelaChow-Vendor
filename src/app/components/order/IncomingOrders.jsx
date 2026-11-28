"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Inbox,
  Loader2,
  RefreshCw,
} from "lucide-react";
import useVendorOrders from "@/app/hooks/useVendorOrders";
import { orderId, queueGroup } from "@/app/lib/orderReceipt.mjs";
import VendorOrderCard from "./VendorOrderCard";

export default function IncomingOrders() {
  const { orders, autoCancelMinutes, isPending, isFetching, isError, refetch } = useVendorOrders();
  const [nowMs, setNowMs] = useState(() => Date.now());

  const incoming = useMemo(
    () =>
      orders
        .filter((order) => queueGroup(order) === "incoming")
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [orders]
  );

  const preparing = useMemo(
    () => orders.filter((order) => queueGroup(order) === "preparing").length,
    [orders]
  );

  useEffect(() => {
    if (incoming.length === 0) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [incoming.length]);

  return (
    <section className="overflow-hidden rounded-2xl border border-orange-200/80 bg-white shadow-sm dark:border-orange-500/25 dark:bg-zinc-900">
      <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500" />
      <header className="flex flex-col gap-3 border-b border-orange-100/80 bg-gradient-to-r from-orange-50/60 via-white to-white p-5 dark:border-zinc-800 dark:from-orange-500/10 dark:via-zinc-900 dark:to-zinc-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
              Orders first
            </span>
            <span
              className={`inline-flex min-w-[24px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                incoming.length > 0
                  ? "animate-pulse bg-orange-600 text-white shadow-sm shadow-orange-500/30"
                  : "bg-orange-100/80 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
              }`}
            >
              {incoming.length}
            </span>
          </div>
          <h2 className="mt-1.5 text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
            Incoming Orders
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {incoming.length
              ? "Review each ticket and accept the oldest orders first."
              : "New customer orders appear here automatically."}
          </p>
        </div>

        <Link
          href="/vendors/order"
          className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-orange-600/20 transition hover:bg-orange-700"
        >
          <span>Open Order Desk</span>
          <ArrowRight size={14} />
        </Link>
      </header>

      <div className="p-5">
        {isError && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
          >
            <span className="inline-flex items-center gap-2">
              <AlertCircle size={15} />
              Incoming orders couldn&apos;t refresh.
            </span>
            <button
              type="button"
              onClick={() => refetch()}
              className="font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {isPending ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2.5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 py-10 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400"
          >
            <Loader2 size={18} className="animate-spin text-orange-500" />
            <span>Loading incoming orders...</span>
          </div>
        ) : incoming.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
              {incoming.slice(0, 6).map((order) => (
                <VendorOrderCard
                  key={orderId(order) || order._id}
                  order={order}
                  nowMs={nowMs}
                  autoCancelMinutes={autoCancelMinutes}
                  onRefresh={() => refetch()}
                />
              ))}
            </div>
            {incoming.length > 6 && (
              <Link
                href="/vendors/order"
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
              >
                <span>View all {incoming.length} incoming orders</span>
                <ArrowRight size={15} />
              </Link>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              {preparing > 0 ? <Inbox size={18} /> : <CheckCircle2 size={18} />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-900 dark:text-white">
                You&apos;re caught up
              </p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {preparing > 0
                  ? `${preparing} accepted order${preparing === 1 ? " is" : "s are"} currently being prepared. Open the Order Desk to continue.`
                  : "Keep your store live so customers can place new orders."}
              </p>
            </div>
          </div>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/70 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
        <span>
          <strong className="font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
            {preparing}
          </strong>{" "}
          accepted / preparing
        </span>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold text-zinc-600 transition hover:bg-zinc-200/60 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          <span>{isFetching ? "Refreshing..." : "Refresh orders"}</span>
        </button>
      </footer>
    </section>
  );
}
