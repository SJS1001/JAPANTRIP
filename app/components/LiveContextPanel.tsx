"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { nearestTripCity, tripCities, type SafetyLevel, type TripCityId } from "@/lib/live-context";
import type { LiveContextPayload } from "@/lib/live-context-service";

export type LiveContextPanelProps = {
  plannedCityId?: TripCityId;
  contextLabel?: string;
};

const levelLabel: Record<SafetyLevel, string> = {
  clear: "No active threat found",
  advisory: "Advisory",
  warning: "Warning",
  emergency: "Emergency",
  unknown: "Status unavailable",
};

const panelStyle = {
  display: "grid",
  gap: "18px",
} as const;

const toolbarStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  alignItems: "end",
} as const;

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
  gap: "12px",
} as const;

const cardStyle = {
  display: "grid",
  gap: "7px",
  padding: "16px",
  border: "1px solid var(--line)",
  background: "#fff",
} as const;

function readableTime(value: string | null | undefined) {
  if (!value || Number.isNaN(Date.parse(value))) return "Time unavailable";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

function isPayload(value: unknown): value is LiveContextPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LiveContextPayload>;
  return Boolean(candidate.city?.id && candidate.freshness?.status && candidate.safety && candidate.transit && candidate.links);
}

export default function LiveContextPanel({ plannedCityId = "tokyo", contextLabel }: LiveContextPanelProps) {
  const [overrideCityId, setOverrideCityId] = useState<TripCityId | null>(null);
  const [selectionSource, setSelectionSource] = useState<"agenda" | "manual" | "device">("agenda");
  const [payload, setPayload] = useState<LiveContextPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [locationMessage, setLocationMessage] = useState("");
  const cityId = overrideCityId ?? plannedCityId;
  const activePayload = payload?.city.id === cityId ? payload : null;
  const isLoading = loading || Boolean(!error && payload && !activePayload);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/live-context?city=${encodeURIComponent(cityId)}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result: unknown = await response.json();
        if (!response.ok) {
          const message = result && typeof result === "object" && "error" in result
            ? String((result as { error: unknown }).error)
            : "Live context could not be loaded.";
          throw new Error(message);
        }
        if (!isPayload(result)) throw new Error("Live context returned an unexpected response.");
        setError("");
        setPayload(result);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Live context could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [cityId, refreshKey]);

  const useLocationOnce = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationMessage("This browser does not offer location. Choose a city instead.");
      return;
    }
    setLocationMessage("Requesting one location fix…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nearest = nearestTripCity(coords.latitude, coords.longitude);
        setLoading(true);
        setError("");
        setOverrideCityId(nearest.id);
        setSelectionSource("device");
        setLocationMessage(`Using nearest itinerary city: ${nearest.name}. Raw coordinates are discarded and never sent to the server.`);
      },
      () => setLocationMessage("Location was not available. Nothing was stored; choose a city instead."),
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  const urgentSignal = useMemo(() => {
    if (!activePayload) return null;
    if (["emergency", "warning"].includes(activePayload.safety.tsunami.level)) return activePayload.safety.tsunami;
    if (activePayload.safety.weather.level === "emergency") return activePayload.safety.weather;
    if (activePayload.safety.heatAlert.level === "emergency") return activePayload.safety.heatAlert;
    return null;
  }, [activePayload]);

  return (
    <section className="weather-panel live-context-panel" aria-labelledby="live-context-title" style={panelStyle}>
      <header className="weather-head">
        <div>
          <p className="kicker">Official live sources · informational</p>
          <h2 id="live-context-title">Live context</h2>
          <p>
            Safety, heat and transit context for {contextLabel || "the selected trip city"}. This panel is read only and never changes the agenda.
          </p>
        </div>
        <div style={toolbarStyle}>
          <label>
            <span className="sr-only">Context city</span>
            <select
              aria-label="Context city"
              value={cityId}
              onChange={(event) => {
                setLoading(true);
                setError("");
                setOverrideCityId(event.target.value as TripCityId);
                setSelectionSource("manual");
                setLocationMessage("");
              }}
              style={{ minHeight: 44, padding: "0 10px", border: "1px solid var(--line)", background: "white" }}
            >
              {tripCities.map((city) => <option value={city.id} key={city.id}>{city.name}</option>)}
            </select>
          </label>
          <button type="button" className="button" onClick={useLocationOnce}>Use my location once</button>
          <button type="button" className="button" onClick={() => {
            setLoading(true);
            setError("");
            setRefreshKey((value) => value + 1);
          }} disabled={isLoading}>
            {isLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      <p aria-live="polite" style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
        {locationMessage || `Using ${selectionSource === "agenda" ? "the planned" : selectionSource === "device" ? "a one-time nearby" : "your selected"} city. Device location is never monitored.`}
      </p>

      {error && (
        <div role="alert" className="weather-error">
          <strong>Live context unavailable.</strong> {error} Use the official links below.
        </div>
      )}
      {urgentSignal && (
        <div role="alert" aria-live="assertive" style={{ padding: 18, border: "3px solid #a8271d", background: "#fff1ee" }}>
          <strong>{urgentSignal.title}</strong>
          <p>{urgentSignal.summary}</p>
          <p>Follow local evacuation instructions immediately and confirm on JMA, local alerts, station announcements, or broadcasters.</p>
        </div>
      )}

      {activePayload && (
        <>
          <div className={activePayload.freshness.status === "fresh" ? "weather-warning" : "weather-error"} role="status">
            <strong>{activePayload.freshness.status === "fresh" ? "Recently refreshed" : `${activePayload.freshness.status} data`}</strong>
            {" "}{activePayload.freshness.message} Source time: {readableTime(activePayload.freshness.sourceUpdatedAt)}.
            <ul>
              {activePayload.freshness.sources.map((source) => (
                <li key={source.id}>{source.label}: {source.status} · {readableTime(source.updatedAt)}</li>
              ))}
            </ul>
          </div>
          {activePayload.warning && <p className="weather-warning">{activePayload.warning}</p>}

          <div style={gridStyle} aria-label={`Safety context for ${activePayload.city.name}`}>
            {[activePayload.safety.weather, activePayload.safety.earthquake, activePayload.safety.tsunami].map((signal) => (
              <article key={signal.title} style={cardStyle}>
                <small>{levelLabel[signal.level]}</small>
                <strong>{signal.title}</strong>
                <p style={{ margin: 0, lineHeight: 1.5 }}>{signal.summary}</p>
                <small>Updated {readableTime(signal.updatedAt)}</small>
                <a href={signal.sourceUrl} target="_blank" rel="noreferrer">Open official JMA source ↗</a>
              </article>
            ))}
            <article style={cardStyle}>
              <small>Official Ministry of the Environment</small>
              <strong>{activePayload.safety.heat ? `WBGT ${activePayload.safety.heat.value.toFixed(1)} · ${activePayload.safety.heat.risk}` : "WBGT unavailable"}</strong>
              <strong>{activePayload.safety.heatAlert.title}</strong>
              <p style={{ margin: 0, lineHeight: 1.5 }}>{activePayload.safety.heatAlert.summary}</p>
              {activePayload.safety.heat ? (
                <>
                  <p style={{ margin: 0, lineHeight: 1.5 }}>{activePayload.safety.heat.station} forecast for {readableTime(activePayload.safety.heat.validAt)}. Local sun and shade conditions can differ.</p>
                  <small>Updated {readableTime(activePayload.safety.heat.updatedAt)}</small>
                </>
              ) : <p style={{ margin: 0 }}>Confirm heat risk on the official WBGT site.</p>}
              <a href={activePayload.links.wbgt} target="_blank" rel="noreferrer">Open official WBGT ↗</a>
            </article>
          </div>

          <section aria-labelledby="official-now-links">
            <h3 id="official-now-links">Useful right now</h3>
            <div style={gridStyle}>
              <a className="button" href={activePayload.links.radar} target="_blank" rel="noreferrer">Open JMA radar ↗</a>
              <a className="button" href={activePayload.links.uv} target="_blank" rel="noreferrer">Open official UV ↗</a>
              <a className="button" href={activePayload.links.hakone} target="_blank" rel="noreferrer">Hakone operations ↗</a>
              <a className="button" href={activePayload.links.miyajima} target="_blank" rel="noreferrer">Miyajima tides ↗</a>
            </div>
          </section>

          <details>
            <summary style={{ minHeight: 44, cursor: "pointer", fontWeight: 800 }}>Official rail status</summary>
            <p>{activePayload.transit.tokyoMetro.note}</p>
            {activePayload.transit.tokyoMetro.notices.map((notice) => <p key={notice}>{notice}</p>)}
            <div style={gridStyle}>
              {activePayload.transit.officialLinks.map((link) => (
                <a href={link.url} target="_blank" rel="noreferrer" key={link.label} style={cardStyle}>
                  <strong>{link.label}</strong>
                  <span>{link.coverage} ↗</span>
                </a>
              ))}
            </div>
          </details>

          <p className="weather-credit">
            {activePayload.disclaimer} Google Places remains disabled by default; live crowd/popular-times data is not offered by its official API.
          </p>
        </>
      )}
    </section>
  );
}
