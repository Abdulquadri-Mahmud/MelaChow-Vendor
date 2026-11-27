"use client";

import { useCallback, useEffect, useState } from "react";
import { BatteryCharging, CheckCircle2, ShieldAlert, Volume2, VolumeX } from "lucide-react";
import toast from "react-hot-toast";
import {
  getVendorAlarmPermissions,
  isNativeAndroidVendorAlarmSupported,
  isVendorAlarmRinging,
  openVendorAlarmChannelSettings,
  openVendorFullScreenAlertSettings,
  requestVendorBatteryUnrestricted,
  startVendorOrderAlarm,
  stopVendorOrderAlarm,
  subscribeVendorAlarmEvents,
  syncVendorAlarmPreferences,
} from "@/app/lib/nativeVendorAlarm";

export default function VendorNativeAlarmControls({ alertSettings }) {
  const [perms, setPerms] = useState(null);
  const [ringing, setRinging] = useState(false);

  const refreshPerms = useCallback(async () => {
    const p = await getVendorAlarmPermissions();
    setPerms(p);
  }, []);

  useEffect(() => {
    void syncVendorAlarmPreferences(alertSettings);
  }, [alertSettings]);

  useEffect(() => {
    void refreshPerms();
    void isVendorAlarmRinging().then(setRinging);
    const unsub = subscribeVendorAlarmEvents({
      onStarted: () => setRinging(true),
      onStopped: () => setRinging(false),
      onOpened: () => setRinging(false),
    });
    const onFocus = () => void refreshPerms();
    window.addEventListener("focus", onFocus);
    return () => {
      unsub();
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshPerms]);

  const handleToggleTest = async () => {
    if (ringing) {
      await stopVendorOrderAlarm();
      setRinging(false);
      return;
    }
    setRinging(true);
    await startVendorOrderAlarm({
      title: "MelaChow Kitchen Test Alarm",
      body: "This is how loud incoming customer orders will ring on your device.",
      route: "/vendors/profile",
      durationMs: 6000,
      force: true,
    });
    toast.success("Kitchen alarm test playing (6s)");
  };

  const isNativeAndroid = isNativeAndroidVendorAlarmSupported();

  return (
    <div className="space-y-3 pt-1">
      {isNativeAndroid && perms && (
        <div className="space-y-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Android Background &amp; Lock-Screen Reliability
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {perms.ignoringBatteryOptimizations ? (
                <CheckCircle2 size={15} className="text-emerald-600" />
              ) : (
                <ShieldAlert size={15} className="text-amber-600" />
              )}
              <span>
                Battery optimization:{" "}
                {perms.ignoringBatteryOptimizations ? "Unrestricted (ready)" : "Restricted (may delay alarms)"}
              </span>
            </div>
            {!perms.ignoringBatteryOptimizations && (
              <button
                type="button"
                onClick={() => void requestVendorBatteryUnrestricted()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-600"
              >
                <BatteryCharging size={14} /> Allow background
              </button>
            )}
          </div>

          {perms.androidSdkInt >= 34 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                {perms.fullScreenIntentAllowed ? (
                  <CheckCircle2 size={15} className="text-emerald-600" />
                ) : (
                  <ShieldAlert size={15} className="text-amber-600" />
                )}
                <span>
                  Lock-screen alert:{" "}
                  {perms.fullScreenIntentAllowed ? "Allowed" : "Needs permission"}
                </span>
              </div>
              {!perms.fullScreenIntentAllowed && (
                <button
                  type="button"
                  onClick={() => void openVendorFullScreenAlertSettings()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Enable lock-screen alert
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2.5">
        {isNativeAndroid && (
          <button
            type="button"
            onClick={() => void openVendorAlarmChannelSettings()}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            Channel Settings
          </button>
        )}
        <button
          type="button"
          onClick={handleToggleTest}
          className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition ${
            ringing ? "bg-rose-600 hover:bg-rose-700" : "bg-orange-600 hover:bg-orange-700"
          }`}
        >
          {ringing ? <VolumeX size={15} /> : <Volume2 size={15} />}
          <span>{ringing ? "Stop Alarm Test" : "Test Alarm (6s)"}</span>
        </button>
      </div>
    </div>
  );
}
