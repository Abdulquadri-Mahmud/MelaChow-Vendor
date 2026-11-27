"use client";
import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import toast from "react-hot-toast";
import { TokenManager } from "@/app/lib/auth-token";
import { nativePushTokenKey, registerNativePushToken, removeNativePushToken } from "@/app/lib/push-notification-service";
import {
  isVendorDismissAlarmPush,
  isVendorNewOrderPush,
  startVendorOrderAlarm,
  stopVendorOrderAlarm,
  subscribeVendorAlarmEvents,
  syncVendorAlarmPreferences,
} from "@/app/lib/nativeVendorAlarm";

const safeRoute = (target) =>
  typeof target === "string" && target.startsWith("/") && !target.startsWith("//") ? target : null;

export default function NativePushRuntime({ role = "vendor" }) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    const handles = [];

    void syncVendorAlarmPreferences();

    const unsubscribeAlarm = subscribeVendorAlarmEvents({
      onOpened: (detail) => {
        void stopVendorOrderAlarm();
        const route = safeRoute(detail?.route) || "/vendors/order";
        if (typeof window !== "undefined") {
          if (window.__melachowVendorNavigate) window.__melachowVendorNavigate(route);
          else window.location.href = route;
        }
      },
    });

    const add = async (event, callback) => {
      const handle = await PushNotifications.addListener(event, callback);
      if (disposed) await handle.remove(); else handles.push(handle);
    };
    const sync = async (token) => {
      if (!token) return;
      localStorage.setItem(nativePushTokenKey(role), token);
      if (TokenManager.getToken(role)) {
        try { await registerNativePushToken(token, role, Capacitor.getPlatform()); }
        catch (error) { console.warn("FCM token sync deferred until sign-in.", error.response?.status || error.message); }
      }
    };
    const clear = (event) => {
      if (event.detail?.role !== role) return;
      void stopVendorOrderAlarm();
      const token = localStorage.getItem(nativePushTokenKey(role));
      const authToken = TokenManager.getToken(role);
      if (token && authToken) removeNativePushToken(token, role, authToken).catch(() => {});
      localStorage.removeItem(nativePushTokenKey(role));
    };
    const tokenChanged = () => { const token = localStorage.getItem(nativePushTokenKey(role)); if (token) void sync(token); void ensureRegistration().catch((error) => console.warn("FCM registration deferred:", error)); };
    const ensureRegistration = async () => {
      if (!TokenManager.getToken(role)) return;
      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === "prompt" || permission.receive === "prompt-with-rationale") permission = await PushNotifications.requestPermissions();
      if (permission.receive !== "granted") return;
      // Native VendorAlarmChannels creates melachow_vendor_order_alarm_v1 & melachow_orders with USAGE_ALARM sound.
      await PushNotifications.register();
    };
    const openNotification = ({ notification }) => {
      void stopVendorOrderAlarm();
      const target = safeRoute(notification?.data?.url || notification?.data?.route);
      if (target) {
        if (window.__melachowVendorNavigate) window.__melachowVendorNavigate(target);
        else window.location.href = target;
      }
    };
    const showNotification = (notification) => {
      if (isVendorDismissAlarmPush(notification)) {
        void stopVendorOrderAlarm();
      } else if (isVendorNewOrderPush(notification)) {
        const data = notification?.data || {};
        void startVendorOrderAlarm({
          title: notification?.title || data.title || "New Order Received!",
          body: notification?.body || data.body || "Open MelaChow Vendor now to accept.",
          orderId: data.orderDatabaseId || data.orderId || "",
          route: safeRoute(data.url || data.route) || "/vendors/order",
        });
      }
      toast(notification.body || notification.title || "You have a new MelaChow update.", { duration: 7000 });
    };
    window.addEventListener("melachow:auth-token-set", tokenChanged);
    window.addEventListener("melachow:auth-token-clearing", clear);
    const setup = async () => {
      await add("registration", ({ value }) => { void sync(value); });
      await add("registrationError", ({ error }) => console.error("FCM registration failed", error));
      await add("pushNotificationReceived", showNotification);
      await add("pushNotificationActionPerformed", openNotification);
      const saved = localStorage.getItem(nativePushTokenKey(role));
      if (saved && TokenManager.getToken(role)) await sync(saved);
      await ensureRegistration();
    };
    void setup().catch((error) => console.error("Native push setup failed", error));
    const appState = App.addListener("appStateChange", ({ isActive }) => { if (isActive) tokenChanged(); });
    return () => {
      disposed = true;
      unsubscribeAlarm();
      window.removeEventListener("melachow:auth-token-set", tokenChanged);
      window.removeEventListener("melachow:auth-token-clearing", clear);
      handles.forEach((handle) => handle.remove());
      appState.then((handle) => handle.remove());
    };
  }, [role]);
  return null;
}
