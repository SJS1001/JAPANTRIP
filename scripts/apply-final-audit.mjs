import fs from "node:fs";

const file = new URL("../data/seed.json", import.meta.url);
const items = JSON.parse(fs.readFileSync(file, "utf8"));
const byId = new Map(items.map((item) => [item.id, item]));

function update(id, changes) {
  const item = byId.get(id);
  if (!item) throw new Error(`Missing itinerary item: ${id}`);
  Object.assign(item, changes);
  delete item.order;
}

function remove(...ids) {
  for (const id of ids) byId.delete(id);
}

function add(item) {
  if (byId.has(item.id)) throw new Error(`Duplicate itinerary item: ${item.id}`);
  byId.set(item.id, item);
}

// Tokyo final audit: remove the cross-city Yanaka detour and keep the east-side
// day moving in one direction through Asakusa, Skytree, Ueno and Akihabara.
remove("a4", "tk8");
update("a1b", { time: "07:20–08:00" });
update("m07a", {
  time: "08:00–09:10",
  title: "Asakusa breakfast & cooling stop",
  location: "Asakusa",
  notes: "Use an air-conditioned café near Senso-ji while shops begin opening. This replaces the inefficient Yanaka/Nezu detour.",
  lat: 35.7126,
  lng: 139.7967,
});
update("a1c", { time: "09:30–10:40" });
update("a1d", { time: "11:05–12:15" });
add({
  id: "m07lunch",
  date: "2026-08-07",
  time: "12:15–12:50",
  category: "meal",
  title: "Solamachi lunch & Ueno transfer",
  location: "Tokyo Skytree Town",
  notes: "Quick indoor lunch, then take the subway to Ueno for the 13:00 museum opening block.",
  ticketStatus: "not-needed",
  confirmed: true,
  confirmation: "",
  cost: "",
  link: "",
  lat: 35.7103,
  lng: 139.8126,
  quantity: "",
  fareDetails: "",
  imageUrl: "",
});
update("a7", {
  notes: "Nintendo Tokyo opens at 10:00 and may distribute same-day numbered-entry tickets on this busy Saturday. Check the official instructions that morning.",
  link: "https://shibuya.parco.jp.e.aiv.hp.transer.com/shop/detail/?cd=025888",
});
update("tk1", {
  notes: "Booking is open now. Reserve the 13:30 timed entry; do not book sunset because Shibuya Bon Odori begins at 18:00 and road restrictions begin at 16:30.",
});
update("t21borderless", {
  time: "10:35–11:20",
  notes: "Heat-safe primary: taxi from Hamarikyu to Azabudai Hills, usually about 10–20 minutes. Transit backup: walk to Shimbashi, take the Ginza Line to Toranomon, then walk 10–12 minutes. Leave by 10:35–10:40 for the 11:30 timed entry.",
});
update("a51", {
  ticketStatus: "not-needed",
  cost: "Adults ¥500 · high-school ¥250 · junior-high free",
  notes: "Large landscaped garden beside the hotel area. Visit after peak heat; August hours are 09:00–18:00 with final admission at 17:30. Pay at the gate or use an IC card; no urgent reservation.",
});
update("tk-gyoen", {
  ticketStatus: "not-needed",
  cost: "2 adults ¥1,000 + high-school ¥250; junior-high free",
  notes: "No advance booking needed. Pay at the gate or use Suica/PASMO; the 13-year-old junior-high student enters free.",
});

// Hakone: remove the risky on-arrival pass purchase and clarify the museum stop.
update("pass-hakone", {
  time: "Buy digitally before Aug 10",
  notes: "Buy the two-day Odawara-origin digital pass before travel; the station counter opens too late for the 07:20 bus. All four travellers use adult passes. Check live operations separately on the morning of travel.",
});
update("t10c", {
  title: "Bus → Ninotaira-iriguchi + walk",
  location: "Ninotaira-iriguchi bus stop",
  notes: "Board toward Ninotaira/Chokoku-no-Mori, get off at Ninotaira-iriguchi and walk to the Open-Air Museum. Confirm the stop in Hakone Navi shortly before travel.",
  lat: 35.2445,
  lng: 139.0487,
});
update("a16", {
  ticketStatus: "not-needed",
  cost: "About ¥5,600 online for 2 adults + 1 high-school + 1 junior-high",
});
update("tk-oam", {
  cost: "About ¥5,600 family online",
  notes: "Buy the official online ticket for two adults, one high-school student and one junior-high student. It is cheaper and bypasses the sales counter, but is not a fast pass inside.",
});

