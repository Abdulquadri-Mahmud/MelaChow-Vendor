"use client";
import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Search,
  Inbox,
  ChefHat,
  PackageCheck,
  History,
  Loader2,
} from "lucide-react";
import useVendorOrders from "@/app/hooks/useVendorOrders";
import VendorOrderCard from "@/app/components/order/VendorOrderCard";
import { orderReceipt, queueGroup } from "@/app/lib/orderReceipt.mjs";
import "@/app/components/order/vendor-orders.css";

const tabs = [
  { key: "incoming", label: "Incoming", icon: Inbox },
  { key: "preparing", label: "Preparing", icon: ChefHat },
  { key: "ready", label: "Ready for pickup", icon: PackageCheck },
  { key: "history", label: "Other orders", icon: History },
];
export default function VendorOrderDesk() {
  const { orders, isPending, isFetching, isError, refetch } = useVendorOrders();
  const [tab, setTab] = useState("incoming"),
    [search, setSearch] = useState(""),
    [limit, setLimit] = useState(12);
  useEffect(() => {
    const incoming = () => {
      setTab("incoming");
      setLimit(12);
    };
    window.addEventListener("vendor:new-order", incoming);
    return () => window.removeEventListener("vendor:new-order", incoming);
  }, []);
  const counts = Object.fromEntries(
    tabs.map((item) => [
      item.key,
      orders.filter((order) => queueGroup(order) === item.key).length,
    ]),
  );
  const filtered = useMemo(
    () =>
      orders
        .filter((order) => {
          if (queueGroup(order) !== tab) return false;
          if (!search.trim()) return true;
          const receipt = orderReceipt(order);
          return `${receipt.code} ${receipt.customer} ${receipt.items.map((item) => item.name).join(" ")}`
            .toLowerCase()
            .includes(search.trim().toLowerCase());
        })
        .sort((a, b) =>
          tab === "history"
            ? new Date(b.createdAt) - new Date(a.createdAt)
            : new Date(a.createdAt) - new Date(b.createdAt),
        ),
    [orders, tab, search],
  );
  return (
    <div className="vendor-orders-page">
      <header className="order-desk-header">
        <div>
          <p className="order-eyebrow">Your kitchen, organised</p>
          <h1>Orders</h1>
          <p>
            Accept incoming orders, prepare what was bought, and mark each
            package ready.
          </p>
        </div>
        <button
          type="button"
          className="order-button secondary"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw size={17} className={isFetching ? "animate-spin" : ""} />{" "}
          Refresh
        </button>
      </header>
      <div className="order-flow-guide">
        <span>
          <b>1</b> Accept order
        </span>
        <span>
          <b>2</b> Prepare items
        </span>
        <span>
          <b>3</b> Ready for pickup
        </span>
      </div>
      <nav className="order-desk-tabs" aria-label="Order queues">
        {tabs.map((item) => (
          <button
            type="button"
            key={item.key}
            aria-pressed={tab === item.key}
            onClick={() => {
              setTab(item.key);
              setLimit(12);
            }}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
            <b>{counts[item.key]}</b>
          </button>
        ))}
      </nav>
      <div className="order-desk-toolbar">
        <h2>
          {tabs.find((item) => item.key === tab).label}{" "}
          <span>{filtered.length}</span>
        </h2>
        <label className="order-search">
          <Search size={18} />
          <input
            aria-label="Search orders"
            placeholder="Search order, customer, or item"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setLimit(12);
            }}
          />
        </label>
      </div>
      {isError && (
        <div className="order-error" role="alert">
          Orders couldn’t refresh.{" "}
          {orders.length
            ? "The last loaded orders are still shown."
            : "Please check your connection."}
          <button type="button" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      )}
      {isPending ? (
        <div className="order-empty" role="status">
          <Loader2 size={28} className="animate-spin" />
          <p>Loading your orders…</p>
        </div>
      ) : filtered.length ? (
        <>
          <div className="order-card-grid">
            {filtered.slice(0, limit).map((order) => (
              <VendorOrderCard
                key={order._id?.$oid || order._id || order.id}
                order={order}
                onRefresh={() => refetch()}
              />
            ))}
          </div>
          {filtered.length > limit && (
            <button
              type="button"
              className="order-button secondary order-load-more"
              onClick={() => setLimit((value) => value + 12)}
            >
              Show more orders
            </button>
          )}
        </>
      ) : (
        <div className="order-empty">
          <Inbox size={32} />
          <h3>
            {search
              ? "No matching orders"
              : tab === "incoming"
                ? "You’re caught up"
                : "No orders here yet"}
          </h3>
          <p>
            {search
              ? "Try another order number, customer, or item."
              : tab === "incoming"
                ? "New orders appear here automatically. Keep your store live to receive them."
                : "Orders move here as you accept and prepare them."}
          </p>
        </div>
      )}
      <p className="order-refresh-note" role="status">
        {isFetching && !isPending
          ? "Updating orders…"
          : "New orders update automatically. Incoming orders are shown oldest first."}
      </p>
    </div>
  );
}
