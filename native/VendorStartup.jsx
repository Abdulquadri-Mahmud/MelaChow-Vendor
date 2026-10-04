"use client";

import { useCallback, useEffect, useState } from "react";
import SplashScreen from "@/app/components/SplashScreen";
import { useRouter } from "./navigation";

const STARTUP_DELAY_MS = 2200;

export default function VendorStartup() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(() => (
    typeof navigator === "undefined" ? true : navigator.onLine
  ));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) return undefined;
    const timer = window.setTimeout(() => {
      router.replace("/vendors/dashboard/");
    }, STARTUP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isOnline, router]);

  const retry = useCallback(() => {
    setIsOnline(navigator.onLine);
  }, []);

  return <SplashScreen connectionLost={!isOnline} onRetry={retry} />;
}
