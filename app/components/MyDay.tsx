"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { projectKidDay, type KidDayInputItem } from "@/lib/kid-day";
import AttachmentManager from "./AttachmentManager";

type MyDayProps = {
  items: readonly KidDayInputItem[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onAskTrip: () => void;
};

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

export default function MyDay({ items, selectedDate, onDateChange, onAskTrip }: MyDayProps) {
  const dates = useMemo(() => [...new Set(items.map((item) => item.date))].sort(), [items]);
  const selectedIndex = Math.max(0, dates.indexOf(selectedDate));
  const model = useMemo(
    () => projectKidDay(items, { selectedDate }),
    [items, selectedDate],
  );
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`japanTripMyDayDone:${selectedDate}`) ?? "[]");
      queueMicrotask(() => setDone(new Set(Array.isArray(saved) ? saved : [])));
    } catch {
      queueMicrotask(() => setDone(new Set()));
    }
  }, [selectedDate]);

  function toggleDone(itemId: string) {
    setDone((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      localStorage.setItem(`japanTripMyDayDone:${selectedDate}`, JSON.stringify([...next]));
      return next;
    });
  }

  return (
    <section className="my-day" aria-labelledby="my-day-title">
      <header className="my-day-header">
        <div>
          <p className="kicker">My Day · Read only</p>
          <h2 id="my-day-title">{dateLabel(model.date)}</h2>
          {model.currentLocation && <p className="my-day-location">Current planned location: <strong>{model.currentLocation.name}</strong></p>}
        </div>
        <div className="my-day-actions">
          <button type="button" className="button" onClick={onAskTrip}>Ask about the trip</button>
          <Link className="button emergency-button" href="/emergency">Emergency</Link>
        </div>
      </header>

      <nav className="my-day-nav" aria-label="Choose trip day">
        <button type="button" disabled={selectedIndex <= 0} onClick={() => onDateChange(dates[selectedIndex - 1])}>← Previous</button>
        <select aria-label="Trip day" value={selectedDate} onChange={(event) => onDateChange(event.target.value)}>
          {dates.map((date) => <option key={date} value={date}>{dateLabel(date)}</option>)}
        </select>
        <button type="button" disabled={selectedIndex >= dates.length - 1} onClick={() => onDateChange(dates[selectedIndex + 1])}>Next →</button>
      </nav>

      {model.emptyMessage && <p className="my-day-empty">{model.emptyMessage}</p>}

      <div className="my-day-sections">
        {model.sections.map((section) => (
          <section key={section.id} aria-labelledby={`my-day-${section.id}`}>
            <h3 id={`my-day-${section.id}`}>{section.label}</h3>
            {!section.items.length && <p className="my-day-none">Nothing scheduled.</p>}
            {section.items.map((item) => (
              <article id={`trip-item-${item.id}`} className={`my-day-card ${done.has(item.id) ? "done" : ""}`} key={item.id}>
                <div className="my-day-time">{item.time || "Flexible"}</div>
                <div>
                  <span>{item.category}</span>
                  <h4>{item.title}</h4>
                  {item.location && <p>{item.location}</p>}
                </div>
                <button
                  type="button"
                  className="my-day-done"
                  aria-pressed={done.has(item.id)}
                  onClick={() => toggleDone(item.id)}
                >
                  {done.has(item.id) ? "Done ✓" : "Mark done"}
                </button>
                <details className="my-day-files">
                  <summary>Tickets &amp; documents</summary>
                  <AttachmentManager tripItemId={item.id} role="viewer" title="Approved files" />
                </details>
              </article>
            ))}
          </section>
        ))}
      </div>

      {model.hotel && (
        <aside className="my-day-hotel" aria-labelledby="my-day-hotel-title">
          <p className="kicker">Find our hotel</p>
          <h3 id="my-day-hotel-title">{model.hotel.name}</h3>
          {model.hotel.location && <p>{model.hotel.location}</p>}
          {model.hotel.nearestStation && <p>Nearest station: {model.hotel.nearestStation}</p>}
          {model.hotel.meetupNote && <p>{model.hotel.meetupNote}</p>}
          {model.hotel.directionsQuery && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(model.hotel.directionsQuery)}`} target="_blank" rel="noreferrer">Open directions ↗</a>
          )}
        </aside>
      )}
    </section>
  );
}
