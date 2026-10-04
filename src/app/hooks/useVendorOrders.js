"use client";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getVendorOrders } from "@/app/lib/vendorApi";
import { useVendorProfile } from "@/app/context/VendorProfileContext";

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
      const orders = response.vendorOrders || response.data || response;
      if (!Array.isArray(orders))
        throw new Error("Your orders could not be loaded. Please retry.");
      return orders;
    },
    staleTime: 5000,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    const refresh = () =>
      client.invalidateQueries({ queryKey: ["vendor-orders", vendorId] });
    window.addEventListener("vendor:new-order", refresh);
    window.addEventListener("vendor:orders-updated", refresh);
    return () => {
      window.removeEventListener("vendor:new-order", refresh);
      window.removeEventListener("vendor:orders-updated", refresh);
    };
  }, [client, vendorId]);
  return { ...query, orders: query.data || [], vendor: vendorProfile };
}
