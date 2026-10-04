import { cp, mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import path from "node:path"; import { fileURLToPath } from "node:url"; import { spawnSync } from "node:child_process"; import { createRequire } from "node:module";
import { validateApiOrigin } from "../native/api-url.mjs";
const require=createRequire(import.meta.url), root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."), stage=path.join(root,".native-build");
require("@next/env").loadEnvConfig(root,false); try{process.loadEnvFile(path.join(root,".env.native.local"))}catch(e){if(e.code!=="ENOENT")throw e}
const origin=validateApiOrigin(process.env.NEXT_PUBLIC_NATIVE_API_URL||process.env.NEXT_PUBLIC_API_URL);
Object.assign(process.env,{NEXT_PUBLIC_NATIVE_API_URL:origin,NEXT_PUBLIC_API_URL:origin,NEXT_PUBLIC_SOCKET_URL:process.env.NEXT_PUBLIC_SOCKET_URL||origin,NEXT_PUBLIC_NATIVE_BUILD:"true",NEXT_TELEMETRY_DISABLED:"1"});
await rm(stage,{recursive:true,force:true}); await mkdir(stage,{recursive:true});
for(const entry of ["src","public","package.json","package-lock.json","jsconfig.json","postcss.config.mjs"])await cp(path.join(root,entry),path.join(stage,entry),{recursive:true});
for(const entry of ["src/proxy.js","src/app/sitemap.js","src/app/robots.js"])await rm(path.join(stage,entry),{force:true});
await writeFile(path.join(stage,"next.config.mjs"),'export default '+JSON.stringify({output:"export",outputFileTracingRoot:root,trailingSlash:true,images:{unoptimized:true},experimental:{cpus:2}},null,2));
await cp(path.join(root,"native"),path.join(stage,"src/native"),{recursive:true});
const routes=[
 ["vendors/food-details/[id]","vendor-food-details","id"],["vendors/my-combos/[id]/edit","vendor-combo-edit","id"],["vendors/my-combos/[id]","vendor-combo-details","id"],
 ["vendors/my-foods/[id]/edit","vendor-food-edit","id"],["vendors/my-foods/[id]","vendor-my-food-details","id"],["vendors/order/[id]","vendor-order","id"],
 ["vendors/order/[id]","vendor-orders","id"],["vendors/products/[productId]","vendor-product","productId"]];
const removeDirs=new Set();
for(const [source,alias,key] of routes){const file=path.join(stage,"src/app",source,"page.jsx"), content=await readFile(file,"utf8"), dir=path.join(stage,"src/app/native",alias);await mkdir(dir,{recursive:true});await writeFile(path.join(dir,"NativePage.jsx"),content);await writeFile(path.join(dir,"page.jsx"),'"use client";\nimport Component from "./NativePage";\nimport { useParams } from "@/native/navigation";\nimport { VendorProfileProvider } from "@/app/context/VendorProfileContext";\nexport default function Page(){const params=useParams();return <VendorProfileProvider><Component key={params.'+key+'}/></VendorProfileProvider>;}\n');const segments=source.split("/"), bracket=segments.findIndex(x=>x.startsWith("["));removeDirs.add(path.join(stage,"src/app",...segments.slice(0,bracket+1)));}
removeDirs.add(path.join(stage,"src/app/vendors/orders/[id]"));
for(const dir of removeDirs)await rm(dir,{recursive:true,force:true});
async function all(dir){let out=[];for(const item of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,item.name);out.push(...(item.isDirectory()?await all(full):[full]));}return out}
for(const file of await all(path.join(stage,"src"))){if(file.startsWith(path.join(stage,"src/native")+path.sep)||!/\.(jsx?|tsx?)$/.test(file))continue;let source=await readFile(file,"utf8");source=source.replace(/from (["'])next\/navigation\1/g,'from "@/native/navigation"').replace(/from (["'])next\/link\1/g,'from "@/native/Link"').replace(/from (["'])axios\1/g,'from "@/native/axios"').replace(/window\.location\.href\s*=\s*([^;\n]+);/g,"window.__melachowVendorNavigate($1);");const rel=path.relative(stage,file).replaceAll("\\","/");
if(rel==="src/app/layout.jsx"){source='import { Suspense } from "react";\nimport NativeRuntime from "@/native/NativeRuntime";\n'+source;source=source.replace("<ThemeProvider>",'<Suspense fallback={null}><NativeRuntime><ThemeProvider>').replace("</ThemeProvider>","</ThemeProvider></NativeRuntime></Suspense>");}
await writeFile(file,source)}
await writeFile(path.join(stage,"src/app/page.jsx"),'"use client";\nimport VendorStartup from "@/native/VendorStartup";\nexport default function Page(){return <VendorStartup/>;}\n');
const termsRedirect='"use client";\nimport { useEffect } from "react";import { useRouter } from "@/native/navigation";export default function Page(){const router=useRouter();useEffect(()=>router.replace("/vendors/terms-and-policy/"),[router]);return null;}\n';
for(const page of ["src/app/vendor-terms/page.jsx","src/app/vendors/vendor-terms/page.jsx"])await writeFile(path.join(stage,page),termsRedirect);
for(const target of ["src/app/components/InstallPWA.jsx","src/app/components/PWA/PWAUpdateManager.jsx","src/app/components/PWA/PWAInstallPrompt.jsx","src/app/components/notifications/PushNotificationPrompt.jsx"]){try{await cp(path.join(root,"native/empty-component.jsx"),path.join(stage,target))}catch{}}
const result=spawnSync(process.execPath,[path.join(root,"node_modules/next/dist/bin/next"),"build",stage],{cwd:root,stdio:"inherit",env:process.env});if(result.status!==0)process.exit(result.status||1);
await readFile(path.join(stage,"out/vendors/dashboard/index.html"));console.log("Vendor native bundle ready: .native-build/out");


