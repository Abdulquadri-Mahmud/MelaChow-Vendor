import { Capacitor, registerPlugin } from "@capacitor/core";
import { getVendorAlertSettings, playVendorNewOrderAlert, saveVendorAlertSettings } from "@/app/lib/vendorAlertSettings";

const VendorAlarm = registerPlugin("VendorAlarm");

let webAudioElement = null;
let webChimeTimer = null;
let webAutoStopTimer = null;
let webRinging = false;

export const isNativeAndroidVendorAlarmSupported = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

function emitWebAlarmState(ringing, extra = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("melachow:vendor-alarm-state", { detail: { ringing, ...extra } }));
}

function stopWebAlarmFallback() {
  webRinging = false;
  if (webChimeTimer) {
    window.clearInterval(webChimeTimer);
    webChimeTimer = null;
  }
  if (webAutoStopTimer) {
    window.clearTimeout(webAutoStopTimer);
    webAutoStopTimer = null;
  }
  if (webAudioElement) {
    try {
      webAudioElement.pause();
      webAudioElement.currentTime = 0;
    } catch {}
  }
  try {
    navigator.vibrate?.(0);
  } catch {}
  emitWebAlarmState(false);
}

function startWebAlarmFallback({ durationMs = 60000, orderId = "", route = "/vendors/order", force = false } = {}) {
  if (typeof window === "undefined") return;
  const settings = getVendorAlertSettings();
  if (!force && !settings.alarmEnabled) return;

  stopWebAlarmFallback();
  webRinging = true;
  emitWebAlarmState(true, { orderId, route });

  const startChimeLoop = () => {
    playVendorNewOrderAlert({ vibrationEnabled: settings.vibrationEnabled });
    webChimeTimer = window.setInterval(() => {
      playVendorNewOrderAlert({ vibrationEnabled: settings.vibrationEnabled });
    }, Math.max(3000, Number(settings.intervalSeconds || 6) * 1000));
  };

  try {
    if (!webAudioElement) {
      webAudioElement = new Audio("/sounds/vendor_order_alarm.wav");
      webAudioElement.loop = true;
      webAudioElement.volume = 1.0;
    }
    webAudioElement.currentTime = 0;
    const playPromise = webAudioElement.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => startChimeLoop());
    }
    if (settings.vibrationEnabled) {
      navigator.vibrate?.([400, 180, 400, 180, 600]);
    }
  } catch {
    startChimeLoop();
  }

  const safeMs = Math.max(3000, Math.min(120000, Number(durationMs) || 60000));
  webAutoStopTimer = window.setTimeout(stopWebAlarmFallback, safeMs);
}

export async function startVendorOrderAlarm({
  title = "New Order Received!",
  body = "A customer just placed an order. Open MelaChow Vendor to accept.",
  orderId = "",
  route = "/vendors/order",
  durationMs = 60000,
  force = false,
} = {}) {
  const settings = getVendorAlertSettings();
  if (!force && !settings.alarmEnabled) return false;

  if (isNativeAndroidVendorAlarmSupported()) {
    try {
      await VendorAlarm.startAlarm({
        title,
        body,
        orderId: String(orderId || ""),
        route,
        durationMs: Number(durationMs) || 60000,
        force: Boolean(force),
      });
      emitWebAlarmState(true, { orderId, route });
      return true;
    } catch (error) {
      console.warn("Native VendorAlarm.startAlarm failed, using web fallback:", error);
    }
  }

  startWebAlarmFallback({ durationMs, orderId, route, force });
  return true;
}

export async function stopVendorOrderAlarm() {
  stopWebAlarmFallback();
  if (isNativeAndroidVendorAlarmSupported()) {
    try {
      await VendorAlarm.stopAlarm();
    } catch (error) {
      console.warn("Native VendorAlarm.stopAlarm failed:", error);
    }
  }
}

