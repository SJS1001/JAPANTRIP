"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import seedItemsJson from "@/data/seed.json";

type Category = "hotel" | "transport" | "attraction" | "meal" | "ticket" | "note";
type TicketStatus = "to-buy" | "booked" | "not-needed";

type TripItem = {
  id: string;
  date: string;
  time?: string;
  category: Category;
  title: string;
  location?: string;
  notes?: string;
  ticketStatus?: TicketStatus;
  confirmed?: boolean;
  confirmation?: string;
  cost?: string;
  link?: string;
  lat?: number;
  lng?: number;
};

type HistoryItem = {
  id: number;
  version: number;
  action: string;
  changedBy: string;
  changedAt: string;
};

const seedItems = seedItemsJson as TripItem[];
const categories: Category[] = ["hotel", "transport", "attraction", "meal", "ticket", "note"];
const days = Array.from({ length: 17 }, (_, index) => {
  const date = new Date("2026-08-06T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + index);
  return date.toISOString().slice(0, 10);
});

const hotelSchedule = [
  ["2026-08-06", "Tokyo Bay Shiomi Prince Hotel"],
  ["2026-08-10", "APA Hotel Osaka Namba"],
  ["2026-08-14", "Hilton Hiroshima"],
  ["2026-08-16", "KOKO Kyoto Nijo Castle"],
  ["2026-08-19", "Cava House Shinjuku"],
] as const;

const descriptions: Record<string, string> = {
  "Senso-ji Temple & Nakamise": "Tokyo’s oldest temple district: the Kaminarimon gate, incense-filled main hall and traditional Nakamise shopping street.",
  "Meiji Shrine": "A forested Shinto sanctuary dedicated to Emperor Meiji and Empress Shoken, offering a quiet contrast to nearby Harajuku.",
  "Shibuya Sky & Crossing": "An open-air skyline deck above Tokyo’s most famous crossing, with broad views over Shibuya and toward Mount Fuji in clear weather.",
  "teamLab Planets": "An immersive digital-art experience where you move barefoot through water, mirrored light rooms and changing gardens.",
  "Tokyo Tower Main Deck": "Tokyo’s red-and-white postwar landmark, with a 150-metre observation deck and glass floor panels over the city.",
  "Hakone Shrine & lakeside torii": "A cedar-forest shrine beside Lake Ashi, known for its vermilion torii standing at the water’s edge.",
  "Hakone Open-Air Museum": "A mountain sculpture garden combining large outdoor works, landscape views and an indoor Picasso collection.",
  "Owakudani": "Hakone’s active volcanic valley, with steam vents, sulfurous terrain and the region’s famous black eggs.",
  "Todai-ji & Great Buddha": "A monumental wooden temple hall housing one of Japan’s largest bronze Buddha statues.",
  "Peace Memorial Museum": "A deeply moving account of the atomic bombing told through personal belongings, testimony and historical evidence.",
  "Itsukushima Shrine & Great Torii": "Miyajima’s tide-shaped shrine complex, whose vermilion corridors and great torii appear to float at high water.",
  "Nijo Castle": "The Kyoto residence of the Tokugawa shoguns, known for ornate palace rooms, gardens and singing nightingale floors.",
  "Gozan Okuribi": "Kyoto’s Obon finale, when giant fire symbols are lit across five surrounding mountains.",
  "Fushimi Inari Taisha": "A mountainside Shinto shrine threaded by thousands of vermilion torii gates.",
  "Kiyomizu-dera": "A celebrated hillside temple whose wooden stage looks across Kyoto and the Higashiyama district.",
  "Arashiyama Bamboo Grove": "A short but striking path enclosed by towering bamboo in western Kyoto.",
  "Kinkaku-ji": "Kyoto’s Golden Pavilion, reflected in its garden pond and set against wooded northern hills.",
};

function dayHotel(date: string) {
  let hotel = hotelSchedule[0][1];
  hotelSchedule.forEach(([start, name]) => {
    if (date >= start) hotel = name;
  });
  return hotel;
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function sortItems(list: TripItem[]) {
  return [...list].sort((a, b) => String(a.time ?? "").localeCompare(String(b.time ?? "")));
}

function directionsUrl(origin: string, destination: string, mode = "transit") {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${mode}`;
}

function dayMapUrl(date: string, items: TripItem[]) {
  const stops = sortItems(
    items.filter(
      (item) => item.date === date && ["attraction", "meal"].includes(item.category) && item.location,
    ),
  );
  if (!stops.length) return "https://www.google.com/maps";
  const origin = dayHotel(date);
  const destination = `${stops.at(-1)?.title} ${stops.at(-1)?.location}`;
  const waypoints = stops
    .slice(0, -1)
    .slice(0, 8)
    .map((item) => encodeURIComponent(`${item.title} ${item.location}`))
    .join("%7C");
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypoints ? `&waypoints=${waypoints}` : ""}&travelmode=transit`;
}

function newItem(): TripItem {
  return {
    id: `u${Date.now()}`,
    date: days[0],
    time: "",
    category: "note",
    title: "",
    location: "",
    notes: "",
    ticketStatus: "not-needed",
    confirmation: "",
    cost: "",
    link: "",
  };
}

export function TripCalendar() {
  const [phase, setPhase] = useState<"loading" | "locked" | "ready">("loading");
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const [items, setItems] = useState<TripItem[]>([]);
  const [version, setVersion] = useState(1);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [updatedBy, setUpdatedBy] = useState("Trip planner");
  const [updatedAt, setUpdatedAt] = useState("");
  const [name, setName] = useState("Family member");
  const [sync, setSync] = useState<"saved" | "saving" | "offline" | "error">("saved");
  const [syncMessage, setSyncMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"calendar" | "tickets" | "route" | "history">("calendar");
  const [visible, setVisible] = useState<Set<Category>>(new Set(categories));
  const [flipped, setFlipped] = useState<string | null>(null);
  const [draft, setDraft] = useState<TripItem | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionRef = useRef(1);
  const saveChain = useRef(Promise.resolve());
  const importRef = useRef<HTMLInputElement>(null);

  async function loadTrip() {
    setSyncMessage("");
    try {
      const response = await fetch("/api/trip", { cache: "no-store" });
      if (response.status === 401) {
        setPhase("locked");
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The trip could not be loaded.");
      setItems(data.items);
      setVersion(data.version);
      versionRef.current = data.version;
      setHistory(data.history ?? []);
      setUpdatedBy(data.updatedBy ?? "Trip planner");
      setUpdatedAt(data.updatedAt ?? "");
      localStorage.setItem("japanTripCloudCache", JSON.stringify(data.items));
      setPhase("ready");
      setSync("saved");
      const pending = localStorage.getItem("japanTripPending");
      if (pending) {
        try {
          const queued = JSON.parse(pending) as { items?: TripItem[]; action?: string };
          if (Array.isArray(queued.items)) {
            setItems(queued.items);
            setSync("saving");
            setSyncMessage("Uploading changes made while this device was offline…");
            setTimeout(() => {
              saveChain.current = saveChain.current.then(() =>
                sendSave(queued.items as TripItem[], `${queued.action || "Offline changes"} · reconnected`),
              );
            }, 50);
          }
        } catch {
          localStorage.removeItem("japanTripPending");
        }
      }
    } catch (error) {
      const cache = localStorage.getItem("japanTripCloudCache");
      if (cache) {
        setItems(JSON.parse(cache));
        setPhase("ready");
        setSync("offline");
        setSyncMessage("Showing the last saved device copy. Reconnect before editing.");
      } else {
        setPhase("locked");
        setAccessError(error instanceof Error ? error.message : "The trip is unavailable.");
      }
    }
  }

  useEffect(() => {
    const savedName = localStorage.getItem("japanTripFamilyName") || "Family member";
    queueMicrotask(() => setName(savedName));
    const initialLoad = window.setTimeout(() => void loadTrip(), 0);
    const reconnect = () => void loadTrip();
    window.addEventListener("online", reconnect);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("online", reconnect);
    };
    // The loader intentionally runs only at mount and when the browser reconnects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setAccessError("");
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: accessCode }),
    });
    const data = await response.json();
    if (!response.ok) {
      setAccessError(data.error || "The access code did not work.");
      return;
    }
    setAccessCode("");
    setPhase("loading");
    await loadTrip();
  }

  async function sendSave(snapshot: TripItem[], action: string, canRetry = true) {
    if (!navigator.onLine) {
      setSync("offline");
      setSyncMessage("Changes are held on this device until you reconnect.");
      localStorage.setItem("japanTripPending", JSON.stringify({ items: snapshot, action }));
      return;
    }
    setSync("saving");
    const response = await fetch("/api/trip", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: snapshot,
        baseVersion: versionRef.current,
        changedBy: name,
        action,
      }),
    });
    const data = await response.json();
    if (response.status === 409 && canRetry) {
      versionRef.current = data.version;
      setVersion(data.version);
      return sendSave(snapshot, `${action} · reconciled`, false);
    }
    if (!response.ok) {
      setSync("error");
      setSyncMessage(data.error || "The change could not be saved.");
      return;
    }
    versionRef.current = data.version;
    setVersion(data.version);
    setUpdatedBy(name);
    setUpdatedAt(new Date().toISOString());
    setHistory((current) => [
      { id: Date.now(), version: data.version, action, changedBy: name, changedAt: new Date().toISOString() },
      ...current,
    ].slice(0, 30));
    localStorage.setItem("japanTripCloudCache", JSON.stringify(snapshot));
    localStorage.removeItem("japanTripPending");
    setSync("saved");
    setSyncMessage("");
  }

  function commit(next: TripItem[], action: string) {
    setItems(next);
    localStorage.setItem("japanTripCloudCache", JSON.stringify(next));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveChain.current = saveChain.current.then(() => sendSave(next, action));
    }, 550);
  }

  function saveDraft(event: FormEvent) {
    event.preventDefault();
    if (!draft?.title.trim()) return;
    const exists = items.some((item) => item.id === draft.id);
    const next = exists
      ? items.map((item) => (item.id === draft.id ? draft : item))
      : [...items, draft];
    commit(next, `${exists ? "Updated" : "Added"} ${draft.title}`);
    setDraft(null);
  }

  function removeDraft() {
    if (!draft) return;
    commit(items.filter((item) => item.id !== draft.id), `Removed ${draft.title}`);
    setDraft(null);
  }

  function dropOnDay(date: string) {
    if (!dragging) return;
    const moved = items.find((item) => item.id === dragging);
    if (!moved || moved.date === date) return setDragging(null);
    commit(
      items.map((item) => (item.id === dragging ? { ...item, date } : item)),
      `Moved ${moved.title} to ${dateLabel(date)}`,
    );
    setDragging(null);
  }

  function nextFrom(item: TripItem) {
    const dayItems = sortItems(
      items.filter(
        (candidate) =>
          candidate.date === item.date &&
          candidate.id !== item.id &&
          ["attraction", "transport", "meal"].includes(candidate.category),
      ),
    );
    return dayItems.find((candidate) => String(candidate.time ?? "") > String(item.time ?? ""));
  }

  async function importBackup(file: File) {
    try {
      const payload = JSON.parse(await file.text());
      const list = Array.isArray(payload) ? payload : payload.items;
      if (!Array.isArray(list) || list.length < 5) throw new Error();
      commit(list, `Imported ${file.name}`);
    } catch {
      alert("That file is not a valid Japan trip calendar backup.");
    }
  }

  function exportBackup() {
    const blob = new Blob([
      JSON.stringify({ app: "Japan Family Trip Calendar", version, exportedAt: new Date().toISOString(), items }, null, 2),
    ], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `japan-trip-calendar-v${version}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  const ticketItems = useMemo(
    () => sortItems(items.filter((item) => item.category === "ticket" || item.ticketStatus === "to-buy")).sort((a, b) => a.date.localeCompare(b.date) || String(a.time).localeCompare(String(b.time))),
    [items],
  );

  if (phase === "loading") {
    return <main className="access-screen"><div className="access-box"><div className="kicker">日本 · Family itinerary</div><h1>Opening the family calendar…</h1><p>Loading the latest shared copy.</p></div></main>;
  }

  if (phase === "locked") {
    return (
      <main className="access-screen">
        <form className="access-box" onSubmit={signIn}>
          <div className="enso" aria-hidden="true">日</div>
          <div className="kicker">Private family calendar</div>
          <h1>Japan, shared together</h1>
          <p>Enter the family access code to view or update the August 2026 itinerary.</p>
          <label htmlFor="accessCode">Family access code</label>
          <input id="accessCode" type="password" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} autoComplete="current-password" required autoFocus />
          {accessError && <p className="form-error" role="alert">{accessError}</p>}
          <button className="button primary" type="submit">Open calendar</button>
          <small>The code stays in a protected browser cookie and is never placed in the URL.</small>
        </form>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <div className="kicker">日本 · Shared family itinerary</div>
          <h1>Japan, day by day</h1>
          <p>One protected calendar for the whole family. Changes save to the shared trip memory automatically.</p>
        </div>
        <div className="hero-side">
          <div className={`sync ${sync}`}><span />{sync === "saved" ? "Shared copy saved" : sync === "saving" ? "Saving…" : sync === "offline" ? "Offline copy" : "Needs attention"}</div>
          <label>Editing as<input value={name} onChange={(event) => { setName(event.target.value); localStorage.setItem("japanTripFamilyName", event.target.value); }} maxLength={60} /></label>
          <small>{updatedAt ? `Last saved by ${updatedBy} · ${new Date(updatedAt).toLocaleString()}` : `Shared version ${version}`}</small>
        </div>
      </header>

      {syncMessage && <div className={`notice ${sync}`}>{syncMessage}</div>}

      <nav className="tabs" aria-label="Calendar sections">
        {(["calendar", "tickets", "route", "history"] as const).map((tab) => (
          <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab === "tickets" ? "Passes & tickets" : tab[0].toUpperCase() + tab.slice(1)}</button>
        ))}
      </nav>

      <section className="toolbar">
        <div className="filters" aria-label="Show categories">
          {categories.map((category) => <button key={category} className={visible.has(category) ? "active" : ""} onClick={() => setVisible((current) => { const next = new Set(current); if (next.has(category)) next.delete(category); else next.add(category); return next; })}>{category}</button>)}
        </div>
        <div className="spacer" />
        <button className="button primary" onClick={() => setDraft(newItem())}>＋ Add item</button>
        <button className="button" onClick={exportBackup}>Export backup</button>
        <button className="button" onClick={() => importRef.current?.click()}>Import backup</button>
        <input ref={importRef} className="sr-only" type="file" accept="application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importBackup(file); event.target.value = ""; }} />
      </section>

      {activeTab === "calendar" && (
        <section className="calendar">
          {days.map((date) => {
            const dayItems = sortItems(items.filter((item) => item.date === date && visible.has(item.category)));
            return (
              <article className="day" key={date} onDragOver={(event) => event.preventDefault()} onDrop={() => dropOnDay(date)}>
                <header className="day-head"><div><small>{dateLabel(date).split(",")[0]}</small><h2>{dateLabel(date).replace(/^[^,]+,\s*/, "")}</h2><span>{dayHotel(date)}</span></div><a href={dayMapUrl(date, items)} target="_blank" rel="noreferrer">Day route ↗</a></header>
                <div className="day-items">
                  {!dayItems.length && <div className="empty">No visible items</div>}
                  {dayItems.map((item) => {
                    const isFlipped = flipped === item.id;
                    const next = nextFrom(item);
                    return (
                      <div className={`item-card ${isFlipped ? "flipped" : ""}`} data-category={item.category} key={item.id} draggable onDragStart={() => setDragging(item.id)} onDragEnd={() => setDragging(null)} onClick={(event) => { if ((event.target as HTMLElement).closest("button,a")) return; if (item.category === "attraction") setFlipped(isFlipped ? null : item.id); else setDraft({ ...item }); }}>
                        {!isFlipped ? <>
                          <div className="card-top"><span>{item.category}</span><time>{item.time}</time></div>
                          <h3>{item.title}</h3><button className="edit" aria-label={`Edit ${item.title}`} onClick={() => setDraft({ ...item })}>•••</button>
                          <div className="location">{item.location}</div>
                          {item.notes && <p>{item.notes}</p>}
                          <div className={`status ${item.ticketStatus || "not-needed"}`}><i />{item.ticketStatus === "booked" ? "Booked" : item.ticketStatus === "to-buy" ? "To buy / confirm" : "No advance ticket / conditional"}{item.cost ? ` · ${item.cost}` : ""}</div>
                        </> : <>
                          <div className="back-label">What you are seeing</div><h3>{item.title}</h3>
                          <p>{descriptions[item.title] || (item.notes && !item.notes.startsWith("Click for") ? item.notes : `A planned stop in ${item.location || "Japan"}. Use the official link for the latest admission and visitor information.`)}</p>
                          <div className="next-stop"><div className="back-label">Transport from this attraction</div><strong>{next ? next.title : `Return to ${dayHotel(date)}`}</strong><span>{next ? `${next.time || "Next"} · ${next.location || ""}` : "End of the planned route"}</span><a href={directionsUrl(`${item.title} ${item.location}`, next ? `${next.title} ${next.location}` : dayHotel(date))} target="_blank" rel="noreferrer">Open directions ↗</a></div>
                          {item.link && <a className="official" href={item.link} target="_blank" rel="noreferrer">Official information ↗</a>}
                        </>}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {activeTab === "tickets" && <TicketsPanel items={ticketItems} onEdit={(item) => setDraft({ ...item })} />}
      {activeTab === "route" && <RoutePanel />}
      {activeTab === "history" && <HistoryPanel history={history} />}

      <footer><span>Shared family version {version}</span><button onClick={async () => { await fetch("/api/logout", { method: "POST" }); setPhase("locked"); }}>Lock calendar</button></footer>

      {draft && <Editor item={draft} setItem={setDraft} onSave={saveDraft} onDelete={removeDraft} onClose={() => setDraft(null)} onReset={() => { if (confirm("Restore the original itinerary for everyone?")) { commit(seedItems.map((item) => ({ ...item })), "Restored the original itinerary"); setDraft(null); } }} />}
    </main>
  );
}

function TicketsPanel({ items, onEdit }: { items: TripItem[]; onEdit: (item: TripItem) => void }) {
  return <section><div className="pass-grid"><article className="pass-card"><span>Recommended</span><h2>Hakone Freepass</h2><strong>¥24,000 family</strong><p>Four Odawara-origin passes for the buses, Tozan train, cable car and ropeway.</p></article><article className="pass-card"><span>Recommended</span><h2>Kansai–Hiroshima Area Pass</h2><strong>¥68,000 family</strong><p>Four five-day adult passes, activated Aug 14, covering the eligible regional JR journeys.</p></article><article className="pass-card"><span>Use throughout</span><h2>Four IC cards</h2><strong>Pay as used</strong><p>For ordinary city trains, subways and buses. Reserved intercity trains remain separate.</p></article></div><div className="ticket-list"><h2>Purchase and confirmation list</h2>{items.map((item) => <div className="ticket-row" key={item.id}><small>{dateLabel(item.date)}<br />{item.time}</small><div><strong>{item.title}</strong><span>{item.cost || item.location} · {item.ticketStatus === "booked" ? "Booked" : "To buy"}</span></div><button onClick={() => onEdit(item)}>Edit</button></div>)}</div></section>;
}

function RoutePanel() {
  return <section className="route-panel"><div className="kicker">Locked accommodation route</div><h2>Tokyo → Osaka → Hiroshima → Kyoto → Tokyo</h2><div className="route-chain">{hotelSchedule.map(([date, hotel], index) => <span key={date}>{index > 0 && <b>→</b>}<i>{hotel}<small>{dateLabel(date)}</small></i></span>)}</div><p>Hotel dates remain fixed. Local sightseeing cards can move between days, while intercity train reservations and passes stay visible in the ticket list.</p></section>;
}

function HistoryPanel({ history }: { history: HistoryItem[] }) {
  return <section className="history-panel"><div><div className="kicker">Shared memory</div><h2>Recent family changes</h2><p>The current itinerary is saved in the cloud. This log helps everyone see what changed and who changed it.</p></div><div className="history-list">{!history.length && <p>No shared edits yet.</p>}{history.map((entry) => <article key={entry.id}><span>v{entry.version}</span><div><strong>{entry.action}</strong><small>{entry.changedBy} · {new Date(entry.changedAt).toLocaleString()}</small></div></article>)}</div></section>;
}

function Editor({ item, setItem, onSave, onDelete, onClose, onReset }: { item: TripItem; setItem: (item: TripItem) => void; onSave: (event: FormEvent) => void; onDelete: () => void; onClose: () => void; onReset: () => void }) {
  const update = (key: keyof TripItem, value: string) => setItem({ ...item, [key]: value });
  return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="editor-title"><form className="editor" onSubmit={onSave}><header><h2 id="editor-title">Edit itinerary item</h2><button type="button" onClick={onClose} aria-label="Close">×</button></header><div className="form-grid"><label>Date<input type="date" min="2026-08-06" max="2026-08-22" value={item.date} onChange={(event) => update("date", event.target.value)} required /></label><label>Time<input value={item.time || ""} onChange={(event) => update("time", event.target.value)} placeholder="09:00–10:30" /></label><label>Category<select value={item.category} onChange={(event) => update("category", event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Ticket status<select value={item.ticketStatus || "not-needed"} onChange={(event) => update("ticketStatus", event.target.value)}><option value="to-buy">To buy</option><option value="booked">Booked</option><option value="not-needed">Not needed / conditional</option></select></label><label className="wide">Title<input value={item.title} onChange={(event) => update("title", event.target.value)} required /></label><label className="wide">Location<input value={item.location || ""} onChange={(event) => update("location", event.target.value)} /></label><label>Confirmation number<input value={item.confirmation || ""} onChange={(event) => update("confirmation", event.target.value)} /></label><label>Cost<input value={item.cost || ""} onChange={(event) => update("cost", event.target.value)} /></label><label className="wide">Official link<input type="url" value={item.link || ""} onChange={(event) => update("link", event.target.value)} /></label><label className="wide">Notes<textarea value={item.notes || ""} onChange={(event) => update("notes", event.target.value)} /></label></div><footer><button type="button" className="danger" onClick={onDelete}>Delete</button><button type="button" className="quiet" onClick={onReset}>Restore defaults</button><span /><button type="button" onClick={onClose}>Cancel</button><button className="primary" type="submit">Save for family</button></footer></form></div>;
}
