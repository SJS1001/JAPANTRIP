# Restaurant rankings and gluten-aware fallbacks

**Snapshot:** 2026-07-27  
**Scope:** every `areaByItem` / `areaGuides` key in `data/card-guides.ts`; entries are chosen for the actual scheduled stop and walking practicality, not as a citywide awards list. The machine-readable companion is `data/restaurant-guides.json`.

## How to read this

- Ratings are a **dated platform snapshot**, not a universal score. Tabelog uses a conservative weighted scale; a 3.5 there is generally strong. A numeric value is included only when the current page exposed both score and review count. Otherwise the JSON uses `null`.
- Ranking tempers rating with review volume, walking distance, family seating and whether the venue is actually usable in the agenda window.
- **Dedicated** means the source describes the whole operation/kitchen as gluten-free. **Gluten-free menu** means specific dishes are designed as GF but the kitchen is mixed. **Accommodates request** is lower confidence. **Uncertain** is not celiac-safe.
- Soy sauce, miso, curry roux, tempura, soba, udon, okonomiyaki, yakisoba and fried foods commonly contain wheat. Plain-looking sushi, eel and grilled meat are not automatically GF. A Japanese allergy card and a direct cross-contact discussion remain necessary.

## Critical itinerary corrections found

1. **Nagataya must not be the Aug 14 lunch anchor.** Its current Tabelog business note says it is closed **Aug 12–14 for Obon**. Use Caffè Ponte, the scheduled indoor meal, or confirm another shop immediately before the day. The page currently shows 3.49/653, but availability overrides rank. [Current Tabelog page](https://tabelog.com/en/hiroshima/A3401/A340116/34010875/)
2. **Omen Kodaiji is a stale recommendation.** Tabelog marks that listing as relocated and the displayed score is for the old location. Do not show it as a current walk-in until the new address and hours are verified. [Relocated listing](https://tabelog.com/en/kyoto/A2601/A260301/26018201/)
3. **“Gluten-friendly” is not “celiac-safe.”** Koguma in Hiroshima is unusually strong because its official site says GF okonomiyaki is cooked on a separate GF grill, but it still requires a reservation. [Koguma official](https://www.hiroshimayaki.biz/?mode=f7)
4. **Tokyo Shiba Tofuya Ukai is no longer an option.** The Tokyo/Hakone audit found it permanently closed in March 2026. The app should remove the old restaurant suggestion rather than retain a dead link.
5. **Tsunahachi Sohonten is closed/on hold after May 31, 2026.** If the family wants tempura in Shinjuku, use the Keio branch and recheck it before travel.

## Osaka

| Area key | Ranked practical choices | Rating snapshot | Walk / reservation | Why it ranks here |
|---|---|---|---|---|
| `namba` | 1. Ajinoya Honten; 2. Gluten-Free & Vegan Okonomiyaki Vim; 3. Marufuku Coffee Sennichimae; 4. Rikuro Ojisan Namba | Ajinoya **3.60/1,729 Tabelog**; Vim **4.6/135 Google**; Marufuku **3.42/840 Tabelog** | 5–10 min; Ajinoya queue/online slots, Vim reservation recommended | Ajinoya is the volume-tested classic; Vim is the safest signature-food choice for GF diners; Marufuku is the reliable air-conditioned coffee fallback. [Ajinoya](https://tabelog.com/en/osaka/A2701/A270202/27001439/) · [Vim](https://www.godotonbori.com/shop/gluten-freevegan-okonomiyaki-vim/) · [Marufuku](https://tabelog.com/en/osaka/A2701/A270202/27001450/)
| `osaka_castle` | 1. Chibo JO-TERRACE; 2. Restaurant RASPBERRY with MOON BAR; 3. JO-TERRACE food cluster | null | 8–12 min; walk-in / recommended for terrace restaurant | All stay on the castle-to-station line. Chibo is the only nearby source found that explicitly advertises a GF minced-style option/allergen information; confirm cross-contact. [Osaka tourism listing](https://osaka-info.jp/fr/special/universal/course01/spot01/)
| `nipponbashi` | 1. Fukutaro Honten; 2. Marufuku Coffee Sennichimae; 3. Maguroya Kurogin | Fukutaro **3.74/2,664 Tabelog**; Marufuku **3.42/840** | 3–10 min; both core restaurants walk-in/queue | Fukutaro has the strongest quality/volume signal in the area; Marufuku is a practical heat break; market seafood is for flexible snacking, not celiac certainty. [Fukutaro](https://tabelog.com/en/osaka/A2701/A270202/27002665/) 
| `shinsekai` | 1. Yaekatsu; 2. Kushikatsu Daruma; 3. Tengu | null | 2–7 min; walk-in queues | All are classic and directly on the route, but breading/shared oil make all three unsuitable for celiac diners. Use Vim back in Namba for a dedicated GF meal.
| `sumiyoshi` | 1. Yaroku Restaurant; 2. Yaroku takeaway croquette shop; 3. Kagoya sweets | Yaroku **3.48/428 Tabelog** | 3–12 min; restaurant walk-in, may sell out | Strong local institution, but it opens too late for the current 06:30 shrine block. Treat as a future/late option, not breakfast. [Yaroku](https://tabelog.com/en/osaka/A2701/A270404/27002854/)
| `tenjinbashi` | 1. Harukoma main; 2. Harukoma branch; 3. Nakamuraya croquette; 4. Coffee no Mori | Main **3.58/1,765**; branch **3.52/1,068 Tabelog** | 3–8 min; queues, no dependable group reservation | Harukoma wins on volume and proximity. Sushi is only GF by explicit order with tamari and clean handling; never assume regular soy sauce is safe. [Main](https://tabelog.com/en/osaka/A2701/A270103/27002205/) · [Branch](https://tabelog.com/en/osaka/A2701/A270103/27023038/)
| `umeda` | 1. Okonomiyaki Kiji Honten; 2. Hankyu depachika; 3. Kiji Sky Building branch; 4. Rikuro Daimaru | Honten **3.67/2,121 Tabelog**; Sky branch **3.69/878** (area ranking snapshot) | 0–12 min; Kiji walk-in queues | Kiji has the strongest rating/volume combination, but the food is wheat-heavy. The depachika is the family-flexible fallback, not an allergy-safe kitchen. [Kiji Honten](https://tabelog.com/en/osaka/A2701/A270101/27000297/) · [area ranking](https://tabelog.com/en/osaka/A2701/A270101/rstLst/RC0109)
| `nakanoshima` | 1. Drawing House of Nakanoshima; 2. Gokan Kitahama; 3. Brooklyn Roasting Kitahama | Drawing House **3.48/587 Tabelog** | On site to 12 min; reserve recommended for seated meal | The renamed Central Public Hall restaurant is the efficient choice. Gokan/coffee are nearby heat-break options, not GF-safe by default. [Current restaurant listing](https://tabelog.com/en/osaka/A2701/A270101/27085674/)

### Osaka gluten-aware choices

| Area(s) | Choice | Safety | Practical note |
|---|---|---|---|
| `namba`, `nipponbashi`, `shinsekai` | **Gluten-Free & Vegan Okonomiyaki Vim** | **Dedicated** | Central Namba, 5–15 min from these stops. The Dotonbori district guide describes an entirely GF specialist operation. Reserve for four. [Official district page](https://www.godotonbori.com/shop/gluten-freevegan-okonomiyaki-vim/)
| `osaka_castle` | **Chibo JO-TERRACE** | Gluten-free menu / mixed kitchen | Official Osaka tourism page lists allergen information and a GF minced-style dish. Ask about griddle/utensil cross-contact. [Source](https://osaka-info.jp/fr/special/universal/course01/spot01/)
| `sumiyoshi`, `tenjinbashi`, `umeda`, `nakanoshima` | **Vim (nearest robust anchor)** | Dedicated | No second nearby venue with official celiac controls was verified. Plan a separate Namba meal rather than improvising with soy sauce/fryer requests. Approx 15–35 min by rail depending on area.
| all Osaka areas | **Hotel/department-store allergy desk** | Accommodates request | Ask in advance; an allergen chart does not establish a dedicated kitchen.

## Nara

| Area key | Ranked practical choices | Rating snapshot | Walk / reservation | Why it ranks here |
|---|---|---|---|---|
| `nara_park` | 1. Kasuga Ninai Jaya; 2. Mizuya Chaya; 3. Big Mountain Cafe & Farm; 4. Nakatanido (snack) | Mizuya **3.26/60 Tabelog** | 2–15 min on the park route; walk-in | Ninai Jaya is on-route and documented by Nara tourism; Mizuya is atmospheric but wheat-heavy. Big Mountain is the best verified GF meal, though farther north. [Mizuya](https://tabelog.com/en/nara/A2901/A290101/29001604/) · [Big Mountain official](https://www.bmcaf.co/)
| `naramachi` | 1. Edogawa Naramachi; 2. Nakanishi Yosaburo; 3. Hiraso kakinoha-zushi; 4. Big Mountain Cafe & Farm | Edogawa **3.43/182 Tabelog** | 3–10 min; Edogawa reservation recommended | Edogawa is comfortable for four and currently bookable; the sauce makes eel unsafe unless the kitchen confirms a GF preparation. [Edogawa](https://tabelog.com/en/nara/A2901/A290101/29000292/)

### Nara gluten-aware choices

| Choice | Safety | Practical note |
|---|---|---|
| **Big Mountain Cafe & Farm** | **Dedicated** | Officially calls itself a gluten-free and vegan shop; about 20–30 min walk or short taxi from the park/Naramachi edge. It is closed Tuesday and the trip is Thursday. [Official](https://www.bmcaf.co/)
| **+FINO HOME CAFE** | Gluten-free menu | Official site says it specializes in freshly baked GF waffles. It is less central; verify service hours and cross-contact before detouring. [Official](https://plufino-cafe.com/top-en/)
| **Sarasojyu** | Dedicated, but **do not rely on it** | Current third-party listing says temporarily closed as of Feb 2026. Exclude unless the shop itself announces reopening. [Closure evidence](https://www.corner.inc/place/puBg8rDFUb6v)

## Hiroshima and Miyajima

| Area key | Ranked practical choices | Rating snapshot | Walk / reservation | Why it ranks here |
|---|---|---|---|---|
| `peace_park` | 1. Caffè Ponte; 2. Nagataya **closed Aug 14**; 3. Musubi Musashi; 4. Koguma GF okonomiyaki (taxi/tram) | Caffè Ponte **3.47/460 Tabelog**; Nagataya **3.49/653** | Ponte 2–5 min, reserve recommended; Nagataya unavailable | Ponte is the practical indoor decompression meal. Nagataya’s rating is irrelevant on the trip date because its current page lists an Obon closure. [Ponte](https://tabelog.com/en/hiroshima/A3401/A340116/34004795/) · [Nagataya](https://tabelog.com/en/hiroshima/A3401/A340116/34010875/)
| `central_hiroshima` | 1. Okonomiyaki Hassho, Okonomimura; 2. Okonomiyaki Hasshou (Ginzancho); 3. Hiroshima Andersen; 4. Koguma | Okonomimura Hassho **3.46/235**; Ginzancho Hasshou **3.74/1,177 Tabelog** | 5–15 min; queues; Koguma reservation required | Ginzancho has the strongest rating/volume but more detour; Okonomimura is more efficient with Hondori. [Hassho](https://tabelog.com/en/hiroshima/A3401/A340114/34002533/) · [Hasshou](https://tabelog.com/en/hiroshima/A3401/A340108/34019405/)
| `shukkeien` | 1. Sensuitei tea shop; 2. Hilton Hiroshima dining; 3. Koguma; 4. Hassho | null | On site / at hotel / short taxi | Dinner is already included at Hilton, so it outranks another queue. Sensuitei is the only no-detour snack if open.
| `miyajima` | 1. Fujitaya; 2. Kakiya; 3. Kakiwai; 4. Momijido | Fujitaya **3.57/932**; Kakiya **3.56/2,062**; Kakiwai **3.41/147 Tabelog** | 4–8 min; Fujitaya/Kakiya no reservations | Fujitaya edges by score; Kakiya wins operationally with 100 seats and a central 10:00–18:00 window. Neither is celiac-safe by default. [Fujitaya](https://tabelog.com/en/hiroshima/A3402/A340202/34002045/) · [Kakiya](https://tabelog.com/en/hiroshima/A3402/A340202/34003363/) · [Kakiwai](https://tabelog.com/en/hiroshima/A3402/A340202/34020139/)

### Hiroshima/Miyajima gluten-aware choices

| Area(s) | Choice | Safety | Practical note |
|---|---|---|---|
| `central_hiroshima`, `shukkeien`, `peace_park` | **Koguma** | **Gluten-free menu with separate GF grill** | Strongest celiac-oriented evidence in the city; official site says the GF okonomiyaki uses a separate grill and **reservation is required**. Confirm every allergen and utensil detail when booking. [Official](https://www.hiroshimayaki.biz/?mode=f7)
| same | **OKOSTA Hiroshima Station** | Gluten-free menu | Official Otafuku experience offers rice-flour noodles and GF sauce. It is a 90-minute reserved class, not a drop-in restaurant; it does not state a dedicated facility. [Official](https://www.otafuku.co.jp/visit/en/experience/)
| `miyajima` | **Plain grilled oysters / plain rice only by direct request** | Uncertain | No island venue with official celiac controls was verified. Regular anago sauce, soy sauce, noodles, fried oysters and age-momiji are unsafe. Carry a sealed backup meal from Hiroshima.
| `miyajima` | **Koguma before/after island** | Gluten-free menu with separate GF grill | Nearest robust alternative is back in central Hiroshima, roughly 60–90 min including ferry/train; therefore not a practical lunch detour.

## Kyoto

| Area key | Ranked practical choices | Rating snapshot | Walk / reservation | Why it ranks here |
|---|---|---|---|---|
| `nijo` | 1. Menbaka Fire Ramen; 2. Ikkon/local Japanese meal near castle; 3. Nijō Wakasaya; 4. La Locanda (splurge, east) | Menbaka rating not reliably exposed in current result | 7–15 min; Menbaka reservation recommended | Menbaka is experiential and officially documents GF rice noodles plus dedicated pots/utensils to reduce cross-contact. [Official](https://www.fireramen.com/)
| `nishiki` | 1. Katsukura Sanjo; 2. Nishiki shop tastings; 3. CHOICE (east); 4. Toshoan GF sweets | Katsukura **3.22/242 Tabelog** | 5–15 min; Katsukura walk-in | Katsukura is family-reliable, but breaded. CHOICE/Toshoan are the safer GF anchors; market tasting is not allergy-safe by default. [Katsukura](https://tabelog.com/en/kyoto/A2601/A260201/26001918/)
| `demachiyanagi` | 1. Bon Bon Café; 2. Demachi Futaba; 3. La Locanda; 4. CHOICE | null | 5–20 min; reserve early dinner on Gozan day | Bon Bon wins on viewpoint logistics. Futaba is a snack, not dinner. The Ritz-Carlton’s La Locanda publishes an à-la-carte GF menu but still asks guests to declare allergies. [La Locanda menu](https://lalocanda.ritzcarltonkyoto.com/en/our-menus)
| `fushimi` | 1. Vermillion Cafe; 2. Nezameya; 3. Inari-sushi specialist on approach | Vermillion espresso bar **3.22/41 Tabelog** | 3–8 min; walk-in | Vermillion is the practical breakfast. Inari sushi may contain wheat in soy-seasoned tofu; neither is celiac-safe without direct confirmation. [Vermillion](https://tabelog.com/en/kyoto/A2601/A260601/26025786/)
| `higashiyama` | 1. GF Ramen Kyoto / Gion Soy Milk Ramen UNO; 2. CHOICE; 3. Kagizen; 4. Kasagiya; 5. Omen Kodaiji **stale listing** | null | 5–20 min; GF ramen/CHOICE walk-in or recommended | Dedicated GF restaurants outrank the stale Omen lead. Use traditional sweets only after ingredient/cross-contact confirmation. [Kyoto GF guide](https://www.gluten-free-japan.com/guide/kyoto)
| `gion` | 1. GF Ramen Kyoto / UNO; 2. Gion Endo (splurge); 3. Gion Tanto; 4. Kagizen | Gion Endo **3.88/140**; Gion Tanto **3.29/70 Tabelog** | 3–10 min; Endo required; Tanto queue | The dedicated GF ramen is the safest casual dinner. Endo is rating-led but expensive; Tanto is approachable but wheat-heavy and permits smoking per current listing. [Endo](https://tabelog.com/en/kyoto/A2601/A260301/26019418/) · [Tanto](https://tabelog.com/en/kyoto/A2601/A260301/26007590/)
| `arashiyama` | 1. Shigetsu; 2. Arashiyama Yoshimura; 3. eX Café; 4. % Arabica | Shigetsu **3.59/176**; Yoshimura **3.52/1,019 Tabelog** | On site to 6 min; Shigetsu reserve | Shigetsu best matches the itinerary and has the stronger experience, but vegetarian does not mean GF. Yoshimura’s soba and dipping sauce can contain wheat. [Shigetsu](https://tabelog.com/en/kyoto/A2601/A260403/26000923/) · [Yoshimura](https://tabelog.com/en/kyoto/A2601/A260403/26000403/)
| `north_kyoto` | 1. Seigeiin yudofu; 2. Okonomiyaki Katsu; 3. temple-area teahouse | Katsu **3.03/7 Tabelog** | On site to 12 min; walk-in | Seigeiin is the only efficient proper meal. Tofu meals still use wheat-containing soy sauce unless a GF set is explicitly arranged. [Katsu](https://tabelog.com/en/kyoto/A2601/A260402/26011168/)

### Kyoto gluten-aware choices

| Area(s) | Choice | Safety | Practical note |
|---|---|---|---|
| `higashiyama`, `gion` | **GF Ramen Kyoto / Gion Soy Milk Ramen UNO** | **Dedicated** | Kyoto GF guide describes a fully GF kitchen using rice noodles. Confirm live hours directly before travel. [Source](https://www.gluten-free-japan.com/guide/kyoto)
| `higashiyama`, `gion`, `demachiyanagi`, `nishiki` | **CHOICE** | **Dedicated** | Same guide describes a fully GF vegetarian/vegan kitchen on Sanjo-dori. Best citywide casual fallback.
| `nijo` | **Menbaka Fire Ramen GF option** | Gluten-free menu / controlled utensils | Official site says rice noodles and dedicated pots/utensils are used to minimize cross-contact, not that the kitchen is dedicated. [Official](https://www.fireramen.com/)
| `nijo`, `nishiki` | **Toshoan** | Dedicated sweets | Guide describes a 100% GF wagashi/tea shop; verify current day/hours.
| `demachiyanagi` | **La Locanda** | Gluten-free menu | Official menu marks GF dishes and asks guests to declare allergies; reserve and discuss cross-contact. [Official menu](https://lalocanda.ritzcarltonkyoto.com/en/our-menus)
| `arashiyama`, `north_kyoto`, `fushimi` | **Nearest dedicated anchor: CHOICE or GF Ramen Kyoto** | Dedicated | No two nearby venues with current official celiac controls were verified. Detour is roughly 25–50 min by transit/taxi depending on stop; carry breakfast/snacks and schedule the dedicated venue later rather than relying on tofu, soba or inari sushi.

## Ranking and implementation rules

1. Show **one primary + two backups** on a card before exposing the rest; 10 choices is useful only in dense Namba/Umeda/Gion/Shinjuku-like areas.
2. Do not duplicate the same venue on adjacent attraction cards. Attach the venue to the scheduled meal card or the final attraction before that meal.
3. Use the JSON `ratingSource` and `updatedAt` at display time. Ratings should never appear without the platform name and date.
4. If `rating` is `null`, show “rating not independently captured” instead of a fabricated or stale number.
5. Gluten safety should render as a separate badge and warning. Only `dedicated` may use a strong safety colour; all other levels require a cross-contact warning.

## Known gaps and recheck list

- Live August holiday hours still need a 48-hour reconfirmation, especially owner-operated restaurants and Miyajima venues.
- Ratings for several low-volume or venue-directory choices are intentionally `null`; no current two-part score/review evidence was captured.
- No officially documented celiac-safe restaurant was verified on Miyajima, at Fushimi Inari, Arashiyama or the Kinkaku/Ryōan route.
- The itinerary does not state whether gluten avoidance is preference, intolerance, wheat allergy or diagnosed celiac disease. The app should ask this once and preserve the answer because the safe recommendation tier changes materially.

## Dense-area second pass

The companion JSON now contains **10 credible, practical choices** for each of the following high-choice districts: `asakusa`, `ueno`, `akihabara`, `shibuya`, `shinjuku`, `ginza`, `marunouchi`, `namba`, `umeda`, and `gion`. Ratings and review totals are included only when a current Tabelog or documented Google snapshot exposed both values; otherwise they remain `null`. Every area with fewer than 10 has an `availabilityNote` explaining that the shorter list is intentional and was not padded with distant, closed, weakly evidenced or schedule-incompatible venues.

### Exact replacements for unavailable or stale recommendations

| Remove / do not use | Verified replacement | Why / evidence |
|---|---|---|
| **Nagata-ya, Aug 14** — closed Aug 12–14 | **Mitchan Sohonten Orizuru Tower** ([official facility listing](https://www.orizurutower.jp/en/shop/), [current Tabelog page](https://tabelog.com/en/hiroshima/A3401/A340116/34031776/)) | Same Hiroshima-okonomiyaki experience, on Orizuru Tower 1F, about four minutes from Peace Memorial Park. |
| **Nagata-ya, Aug 14** | **Caffè Ponte Italiano** ([current listing](https://tabelog.com/en/hiroshima/A3401/A340116/34004795/)) | Closest calm, air-conditioned reserved meal beside the memorial park; 3.47/460 snapshot. |
| **Nagata-ya, Aug 14** | **Musubi Musashi Dobashi** ([Hiroshima city product listing](https://www.city.hiroshima.lg.jp/english/hiroshima-brand-en/1032092/1032094/1014814.html)) | Fast local onigiri/bento alternative when the museum runs long. |
| **Tokyo Shiba Tofuya Ukai** — permanently closed March 2026 | **Terrace Dining TANGO** ([place/current listing](https://tabelog.com/en/tokyo/A1307/A130704/13144857/), [official](https://www.tango-tpt.com/)) | Immediately beside Tokyo Tower and practical after sunset. |
| **Tokyo Shiba Tofuya Ukai** | **WAKANUI Grill Dining Bar Tokyo** ([current listing](https://tabelog.com/en/tokyo/A1307/A130704/13124827/), [official](https://www.wakanui.jp/)) | Five-to-eight-minute walk; bookable steak/lamb dinner for four. |
| **Tokyo Shiba Tofuya Ukai** | **SAVOY Tomato & Cheese** ([current listing](https://tabelog.com/en/tokyo/A1307/A130702/13155593/), [official](https://savoy-pizza.com/tomatotocheese)) | Strong 3.75/700 snapshot and a 10–15-minute walk toward Azabu. |
| **Tsunahachi Sohonten** — closed/on hold after May 31, 2026 | **Tempura Shinjuku Tsunahachi Keio branch** ([current branch page](https://tabelog.com/en/tokyo/A1304/A130401/13017310/)) | Same brand in the Shinjuku station complex; current page states reservations after 15:00. |
| **Omen Kodaiji** — relocated/stale listing | **Gion Karyo** ([official](https://www.gion-karyo.com/), [map](https://www.google.com/maps/search/?api=1&query=Gion+Karyo+Kyoto)) | Current, bookable Kyoto cuisine in the same Gion/Higashiyama evening area. |
| **Omen Kodaiji** | **Gion Soy Milk Ramen UNO** ([Kyoto GF guide](https://www.gluten-free-japan.com/guide/kyoto), [map](https://www.google.com/maps/search/?api=1&query=Gion+Soy+Milk+Ramen+UNO+Kyoto)) | Dedicated-GF casual replacement already aligned with the route. |

### Additional closure correction

**Daikokuya Tempura in Asakusa was removed from the JSON.** The current Tabelog result identifies the branch as closed and recent review text reports a March 2026 closure. Use Yadoroku, MISOJYU, Sometaro, Yoshikami or Asakusa Imahan instead. [Closure evidence](https://tabelog.com/en/tokyo/A1311/A131102/13082458/dtlrvwlst/)
