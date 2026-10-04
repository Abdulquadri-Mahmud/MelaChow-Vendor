import { test } from "node:test";
import assert from "node:assert/strict";
import {
  receiptItem,
  orderReceipt,
  scopedItems,
  nextOrderAction,
  queueGroup,
  money,
} from "../src/app/lib/orderReceipt.mjs";

const item = () => ({
  name: "Jollof rice",
  restaurantId: "store-a",
  quantity: 2,
  portion_quantity: 2,
  portion_label: "Regular",
  price: 2050,
  selected_options: [
    {
      group_name: "Choose protein",
      label: "Chicken",
      quantity: 3,
      price_modifier_naira: 150,
    },
  ],
  metadata: { pricing: { base_naira: 1600, final_unit_naira: 2050 } },
});
test("receipt multiplies portions and option quantities by packs exactly once", () => {
  const row = receiptItem(item());
  assert.equal(row.portionCount, 4);
  assert.equal(row.baseUnit, 800);
  assert.equal(row.baseTotal, 3200);
  assert.equal(row.groups[0].options[0].quantity, 6);
  assert.equal(row.groups[0].options[0].unitPrice, 150);
  assert.equal(row.groups[0].options[0].total, 900);
  assert.equal(row.total, 4100);
  assert.equal(row.adjustment, 0);
});
test("supports explicit PostgreSQL kobo pricing snapshots", () => {
  const value = item();
  value.metadata = { pricing: { base_kobo: 160000, final_unit_kobo: 205000 } };
  assert.equal(receiptItem(value).baseUnit, 800);
  assert.equal(receiptItem(value).total, 4100);
});
test("legacy final prices include choices and do not charge them twice", () => {
  const value = item();
  value.metadata = {};
  assert.equal(receiptItem(value).baseUnit, 800);
  assert.equal(receiptItem(value).total, 4100);
});
test("free selected choices show zero instead of missing prices", () => {
  const value = item();
  value.price = 1600;
  value.metadata = {};
  value.selected_options[0].price_modifier_naira = 0;
  const row = receiptItem(value);
  assert.equal(row.groups[0].options[0].total, 0);
  assert.equal(row.baseTotal, 3200);
});
test("missing option prices are not invented from the current menu", () => {
  const value = item();
  delete value.selected_options[0].price_modifier_naira;
  value.metadata = {};
  const row = receiptItem(value);
  assert.equal(row.groups[0].options[0].unitPrice, null);
  assert.equal(row.baseUnit, null);
  assert.equal(row.total, 4100);
});
test("keeps recorded price adjustments visible when breakdowns do not match", () => {
  const value = item();
  value.metadata.pricing.final_unit_naira = 2000;
  assert.equal(receiptItem(value).adjustment, -100);
});
test("decimal prices preserve cents in line totals and display", () => {
  const row = receiptItem({ name: "Drink", quantity: 3, price: 100.25 });
  assert.equal(row.total, 300.75);
  assert.equal(money(row.total), "₦300.75");
});
test("vendor receipts exclude other stores and never fall back to their items", () => {
  const value = {
    restaurantId: { _id: "store-a" },
    items: [],
    userOrderId: {
      items: [{ ...item(), restaurantId: "store-b" }],
      total: 5000,
      deliveryFee: 600,
    },
  };
  assert.deepEqual(scopedItems(value), []);
  assert.equal(orderReceipt(value).customerTotal, null);
});
test("multi-store fees and totals stay scoped to this store", () => {
  const value = {
    restaurantId: "store-a",
    userOrderId: {
      items: [item(), { ...item(), restaurantId: "store-b" }],
      total: 9999,
      deliveryFee: 1000,
      serviceFee: 100,
      vendorDeliveryFees: [{ restaurantId: "store-a", deliveryFee: 450 }],
    },
  };
  const receipt = orderReceipt(value);
  assert.equal(receipt.itemsSubtotal, 4100);
  assert.equal(receipt.deliveryFee, 450);
  assert.equal(receipt.customerTotal, null);
  assert.equal(receipt.serviceFee, null);
});
test("single-store receipt retains customer paid total and fee breakdown", () => {
  const value = {
    restaurantId: "store-a",
    userOrderId: {
      items: [item()],
      total: 4550,
      deliveryFee: 450,
      serviceFee: 0,
      paymentStatus: "paid",
      userId: { fullName: "Amina" },
    },
  };
  const receipt = orderReceipt(value);
  assert.equal(receipt.customerTotal, 4550);
  assert.equal(receipt.serviceFee, 0);
  assert.equal(receipt.customer, "Amina");
});
test("accept, prepare and ready actions use the established API statuses", () => {
  assert.equal(
    nextOrderAction({
      orderStatus: "pending",
      userOrderId: { paymentStatus: "paid" },
    }).status,
    "accepted",
  );
  assert.equal(
    nextOrderAction({ orderStatus: "accepted" }).status,
    "preparing",
  );
  assert.equal(
    nextOrderAction({ orderStatus: "preparing" }).status,
    "ready_for_pickup",
  );
  assert.equal(nextOrderAction({ orderStatus: "ready_for_pickup" }), null);
});
test("unpaid orders cannot be accepted and platform delivery cannot be completed by vendors", () => {
  assert.equal(
    nextOrderAction({
      orderStatus: "pending",
      userOrderId: { paymentStatus: "unpaid" },
    }),
    null,
  );
  assert.equal(
    nextOrderAction(
      { orderStatus: "delivered" },
      { deliveryManagedBy: "platform" },
    ),
    null,
  );
});
test("rider-assigned orders remain in the pickup queue, not history", () => {
  assert.equal(queueGroup({ orderStatus: "rider_assigned" }), "ready");
  assert.equal(queueGroup({ orderStatus: "ready" }), "ready");
});
