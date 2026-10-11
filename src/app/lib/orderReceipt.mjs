export const orderId = (order) =>
  String(order?._id?.$oid || order?._id || order?.id || "");
const identity = (value) =>
  String(
    value?._id?.$oid || value?._id || value?.id || value?.$oid || value || "",
  );
const amount = (value) =>
  value != null && value !== "" && Number.isFinite(Number(value))
    ? Number(value)
    : null;
const firstAmount = (...values) =>
  values.map(amount).find((value) => value !== null) ?? null;
const quantity = (value) => Math.max(1, Number(value) || 1);
const rounded = (value) =>
  value == null ? null : Math.round(value * 100) / 100;
export const money = (value) =>
  value == null
    ? "Not recorded"
    : `₦${Number(value).toLocaleString("en-NG", { minimumFractionDigits: Number(value) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
export const statusOf = (order) => {
  const status = String(order?.orderStatus || "pending").toLowerCase();
  return status === "ready" ? "ready_for_pickup" : status;
};
export const statusLabel = (status) =>
  ({
    pending: "Incoming",
    accepted: "Accepted",
    preparing: "Preparing",
    ready_for_pickup: "Ready for pickup",
    rider_assigned: "Rider assigned",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
    failed: "Failed",
    refunded: "Refunded",
    pending_activation: "Awaiting payment",
  })[status] || status.replaceAll("_", " ");
export function scopedItems(order) {
  const vendorId = identity(order.restaurantId);
  const nested = Array.isArray(order.userOrderId?.items)
    ? order.userOrderId.items
    : [];
  const own = Array.isArray(order.items) ? order.items : [];
  // Never fall back to another store's basket if filtering produces no matches.
  const filtered = nested.filter(
    (item) =>
      !vendorId ||
      !identity(item.restaurantId) ||
      identity(item.restaurantId) === vendorId,
  );
  return filtered.length
    ? filtered
    : own.filter(
        (item) =>
          !vendorId ||
          !identity(item.restaurantId) ||
          identity(item.restaurantId) === vendorId,
      );
}
export function receiptItem(item, moneyUnit = "naira") {
  const pricing = item.metadata?.pricing || {},
    packs = quantity(item.quantity),
    portionsPerPack = quantity(
      item.portion_quantity || item.metadata?.portion_quantity,
    );
  const source = Array.isArray(item.selected_options)
    ? item.selected_options
    : item.metadata?.selected_options || [];
  const options = source.map((option) => {
    const unitPrice = firstAmount(
      option.price_modifier_naira,
      option.priceModifierNaira,
      option.price_modifier_kobo != null
        ? Number(option.price_modifier_kobo) / 100
        : null,
    );
    const count = quantity(option.quantity) * packs;
    return {
      name: option.label || option.name || "Selected option",
      group: option.group_name || option.groupName || "Selected choices",
      quantity: count,
      perPack: quantity(option.quantity),
      unitPrice,
      total: rounded(unitPrice == null ? null : unitPrice * count),
    };
  });
  const optionsPerPack = options.every((option) => option.unitPrice != null)
    ? options.reduce(
        (sum, option) => sum + option.unitPrice * option.perPack,
        0,
      )
    : null;
  const scale = moneyUnit === "kobo" ? 100 : 1;
  const finalUnit = firstAmount(
    pricing.final_unit_naira,
    pricing.final_unit_kobo != null
      ? Number(pricing.final_unit_kobo) / 100
      : null,
    item.price != null ? Number(item.price) / scale : null,
    item.variant?.price != null ? Number(item.variant.price) / scale : null,
  );
  let basePerPack = firstAmount(
    pricing.base_naira,
    pricing.base_kobo != null ? Number(pricing.base_kobo) / 100 : null,
  );
  if (
    basePerPack == null &&
    finalUnit != null &&
    optionsPerPack != null &&
    finalUnit >= optionsPerPack
  )
    basePerPack = finalUnit - optionsPerPack;
  const total = rounded(
    finalUnit != null
      ? finalUnit * packs
      : basePerPack != null && optionsPerPack != null
        ? (basePerPack + optionsPerPack) * packs
        : null,
  );
  const portionCount = portionsPerPack * packs;
  const baseUnit = basePerPack == null ? null : basePerPack / portionsPerPack;
  const baseTotal = rounded(basePerPack == null ? null : basePerPack * packs);
  const groups = [...new Set(options.map((option) => option.group))].map(
    (name) => ({
      name,
      options: options.filter((option) => option.group === name),
    }),
  );
  const knownTotal =
    baseTotal == null || options.some((option) => option.total == null)
      ? null
      : rounded(
          baseTotal + options.reduce((sum, option) => sum + option.total, 0),
        );
  return {
    name: item.name || item.foodId?.name || item.variant?.name || "Menu item",
    packs,
    portionsPerPack,
    mealGroup: item.meal_group_label || item.metadata?.meal_group_label || "",
    note: item.note || "",
    portion:
      item.portion_label ||
      item.metadata?.portion_label ||
      (item.type === "combo" ? "Base combo" : "Portion"),
    portionCount,
    baseUnit,
    baseTotal,
    groups,
    total,
    adjustment:
      total != null && knownTotal != null ? rounded(total - knownTotal) : null,
  };
}
export function packingGroups(items) {
  const labels = new Map();
  const separated = items.some((item) => item.mealGroup);
  for (const item of items) {
    const label = separated ? item.mealGroup || "Person 1" : "Order items";
    if (!labels.has(label)) labels.set(label, []);
    labels.get(label).push(item);
  }
  return [...labels].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([label, groupItems]) => ({ label, items: groupItems }));
}
export function orderReceipt(order) {
  const parent =
    order.userOrderId && typeof order.userOrderId === "object"
      ? order.userOrderId
      : order;
  const user = parent.userId || order.userId || {};
  const items = scopedItems(order).map((item) =>
    receiptItem(item, order.moneyUnit || parent.moneyUnit || "naira"),
  );
  const itemsSubtotal = items.every((item) => item.total != null)
    ? rounded(items.reduce((sum, item) => sum + item.total, 0))
    : null;
  const sameVendorBasket =
    Array.isArray(parent.items) &&
    parent.items.length === scopedItems(order).length;
  const deliveryEntry = parent.vendorDeliveryFees?.find(
    (entry) => identity(entry.restaurantId) === identity(order.restaurantId),
  );
  return {
    id: orderId(order),
    code:
      parent.orderId || order.orderId || orderId(order).slice(-8).toUpperCase(),
    customer:
      user.fullName ||
      `${user.firstname || ""} ${user.lastname || ""}`.trim() ||
      user.name ||
      "Customer",
    phone: user.phone || parent.phone || order.phone || "",
    address: parent.deliveryAddress || order.deliveryAddress || null,
    note: order.customerNote || "",
    items,
    packingGroups: packingGroups(items),
    itemsSubtotal,
    deliveryFee: firstAmount(
      deliveryEntry?.deliveryFee,
      sameVendorBasket ? parent.deliveryFee : null,
    ),
    serviceFee: sameVendorBasket ? amount(parent.serviceFee) : null,
    customerTotal: sameVendorBasket ? amount(parent.total) : null,
    isWholeBasket: sameVendorBasket,
    paymentStatus: parent.paymentStatus || order.paymentStatus || "",
    reference: parent.paymentReference || "",
    vendorPayout: amount(order.vendorTotal),
    commission: amount(order.commission),
    deliveryShare: amount(order.deliveryShare),
    rider:
      typeof order.riderId === "object"
        ? order.riderId
        : typeof parent.riderId === "object"
          ? parent.riderId
          : null,
  };
}
export function nextOrderAction(order, vendor) {
  const status = statusOf(order);
  const payment = order.userOrderId?.paymentStatus || order.paymentStatus;
  if (status === "pending" && ["pending", "unpaid", "failed"].includes(payment))
    return null;
  if (status === "pending")
    return { status: "accepted", label: "Accept order" };
  if (status === "accepted")
    return { status: "preparing", label: "Start preparing" };
  if (status === "preparing")
    return { status: "ready_for_pickup", label: "Mark ready for pickup" };
  if (status === "delivered" && vendor?.deliveryManagedBy === "vendor")
    return { status: "completed", label: "Complete order" };
  return null;
}
export function queueGroup(order) {
  const status = statusOf(order);
  if (status === "pending") return "incoming";
  if (["accepted", "preparing"].includes(status)) return "preparing";
  if (["ready_for_pickup", "rider_assigned"].includes(status)) return "ready";
  return "history";
}