// Osaka: outdoor landmarks at the cool ends of the day; protected indoor rest
// through the worst early-afternoon heat.
update("a17", { ticketStatus: "not-needed", cost: "Grounds free" });
update("a18", {
  ticketStatus: "not-needed",
  cost: "Paid interior; optional",
  notes: "Enter at opening only if the queue is manageable. The grounds are free; the reconstructed keep is a separate paid modern museum.",
});
update("m11", {
  time: "12:00–14:30",
  title: "Lunch, hotel reset & cooling break",
  location: "APA Hotel / Namba",
  notes: "Protected indoor lunch, showers and rest during the hottest part of this Mountain Day holiday.",
  lat: 34.6664,
  lng: 135.495,
});
update("a19", { time: "14:45–16:45", notes: "Osaka’s electronics, anime, games and collectables district. Prioritize air-conditioned shops." });
update("a20", { time: "17:00–18:30", notes: "Explore the retro streets after peak heat and see Tsutenkaku from below; skip another paid observation deck." });
update("a21", { time: "19:00–late" });
update("m11b", { time: "19:30–21:00" });
update("tk4", {
  title: "OPTIONAL · Pokémon Café Osaka cancellation check",
  time: "Only if a suitable table appears",
  notes: "No reservation is held. Check only for a four-person cancellation that fits without cutting Osaka Castle, Den Den Town, Shinsekai or Dotonbori.",
  ticketStatus: "not-needed",
  link: "https://www.pokemoncenter-online.com/cafe/en/reservation/",
});
update("a23", { ticketStatus: "not-needed", notes: "Indoor reconstruction of Edo-period Osaka streets. Buy walk-up admission; no express pass is needed." });
update("a24b", {
  time: "17:30–18:30",
  notes: "Short riverfront and Central Public Hall walk only after the heat eases. If it remains oppressive, stay in Umeda’s indoor complexes and view Nakanoshima by taxi or skip it.",
});
update("a25", { time: "14:30–17:15", notes: "Use Grand Front, department stores and the Osaka Station complex as the protected indoor afternoon block. Skip Umeda Sky Building because Tokyo has the chosen skyline decks." });

// Nara: temples early, then a genuine midday recovery before Naramachi and Tōkae.
update("a29", {
  time: "10:15–11:45",
  ticketStatus: "not-needed",
  cost: "Grounds free; special worship optional",
  notes: "Forest shrine and lantern-lined paths. The approach is shaded, but hydrate before the walk; special worship is optional and paid.",
});
update("m13a", {
  time: "12:00–14:30",
  title: "Long indoor Nara lunch & cooling break",
  notes: "Protect this full air-conditioned break before Naramachi and the evening lantern lighting.",
});
update("a30", { time: "14:30–17:00", notes: "Historic merchant district. Move between machiya interiors, cafés and shaded streets rather than staying exposed outside." });

// Hiroshima: remove duplicates, decompress indoors after the museum, and push
// the exposed garden to late afternoon.
remove("hr-bags", "m14a", "m14b");
update("t5b", { time: "08:40–09:20", notes: "Taxi from Hiroshima Station to Hilton for one overnight-bag drop, then continue directly to the hypocenter/Peace Park. This is the single transfer entry." });
update("hr-hypo", { time: "09:20–09:30" });
update("hr-lunch", {
  time: "13:45–15:10",
  title: "Indoor okonomiyaki lunch & decompression",
  notes: "Use a seated, air-conditioned lunch after the museum. Nagata-ya is convenient; if its queue is long, use another nearby Hiroshima-style okonomiyaki restaurant.",
});
update("hr-hondori", { time: "15:10–16:10", notes: "Covered shopping arcade and cooling stop before the garden." });
update("a33", {
  time: "16:30–17:30",
  ticketStatus: "not-needed",
  notes: "Late-afternoon short garden circuit after the strongest heat. Take a taxi from Hondori; if the heat warning remains severe, shorten to the shaded core or skip without replacing the Peace Museum block.",
});

