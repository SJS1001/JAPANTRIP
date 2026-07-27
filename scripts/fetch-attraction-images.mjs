import { mkdir, readFile, writeFile } from "node:fs/promises";

const seedPath = new URL("../data/seed.json", import.meta.url);
const manifestPath = new URL("../data/image-manifest.json", import.meta.url);
const imageDirectory = new URL("../public/images/attractions/", import.meta.url);

const pages = {
  a1: "Sensō-ji",
  a1b: "Sumida River",
  a4: "Nezu Shrine",
  a1c: "Kappabashi Kitchen Town Tokyo storefront",
  a1d: "Tokyo Skytree",
  a2: "Tokyo National Museum building Ueno",
  "tok-ueno-park": "Ueno Park",
  "tok-ameyoko": "Ameya-Yokochō",
  a55: "Akihabara",
  a61: "Akihabara",
  a5: "Meiji Jingu shrine Tokyo",
  a6: "Takeshita Street Harajuku Tokyo",
  a7: "Shibuya Parco exterior Tokyo",
  a60: "Pokemon Center Shibuya",
  "tok-hachiko": "Hachikō",
  "tok-megadonki": "Shibuya",
  a8: "Shibuya Sky observation deck Tokyo",
  a8b: "Bon (festival)",
  a9: "teamLab Planets Tokyo",
  a12: "Odaiba",
  a10: "Unicorn Gundam",
  a09b: "teamLab Borderless Tokyo",
  a09c: "Tokyo Tower",
  a09d: "Roppongi Hills",
  a13: "Hakone Shrine Lake Ashi torii",
  a16: "Hakone Open Air Museum sculpture park",
  a14x: "Hakone Ropeway",
  a15: "Owakudani Hakone volcanic valley",
  a17: "Osaka Castle",
  a18: "Osaka Castle",
  a18b: "Kuromon Ichiba Market",
  a19: "Den Den Town Osaka street",
  a20: "Shinsekai Tsutenkaku Osaka street",
  a21: "Dōtonbori",
  a22: "Sumiyoshi-taisha",
  a23: "Osaka Museum of Housing and Living exhibit",
  a24: "Tenjinbashisuji Shopping Street",
  a24b: "Nakanoshima (Osaka)",
  a25: "Osaka Station",
  a26: "Nara Park",
  a27: "Todaiji Great Buddha Nara",
  a28: "Nigatsu-dō",
  a29: "Kasuga-taisha",
  a30: "Naramachi",
  a30b: "Tōkae",
  "hr-hypo": "Shima Hospital Hiroshima hypocenter",
  a31: "Hiroshima Peace Memorial",
  "hr-remnants": "Hiroshima Peace Memorial ruins",
  "hr-hall": "Hiroshima National Peace Memorial Hall for the Atomic Bomb Victims",
  a32: "Hiroshima Peace Memorial Museum building",
  "hr-hondori": "Hondori shopping arcade Hiroshima",
  a33: "Shukkeien garden Hiroshima",
  a34: "Itsukushima Shrine",
  a35: "Daishoin Temple Miyajima",
  a36: "Mount Misen",
  "miy-tide": "Itsukushima Shrine",
  "miy-senjokaku": "Senjō-kaku",
  a36b: "Miyajima Omotesando waterfront street",
  a37: "Nijō Castle",
  a50: "Nishiki Market",
  a38: "Daimonji Gozan Okuribi Kyoto fire",
  a39: "Fushimi Inari-taisha",
  a40: "Kiyomizu-dera",
  a41: "Sannenzaka",
  a42: "Kōdai-ji",
  a43: "Gion Pontocho Kyoto street",
  a44: "Arashiyama bamboo grove Kyoto",
  a45: "Togetsukyō Bridge",
  a46: "Tenryū-ji",
  a47: "Iwatayama Monkey Park",
  a48: "Golden Pavilion Kyoto Kinkakuji",
  a49: "Ryōan-ji",
  a51: "Shinjuku Gyo-en",
  a51b: "Shinjuku",
  a52: "Shinjuku",
  "tok-west-hanazono": "Hanazono Shrine",
  "tok-west-animate": "Animate Ikebukuro flagship storefront",
  "tok-west-sunshine": "Sunshine City Tokyo building",
  "tok-west-nakano": "Nakano Broadway",
  "tok-west-koenji": "Koenji Tokyo shopping street",
  a56: "Tsukiji fish market",
  a57: "Hama-rikyū Gardens",
  a58: "Ginza shopping street Tokyo",
  a59: "Tokyo Station",
  "tok-imperial": "Nijubashi Imperial Palace Tokyo",
  a59b: "Ginza",
};

