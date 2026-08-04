"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  japanTripDate,
  projectKidDay,
  type KidDayInputItem,
} from "@/lib/kid-day";
import type { TripCityId } from "@/lib/live-context";
import AttachmentManager from "./AttachmentManager";
import FamilyRatings from "./FamilyRatings";
import LiveContextPanel from "./LiveContextPanel";

type MyDayProps = {
  items: readonly KidDayInputItem[];
  selectedDate: string;
  role: "viewer" | "editor";
  canOpenCalendar: boolean;
  plannedCityId: TripCityId;
  onDateChange: (date: string) => void;
  onAskTrip: () => void;
  onOpenCalendar: (target: {
    date: string;
    itemId?: string;
    category?: string;
  }) => void;
};

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  weekday: "long",
  month: "long",
  day: "numeric",
});

function dateLabel(date: string) {
  return DAY_LABEL_FORMATTER.format(new Date(`${date}T12:00:00Z`));
}

export default function MyDay({
  items,
  selectedDate,
  role,
  canOpenCalendar,
  plannedCityId,
  onDateChange,
  onAskTrip,
  onOpenCalendar,
}: MyDayProps) {
  const [now, setNow] = useState(() => Date.now());
  const dates = useMemo(
    () => [...new Set(items.map((item) => item.date))].sort(),
    [items],
  );
  const selectedIndex = Math.max(0, dates.indexOf(selectedDate));
  const today = japanTripDate(now);
  const todayAvailable = dates.includes(today);
  const model = useMemo(
    () => projectKidDay(items, { selectedDate, now }),
    [items, now, selectedDate],
  );
  const [done, setDone] = useState<Set<string>>(new Set());
  const [openFiles, setOpenFiles] = useState<Set<string>>(new Set());
  const [openRatings, setOpenRatings] = useState<Set<string>>(new Set());

  useEffect(() => {
    const refreshNow = () => setNow(Date.now());
    const timer = window.setInterval(refreshNow, 30_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshNow();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(`japanTripMyDayDone:v1:${selectedDate}`) ?? "[]",
      );
      queueMicrotask(() => setDone(new Set(Array.isArray(saved) ? saved : [])));
    } catch {
      queueMicrotask(() => setDone(new Set()));
    }
  }, [selectedDate]);

  function toggleDone(itemId: string) {
    const next = new Set(done);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    localStorage.setItem(
      `japanTripMyDayDone:v1:${selectedDate}`,
      JSON.stringify([...next]),
    );
    setDone(next);
  }

  return (
    <section className="my-day" aria-labelledby="my-day-title">
      <header className="my-day-header">
        <div>
          <p className="kicker">My Day · Read only</p>
          <h2 id="my-day-title">{dateLabel(model.date)}</h2>
          {model.currentLocation && (
            <p className="my-day-location">
              Current planned location:{" "}
              <strong>{model.currentLocation.name}</strong>
            </p>
          )}
        </div>
        <div className="my-day-actions">
          {canOpenCalendar && (
            <button
              type="button"
              className="button primary"
              onClick={() => onOpenCalendar({ date: model.date })}
            >
              View full day in calendar
            </button>
          )}
          <button type="button" className="button" onClick={onAskTrip}>
            Ask about the trip
          </button>
          <Link className="button emergency-button" href="/emergency">
            Emergency
          </Link>
        </div>
      </header>

      <nav className="my-day-nav" aria-label="Choose trip day">
        <button
          type="button"
          disabled={selectedIndex <= 0}
          onClick={() => onDateChange(dates[selectedIndex - 1])}
        >
          ← Previous
        </button>
        <select
          aria-label="Trip day"
          value={selectedDate}
          onChange={(event) => onDateChange(event.target.value)}
        >
          {dates.map((date) => (
            <option key={date} value={date}>
              {dateLabel(date)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={selectedIndex >= dates.length - 1}
          onClick={() => onDateChange(dates[selectedIndex + 1])}
        >
          Next →
        </button>
        <button
          type="button"
          disabled={!todayAvailable || selectedDate === today}
          title={todayAvailable ? "Return to today in Japan" : "Today is outside the trip dates"}
          onClick={() => onDateChange(today)}
        >
          Today
        </button>
      </nav>

      {model.emptyMessage && (
        <p className="my-day-empty">{model.emptyMessage}</p>
      )}

      <div className="my-day-sections">
        {model.sections.map((section) => (
          <section key={section.id} aria-labelledby={`my-day-${section.id}`}>
            <h3 id={`my-day-${section.id}`}>{section.label}</h3>
            {!section.items.length && (
              <p className="my-day-none">Nothing scheduled.</p>
            )}
            {section.items.map((item) => (
              <article
                id={`trip-item-${item.id}`}
                className={`my-day-card ${done.has(item.id) ? "done" : ""}`}
                key={item.id}
              >
                <div className="my-day-time">{item.time || "Flexible"}</div>
                <div>
                  <span>{item.category}</span>
                  <h4>{item.title}</h4>
                  {item.location && <p>{item.location}</p>}
                  <p className="my-day-suggestion">
                    <strong>Good to know:</strong> {item.suggestion}
                  </p>
                </div>
                <button
                  type="button"
                  className="my-day-done"
                  aria-label={`${done.has(item.id) ? "Mark not done" : "Mark done"}: ${item.title}`}
                  aria-pressed={done.has(item.id)}
                  onClick={() => toggleDone(item.id)}
                >
                  {done.has(item.id) ? "Done ✓" : "Mark done"}
                </button>
                {canOpenCalendar && (
                  <button
                    type="button"
                    className="button my-day-open-calendar"
                    aria-label={`Open ${item.title} in calendar`}
                    onClick={() =>
                      onOpenCalendar({
                        date: item.date,
                        itemId: item.id,
                        category: item.category,
                      })
                    }
                  >
                    Open in calendar
                  </button>
                )}
                <details
                  className="my-day-files"
                  onToggle={(event) => {
                    if (!event.currentTarget.open) return;
                    setOpenFiles((current) => new Set(current).add(item.id));
                  }}
                >
                  <summary>Tickets &amp; documents</summary>
                  {openFiles.has(item.id) && (
                    <AttachmentManager
                      tripItemId={item.id}
                      role="viewer"
                      title="Approved files"
                    />
                  )}
                </details>
                {(item.category === "attraction" ||
                  item.category === "hotel") && (
                  <details
                    className="my-day-files"
                    onToggle={(event) => {
                      if (!event.currentTarget.open) return;
                      setOpenRatings((current) =>
                        new Set(current).add(item.id),
                      );
                    }}
                  >
                    <summary>Family rating</summary>
                    {openRatings.has(item.id) && (
                      <FamilyRatings
                        targetId={item.id}
                        targetKind={item.category}
                        role={role}
                      />
                    )}
                  </details>
                )}
              </article>
            ))}
          </section>
        ))}
      </div>

      <details className="my-day-live-context">
        <summary>Live safety, heat &amp; rail updates</summary>
        <LiveContextPanel
          plannedCityId={plannedCityId}
          contextLabel={model.currentLocation?.name || model.hotel?.location}
        />
      </details>

      {model.hotel && (
        <aside className="my-day-hotel" aria-labelledby="my-day-hotel-title">
          <p className="kicker">Find our hotel</p>
          <h3 id="my-day-hotel-title">{model.hotel.name}</h3>
          {model.hotel.location && <p>{model.hotel.location}</p>}
          {model.hotel.nearestStation && (
            <p>Nearest station: {model.hotel.nearestStation}</p>
          )}
          {model.hotel.meetupNote && <p>{model.hotel.meetupNote}</p>}
          {model.hotel.directionsQuery && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(model.hotel.directionsQuery)}`}
              target="_blank"
              rel="noreferrer"
            >
              Open directions ↗
            </a>
          )}
        </aside>
      )}
    </section>
  );
}
