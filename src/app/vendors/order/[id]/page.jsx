"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Capacitor, registerPlugin } from "@capacitor/core";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowLeft,
  Bike,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  PackageCheck,
  Phone,
  Printer,
  RefreshCw,
  StickyNote,
  User,
  Wallet,
} from "lucide-react";

import { getVendorOrderById } from "@/app/lib/vendorApi";
import { useVendorProfile } from "@/app/context/VendorProfileContext";
import {
  money,
  orderReceipt,
  statusLabel,
  statusOf,
} from "@/app/lib/orderReceipt.mjs";
import OrderActions from "@/app/components/order/OrderActions";
import PickupCodeControl from "@/app/components/order/PickupCodeControl";

const addressText = (address) =>
  typeof address === "string"
    ? address
    : [
        address?.address || address?.street || address?.fullAddress,
        address?.city?.name || address?.city,
        address?.state?.name || address?.state,
      ]
        .filter((value) => typeof value === "string" && value)
        .join(", ");

const ReceiptPrinter = registerPlugin("ReceiptPrinter");

export default function VendorOrderDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { vendorProfile } = useVendorProfile();

  const {
    data: order,
    isPending,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["vendor-order", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const result = await getVendorOrderById(id);
      const value = result.data || result.vendorOrder || result;
      if (!value?._id && !value?.id) {
        throw new Error("Order details were not returned.");
      }
      return value;
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const printReceipt = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await ReceiptPrinter.print({
          name: `MelaChow receipt ${order?.userOrderId?.orderId || id}`,
        });
      } catch (error) {
        console.error("Could not open Android printing:", error);
        toast.error("Could not open printing on this device.");
      }
      return;
    }
    window.print();
  };

  if (isPending && !order) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center rounded-2xl border border-zinc-200/90 bg-white px-6 py-20 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <Loader2 size={28} className="animate-spin text-orange-500" />
        <p className="mt-3 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
          Loading order receipt...
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <div className="flex flex-col items-center rounded-2xl border border-zinc-200/90 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <AlertCircle size={28} className="text-rose-500" />
          <h1 className="mt-3 text-lg font-bold text-zinc-900 dark:text-white">
            We couldn&apos;t load this order
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Check your internet connection and try again.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => refetch()}
              className="min-h-[42px] rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => router.push("/vendors/order")}
              className="min-h-[42px] rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  const receipt = orderReceipt(order);
  const status = statusOf(order);
  const created = new Date(order.createdAt);
  const address = addressText(receipt.address);
  const ready = ["ready_for_pickup", "rider_assigned"].includes(status);

  const adjustment =
    receipt.customerTotal != null &&
    receipt.itemsSubtotal != null &&
    receipt.deliveryFee != null &&
    receipt.serviceFee != null
      ? Math.round(
          (receipt.customerTotal -
            receipt.itemsSubtotal -
            receipt.deliveryFee -
            receipt.serviceFee) *
            100
        ) / 100
      : null;

  return (
    <div className="mx-auto max-w-[1280px] pb-12 font-sans text-zinc-900 dark:text-zinc-100">
      <div className="space-y-5">
        {/* Top Action Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={() => router.push("/vendors/order")}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <ArrowLeft size={16} />
            <span>All Orders</span>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isFetching}
              onClick={() => refetch()}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-55 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={printReceipt}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-orange-600 dark:hover:bg-orange-500"
            >
              <Printer size={15} />
              <span>Print Receipt</span>
            </button>
          </div>
        </header>

        {isError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 print:hidden dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
          >
            <AlertCircle size={15} />
            <span>
              Could not refresh this order. Showing the last loaded details.
            </span>
          </div>
        )}

        {/* Top Pickup Code Banner for Ready Orders */}
        {ready && vendorProfile?.deliveryManagedBy === "admin" && (
          <div className="print:hidden">
            <PickupCodeControl
              orderId={receipt.id}
              orderReference={`${receipt.code}:${String(receipt.id || "").slice(0, 8)}`}
            />
          </div>
        )}

        {/* Main 12-Col Grid */}
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          {/* LEFT: FULL RECEIPT (8 COLS) */}
          <article className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-8">
            <header className="border-b border-dashed border-orange-200 bg-orange-50/70 p-5 sm:p-6 dark:border-orange-500/30 dark:bg-orange-500/10">
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                {vendorProfile?.storeName ||
                  vendorProfile?.restaurantName ||
                  "MelaChow"}{" "}
                · Order Receipt
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  #{receipt.code}
                </h1>
                <span className="inline-flex items-center rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-bold text-orange-700 dark:border-orange-500/30 dark:bg-zinc-900 dark:text-orange-300">
                  {statusLabel(status)}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <Clock size={12} />
                {!Number.isNaN(created.getTime())
                  ? created.toLocaleString("en-NG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Africa/Lagos",
                    })
                  : "Date not recorded"}
              </p>

              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-orange-200/60 pt-4 text-xs dark:border-orange-500/20">
                <div>
                  <dt className="text-zinc-500 dark:text-zinc-400">Customer</dt>
                  <dd className="mt-0.5 font-bold text-zinc-900 dark:text-white">
                    {receipt.customer}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500 dark:text-zinc-400">Payment</dt>
                  <dd className="mt-0.5 flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                    {receipt.paymentStatus === "paid" && (
                      <CheckCircle2 size={13} />
                    )}
                    {receipt.paymentStatus === "paid"
                      ? "Paid"
                      : receipt.paymentStatus || "Not recorded"}
                  </dd>
                </div>
              </dl>
            </header>

            <div className="space-y-5 p-5 sm:p-6">
              {receipt.packingGroups.length > 1 && (
                <div className="flex items-center gap-2.5 rounded-xl border border-orange-200 bg-orange-50/80 px-4 py-3 text-xs font-medium text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
                  <PackageCheck size={16} className="shrink-0 text-orange-600" />
                  <span>
                    <strong>{receipt.packingGroups.length} separate packs.</strong>{" "}
                    Pack and label each person&apos;s items individually.
                  </span>
                </div>
              )}

              {receipt.note && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  <StickyNote size={15} className="mt-0.5 shrink-0 text-amber-600" />
                  <p className="leading-relaxed">
                    <strong>Customer note:</strong> {receipt.note}
                  </p>
                </div>
              )}

              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Ordered Items
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Quantities below show the exact total to prepare across all
                  packs.
                </p>
              </div>

              {/* Itemized Packing Groups */}
              <div className="space-y-4">
                {receipt.packingGroups.map((pack) => (
                  <div key={pack.label} className="space-y-3">
                    {pack.label !== "Order items" && (
                      <div className="flex items-center justify-between rounded-xl border border-orange-200/80 bg-orange-50/80 px-3.5 py-2 text-xs dark:border-orange-500/30 dark:bg-orange-500/15">
                        <strong className="font-bold text-orange-900 dark:text-orange-200">
                          {pack.label}
                        </strong>
                        <span className="font-semibold text-orange-700 dark:text-orange-300">
                          Pack separately · {pack.items.length}{" "}
                          {pack.items.length === 1 ? "item" : "items"}
                        </span>
                      </div>
                    )}

                    <div className="divide-y divide-dashed divide-zinc-200 dark:divide-zinc-800">
                      {pack.items.map((item, idx) => (
                        <div
                          key={`${pack.label}-${idx}`}
                          className="space-y-2 py-4 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                                {item.name}
                              </h3>
                              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                {item.portion} × {item.portionCount}
                                {item.baseUnit != null
                                  ? ` (${money(item.baseUnit)} each)`
                                  : ""}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                              {money(item.baseTotal)}
                            </span>
                          </div>

                          {item.groups.map((group) => (
                            <div
                              key={group.name}
                              className="ml-2 space-y-1 border-l-2 border-orange-200 pl-3.5 text-xs dark:border-orange-500/30"
                            >
                              <p className="font-semibold text-zinc-500 dark:text-zinc-400">
                                {group.name}
                              </p>
                              {group.options.map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  className="flex items-center justify-between gap-3 text-zinc-700 dark:text-zinc-300"
                                >
                                  <span>
                                    {opt.name}{" "}
                                    <strong className="text-orange-700 dark:text-orange-400">
                                      ×{opt.quantity}
                                    </strong>
                                  </span>
                                  <span className="font-semibold tabular-nums">
                                    {opt.total === 0 ? "Included" : money(opt.total)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ))}

                          {item.note && (
                            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                              <strong>Item note:</strong> {item.note}
                            </p>
                          )}

                          <div className="flex items-center justify-between border-t border-zinc-100 pt-2 text-xs dark:border-zinc-800">
                            <span className="font-medium text-zinc-500 dark:text-zinc-400">
                              Item Total
                            </span>
                            <strong className="text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                              {money(item.total)}
                            </strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-2 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Items Subtotal
                  </span>
                  <strong className="tabular-nums">
                    {money(receipt.itemsSubtotal)}
                  </strong>
                </div>
                {receipt.deliveryFee != null && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Delivery Fee
                    </span>
                    <strong className="tabular-nums">
                      {money(receipt.deliveryFee)}
                    </strong>
                  </div>
                )}
                {receipt.serviceFee != null && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Service Fee
                    </span>
                    <strong className="tabular-nums">
                      {money(receipt.serviceFee)}
                    </strong>
                  </div>
                )}
                {adjustment != null && adjustment !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {adjustment < 0 ? "Discounts / Adjustments" : "Adjustments"}
                    </span>
                    <strong className="tabular-nums">
                      {adjustment < 0 ? "−" : "+"}
                      {money(Math.abs(adjustment))}
                    </strong>
                  </div>
                )}
                {receipt.customerTotal != null && (
                  <div className="flex justify-between border-t-2 border-orange-500 pt-3 text-lg font-bold">
                    <span>
                      {receipt.paymentStatus === "paid"
                        ? "Total Paid"
                        : "Order Total"}
                    </span>
                    <strong className="tabular-nums">
                      {money(receipt.customerTotal)}
                    </strong>
                  </div>
                )}
              </div>

              {receipt.reference && (
                <p className="break-all font-mono text-[11px] text-zinc-400">
                  Payment Ref: {receipt.reference}
                </p>
              )}
            </div>
          </article>

          {/* RIGHT SIDEBAR (4 COLS) */}
          <aside className="space-y-4 print:hidden lg:col-span-4">
            {/* Next Step Panel */}
            <section className="rounded-2xl border border-orange-200 bg-orange-50/70 p-5 shadow-sm dark:border-orange-500/30 dark:bg-orange-500/10">
              <p className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                Next Step
              </p>
              <h2 className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                {status === "pending"
                  ? "Accept this order"
                  : status === "accepted"
                    ? "Start preparing"
                    : status === "preparing"
                      ? "Pack & mark ready"
                      : ready
                        ? "Hand over at pickup"
                        : statusLabel(status)}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                {status === "pending"
                  ? "Review the items and customer notes before accepting."
                  : status === "accepted"
                    ? "Use the receipt to prepare the exact portions and choices."
                    : status === "preparing"
                      ? "Check every pack and label before marking ready for pickup."
                      : ready
                        ? "Keep the package ready until the assigned rider arrives."
                        : "The latest status for this order is displayed above."}
              </p>
              <div className="mt-4">
                <OrderActions
                  order={order}
                  vendor={vendorProfile}
                  onChanged={() => refetch()}
                  showCancel
                />
              </div>
            </section>

            {/* Customer & Delivery Panel */}
            <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                Customer &amp; Delivery
              </h2>
              <div className="mt-3 space-y-2.5 text-sm">
                <p className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-white">
                  <User size={15} className="text-zinc-400" />
                  {receipt.customer}
                </p>
                {receipt.phone && (
                  <a
                    href={`tel:${receipt.phone.replace(/[^+\d]/g, "")}`}
                    className="inline-flex items-center gap-2 font-semibold text-orange-600 hover:underline dark:text-orange-400"
                  >
                    <Phone size={15} />
                    {receipt.phone}
                  </a>
                )}
                {address && (
                  <p className="flex items-start gap-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-zinc-400" />
                    <span>{address}</span>
                  </p>
                )}
              </div>

              {receipt.rider && (
                <div className="mt-4 space-y-1 border-t border-zinc-100 pt-4 text-xs dark:border-zinc-800">
                  <p className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white">
                    <Bike size={14} className="text-sky-600 dark:text-sky-400" />
                    Assigned Rider
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-300">
                    {receipt.rider.name || "Rider assigned"}
                  </p>
                  {receipt.rider.phone && (
                    <a
                      href={`tel:${String(receipt.rider.phone).replace(/[^+\d]/g, "")}`}
                      className="inline-flex items-center gap-1.5 font-semibold text-orange-600 hover:underline dark:text-orange-400"
                    >
                      <Phone size={12} />
                      Call rider
                    </a>
                  )}
                </div>
              )}
            </section>

            {/* Store Earnings Breakdown */}
            <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2">
                <Wallet size={15} className="text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Store Earnings
                </h2>
              </div>
              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-zinc-500 dark:text-zinc-400">Store Payout</dt>
                  <dd className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {money(receipt.vendorPayout)}
                  </dd>
                </div>
                {receipt.commission != null && (
                  <div className="flex justify-between">
                    <dt className="text-zinc-500 dark:text-zinc-400">
                      Platform Commission
                    </dt>
                    <dd className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                      {money(receipt.commission)}
                    </dd>
                  </div>
                )}
                {receipt.deliveryShare > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-zinc-500 dark:text-zinc-400">
                      Delivery Share
                    </dt>
                    <dd className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                      {money(receipt.deliveryShare)}
                    </dd>
                  </div>
                )}
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                Your store payout settles into your available balance once
                delivered.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
