"use client";
import Link from "next/link";
import { Inbox, ArrowRight, RefreshCw, Loader2 } from "lucide-react";
import useVendorOrders from "@/app/hooks/useVendorOrders";
import { queueGroup } from "@/app/lib/orderReceipt.mjs";
import VendorOrderCard from "./VendorOrderCard";
import "./vendor-orders.css";

export default function IncomingOrders() {
  const { orders, isPending, isFetching, isError, refetch } = useVendorOrders();
  const incoming = orders
    .filter((order) => queueGroup(order) === "incoming")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const preparing = orders.filter(
    (order) => queueGroup(order) === "preparing",
  ).length;
  return (
    <section className="dashboard-incoming">
      <header>
        <div>
          <p className="order-eyebrow">Orders first</p>
          <h2>
            Incoming orders <span>{incoming.length}</span>
          </h2>
          <p>
            {incoming.length
              ? "Review what was bought and accept the oldest orders first."
              : "New orders appear here automatically."}
          </p>
        </div>
        <Link href="/vendors/order" className="order-button secondary">
          Order desk <ArrowRight size={17} />
        </Link>
      </header>
      {isError && (
        <div className="order-error" role="alert">
          Incoming orders couldn’t refresh.
          <button type="button" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      )}
      {isPending ? (
        <p className="order-empty" role="status">
          <Loader2 size={22} className="animate-spin" />
          Loading incoming orders…
        </p>
      ) : incoming.length ? (
        <div className="order-card-grid">
          {incoming.slice(0, 4).map((order) => (
            <VendorOrderCard
              key={order._id?.$oid || order._id || order.id}
              order={order}
              onRefresh={() => refetch()}
            />
          ))}
        </div>
      ) : (
        <div className="dashboard-orders-clear">
          <Inbox size={24} />
          <div>
            <strong>You’re caught up</strong>
            <p>
              {preparing
                ? `${preparing} accepted order${preparing === 1 ? " is" : "s are"} being prepared. Open the order desk to continue.`
                : "Keep your store live so customers can place orders."}
            </p>
          </div>
        </div>
      )}
      {incoming.length > 4 && (
        <Link href="/vendors/order" className="order-button primary">
          View all {incoming.length} incoming orders <ArrowRight size={16} />
        </Link>
      )}
      <footer>
        <span>{preparing} accepted / preparing</span>
        <button type="button" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          {isFetching ? "Refreshing…" : "Refresh orders"}
        </button>
      </footer>
    </section>
  );
}
