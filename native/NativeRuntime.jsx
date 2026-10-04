"use client";
import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { useRouter } from "./navigation";
import { installTransport } from "./transport";
import { toNativeHref } from "./routes.mjs";
import NativePushRuntime from "@/app/components/NativePushRuntime";

if (typeof window !== "undefined") installTransport();

export default function NativeRuntime({children}) {
  const router=useRouter();
  useEffect(()=>{ let disposed=false; const handles=[];
    window.__melachowVendorNavigate=async href=>{const mapped=toNativeHref(href);if(typeof mapped==="string"&&mapped.startsWith("/")&&!mapped.startsWith("//"))router.push(mapped);else if(mapped)await Browser.open({url:new URL(mapped).href});};
    if(Capacitor.isNativePlatform()) App.addListener("backButton",({canGoBack})=>{if(canGoBack)history.back();else if(location.pathname!=="/vendors/dashboard/")router.replace("/vendors/dashboard/");else App.minimizeApp();}).then(h=>disposed?h.remove():handles.push(h));
    return()=>{disposed=true;handles.forEach(h=>h.remove());delete window.__melachowVendorNavigate};
  },[router]);
  return <><NativePushRuntime role="vendor" />{children}</>;
}
