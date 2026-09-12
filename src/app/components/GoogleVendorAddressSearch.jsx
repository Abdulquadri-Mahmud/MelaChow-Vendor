"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, MapPin, Search } from "lucide-react";

const newSessionToken = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `vendor-location-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export default function GoogleVendorAddressSearch({ baseUrl = "/api", value = "", confirmed = false, onSelect, error }) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [message, setMessage] = useState("");
  const sessionToken = useRef(newSessionToken());

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const input = query.trim();
    if (input.length < 3 || input === value) {
      setSuggestions([]);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setMessage("");
      try {
        const response = await axios.get(`${baseUrl}/vendor/auth/locations/autocomplete`, {
          params: { input, sessionToken: sessionToken.current },
          signal: controller.signal,
          withCredentials: true,
        });
        setSuggestions(response.data?.data || []);
      } catch (requestError) {
        if (requestError.code !== "ERR_CANCELED") {
          setSuggestions([]);
          setMessage(requestError.response?.data?.message || "Address suggestions are temporarily unavailable.");
        }
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [baseUrl, query, value]);

  const chooseSuggestion = async (suggestion) => {
    setResolving(true);
    setSuggestions([]);
    setMessage("");
    try {
      const response = await axios.get(
        `${baseUrl}/vendor/auth/locations/place/${encodeURIComponent(suggestion.placeId)}`,
        { withCredentials: true },
      );
      const place = response.data?.data;
      if (!place || !Number.isFinite(Number(place.latitude)) || !Number.isFinite(Number(place.longitude))) {
        throw new Error("Google did not return coordinates for this address.");
      }
      const selected = {
        street: place.formattedAddress || suggestion.text || "",
        formattedAddress: place.formattedAddress || suggestion.text || "",
        city: place.city || "",
        state: place.state || "",
        postalCode: place.postalCode || "",
        googlePlaceId: place.placeId,
        latitude: Number(place.latitude),
        longitude: Number(place.longitude),
        coordinates: {
          type: "Point",
          coordinates: [Number(place.longitude), Number(place.latitude)],
        },
      };
      setQuery(selected.formattedAddress);
      onSelect(selected);
      sessionToken.current = newSessionToken();
    } catch (requestError) {
      setMessage(requestError.response?.data?.message || requestError.message || "Could not confirm this address.");
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="ml-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
        <MapPin size={13} /> Search business pickup address
      </label>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setMessage("");
          }}
          placeholder="Start typing the full restaurant address"
          autoComplete="off"
          className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 pl-11 pr-11 text-sm font-medium outline-none transition-all focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white"
        />
        {(searching || resolving) && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-orange-500" />}
        {suggestions.length > 0 && (
          <div className="absolute z-40 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            {suggestions.map((suggestion) => (
              <button
                type="button"
                key={suggestion.placeId}
                onClick={() => chooseSuggestion(suggestion)}
                className="block w-full border-b border-zinc-100 px-4 py-3 text-left last:border-0 hover:bg-orange-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
              >
                <strong className="block text-sm text-zinc-900 dark:text-white">{suggestion.mainText || suggestion.text}</strong>
                <span className="mt-1 block text-xs text-zinc-500">{suggestion.secondaryText}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {confirmed && !message && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <CheckCircle2 size={14} /> Google-confirmed pickup location
        </p>
      )}
      {(message || error) && <p className="text-xs font-semibold text-rose-600">{message || error}</p>}
      <p className="text-[11px] leading-relaxed text-zinc-500">Select one of Google&apos;s suggestions so customers can see accurate distance and delivery fees.</p>
    </div>
  );
}
