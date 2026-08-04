# Japan emergency resources for a Canadian family

Verified against official sources on **2026-08-04**. This is implementation research for an in-app Emergency page, not a live incident report. Live warnings, office closures, and service availability must be fetched or opened at use time.

## Recommended emergency-page hierarchy

The first screen should work without web data and put these actions above all news links:

1. **Police — 110** (`tel:110`)
2. **Ambulance / fire — 119** (`tel:119`)
3. **Coast Guard / emergency at sea — 118** (`tel:118`)
4. **Japan Visitor Hotline — 050-3816-2787** (`tel:05038162787`)
5. **Canada 24/7 consular emergency — +1-613-996-8885** (`tel:+16139968885`)

Use plain labels as well as icons. Do not require a map, login, geolocation permission, or network fetch before showing the numbers. Never test the three emergency short codes.

## Japan emergency numbers

| Need | Number | Scope and constraints | Language / hours | Official basis |
|---|---:|---|---|---|
| Police: crime, traffic accident, or immediate danger | **110** | Treat as a **Japan-only short code**. Dial directly from a voice-capable phone connected to a Japanese network; there is no published `+81` form. | 24/7 emergency service. Do not promise nationwide English. In Tokyo, the Metropolitan Police explicitly says a police interpreter will join if the caller does not speak Japanese. | [JNTO emergency numbers](https://www.japan.travel/en/plan/hotline/); [Tokyo police interpreter guidance](https://www.keishicho.metro.tokyo.lg.jp/multilingual/english/finding_services/living_guide/living_guide_e_1.html) |
| Ambulance or fire | **119** | Treat as a **Japan-only short code**. Ambulance and fire share the number. | 24/7 emergency service. Fire departments can use a 24/7 three-way telephone interpretation service where adopted, but the Fire and Disaster Management Agency does not report universal adoption; do not promise an English dispatcher everywhere. | [FDMA ambulance guide](https://www.fdma.go.jp/publication/portal/items/portal001_pamphiet_english.pdf); [FDMA interpretation program and adoption status](https://www.fdma.go.jp/mission/enrichment/gaikokujin_syougaisya_torikumi/sanshakan-douji-tsuuyaku.html) |
| Incident or accident at sea | **118** | Treat as a **Japan-only short code** for the Japan Coast Guard, including marine casualty/rescue and observed maritime incidents. | Operated for emergency reporting; no official English-language promise was found, so do not advertise one. | [Japan Coast Guard 118 page](https://www.kaiho.mlit.go.jp/doc/tel118.html); [JCG English annual report](https://www.kaiho.mlit.go.jp/e/pdf/r06_en.pdf) |

The three short codes are local dispatch numbers. The app should explicitly say **“Call while in Japan”** and should not expose fabricated `+81-110`, `+81-119`, or `+81-118` alternatives. A family member in Canada who needs help for a traveller should contact Global Affairs Canada's 24/7 centre, not these short codes.

Emergency calls to 110, 118, and 119 can be made from most Japanese public telephones without coins or a telephone card. On a phone with a red emergency button, lift the receiver, press that button, then dial; without the red button, lift and dial directly. [NTT East confirms the three numbers and public-phone procedure](https://www.ntt-east.co.jp/en/product/emergency_call.html).

**Implementation caution:** do not assume a data-only travel eSIM can place voice calls. At least one family phone should retain a voice-capable roaming or local line, and the offline page should mention the public-phone fallback. A cached `tel:` button works without internet, but placing the call still requires a working voice network.

## Tourist and language help

### Japan Visitor Hotline — best nationwide language fallback

- **Inside Japan:** `050-3816-2787`
- **From outside Japan:** `+81-50-3816-2787`
- **Hours:** 24 hours a day, 365 days a year
- **Languages confirmed on the dedicated English page:** English, Chinese, Korean
- **Purpose:** assistance with accidents, illness, other emergencies, natural disasters, and general tourist information

These facts are from the [Japan National Tourism Organization's current hotline page](https://www.japan.travel/en/plan/hotline/). The number is assistance, not a replacement for 110/119/118 when dispatch is urgently needed.

There is a source inconsistency worth handling conservatively: JNTO's broader safety page says its visitor and tourism call services support Japanese as well, while the dedicated hotline page lists only English, Chinese, and Korean. The app should advertise only the three languages on the dedicated page unless JNTO clarifies this. [JNTO's broader safety page](https://www.japan.travel/en/plan/emergencies/) also recommends the hotline for illness and disasters.

### Tokyo-only police language help

- For an emergency in Tokyo, call **110**; Tokyo police says an interpreter will assist a non-Japanese speaker.
- For a **non-emergency police consultation in Tokyo**, use `#9110` or `03-3501-0110`. The General Advisory Center supports Japanese, English, Chinese, and Korean. JNTO describes the `03-3501-0110` English helpline as 24/7, but the Tokyo police help-line page itself does not publish hours; if included, label it non-emergency and avoid relying on it after hours. [Tokyo police help-line page](https://www.keishicho.metro.tokyo.lg.jp/multilingual/english/finding_services/help_desk/hotline_info.html); [JNTO hours statement](https://www.japan.travel/en/plan/emergencies/).

No equivalent nationwide police-English guarantee was found. Outside Tokyo, the JNTO Visitor Hotline or hotel staff is the safer language-assistance fallback, but neither should delay an urgent 110/119/118 call.

## Canadian consular contacts

### 24/7 Emergency Watch and Response Centre, Ottawa

This should be the primary Canadian emergency contact in the app because the Japan offices are not staffed around the clock.

- **Telephone from outside Canada:** `+1-613-996-8885` — collect calls accepted where available
- **Email:** `SOS@international.gc.ca`
- **SMS:** `+1-613-686-3658` — carrier charges may apply
- **WhatsApp:** `+1-613-909-8881` — carrier/data charges may apply
- **Signal:** `+1-613-909-8087` — carrier/data charges may apply
- **Online:** [emergency contact form](https://travel.gc.ca/assistance/emergency-assistance/emergency-contact-form)
- **Hours:** 24/7; for consular emergencies, not visa or immigration questions

All channels are on the [Government of Canada emergency-assistance page](https://travel.gc.ca/assistance/emergency-assistance). Japan is not in Canada's current list of countries with a dedicated international toll-free number, and Canada warns that toll-free numbers can fail from mobile or public phones; store the direct `+1` number. [Government of Canada toll-free-country list and warning](https://travel.gc.ca/assistance/emergency-assistance/toll-free-numbers).

Global Affairs Canada provides emergency consular help in **English and French**. No official promise of Japanese-language consular service was found. [Canadian consular service standards](https://travel.gc.ca/assistance/consular-services/standards).

### Canadian offices currently listed in Japan

The current [Government of Canada Japan consular directory](https://travel.gc.ca/assistance/embassies-consulates/japan), modified 2026-08-03, lists Tokyo plus honorary consuls in Fukuoka, Hiroshima, and Osaka. During business hours, Canada advises contacting the nearest office; at any time, use the Ottawa centre.

| Office | Contact | Published appointment hours | Limits / app note |
|---|---|---|---|
| **Tokyo — Embassy of Canada** | In Japan: `03-5412-6200`; international: `+81-3-5412-6200`; `tokyo-consul@international.gc.ca`; 3-38 Akasaka 7-chome, Minato-ku, Tokyo 107-8503 | Consular: Mon–Fri 09:30–12:00 and 13:30–16:30, appointment | Full embassy contact for the itinerary's Tokyo portion. Hours/closures can change in a large emergency. [Official Tokyo page](https://www.international.gc.ca/country-pays/japan-japon/tokyo.aspx?lang=eng) |
| **Osaka — Honorary Consul** | In Japan: `06-6949-1605`; international: `+81-6-6949-1605`; `osaka@international.gc.ca`; 4F Osaka Castle Hotel, 1-1 Tenmabashikyomachi, Chuo-ku, Osaka 540-0032 | Tue/Thu 13:30–17:00, appointment | Closest listed office for Osaka/Kyoto, but services are limited and passport/citizenship services are not provided. [Official Osaka page](https://www.international.gc.ca/country-pays/japan-japon/osaka.aspx?lang=eng) |
| **Hiroshima — Honorary Consul** | In Japan: `082-875-7530`; international: `+81-82-875-7530`; `hiroshima-honcon@hue.ac.jp`; c/o Hiroshima University of Economics, 5-37-1 Gion, Asaminami-ku, Hiroshima 731-0192 | Tue/Thu 13:30–17:00, appointment | Limited services. [Official Hiroshima page](https://www.international.gc.ca/country-pays/japan-japon/hiroshima.aspx?lang=eng) |
| **Fukuoka — Honorary Consul** | No telephone is currently published; `info@canadian-consulate-fukuoka.jp`; c/o Kyushu Electric Power Co., Inc., 1-82 Watanabe-dori 2-chome, Chuo-ku, Fukuoka 810-8720 | Tue/Thu 14:00–17:30, appointment | Limited services; passport/citizenship services are not provided. [Official Fukuoka page](https://www.international.gc.ca/country-pays/japan-japon/fukuoka.aspx?lang=eng) |

Canada's Tokyo page says to add a `0` before a Japanese area code for a local call and omit it for an international call. The app may use E.164 `tel:` links, but should display the familiar local form while in Japan. Local office pages saying “emergency assistance available 24/7” refer to Canada's overall after-hours system; they do not mean each local office is continuously staffed.

Before departure, register all family members with the free, voluntary [Registration of Canadians Abroad](https://travel.gc.ca/travelling/registration) service. Canada uses it to send location-specific information for emergencies, natural disasters, or civil unrest, by email and in some circumstances text message.

## Official live disaster, weather, and news sources

### Primary links for the app

| Resource | Best use | Language / limitations | Connectivity |
|---|---|---|---|
| [JMA multilingual disaster portal](https://www.data.jma.go.jp/multi/index.html?lang=en) | Canonical official entry point for weather, warnings, tropical cyclones, earthquakes, tsunamis, and volcanoes | English plus 14 other listed languages. Data is live/dynamic. The [JMA multilingual directory](https://www.jma.go.jp/jma/kokusai/multi.html) confirms the scope. | Internet required for current information |
| [JMA weather warnings](https://www.data.jma.go.jp/multi/warn/index.html?lang=en) | Current warnings/advisories by area | English dynamic page | Internet required |
| [JMA tropical cyclone / typhoon information](https://www.data.jma.go.jp/multi/cyclone/index.html?lang=en) | Current typhoon track and forecast | English dynamic page | Internet required |
| [JMA earthquake information](https://www.data.jma.go.jp/multi/quake/index.html?lang=en) | Recent earthquake location, magnitude, and intensity | English dynamic page | Internet required |
| [JMA tsunami information](https://www.data.jma.go.jp/multi/tsunami/index.html?lang=en) | Current major tsunami warning, warning, or advisory | English dynamic page | Internet required |
| [JMA Real-time Risk Map](https://www.jma.go.jp/bosai/en_risk/m_index.html) | One official English hub covering warnings, rain/flood/landslide risk, tropical cyclones, earthquakes, and tsunamis | Map-heavy; potentially less usable on weak data | Internet required |
| [Japan Safe Travel Information](https://www.japan.travel/en/japan-safe-travel-information/) | JNTO traveller-facing disruptions and emergency notices | English; useful complement, not a replacement for JMA alerts | Internet required |
| [NHK WORLD-JAPAN News](https://www3.nhk.or.jp/nhkworld/en/news/) | Official English news reporting during an event | Current news; do not cache headlines as live | Internet required |
| [NHK WORLD-JAPAN Live TV](https://www3.nhk.or.jp/nhkworld/en/live_tv/) | Official live English television stream | High bandwidth; live schedule may change | Internet required |
| [Ministry of the Environment heat alerts / WBGT](https://www.wbgt.env.go.jp/en/) | Essential for August: current Heat Stroke Alerts and heat-stress index | English; Japan's heat-risk information. Canada's Japan advice says severe heat waves periodically affect Japan July–September. | Internet required |
| [Government of Canada Japan advice](https://travel.gc.ca/destinations/japan) | Canadian advisory, natural-disaster guidance, and consular directory | English/French. Current content notes typhoon season June–October and severe heat risk July–September. | Internet required for current status |

The official [Safety Tips app page](https://www.jnto.go.jp/safety-tips/eng/app.html) says the app pushes earthquake early warnings, tsunami warnings, and other weather warnings in 15 languages, and includes an evacuation flowchart, helpful phrases, and disaster links. Recommend installation before travel, but do not treat push notifications as an offline channel: alert delivery needs device power and data connectivity. The official [NHK WORLD-JAPAN app](https://www3.nhk.or.jp/nhkworld/en/app/) provides earthquake, tsunami, and weather emergency-warning notifications in 11 languages, alongside news and streaming.

For a coastal earthquake/tsunami cue that survives loss of data, cache this short instruction: **If a strong earthquake occurs near the coast, move to higher ground; if JMA issues a tsunami warning or advisory, evacuate coastal and riverside areas immediately and remain away until it is lifted.** This is consistent with [JNTO's earthquake guidance](https://www.japan.travel/en/plan/emergencies/) and [JMA's official tsunami action guidance](https://www.data.jma.go.jp/multi/tsunami/tsunami_advisory.html?lang=en).

## Offline versus connectivity contract

### Must remain available offline

- The 110 / 119 / 118 labels, scope, “inside Japan” note, and `tel:` actions.
- Japan Visitor Hotline number, overseas form, languages, hours, and its role as assistance rather than dispatch.
- Ottawa 24/7 phone, email, SMS, WhatsApp, and Signal addresses, with channel/cost notes.
- Tokyo and Osaka office phone/email/address/hours because they match the likely route; retaining the other currently listed offices costs little.
- The public-phone fallback and a warning that cached call buttons still require voice service.
- The short coastal-earthquake/tsunami evacuation cue, plus “follow hotel staff and local-authority evacuation instructions.”
- Traveller-specific data supplied elsewhere in the app: each lodging's name/address/phone, travel-insurance emergency line and policy number, allergies/medications, and an out-of-country family contact. These details must not depend on a web fetch.
- A visible **“verified 2026-08-04”** stamp for static official contacts.

### Requires some connectivity

- **Voice network:** all telephone calls, including emergency short codes and public-phone calls; these do not require internet but do require a functioning telephone network.
- **SMS/mobile network:** SMS to Canada; carrier charges may apply.
- **Internet/data:** JMA status maps, heat alerts, JNTO notices, Canada advice, NHK news/live TV, Safety Tips/NHK push delivery, email, web forms, WhatsApp, Signal, and online maps.
- The UI must never present cached warnings, heat values, typhoon tracks, or headlines as current. Show the last successful refresh time and a clear “Reconnect for live information” state.

## Facts to recheck or phrase conservatively

- **Nagoya discrepancy:** an older Canada-and-Japan office index and search cache still showed a Nagoya consulate, but the current Travel.gc.ca Japan directory modified 2026-08-03 omits it and its individual official URL returned HTTP 404 on 2026-08-04. Do **not** put Nagoya in the app unless Global Affairs restores it.
- **119 interpretation is not universal:** FDMA's latest adoption figure on the cited page is 673 of 720 fire departments as of 2025-01-01. Say interpretation “may be available,” not guaranteed.
- **110 English outside Tokyo:** Tokyo publishes an interpreter promise; no equally clear current nationwide promise was found.
- **118 English:** no official language-service statement was found.
- **JNTO hotline Japanese support:** the dedicated English page lists English/Chinese/Korean, while another JNTO page also mentions Japanese. Advertise the narrower confirmed list.
- **Office hours and closures:** honorary-consul hours are narrow, appointment-only, and can change during emergencies. The 24/7 Ottawa contact is the reliable after-hours path.
- **Connectivity:** official sources identify numbers and services but cannot guarantee a traveller's carrier, eSIM, roaming, battery, or VoIP behavior. Validate at least one voice-capable phone before departure without placing a test call to an emergency number.
