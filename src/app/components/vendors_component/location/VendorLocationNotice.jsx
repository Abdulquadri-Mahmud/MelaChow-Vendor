"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { updateVendor } from "@/app/lib/vendorProfileApi";

const getPosition = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) return reject(new Error("Location is unavailable on this device."));
  navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 });
});

const reverseGeocode = async (latitude, longitude) => {
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&addressdetails=1`, { headers: { Accept: "application/json", "Accept-Language": "en" } });
  if (!response.ok) throw new Error("OpenStreetMap could not resolve this address.");
  return response.json();
};

export const vendorHasCoordinates = (vendor) => Number.isFinite(Number(vendor?.pickupLatitude ?? vendor?.address?.latitude ?? vendor?.address?.coordinates?.lat)) && Number.isFinite(Number(vendor?.pickupLongitude ?? vendor?.address?.longitude ?? vendor?.address?.coordinates?.lng));

export default function VendorLocationNotice({ vendor, profile = false, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  if (!vendor || saved || vendorHasCoordinates(vendor)) return null;

  const captureLocation = async () => {
    setSaving(true);
    try {
      const position = await getPosition();
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      let result;
      try {
        result = await reverseGeocode(latitude, longitude);
      } catch {
        if (!manualAddress.trim()) throw new Error("Street not found. Type the restaurant address and try again.");
        result = { display_name: manualAddress.trim(), place_id: `gps:${latitude},${longitude}`, address: {} };
      }
      if (manualAddress.trim()) result.display_name = manualAddress.trim();
      const address = result.address || {};
      const payload = {
        address: {
          ...(vendor.address || {}),
          street: result.display_name || vendor.address?.street || "",
          formattedAddress: result.display_name || "",
          city: address.city || address.town || address.village || address.municipality || address.county || vendor.address?.city || "",
          state: address.state || address.region || vendor.address?.state || "",
          latitude,
          longitude,
          coordinates: { lat: latitude, lng: longitude },
          provider: "openstreetmap",
          providerPlaceId: String(result.place_id || ""),
          locationSource: "device_gps",
        },
        deliveryRadiusKm: Math.min(20, Number(vendor.deliveryRadiusKm || 15)),
      };
      const response = await updateVendor({ data: payload });
      setSaved(true);
      onSaved?.(response?.data || response?.vendor || response);
      toast.success("Restaurant location saved. Customers can now find you nearby.");
    } catch (error) {
      const denied = error?.code === 1;
      toast.error(denied ? "Allow location access in your device settings, then try again." : error?.message || "Could not capture the restaurant location.", { duration: 7000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/30 dark:bg-orange-500/10">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-orange-600 text-white"><MapPin size={19} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">New: confirm your restaurant location</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">Use the phone at your restaurant. GPS helps customers within 15 km discover your store and calculates delivery fees by distance.</p>
          <input value={manualAddress} onChange={(event) => setManualAddress(event.target.value)} placeholder="Type the restaurant address if OpenStreetMap misses the street" className="mt-3 w-full rounded-md border border-orange-200 bg-white px-3 py-2.5 text-xs text-zinc-900 outline-none focus:border-orange-500 dark:border-orange-500/30 dark:bg-zinc-900 dark:text-white" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={captureLocation} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />}
              {saving ? "Finding location..." : "Use restaurant GPS"}
            </button>
            {!profile && <Link href="/vendors/profile" className="inline-flex items-center rounded-md border border-orange-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">Enter address manually</Link>}
          </div>
          <p className="mt-2 text-[10px] text-zinc-500">Address data © OpenStreetMap contributors</p>
        </div>
      </div>
    </div>
  );
}


