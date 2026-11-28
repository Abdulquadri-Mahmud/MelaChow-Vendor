"use client";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getVendorOrders } from "@/app/lib/vendorApi";
import { useVendorProfile } from "@/app/context/VendorProfileContext";

const DEFAULT_AUTO_CANCEL_MINUTES = 10;

const isVendorVisibleOrder = (order) => {
  const payment = String(
    order?.userOrderId?.paymentStatus || order?.paymentStatus || ""
  )
    .trim()
    .toLowerCase();
  // Defense-in-depth: hide unpaid / failed checkout attempts from the kitchen desk.
  return !["pending", "unpaid", "failed"].includes(payment);
};

export default function useVendorOrders() {
  const { vendorProfile } = useVendorProfile();
  const client = useQueryClient();
  const vendorId = vendorProfile?._id || vendorProfile?.id;
  const key = ["vendor-orders", vendorId];
  const query = useQuery({
    queryKey: key,
    enabled: !!vendorId,
    queryFn: async () => {
      const response = await getVendorOrders();
      const rawOrders = response.vendorOrders || response.data || response;
      if (!Array.isArray(rawOrders))
        throw new Error("Your orders could not be loaded. Please retry.");
      const orders = rawOrders.filter(isVendorVisibleOrder);
      const parsedMinutes = Number(
        response?.meta?.autoCancelMinutes ??
          orders[0]?.autoCancelMinutes ??
          DEFAULT_AUTO_CANCEL_MINUTES
      );
      const autoCancelMinutes =
        Number.isFinite(parsedMinutes) && parsedMinutes > 0
          ? Math.round(parsedMinutes)
          : DEFAULT_AUTO_CANCEL_MINUTES;
      return { orders, autoCancelMinutes };
    },
    staleTime: 5000,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    const refresh = () =>
      client.invalidateQueries({ queryKey: ["vendor-orders", vendorId] });
    const onAlarmState = (event) => {
      if (event?.detail?.ringing) refresh();
    };
    window.addEventListener("vendor:new-order", refresh);
    window.addEventListener("vendor:orders-updated", refresh);
    window.addEventListener("melachow:vendor-alarm-state", onAlarmState);
    return () => {
      window.removeEventListener("vendor:new-order", refresh);
      window.removeEventListener("vendor:orders-updated", refresh);
      window.removeEventListener("melachow:vendor-alarm-state", onAlarmState);
    };
  }, [client, vendorId]);
  const orders = Array.isArray(query.data)
    ? query.data
    : query.data?.orders || [];
  const autoCancelMinutes = Array.isArray(query.data)
    ? DEFAULT_AUTO_CANCEL_MINUTES
    : query.data?.autoCancelMinutes || DEFAULT_AUTO_CANCEL_MINUTES;
  return { ...query, orders, autoCancelMinutes, vendor: vendorProfile };
}
