import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

const accuracyLabel = (meters) => meters >= 1000
  ? `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`
  : `${Math.round(meters)} m`;

const locationError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  if (error?.code === 1 || message.includes("denied") || message.includes("permission")) {
    return new Error("Location permission is required. Allow precise location for MelaChow Vendor in your device settings, then try again.");
  }
  if (error?.code === 2 || message.includes("unavailable") || message.includes("disabled")) {
    return new Error("GPS location is unavailable. Turn on device location and try again.");
  }
  if (error?.code === 3 || message.includes("timeout")) {
    return new Error("GPS is taking too long. Move outdoors or near a window, then try again.");
  }
  return new Error(error?.message || "Could not obtain a GPS reading. Turn on location services and try again.");
};

const captureNativePosition = async ({ targetAccuracyMeters, maximumAccuracyMeters, timeoutMs }) => {
  const permissions = await Geolocation.checkPermissions();
  if (permissions.location !== "granted" && permissions.coarseLocation !== "granted") {
    const requested = await Geolocation.requestPermissions({ permissions: ["location", "coarseLocation"] });
    if (requested.location !== "granted" && requested.coarseLocation !== "granted") {
      throw locationError({ code: 1 });
    }
  }

  let position;
  try {
    position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: timeoutMs,
      maximumAge: 0,
    });
  } catch (error) {
    throw locationError(error);
  }

  const accuracy = Number(position?.coords?.accuracy);
  if (!Number.isFinite(accuracy)) throw new Error("Your device did not return GPS accuracy. Please try again.");
  if (accuracy > maximumAccuracyMeters) {
    throw new Error(`Location accuracy is only ±${accuracyLabel(accuracy)}. Enable precise location and try outdoors.`);
  }
  return position;
};

const captureBrowserPosition = ({ targetAccuracyMeters, maximumAccuracyMeters, timeoutMs }) =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Location is unavailable on this device."));

    let bestPosition = null;
    let watchId = null;
    let finished = false;
    const finish = (error, position) => {
      if (finished) return;
      finished = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (error) reject(error); else resolve(position);
    };
    const timer = setTimeout(() => {
      const accuracy = Number(bestPosition?.coords?.accuracy);
      if (bestPosition && Number.isFinite(accuracy) && accuracy <= maximumAccuracyMeters) return finish(null, bestPosition);
      finish(bestPosition
        ? new Error(`Location accuracy is only ±${accuracyLabel(accuracy)}. Enable precise location and try outdoors.`)
        : new Error("Could not obtain a GPS reading. Enable location services and try again."));
    }, timeoutMs);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = Number(position.coords.accuracy);
        if (!Number.isFinite(accuracy)) return;
        if (!bestPosition || accuracy < Number(bestPosition.coords.accuracy)) bestPosition = position;
        if (accuracy <= targetAccuracyMeters) finish(null, position);
      },
      (error) => {
        if (error?.code === 1) finish(locationError(error));
        else if (!bestPosition && error?.code === 2) finish(locationError(error));
        else if (!bestPosition && error?.code === 3) finish(locationError(error));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });

export const capturePrecisePosition = (options = {}) => {
  const settings = {
    targetAccuracyMeters: 100,
    maximumAccuracyMeters: 1000,
    timeoutMs: 25000,
    ...options,
  };

  return Capacitor.isNativePlatform()
    ? captureNativePosition(settings)
    : captureBrowserPosition(settings);
};
