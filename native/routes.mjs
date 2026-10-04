export const nativeRoutes = [
  { publicPrefix: "/vendors/food-details/", nativePath: "/native/vendor-food-details/", key: "id" },
  { publicPrefix: "/vendors/my-combos/", suffix: "/edit", nativePath: "/native/vendor-combo-edit/", key: "id" },
  { publicPrefix: "/vendors/my-combos/", nativePath: "/native/vendor-combo-details/", key: "id" },
  { publicPrefix: "/vendors/my-foods/", suffix: "/edit", nativePath: "/native/vendor-food-edit/", key: "id" },
  { publicPrefix: "/vendors/my-foods/", nativePath: "/native/vendor-my-food-details/", key: "id" },
  { publicPrefix: "/vendors/order/", nativePath: "/native/vendor-order/", key: "id" },
  { publicPrefix: "/vendors/orders/", nativePath: "/native/vendor-orders/", key: "id" },
  { publicPrefix: "/vendors/products/", nativePath: "/native/vendor-product/", key: "productId" },
];
const website = "https://vendors.melachow.com";
export function toNativeHref(href) {
  if (typeof href !== "string") return href;
  if (!href.startsWith("/") && !href.startsWith(website)) return href;
  const url = new URL(href, website);
  for (const route of nativeRoutes) {
    if (!url.pathname.startsWith(route.publicPrefix)) continue;
    const rest = url.pathname.slice(route.publicPrefix.length).replace(/\/$/, "");
    if (route.suffix && !rest.endsWith(route.suffix)) continue;
    if (!route.suffix && rest.includes("/")) continue;
    const id = route.suffix ? rest.slice(0, -route.suffix.length) : rest;
    if (!id) continue;
    url.pathname = route.nativePath; url.searchParams.set(route.key, decodeURIComponent(id)); break;
  }
  return url.pathname + url.search + url.hash;
}
export function routeParams(pathname, search) {
  const route = nativeRoutes.find((item) => item.nativePath.replace(/\/$/, "") === pathname.replace(/\/$/, ""));
  return route ? { [route.key]: search.get(route.key) || undefined } : {};
}
export function toPublicPath(pathname, search) {
  const route = nativeRoutes.find((item) => item.nativePath.replace(/\/$/, "") === pathname.replace(/\/$/, ""));
  if (!route) return pathname;
  const id = search.get(route.key) || "";
  return route.publicPrefix + encodeURIComponent(id) + (route.suffix || "");
}
