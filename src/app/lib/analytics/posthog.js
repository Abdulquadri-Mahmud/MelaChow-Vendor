"use client";

import posthog from "posthog-js";

export const VENDOR_ANALYTICS_EVENTS = Object.freeze({
  VENDOR_APP_OPENED: "vendor_app_opened",
  VENDOR_LOGIN_COMPLETED: "vendor_login_completed",
  VENDOR_LOGOUT_COMPLETED: "vendor_logout_completed",
  VENDOR_ORDER_STATUS_UPDATED: "vendor_order_status_updated",
  VENDOR_AVAILABILITY_UPDATED: "vendor_availability_updated",
  VENDOR_MENU_ITEM_CREATED: "vendor_menu_item_created",
});

const POSTHOG_KEY = (process.env.NEXT_PUBLIC_POSTHOG_KEY || "").trim();
const POSTHOG_HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com").trim();
const POSTHOG_ENABLED_FLAG = (process.env.NEXT_PUBLIC_POSTHOG_ENABLED || "true").trim().toLowerCase();
const APP_ENVIRONMENT = (
  process.env.NEXT_PUBLIC_APP_ENV ||
  process.env.NEXT_PUBLIC_VERCEL_ENV ||
  process.env.NODE_ENV ||
  "development"
).trim();
const APP_VERSION = (process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0").trim();

const FORBIDDEN_KEY_PATTERN =
  /^(email|phone|password|pin|otp|token|secret|bank_?account|account_?number|bvn|nin|address_?line)$/i;

let initialized = false;
let lastVendorDistinctId = null;

function detectVendorPlatform() {
  if (typeof window === "undefined") return "server";
  try {
    if (window.__TAURI_INTERNALS__ || window.__TAURI__) return "desktop_tauri";
    const cap = window.Capacitor;
    if (cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform()) {
      const p = typeof cap.getPlatform === "function" ? String(cap.getPlatform()).toLowerCase() : "";
      return p === "ios" ? "ios_capacitor" : "android_capacitor";
    }
    return "web";
  } catch {
    return "web";
  }
}

export function isVendorAnalyticsEnabled() {
  if (typeof window === "undefined") return false;
  if (!POSTHOG_KEY) return false;
  if (POSTHOG_ENABLED_FLAG === "false" || POSTHOG_ENABLED_FLAG === "0") return false;
  return true;
}

function getBaseContext() {
  return {
    app: "melachow_vendor",
    platform: detectVendorPlatform(),
    environment: APP_ENVIRONMENT,
    app_version: APP_VERSION,
  };
}

function sanitize(props = {}) {
  const clean = {};
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null) continue;
    if (FORBIDDEN_KEY_PATTERN.test(k)) continue;
    if (typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) continue;
    clean[k] = v;
  }
  return clean;
}

export function initVendorPostHog() {
  if (typeof window === "undefined" || initialized || !isVendorAnalyticsEnabled()) return initialized;
  try {
    const platform = detectVendorPlatform();
    const isNativeCapacitor = platform === "android_capacitor" || platform === "ios_capacitor";
    const useLocalStorageOnly = platform !== "web";
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: false,
      persistence: useLocalStorageOnly ? "localStorage" : "localStorage+cookie",
      disable_compression: isNativeCapacitor,
      ...(isNativeCapacitor ? { api_transport: "fetch" } : {}),
      person_profiles: "identified_only",
      disable_session_recording: true,
      loaded: (client) => {
        try {
          client.register(getBaseContext());
        } catch {}
      },
    });
    initialized = true;
    return true;
  } catch {
    return false;
  }
}

export function identifyVendor(vendor) {
  if (typeof window === "undefined" || !isVendorAnalyticsEnabled()) return;
  const rawId = vendor?._id || vendor?.id;
  if (!rawId) return;
  const distinctId = `vendor:${String(rawId).trim()}`;
  if (lastVendorDistinctId === distinctId) return;

  try {
    if (!initialized) initVendorPostHog();
    if (!initialized) return;
    posthog.identify(
      distinctId,
      sanitize({
        user_role: "vendor",
        restaurant_id: String(rawId),
        city: vendor?.address?.city,
        state: vendor?.address?.state,
        is_approved: typeof vendor?.isApproved === "boolean" ? vendor.isApproved : undefined,
        environment: APP_ENVIRONMENT,
      })
    );
    lastVendorDistinctId = distinctId;
  } catch {}
}

export function trackVendorEvent(eventName, properties = {}) {
  if (typeof window === "undefined" || !eventName || !isVendorAnalyticsEnabled()) return;
  try {
    if (!initialized) initVendorPostHog();
    if (!initialized) return;
    posthog.capture(eventName, sanitize({ ...getBaseContext(), ...properties }));
  } catch {}
}

export function resetVendorAnalyticsIdentity() {
  lastVendorDistinctId = null;
  if (typeof window === "undefined" || !initialized) return;
  try {
    posthog.reset();
    posthog.register(getBaseContext());
  } catch {}
}