function safeExtension(url, mimeType = "") {
  if (mimeType.includes("png") || /\.png(?:\?|$)/i.test(url)) return "png";
  if (mimeType.includes("webp") || /\.webp(?:\?|$)/i.test(url)) return "webp";
  return "jpg";
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function relevance(title, query) {
  const stopWords = new Set(["japan", "tokyo", "kyoto", "osaka", "street", "building", "exterior"]);
  const tokens = (value) => value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
  const titleTokens = new Set(tokens(title || ""));
  return tokens(query).reduce((score, token) => score + (titleTokens.has(token) ? 1 : 0), 0);
}

async function openverseImage(query, attempt = 0) {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.search = new URLSearchParams({
    q: `${query} Japan`,
    page_size: "5",
    mature: "false",
  });
  const response = await fetch(url, { headers: { "user-agent": "JapanFamilyTripCalendar/1.0" } });
  if (response.status === 429 && attempt < 4) {
    await delay((Number(response.headers.get("retry-after")) || 60) * 1000 + 1000);
    return openverseImage(query, attempt + 1);
  }
  if (!response.ok) return null;
  const payload = await response.json();
  const candidates = (payload.results || []).filter(
    (image) => image.thumbnail && image.foreign_landing_url && !/logo|map|sign/i.test(image.title || ""),
  );
  const match = candidates
    .map((image, index) => ({ image, index, score: relevance(image.title, query) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.image || payload.results?.[0];
  if (!match) return null;
  return {
    image: match.thumbnail,
    source: match.foreign_landing_url,
    credit: [match.creator, match.license?.toUpperCase()].filter(Boolean).join(" · "),
  };
}

const items = JSON.parse(await readFile(seedPath, "utf8"));
await mkdir(imageDirectory, { recursive: true });
const refreshIds = new Set((process.env.REFRESH_IMAGE_IDS || "").split(",").filter(Boolean));

let downloaded = 0;
const missing = [];
const resultCache = new Map();
const bytesCache = new Map();
for (const item of items) {
  if (item.category !== "attraction") continue;
  if (item.imageUrl && item.imageSource && !refreshIds.has(item.id)) {
    downloaded += 1;
    continue;
  }
  const pageTitle = pages[item.id] || item.title.replace(/\s*\([^)]*\)\s*$/, "");
  const result = resultCache.has(pageTitle)
    ? resultCache.get(pageTitle)
    : await openverseImage(pageTitle);
  resultCache.set(pageTitle, result);
  if (!result) {
    missing.push(`${item.id}: ${item.title}`);
    continue;
  }
  let downloadedImage = bytesCache.get(result.image);
  if (!downloadedImage) {
    const response = await fetch(result.image, { headers: { "user-agent": "JapanFamilyTripCalendar/1.0" } });
    if (!response.ok) {
      missing.push(`${item.id}: ${item.title}`);
      continue;
    }
    downloadedImage = {
      bytes: Buffer.from(await response.arrayBuffer()),
      mimeType: response.headers.get("content-type") || "",
    };
    bytesCache.set(result.image, downloadedImage);
  }
  const extension = safeExtension(result.image, downloadedImage.mimeType);
  const filename = `${item.id}.${extension}`;
  await writeFile(new URL(filename, imageDirectory), downloadedImage.bytes);
  item.imageUrl = `/images/attractions/${filename}`;
  item.imageSource = result.source;
  item.imageCredit = result.credit || "Openly licensed image";
  downloaded += 1;
}

// Some broad landmark searches can return a technically related but visually
// misleading result. Reuse a verified photo from the same place instead.
const verifiedFallbacks = {
  a7: "a60", // Shibuya PARCO: Pokémon Center Shibuya is inside this building.
  a36b: "a34", // Miyajima waterfront: use the verified island/torii view.
  h1: "a12", // Shiomi hotel: Tokyo Bay neighbourhood view.
  h2: "a21", // Namba hotel: Dotonbori/Namba neighbourhood view.
  h3: "hr-hondori", // Hiroshima hotel: central Hiroshima neighbourhood view.
  h4: "a37", // Kyoto hotel: nearby Nijo Castle view.
  h5: "a51b", // Cava House: Shinjuku neighbourhood view.
};
const itemsById = new Map(items.map((item) => [item.id, item]));
for (const [targetId, sourceId] of Object.entries(verifiedFallbacks)) {
  const target = itemsById.get(targetId);
  const source = itemsById.get(sourceId);
  if (!target || !source?.imageUrl) continue;
  target.imageUrl = source.imageUrl;
  target.imageSource = source.imageSource;
  target.imageCredit = target.category === "hotel"
    ? `${source.imageCredit || "Local trip image"} · neighbourhood view`
    : source.imageCredit;
}

await writeFile(seedPath, `${JSON.stringify(items, null, 2)}\n`);
const imageManifest = Object.fromEntries(
  items
    .filter((item) => item.imageUrl)
    .map((item) => [item.id, {
      imageUrl: item.imageUrl,
      imageSource: item.imageSource || "",
      imageCredit: item.imageCredit || "Local trip image",
    }]),
);
await writeFile(manifestPath, `${JSON.stringify(imageManifest, null, 2)}\n`);
console.log(JSON.stringify({ downloaded, missing }, null, 2));
