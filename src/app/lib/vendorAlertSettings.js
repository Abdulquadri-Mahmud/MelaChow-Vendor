export const DEFAULT_VENDOR_ALERT_SETTINGS = {
  alarmEnabled: true,
  vibrationEnabled: true,
  intervalSeconds: 6,
};

const KEY = "melachow_vendor_alert_settings";

export function getVendorAlertSettings() {
  if (typeof window === "undefined") return DEFAULT_VENDOR_ALERT_SETTINGS;
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      ...DEFAULT_VENDOR_ALERT_SETTINGS,
      ...stored,
      intervalSeconds: [6, 10, 15].includes(Number(stored.intervalSeconds)) ? Number(stored.intervalSeconds) : 6,
    };
  } catch {
    return DEFAULT_VENDOR_ALERT_SETTINGS;
  }
}

export function saveVendorAlertSettings(settings) {
  const next = { ...DEFAULT_VENDOR_ALERT_SETTINGS, ...settings };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("vendor:alert-settings", { detail: next }));
  }
  return next;
}
let vendorAlertAudioContext;

export function playVendorNewOrderAlert({ vibrationEnabled = true } = {}) {
  if (typeof window === "undefined") return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    if (!vendorAlertAudioContext || vendorAlertAudioContext.state === "closed") {
      vendorAlertAudioContext = new AudioContext();
    }
    if (vendorAlertAudioContext.state === "suspended") {
      vendorAlertAudioContext.resume().catch(() => {});
    }
    const gain = vendorAlertAudioContext.createGain();
    gain.gain.value = 0.2;
    gain.connect(vendorAlertAudioContext.destination);
    [[0, 880], [0.14, 660], [0.28, 880], [0.42, 660]].forEach(([offset, frequency]) => {
      const oscillator = vendorAlertAudioContext.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(vendorAlertAudioContext.currentTime + offset);
      oscillator.stop(vendorAlertAudioContext.currentTime + offset + 0.1);
    });
    if (vibrationEnabled) navigator.vibrate?.([220, 120, 220]);
  } catch {}
}
export function playVendorAlertPreview({ vibrationEnabled = true } = {}) {
  if (typeof window === "undefined") return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  try {
    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.value = 0.18;
    gain.connect(context.destination);
    [[0, 880], [0.14, 660], [0.28, 880], [0.42, 660]].forEach(([offset, frequency]) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(context.currentTime + offset);
      oscillator.stop(context.currentTime + offset + 0.1);
    });
    if (vibrationEnabled) navigator.vibrate?.([220, 120, 220]);
  } catch {}
}