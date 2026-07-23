function transform(input) {
  const payload = input.payload || {};

  // The response has either `departures` or `arrivals` depending on the polled URL.
  const isArrivals = Array.isArray(payload.arrivals);
  const list = payload.arrivals || payload.departures || [];
  const hasPayload = Array.isArray(payload.departures) || Array.isArray(payload.arrivals);

  const services = list.map(function (d) {
    const product = d.product || {};

    // Time as "HH:MM" — the ISO string already carries the local offset, so slicing
    // the time portion avoids any timezone arithmetic.
    const displayDateTime = d.actualDateTime || d.plannedDateTime || "";
    const time = displayDateTime.slice(11, 16);

    // Delay in whole minutes (actual - planned).
    let delay = 0;
    if (d.plannedDateTime && d.actualDateTime) {
      delay = Math.round((Date.parse(d.actualDateTime) - Date.parse(d.plannedDateTime)) / 60000);
    }

    // Route stations joined into a "via ..." line. Arrivals carry no routeStations.
    const via = (d.routeStations || [])
      .slice(0, 4)
      .map(function (s) { return (s.mediumName || "").replace(/\./g, ""); })
      .filter(Boolean)
      .join(", ");

    return {
      time: time,
      delay_text: (!d.cancelled && delay > 0) ? ("+" + delay + "m") : "",
      cancelled: !!d.cancelled,
      // Destination for departures, origin for arrivals.
      place: d.direction || d.origin || "",
      subtitle: d.cancelled ? "Geannuleerd" : (via ? "via " + via : ""),
      track: d.actualTrack || d.plannedTrack || "",
      type: product.longCategoryName || product.shortCategoryName || "Onbekend",
      operator: product.operatorCode || "",
    };
  });

  // When the response isn't a valid departures/arrivals payload (e.g. a wrong API key
  // or station on first setup), surface a hint instead of a bare empty board.
  let status = "";
  if (!hasPayload) {
    status = input && input.message
      ? String(input.message)
      : "Geen gegevens. Controleer de API-sleutel en het station.";
  }

  return {
    services: services,
    mode: isArrivals ? "arrivals" : "departures",
    disruptions: (input.meta && input.meta.numberOfDisruptions) || 0,
    status: status,
  };
}
