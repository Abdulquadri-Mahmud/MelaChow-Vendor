"use client";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Capacitor, registerPlugin } from "@capacitor/core";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Printer,
  Phone,
  MapPin,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { getVendorOrderById } from "@/app/lib/vendorApi";
import { useVendorProfile } from "@/app/context/VendorProfileContext";
import {
  orderReceipt,
  statusOf,
  statusLabel,
  money,
} from "@/app/lib/orderReceipt.mjs";
import OrderReceiptItems from "@/app/components/order/OrderReceiptItems";
import OrderActions from "@/app/components/order/OrderActions";
import PickupCodeControl from "@/app/components/order/PickupCodeControl";
import "@/app/components/order/vendor-orders.css";

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
  const { id } = useParams(),
    router = useRouter();
  const { vendorProfile } = useVendorProfile();
  const {
    data: order,
    isPending,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["vendor-order", id],
    enabled: !!id,
    queryFn: async () => {
      const result = await getVendorOrderById(id);
      const value = result.data || result.vendorOrder || result;
      if (!value?._id && !value?.id)
        throw new Error("Order details were not returned.");
      return value;
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  const printReceipt = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await ReceiptPrinter.print({ name: `MelaChow receipt ${order?.userOrderId?.orderId || id}` });
      } catch (error) {
        console.error("Could not open Android printing:", error);
        toast.error("Could not open printing on this device.");
      }
      return;
    }
    window.print();
  };
  if (isPending && !order)
    return (
      <div className="vendor-orders-page order-empty" role="status">
        <Loader2 size={28} className="animate-spin" />
        <p>Loading the order receipt…</p>
      </div>
    );
  if (!order)
    return (
      <div className="vendor-orders-page order-empty">
        <h1>We couldn’t load this order</h1>
        <p>Check your connection and try again.</p>
        <button
          type="button"
          className="order-button primary"
          onClick={() => refetch()}
        >
          Try again
        </button>
        <button
          type="button"
          className="order-button secondary"
          onClick={() => router.push("/vendors/order")}
        >
          Back to orders
        </button>
      </div>
    );
  const receipt = orderReceipt(order),
    status = statusOf(order),
    created = new Date(order.createdAt),
    address = addressText(receipt.address);
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
            100,
        ) / 100
      : null;
  return (
    <div className="vendor-orders-page order-details-page">
      <header className="order-detail-header print-hidden">
        <button
          type="button"
          className="order-back"
          onClick={() => router.push("/vendors/order")}
        >
          <ArrowLeft size={18} /> All orders
        </button>
        <div>
          <button
            type="button"
            className="order-button secondary"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            type="button"
            className="order-button secondary"
            onClick={printReceipt}
          >
            <Printer size={16} /> Print receipt
          </button>
        </div>
      </header>
      {isError && (
        <p className="order-error print-hidden" role="alert">
          The order couldn’t refresh. These are the last loaded details.
        </p>
      )}
      {ready && vendorProfile?.deliveryManagedBy === "admin" && (
        <div className="order-pickup-top print-hidden"><PickupCodeControl orderId={receipt.id} /></div>
      )}
      <div className="order-details-grid">
        <article className="vendor-receipt print-receipt">
          <header className="receipt-header">
            <p className="order-eyebrow">
              {vendorProfile?.storeName ||
                vendorProfile?.restaurantName ||
                "MelaChow"}{" "}
              · Order receipt
            </p>
            <div>
              <h1>{receipt.code}</h1>
              <span className={`order-status status-${status}`}>
                {statusLabel(status)}
              </span>
            </div>
            <p>
              {!Number.isNaN(created.getTime())
                ? created.toLocaleString("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Africa/Lagos",
                  })
                : "Date not recorded"}
            </p>
            <dl>
              <div>
                <dt>Customer</dt>
                <dd>{receipt.customer}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>
                  {receipt.paymentStatus === "paid"
                    ? "Paid"
                    : receipt.paymentStatus || "Not recorded"}
                </dd>
              </div>
            </dl>
          </header>
          <div className="receipt-body">
            {receipt.packingGroups.length > 1 && <p className="order-packing-alert"><strong>{receipt.packingGroups.length} separate packs.</strong> Pack and label each person’s items individually.</p>}
            <h2>What the customer ordered</h2>
            <p className="receipt-help">
              Quantities below show the total to prepare across all packs.
            </p>
            {receipt.note && (
              <p className="order-customer-note">
                <strong>Customer note:</strong> {receipt.note}
              </p>
            )}
            <OrderReceiptItems items={receipt.items} />
            <div className="receipt-totals">
              <div>
                <span>Items subtotal</span>
                <strong>{money(receipt.itemsSubtotal)}</strong>
              </div>
              {receipt.deliveryFee != null && (
                <div>
                  <span>
                    Delivery fee
                    {!receipt.isWholeBasket ? " for this store" : ""}
                  </span>
                  <strong>{money(receipt.deliveryFee)}</strong>
                </div>
              )}
              {receipt.serviceFee != null && (
                <div>
                  <span>Service fee</span>
                  <strong>{money(receipt.serviceFee)}</strong>
                </div>
              )}
              {adjustment != null && adjustment !== 0 && (
                <div>
                  <span>
                    {adjustment < 0
                      ? "Discounts / adjustments"
                      : "Other adjustments"}
                  </span>
                  <strong>
                    {adjustment < 0 ? "−" : "+"}
                    {money(Math.abs(adjustment))}
                  </strong>
                </div>
              )}
              {receipt.customerTotal != null && (
                <div className="receipt-grand-total">
                  <span>
                    {receipt.paymentStatus === "paid"
                      ? "Total paid"
                      : "Order total"}
                  </span>
                  <strong>{money(receipt.customerTotal)}</strong>
                </div>
              )}
              {!receipt.isWholeBasket && (
                <p className="receipt-help">
                  This receipt shows this store’s items. The customer’s full
                  checkout may include other stores.
                </p>
              )}
            </div>
            {receipt.reference && (
              <p className="receipt-reference">
                Payment reference: {receipt.reference}
              </p>
            )}
          </div>
        </article>
        <aside className="order-detail-sidebar print-hidden">
          <section className="order-next-panel">
            <p className="order-eyebrow">Next step</p>
            <h2>
              {status === "pending"
                ? "Accept this order"
                : status === "accepted"
                  ? "Start preparing"
                  : status === "preparing"
                    ? "Pack and mark ready"
                    : ready
                      ? "Hand over at pickup"
                      : statusLabel(status)}
            </h2>
            <p>
              {status === "pending"
                ? "Review the items and customer notes before accepting."
                : status === "accepted"
                  ? "Use the receipt to prepare the correct portions and selected choices."
                  : status === "preparing"
                    ? "Check every item and selected option before marking the package ready."
                    : ready
                      ? "Keep the order packed until the assigned rider arrives."
                      : "The order’s latest status is shown above."}
            </p>
            <OrderActions
              order={order}
              vendor={vendorProfile}
              onChanged={() => refetch()}
              showCancel
            />
          </section>
          <section className="order-contact-panel">
            <h2>Customer & delivery</h2>
            <h3>{receipt.customer}</h3>
            {receipt.phone && (
              <a href={`tel:${receipt.phone.replace(/[^+\d]/g, "")}`}>
                <Phone size={17} />
                {receipt.phone}
              </a>
            )}
            {address && (
              <p>
                <MapPin size={18} />
                <span>{address}</span>
              </p>
            )}
            {receipt.rider && (
              <div className="order-rider">
                <strong>Assigned rider</strong>
                <span>{receipt.rider.name || "Rider assigned"}</span>
                {receipt.rider.phone && (
                  <a
                    href={`tel:${String(receipt.rider.phone).replace(/[^+\d]/g, "")}`}
                  >
                    Call rider
                  </a>
                )}
              </div>
            )}
            {!receipt.rider && ready && (
              <p className="receipt-help">Awaiting rider assignment.</p>
            )}
          </section>
          <details className="order-payout-panel">
            <summary>Store earnings</summary>
            <dl>
              <div>
                <dt>Store payout</dt>
                <dd>{money(receipt.vendorPayout)}</dd>
              </div>
              {receipt.commission != null && (
                <div>
                  <dt>Platform commission</dt>
                  <dd>{money(receipt.commission)}</dd>
                </div>
              )}
              {receipt.deliveryShare > 0 && (
                <div>
                  <dt>Store delivery share</dt>
                  <dd>{money(receipt.deliveryShare)}</dd>
                </div>
              )}
            </dl>
            <p>
              Your store payout is separate from the customer’s receipt total.
            </p>
          </details>
        </aside>
      </div>
    </div>
  );
}
