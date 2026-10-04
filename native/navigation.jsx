"use client";
import { useMemo } from "react";
import { useRouter as useNextRouter, usePathname as useNextPathname, useSearchParams } from "next/navigation";
import { routeParams, toNativeHref, toPublicPath } from "./routes.mjs";
export * from "next/navigation";
export function useRouter() {
  const router = useNextRouter();
  return useMemo(() => ({ ...router,
    push: (href, options) => navigate(router, "push", href, options),
    replace: (href, options) => navigate(router, "replace", href, options),
    prefetch: (href, options) => navigate(router, "prefetch", href, options),
  }), [router]);
}
function navigate(router, method, href, options) {
  const mapped = toNativeHref(href);
  if (typeof mapped === "string" && mapped.startsWith("/") && !mapped.startsWith("//")) return router[method](mapped, options);
  if (method !== "prefetch") window.__melachowVendorNavigate?.(mapped);
}
export function useParams() { return routeParams(useNextPathname(), useSearchParams()); }
export function usePathname() { const path=useNextPathname(), search=useSearchParams(); return toPublicPath(path, search).replace(/\/$/, "") || "/"; }
