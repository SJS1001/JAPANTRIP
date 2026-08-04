"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type MapPoint = {
  id: string;
  label: string;
  title: string;
  subtitle?: string;
  category: string;
  lat: number;
  lng: number;
  showMarker?: boolean;
};

export function OpenTripMap({ points, master = false }: { points: MapPoint[]; master?: boolean }) {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import("leaflet").Map | null>(null);
  const routeBounds = useRef<import("leaflet").LatLngBounds | null>(null);
  const [mapError, setMapError] = useState("");
  const [online, setOnline] = useState(true);
  const pointsKey = useMemo(
    () => points.map((point) => `${point.id}:${point.lat}:${point.lng}:${point.label}:${point.showMarker !== false}`).join("|"),
    [points],
  );

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!online || !mapNode.current || !points.length) return;
    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    setMapError("");
    void import("leaflet").then((L) => {
      if (cancelled || !mapNode.current) return;
      map = L.map(mapNode.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        attributionControl: true,
      });
      mapInstance.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const coordinates = points.map((point) => [point.lat, point.lng] as [number, number]);
      if (coordinates.length > 1) {
        L.polyline(coordinates, {
          color: master ? "#35465f" : "#b7412d",
          weight: master ? 3 : 4,
          opacity: 0.78,
          dashArray: master ? "8 8" : undefined,
        }).addTo(map);
      }

      const markerGroup = L.featureGroup();
      points.forEach((point) => {
        if (point.showMarker === false) return;
        const icon = L.divIcon({
          className: "trip-marker-shell",
          html: `<span class="trip-marker trip-marker-${point.category}">${point.label}</span>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        const marker = L.marker([point.lat, point.lng], { icon });
        const tooltip = document.createElement("div");
        const strong = document.createElement("strong");
        strong.textContent = point.title;
        tooltip.append(strong);
        if (point.subtitle) {
          const detail = document.createElement("div");
          detail.textContent = point.subtitle;
          tooltip.append(detail);
        }
        marker.bindTooltip(tooltip, { direction: "top", offset: [0, -12] });
        marker.addTo(markerGroup);
      });
      markerGroup.addTo(map);

      const bounds = L.latLngBounds(coordinates);
      routeBounds.current = bounds.isValid() ? bounds : null;
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(master ? 0.08 : 0.16), {
          padding: [28, 28],
          maxZoom: master ? 7 : 15,
        });
      } else {
        map.setView([36.2, 138.25], 5);
      }
      window.setTimeout(() => map?.invalidateSize(), 60);
    }).catch(() => {
      if (!cancelled) {
        setMapError(
          "The interactive map could not be loaded. Use the route links beside it instead.",
        );
      }
    });

    return () => {
      cancelled = true;
      map?.remove();
      mapInstance.current = null;
      routeBounds.current = null;
    };
  }, [master, online, points, pointsKey]);

  const fitRoute = () => {
    const map = mapInstance.current;
    const bounds = routeBounds.current;
    if (!map || !bounds) return;
    map.fitBounds(bounds.pad(master ? 0.08 : 0.16), {
      padding: [28, 28],
      maxZoom: master ? 7 : 15,
    });
  };

  return <div className="open-trip-map-shell">
    {mapError && <p className="form-error" role="alert">{mapError}</p>}
    {!online && (
      <div className="weather-warning" role="status">
        <strong>Interactive map requires a connection.</strong>
        <p>The saved route order is still available:</p>
        <ol>
          {points.map((point) => (
            <li key={point.id}>
              <strong>{point.title}</strong>{point.subtitle ? ` · ${point.subtitle}` : ""}
            </li>
          ))}
        </ol>
      </div>
    )}
    <div className="open-trip-map" hidden={!online} ref={mapNode} aria-label={master ? "Map of the full Japan trip" : "Map of the selected day"} />
    {online && <div className="map-zoom-controls" aria-label="Map zoom controls">
      <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => mapInstance.current?.zoomIn()}>＋</button>
      <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => mapInstance.current?.zoomOut()}>−</button>
      <button type="button" className="fit-route" onClick={fitRoute}>Fit route</button>
    </div>}
  </div>;
}
