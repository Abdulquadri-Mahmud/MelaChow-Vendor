"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BellRing, VolumeX } from "lucide-react";
import Sidebar from "./Sidebar";
import VendorDashboardHeader from "../VendorDashboardHeader";
import { useVendorStorage } from "@/app/hooks/vendorStorage";
import {
  isVendorAlarmRinging,
  stopVendorOrderAlarm,
  subscribeVendorAlarmEvents,
  syncVendorAlarmPreferences,
} from "@/app/lib/nativeVendorAlarm";

export default function DashboardLayout({ children }) {
  const [active, setActive] = useState("My Foods");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alarmRinging, setAlarmRinging] = useState(false);

  const { vendorDetails, isLoading } = useVendorStorage();
  const vendor = vendorDetails?.vendor;

  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !vendor) {
      router.push("/vendors/auth/login");
    }
  }, [isLoading, vendor, router]);

  useEffect(() => {
    void syncVendorAlarmPreferences();
    void isVendorAlarmRinging().then(setAlarmRinging);
    const unsubscribe = subscribeVendorAlarmEvents({
      onStarted: () => setAlarmRinging(true),
      onStopped: () => setAlarmRinging(false),
      onOpened: () => setAlarmRinging(false),
    });
    return () => unsubscribe();
  }, []);

  // Show loading state while fetching vendor data
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar - fixed */}
      {vendor && <Sidebar
        active={active}
        setActive={setActive}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 bg-gray-50 dark:bg-zinc-950 min-h-screen overflow-hidden">
        {/* Sticky Header */}
        {vendor && <div className="sticky top-0 z-50">
          <VendorDashboardHeader
            vendor={vendor}
            onMenuClick={() => setMobileMenuOpen(true)}
          />
        </div>}

        {/* Active Incoming Order Alarm Banner */}
        {vendor && alarmRinging && (
          <div className="z-40 border-b border-orange-700/30 bg-orange-600 px-4 py-3 text-white shadow-md">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <BellRing size={18} className="shrink-0 animate-bounce" />
                <p className="text-xs font-extrabold uppercase tracking-wider sm:text-sm">
                  New Customer Order Ringing!
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void stopVendorOrderAlarm();
                    router.push("/vendors/order");
                  }}
                  className="rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-orange-700 shadow-sm transition hover:bg-orange-50"
                >
                  Open Order Desk
                </button>
                <button
                  type="button"
                  onClick={() => void stopVendorOrderAlarm()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-black/25 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-black/35"
                >
                  <VolumeX size={14} /> Silence
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto scroll p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