// Miyajima: protect the shrine at opening and high tide, then make the exposed
// mountain optional only after a seated lunch.
remove("m15b", "a36b", "miy-return", "m15c");
update("a35", { time: "08:15–09:15" });
update("t15walk", {
  time: "09:15–09:30",
  title: "Walk Daisho-in → shaded Omotesando",
  location: "Miyajima Omotesando",
  notes: "Return downhill toward the shaded shopping streets. Do not begin the exposed Mount Misen climb here.",
  lat: 34.2974,
  lng: 132.3216,
});
add({
  id: "miy-cool",
  date: "2026-08-15",
  time: "09:30–10:35",
  category: "meal",
  title: "Shaded Omotesando cooling stop",
  location: "Miyajima Omotesando",
  notes: "Sit indoors, hydrate and snack before the protected high-tide shoreline revisit.",
  ticketStatus: "not-needed",
  confirmed: true,
  confirmation: "",
  cost: "",
  link: "",
  lat: 34.2974,
  lng: 132.3216,
  quantity: "",
  fareDetails: "",
  imageUrl: "",
});
update("miy-tide", { time: "10:50–11:25" });
update("miy-senjokaku", { time: "11:25–11:55" });
update("miy-food", {
  time: "12:00–13:15",
  title: "Seated Miyajima lunch · oysters, anago & age-momiji",
  notes: "Use a proper air-conditioned lunch rather than a long exposed food walk. Try the island specialties without queueing excessively.",
});
update("a36", {
  time: "13:15–15:00",
  title: "CONDITIONAL · Miyajima Ropeway to Shishiiwa",
  location: "Miyajima Ropeway",
  ticketStatus: "not-needed",
  notes: "Only go if the heat index, visibility and queues are acceptable. Ride to Shishiiwa and return; do not attempt the summit hike in severe August heat. The shrine and high tide are already protected priorities.",
});
update("t6c", { time: "15:15–16:30 target" });
update("tk-miyajima-ropeway", {
  ticketStatus: "not-needed",
  title: "CONDITIONAL · Miyajima Ropeway",
  notes: "Do not precommit. Recheck designated reservation dates, weather, heat index and queues one week before. Use only for a Shishiiwa out-and-back; the summit hike is removed.",
});

// Kyoto: retain the early starts but protect long midday indoor breaks and
// condition the steep monkey-park climb on the heat warning.
update("a37", {
  time: "10:00–12:00",
  ticketStatus: "not-needed",
  notes: "Prioritize Ninomaru Palace and the nightingale floors. Keep the garden circuit short if the sun is intense; Honmaru Palace requires a separate timed reservation.",
});
update("tk-nijo", {
  time: "Choose 11:00 or later if adding Honmaru",
  notes: "General castle/Ninomaru entry is flexible. Honmaru Palace is separate and capacity-controlled; if wanted, reserve 11:00 or later to protect against the Hiroshima transfer running late.",
});
update("m17b", { time: "12:30–15:30", title: "Long Higashiyama lunch & cooling break", notes: "Stay indoors through the hottest three hours before the late-afternoon temple and Gion blocks." });
update("a42", { time: "15:30–17:30" });
update("a43", { time: "17:30–18:45" });
update("m17c", { time: "18:45–20:00" });
update("t17return", { time: "20:00–20:45" });
update("a47", {
  time: "10:00–10:50",
  title: "CONDITIONAL · Arashiyama Monkey Park",
  ticketStatus: "not-needed",
  notes: "Attempt only if the heat warning is not severe and everyone is well hydrated. The steep exposed climb is the first Kyoto item to cut; turn back by 10:50.",
});
update("m18", { time: "11:00–12:15", title: "Indoor Arashiyama lunch & cooling break", notes: "Sit down in air conditioning before crossing Kyoto." });
update("t18b", { time: "12:15–13:15" });
update("a48", { time: "13:20–14:10", notes: "Short pond-view circuit only; use shade and do not linger in the exposed approach during peak heat." });
update("t18c", { time: "14:10–14:35" });
update("a49", { time: "14:35–15:45", notes: "Zen rock garden and shaded temple grounds; use the indoor viewing veranda as the cooling focus." });
update("m18b", { time: "16:00–18:00" });

const finalItems = items
  .filter((item) => byId.has(item.id))
  .map((item) => byId.get(item.id));
for (const item of byId.values()) {
  if (!items.some((original) => original.id === item.id)) finalItems.push(item);
}

fs.writeFileSync(file, `${JSON.stringify(finalItems, null, 2)}\n`);
