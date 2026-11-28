"use client";

import { useEffect, useRef } from "react";
import { useVendorProfile } from "@/app/context/VendorProfileContext";
import {
  VENDOR_ANALYTICS_EVENTS,
  identifyVendor,
  initVendorPostHog,
  trackVendorEvent,
} from "@/app/lib/analytics/posthog";

const SESSION_KEY = "melachow_vendor_ph_opened";

export default function VendorPostHogProvider({ children }) {
  const { vendorProfile, hasCheckedSession } = useVendorProfile();
  const openedRef = useRef(false);

  useEffect(() => {
    const ok = initVendorPostHog();
    if (!ok || openedRef.current) return;
    openedRef.current = true;
    try {
      if (window.sessionStorage.getItem(SESSION_KEY) !== "1") {
        window.sessionStorage.setItem(SESSION_KEY, "1");
        trackVendorEvent(VENDOR_ANALYTICS_EVENTS.VENDOR_APP_OPENED, {
          is_authenticated: Boolean(vendorProfile?._id || vendorProfile?.id),
        });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasCheckedSession && !vendorProfile) return;
    if (vendorProfile) {
      identifyVendor(vendorProfile);
    }
  }, [vendorProfile, hasCheckedSession]);

  return children;
}