export async function isVendorAlarmRinging() {
  if (isNativeAndroidVendorAlarmSupported()) {
    try {
      const res = await VendorAlarm.isRinging();
      return Boolean(res?.ringing);
    } catch {
      return webRinging;
    }
  }
  return webRinging;
}

export async function syncVendorAlarmPreferences(partialSettings) {
  const next = partialSettings ? saveVendorAlertSettings(partialSettings) : getVendorAlertSettings();
  if (isNativeAndroidVendorAlarmSupported()) {
    try {
      await VendorAlarm.setPreferences({
        alarmEnabled: Boolean(next.alarmEnabled),
        vibrationEnabled: Boolean(next.vibrationEnabled),
      });
    } catch (error) {
      console.warn("Native VendorAlarm.setPreferences failed:", error);
    }
  }
  return next;
}

export async function getVendorAlarmPermissions() {
  if (!isNativeAndroidVendorAlarmSupported()) {
    return {
      supported: false,
      notificationsEnabled: typeof Notification !== "undefined" ? Notification.permission === "granted" : true,
      ignoringBatteryOptimizations: true,
      fullScreenIntentAllowed: true,
      androidSdkInt: 0,
    };
  }
  try {
    const res = await VendorAlarm.getAlarmPermissions();
    return { supported: true, ...res };
  } catch {
    return {
      supported: true,
      notificationsEnabled: false,
      ignoringBatteryOptimizations: false,
      fullScreenIntentAllowed: false,
      androidSdkInt: 0,
    };
  }
}

export async function requestVendorBatteryUnrestricted() {
  if (!isNativeAndroidVendorAlarmSupported()) return;
  await VendorAlarm.requestIgnoreBatteryOptimizations();
}

export async function openVendorFullScreenAlertSettings() {
  if (!isNativeAndroidVendorAlarmSupported()) return;
  await VendorAlarm.openFullScreenIntentSettings();
}

export async function openVendorAlarmChannelSettings() {
  if (!isNativeAndroidVendorAlarmSupported()) return;
  await VendorAlarm.openAlarmChannelSettings();
}

export function subscribeVendorAlarmEvents({ onStarted, onStopped, onOpened } = {}) {
  const handles = [];
  let disposed = false;

  const onWindowState = (event) => {
    const detail = event?.detail || {};
    if (detail.ringing) onStarted?.(detail);
    else onStopped?.(detail);
  };
  if (typeof window !== "undefined") {
    window.addEventListener("melachow:vendor-alarm-state", onWindowState);
  }

  if (isNativeAndroidVendorAlarmSupported()) {
    const attach = async (name, cb) => {
      if (!cb) return;
      try {
        const handle = await VendorAlarm.addListener(name, cb);
        if (disposed) await handle.remove();
        else handles.push(handle);
      } catch {}
    };
    void attach("alarmStarted", onStarted);
    void attach("alarmStopped", onStopped);
    void attach("alarmOpened", onOpened);
  }

  return () => {
    disposed = true;
    if (typeof window !== "undefined") {
      window.removeEventListener("melachow:vendor-alarm-state", onWindowState);
    }
    handles.forEach((h) => h.remove?.());
  };
}

export function isVendorNewOrderPush(notification) {
  const data = notification?.data || {};
  if (String(data.alarm || "").toLowerCase() === "true" || String(data.alarm || "") === "1") return true;
  const type = String(data.type || data.event || "").trim().toLowerCase();
  if (type === "vendor_new_order" || type === "new_order") return true;
  const text = `${notification?.title || ""} ${notification?.body || ""}`.toLowerCase();
  return text.includes("new order");
}

export function isVendorDismissAlarmPush(notification) {
  const data = notification?.data || {};
  if (String(data.dismissAlarm || "").toLowerCase() === "true" || String(data.dismissAlarm || "") === "1") return true;
  const type = String(data.type || data.event || "").trim().toLowerCase();
  return type === "vendor_order_cancelled" || type === "order_cancelled";
}
