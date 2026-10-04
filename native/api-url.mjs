export function validateApiOrigin(value) {
  if (!value) throw new Error("Set NEXT_PUBLIC_NATIVE_API_URL to the HTTPS API origin before building.");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("NEXT_PUBLIC_NATIVE_API_URL must be a plain HTTPS origin.");
  return url.origin;
}
export function resolveApiUrl(value, origin) {
  if (typeof value !== "string") return value;
  return /^\/(api|v1)(\/|\?|$)/.test(value) ? origin + value : value;
}
export function isApiUrl(value, origin) {
  try { const url = new URL(value, origin); return url.origin === origin && /^\/(api|v1)(\/|$)/.test(url.pathname); } catch { return false; }
}
