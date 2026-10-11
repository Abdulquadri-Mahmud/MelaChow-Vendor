"use client";
import Link from "next/link";
import { Clock, PackageCheck, ReceiptText } from "lucide-react";
import { useVendorProfile } from "@/app/context/VendorProfileContext";
import {
  money,
  orderReceipt,
  statusOf,
  statusLabel,
} from "@/app/lib/orderReceipt.mjs";
import OrderReceiptItems from "./OrderReceiptItems";
import OrderActions from "./OrderActions";
import PickupCodeControl from "./PickupCodeControl";
import "./vendor-orders.css";

export default function VendorOrderCard({ order, onRefresh }) {
  const { vendorProfile } = useVendorProfile();
  const receipt = orderReceipt(order),
    status = statusOf(order);
  const created = new Date(order.createdAt),
    validDate = !Number.isNaN(created.getTime());
  return (
    <article
      className={`vendor-order-card ${status === "pending" ? "is-incoming" : ""}`}
      aria-label={`Order ${receipt.code}`}
    >
      <header className="order-card-header">
        <div>
          <Link
            href={`/vendors/order/${receipt.id}`}
            className="order-card-code"
          >
            {receipt.code || "Order"}
          </Link>
          <p>{receipt.customer}</p>
        </div>
        <span className={`order-status status-${status}`}>
          {statusLabel(status)}
        </span>
      </header>
      <div className="order-card-meta">
        <span>
          <Clock size={14} />
          {validDate
            ? created.toLocaleTimeString("en-NG", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Africa/Lagos",
              })
            : "Time not recorded"}
        </span>
        <span className={receipt.paymentStatus === "paid" ? "order-paid" : ""}>
          {receipt.paymentStatus === "paid"
            ? "Paid"
            : receipt.paymentStatus
              ? `Payment: ${receipt.paymentStatus}`
              : "Payment not recorded"}
        </span>
      </div>
      {receipt.note && (
        <p className="order-customer-note">
          <strong>Customer note:</strong> {receipt.note}
        </p>
      )}
      {receipt.packingGroups.length > 1 && (
        <div className="order-packing-alert"><PackageCheck size={17} /> <span><strong>{receipt.packingGroups.length} separate packs</strong> · Label each person’s food before handoff.</span></div>
      )}
      <OrderReceiptItems items={receipt.items} compact />
      <div className="order-card-total">
        <span>Items subtotal</span>
        <strong>{money(receipt.itemsSubtotal)}</strong>
      </div>
      <div className="order-card-footer">
        <OrderActions
          order={order}
          vendor={vendorProfile}
          onChanged={onRefresh}
        />
        {["ready_for_pickup", "rider_assigned"].includes(status) && vendorProfile?.deliveryManagedBy === "admin" && (
          <PickupCodeControl orderId={receipt.id} compact />
        )}
        <Link
          href={`/vendors/order/${receipt.id}`}
          className="order-receipt-link"
        >
          <ReceiptText size={16} /> Full receipt & details
        </Link>
      </div>
    </article>
  );
}
