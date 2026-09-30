"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, LocateFixed, MapPin, Save } from "lucide-react";
import toast from "react-hot-toast";
import { updateVendor } from "@/app/lib/vendorProfileApi";
import { capturePrecisePosition } from "@/app/lib/capturePreciseLocation";

const vendorCoordinates = (vendor) => ({
  lat: Number(vendor?.pickupLatitude ?? vendor?.address?.latitude ?? vendor?.address?.coordinates?.lat),
  lng: Number(vendor?.pickupLongitude ?? vendor?.address?.longitude ?? vendor?.address?.coordinates?.lng),
  accuracy: Number(vendor?.address?.coordinates?.accuracy),
});

export const vendorHasCoordinates = (vendor) => {
  const coordinates = vendorCoordinates(vendor);
  return Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng);
};

const reverseGeocode = async (latitude, longitude) => {
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&addressdetails=1`, { headers: { Accept: "application/json", "Accept-Language": "en" } });
  if (!response.ok) throw new Error("OpenStreetMap could not resolve this address.");
  return response.json();
};

export default function VendorLocationNotice({ vendor, profile = false, always = false, onSaved }) {
  const initialCoordinates = vendorCoordinates(vendor);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [coordinates, setCoordinates] = useState(vendorHasCoordinates(vendor) ? initialCoordinates : null);
  const [addressLine, setAddressLine] = useState(vendor?.pickupFormattedAddress || vendor?.address?.formattedAddress || vendor?.address?.street || "");
  const [locationDetails, setLocationDetails] = useState(null);

  useEffect(() => {
    if (!vendor) return;
    const next = vendorCoordinates(vendor);
    if (Number.isFinite(next.lat) && Number.isFinite(next.lng)) setCoordinates(next);
    setAddressLine(vendor.pickupFormattedAddress || vendor.address?.formattedAddress || vendor.address?.street || "");
  }, [vendor]);

  if (!vendor || (!always && (saved || vendorHasCoordinates(vendor)))) return null;

  const persistLocation = async (pin, details, typedAddress) => {
    const address = details?.address || {};
    const finalAddress = typedAddress.trim() || details?.display_name || addressLine.trim();
    if (!finalAddress) throw new Error("Enter the restaurant address before saving.");
    const payload = {
      address: {
        ...(vendor.address || {}),
        street: finalAddress,
        formattedAddress: finalAddress,
        city: address.city || address.town || address.village || address.municipality || address.county || vendor.address?.city || "",
        state: address.state || address.region || vendor.address?.state || "",
        latitude: pin.lat,
        longitude: pin.lng,
        coordinates: { lat: pin.lat, lng: pin.lng, ...(Number.isFinite(pin.accuracy) ? { accuracy: pin.accuracy } : {}) },
        provider: "openstreetmap",
        providerPlaceId: String(details?.place_id || vendor.address?.providerPlaceId || `gps:${pin.lat},${pin.lng}`),
        locationSource: details ? "device_gps" : vendor.address?.locationSource || "device_gps",
      },
      deliveryRadiusKm: Math.min(20, Number(vendor.deliveryRadiusKm || 15)),
    };
    const response = await updateVendor({ data: payload });
    setSaved(true);
    onSaved?.(response?.data || response?.vendor || response);
    toast.success("Restaurant location saved.");
  };

  const captureLocation = async () => {
    setSaving(true);
    try {
      const position = await capturePrecisePosition();
      const pin = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy };
      setCoordinates(pin);
      let details = null;
      try { details = await reverseGeocode(pin.lat, pin.lng); } catch {}
      setLocationDetails(details);
      const resolvedAddress = details?.display_name || addressLine;
      setAddressLine(resolvedAddress);
      await persistLocation(pin, details, resolvedAddress);
    } catch (error) {
      const denied = error?.code === 1;
      toast.error(denied ? "Allow location access in your device settings, then try again." : error?.message || "Could not capture the restaurant location.", { duration: 7000 });
    } finally {
      setSaving(false);
    }
  };

  const saveAddressText = async () => {
    if (!coordinates) return captureLocation();
    setSaving(true);
    try { await persistLocation(coordinates, locationDetails, addressLine); }
    catch (error) { toast.error(error.message || "Could not save the restaurant location."); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/30 dark:bg-orange-500/10">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-600 text-white"><MapPin size={19} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">{coordinates ? "Restaurant location" : "New: confirm your restaurant location"}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">GPS places your store in nearby results and calculates delivery fees by distance.</p>
        </div>
      </div>

      <button type="button" onClick={captureLocation} disabled={saving} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-wider text-white disabled:opacity-60 ${coordinates ? "bg-emerald-600" : "bg-zinc-900"}`}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : coordinates ? <CheckCircle2 size={16} /> : <LocateFixed size={16} />}
        {saving ? "Saving location..." : coordinates ? "Update restaurant GPS" : "Use restaurant GPS"}
      </button>

      {coordinates && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white/80 px-3 py-2.5 dark:border-emerald-500/20 dark:bg-zinc-900/60">
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">GPS coordinates</p>
            <p className="mt-0.5 font-mono text-[10px] font-bold text-zinc-700 dark:text-zinc-200">{coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}</p>
          </div>
          {Number.isFinite(coordinates.accuracy) && coordinates.accuracy > 0 && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{coordinates.accuracy >= 1000 ? `\u00B1${(coordinates.accuracy / 1000).toFixed(coordinates.accuracy >= 10000 ? 0 : 1)} km` : `\u00B1${Math.round(coordinates.accuracy)} m`}</span>}
        </div>
      )}

      <textarea value={addressLine} onChange={(event) => setAddressLine(event.target.value)} placeholder={coordinates ? "Confirm or correct the restaurant address" : "GPS will fill the restaurant address"} rows={3} className="mt-3 w-full resize-none rounded-xl border border-orange-200 bg-white px-3 py-3 text-xs text-zinc-900 outline-none focus:border-orange-500 dark:border-orange-500/30 dark:bg-zinc-900 dark:text-white" />
      {coordinates && <p className="mt-1.5 text-[10px] text-zinc-500">Editing the address keeps the captured coordinates.</p>}

      {profile && coordinates && (
        <button type="button" onClick={saveAddressText} disabled={saving || !addressLine.trim()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save location
        </button>
      )}
    </div>
  );
}
