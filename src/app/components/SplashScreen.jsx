"use client";

import { useEffect } from "react";
import Image from "next/image";
import { WifiOff, RefreshCw } from "lucide-react";
import { Capacitor, SystemBarType, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";

export default function SplashScreen({ connectionLost = false, onRetry }) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    Promise.all([SystemBars.hide(), StatusBar.hide()]).catch(() => {});
    return () => {
      Promise.all([
        SystemBars.show(),
        SystemBars.setStyle({ bar: SystemBarType.StatusBar, style: SystemBarsStyle.Light }),
        SystemBars.setStyle({ bar: SystemBarType.NavigationBar, style: SystemBarsStyle.Light }),
        StatusBar.show(),
        StatusBar.setBackgroundColor({ color: "#ffffff" }),
      ]).catch(() => {});
    };
  }, []);

  return (
    <main
      className="fixed inset-0 z-[10000] overflow-hidden bg-[#fff9ea]"
      aria-label="MelaChow"
    >
      <Image
        src="/melachow-vendor-splash-clean.png"
        alt="MelaChow food delivery"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {connectionLost ? (
        <section className="absolute inset-x-5 bottom-8 z-10 rounded-3xl border border-orange-100 bg-white/95 p-5 text-center shadow-2xl backdrop-blur-md">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-orange-600">
            <WifiOff size={22} aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-base font-black text-zinc-900">Connection interrupted</h1>
          <p className="mx-auto mt-1 max-w-xs text-xs font-medium leading-relaxed text-zinc-600">
            We lost internet access while opening MelaChow Vendor. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-sm font-black text-white active:scale-[0.98]"
          >
            <RefreshCw size={17} aria-hidden="true" />
            Try again
          </button>
        </section>
      ) : (
        <div className="absolute bottom-9 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2" role="status" aria-label="Opening MelaChow Vendor">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-orange-600 shadow-sm"
              style={{ animationDelay: `${dot * 140}ms`, animationDuration: "900ms" }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
