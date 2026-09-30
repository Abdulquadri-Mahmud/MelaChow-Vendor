const accuracyLabel = (meters) => meters >= 1000
  ? `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`
  : `${Math.round(meters)} m`;

export const capturePrecisePosition = ({ targetAccuracyMeters = 100, maximumAccuracyMeters = 1000, timeoutMs = 25000 } = {}) =>
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
      finish(new Error(bestPosition
        ? `Location accuracy is only ±${accuracyLabel(accuracy)}. Enable Precise location and try outdoors or from a GPS-enabled phone.`
        : "Could not obtain a GPS reading. Enable location services and try again."));
    }, timeoutMs);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = Number(position.coords.accuracy);
        if (!Number.isFinite(accuracy)) return;
        if (!bestPosition || accuracy < Number(bestPosition.coords.accuracy)) bestPosition = position;
        if (accuracy <= targetAccuracyMeters) finish(null, position);
      },
      (error) => {
        if (error?.code === 1) finish(new Error("Allow Precise location access in your device settings, then try again."));
        else if (!bestPosition && error?.code === 2) finish(new Error("GPS location is unavailable. Turn on device location and try again."));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });