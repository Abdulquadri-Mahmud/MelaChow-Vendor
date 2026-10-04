import { TokenManager } from "@/app/lib/auth-token";
import { resolveApiUrl, isApiUrl } from "./api-url.mjs";
let installed=false;
export function installTransport() {
  if (installed || typeof window === "undefined") return; installed=true;
  const original=window.fetch.bind(window), origin=process.env.NEXT_PUBLIC_NATIVE_API_URL;
  window.fetch=(input,init={}) => {
    const raw=typeof input==="string"?input:input instanceof URL?input.href:input.url;
    const url=resolveApiUrl(raw,origin);
    if(!isApiUrl(url,origin)) return original(input,init);
    const headers=new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    const token=TokenManager.getToken("vendor"); if(token&&!headers.has("Authorization"))headers.set("Authorization","Bearer "+token);
    return original(input instanceof Request?new Request(url,input):url,{...init,headers,credentials:"include"});
  };
}
