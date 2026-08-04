# Live context and ratings: implementation recommendation

_Researched 2026-08-04. Primary/official sources only._

## Recommendation in one page

Build this as a small **context layer**, not an automatic itinerary editor:

1. Add a compact, timestamped safety strip sourced from JMA public XML: active weather warnings, recent felt earthquakes, and tsunami warning/advisory state for the itinerary cities. Treat it as informational and always link to JMA.
2. Add Ministry of the Environment WBGT/heat-alert data. Use WBGT—not the app's current “feels like” heuristic—for the prominent heat risk state.
3. Keep the existing forecast panel for ordinary planning. Add official JMA radar/UV links; do not build on JMA's undocumented web-map tile endpoints. Sunrise/sunset can remain local/deterministic.
4. Add transit disruption badges only where a licensed feed exists. Tokyo Metro's ODPT feed is the clearest production candidate. For JR East/Central/West and Osaka Metro, use official status links unless a durable operator agreement/API is obtained; do not scrape or republish operator pages.
5. If fresh stars and hours are worth the billing/terms burden, use Google Places **Place Details (New)** only for saved places and visible restaurant cards. Store Place IDs, not cached Google content. Fetch hours/status/rating/count on demand and show Google attribution.
6. Do not promise popular-times or live-crowd data. Google displays it in Maps/Search but does not expose it in the documented Places API schema.
7. Make “Use my location” an explicit tap. Select the nearest known itinerary city in the browser, discard the coordinates, and send neither raw coordinates nor a movement history to the server.

## What the app already has

- `/app/api/weather/route.ts` already fetches current and daily Open-Meteo data for five fixed locations (Tokyo, Hakone, Osaka, Hiroshima, Kyoto), falls back to MET Norway, caches successful responses in D1 for 30 minutes, and includes temperature, apparent temperature, humidity, rain, wind, UV maximum, sunrise, and sunset. The UI labels long-range data as guidance.
- The heat card is currently derived from apparent-temperature thresholds (`>=33°C` / `>=38°C`), not official WBGT or heat alerts.
- The emergency page already links to JMA's official English weather/earthquake/tsunami map, JNTO Safe Travel, and NHK. It does not ingest active alerts.
- Restaurant cards already display static, dated rating/review snapshots from mixed sources (mainly Tabelog, some Google) and correctly leave many ratings null rather than inventing them. They are not live Places data.
- The app already stores itinerary coordinates and can measure distance between saved points, but it does not call the browser Geolocation API and has no Google Place IDs, live opening-hours fields, disruption feed, or crowd signal.

## Source-by-source implementation table

| Signal | Official source | What is actually available | Recommended use | Important caveat |
|---|---|---|---|---|
| Weather warnings and forecasts | [JMA public XML PULL service](https://xml.kishou.go.jp/xmlpull.html) and [published message list](https://xml.kishou.go.jp/xmllist.pdf) | No-registration Atom feeds, updated every minute: [scheduled weather](https://www.data.jma.go.jp/developer/xml/feed/regular.xml), [warnings/advisories](https://www.data.jma.go.jp/developer/xml/feed/extra.xml), and [earthquake/volcano/tsunami](https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml). JMA also publishes [area-code GIS files](https://www.data.jma.go.jp/developer/gis.html). | Server poll once per minute, deduplicate by message ID, parse correction/cancellation messages, map JMA areas to the five trip cities, and retain last-good data with its source timestamp. Monitor [JMA XML revisions](https://xml.kishou.go.jp/revise.html) instead of hard-coding legacy product names. | JMA explicitly says the public feed can stop or be delayed and points users needing rapid, certain delivery to JMBSC/licensed providers. Never present it as the sole alert channel or an SLA-backed push service. Public URLs may block an IP exceeding 10 GB/day. |
| Radar / rain nowcast | [JMA high-resolution precipitation nowcast guide](https://www.data.jma.go.jp/developer/weatherdataguide/appendix/2-1-b.html) and [official radar map](https://www.jma.go.jp/bosai/nowc/) | 250 m predictions to 30 minutes and 1 km predictions to 60 minutes, updated every five minutes. Website imagery is public; bulk binary GRIB2 distribution is through JMBSC. | Add “Open JMA radar” beside today's rain. The official map is the safest lightweight integration. | No supported, lightweight public REST API is documented. Do not couple the app to reverse-engineered JMA tiles/JSON. Raw GRIB2 integration is too heavy for this private PWA unless obtained through the supported distribution channel. |
| Heat and WBGT | [Ministry of the Environment WBGT site](https://www.wbgt.env.go.jp/en/), [current/forecast WBGT](https://www.wbgt.env.go.jp/en/wbgt_data.php), and [2026 CSV format manual](https://www.wbgt.env.go.jp/man15NH/R08_wbgt_data_service_manual.pdf) | Observed and forecast WBGT plus Heat Stroke Alert/Special Alert. The manual documents dated CSV URLs and issuance timing/thresholds. JMA's XML message list also includes Heat Stroke Alerts. | Ingest the official alert CSV/JMA alert and nearest published WBGT station. Show value, risk category, observed/forecast label, station, and update time. Drive the high-visibility heat card from this signal; keep apparent temperature as secondary context. | WBGT varies with the immediate environment. A station value is not the exact shaded/sun-exposed value where the family is standing. Never imply medical certainty. |
| UV | [JMA UV explanation](https://www.jma.go.jp/jma/kishou/know/env/uvhp/3-55uvindex_info.html) and [official English UV map](https://www.data.jma.go.jp/env/uvindex/en/) | Weather-adjusted UV forecasts for today/tomorrow, clear-sky forecasts, and analyzed estimates on roughly 20 km grids. Forecasts update around 06:00 and 18:00 JST. | Keep the existing model UV number, label it by provider, and offer an “Official JMA UV” link. If later ingesting JMA UV, use a supported product/distributor rather than web-map internals. | The web product is not documented as a small public JSON API. Clouds, elevation, and reflective surfaces can make personal exposure differ from a grid value. |
| Sunrise/sunset | [National Astronomical Observatory of Japan local calendar](https://eco.mtk.nao.ac.jp/koyomi/dni/index.html.en) | Authoritative sunrise/sunset tables for major Japanese cities; its Koyomi tools cover other coordinates/dates. | Keep calculating or precomputing on-device from date/coordinates and validate fixtures against NAOJ. No live call is needed. | Sunrise is deterministic context, not weather or visibility. The app already receives equivalent values from Open-Meteo, so this is low priority. |
| Earthquake and tsunami | [JMA XML PULL service](https://xml.kishou.go.jp/xmlpull.html), [public message list](https://xml.kishou.go.jp/xmllist.pdf), [earthquake issuance timing](https://www.data.jma.go.jp/eqev/data/en/guide/earthinfo.html), and [tsunami warnings](https://www.data.jma.go.jp/eqev/data/en/guide/tsunamiinfo.html) | Public XML includes seismic-intensity bulletins, hypocenter/intensity information, tsunami warnings/advisories/forecasts, tsunami information, and Nankai Trough information. JMA says regional intensity information is generally issued in about two minutes and earthquake location/magnitude in about three. | Show the most recent locally relevant event, maximum observed intensity, tsunami state, issuance/update time, and an official JMA link. Make any tsunami warning dominate the UI and instruct the user to follow local evacuation orders immediately. | The public list explicitly says some telegrams, including Earthquake Early Warning, are not published. Public XML may be delayed. This must not replace Japan's native emergency alerts, sirens, broadcasters, or evacuation instructions. |
| Tokyo Metro disruption | [ODPT overview](https://www.odpt.org/en/overview/), [Tokyo Metro data catalog](https://ckan.odpt.org/organization/tokyometro?license_id=odpt-ptodbl&res_format=JSON), and [ODPT developer rules](https://developer.odpt.org/terms) | Licensed JSON REST data includes Tokyo Metro train-status information. Registration and an API key are required; approval may take two business days. | Best first transit integration. Proxy through the server, keep the key secret, honor `dc:date`, `odpt:frequency`, and `dct:valid`, and display the required source/no-warranty/contact notice from the [developer guideline](https://developer.odpt.org/terms/data_basic_use_guideline.html). | ODPT may set access-frequency limits, change specifications, suspend service, and applies dataset-specific licenses. It is not an emergency SLA. |
| JR East disruption | [JR East official status](https://traininfo.jreast.co.jp/train_info/e/) and [JR East ODPT catalog](https://ckan.odpt.org/organization/jreast?organization=jreast) | Official web status; current ODPT JR East real-time/location/status data found in the catalog is marked **Challenge 2026 only** under a limited licence. JR East's public web status generally reports expected/actual delays over 30 minutes. | Link to the official status page/app. Treat Challenge data as a prototype opportunity only, not a durable production dependency. | Coverage/thresholds omit small delays. The challenge licence is time/scope limited and includes JR East-specific competitive-use/IP conditions. |
| JR Central disruption | [Official Tokaido Shinkansen status](https://traininfo.jr-central.co.jp/shinkansen/pc/en/index.html), [conventional-line status](https://traininfo.jr-central.co.jp/zairaisen/index.html?lang=en), and [SmartEX delay guidance](https://smart-ex.jp/en/faq/category/detail/?id=491) | Official live pages; SmartEX says it announces when Tokaido Shinkansen delay is expected to exceed 10 minutes. No durable general public production API was identified in JR Central's official documentation. | Deep-link based on the relevant booked train/line; keep the existing instruction to check live boards. | Do not reverse-engineer page network calls. A link can be stale or unavailable and should not silently rewrite bookings. |
| JR West disruption | [JR West status and service outline](https://global.trafficinfo.westjr.co.jp/en/readme.html) | Official page covers the network; typical publication threshold is 15 minutes, with 10-minute thresholds for Kyoto–Osaka–Kobe rush hour and Shinkansen. | Link to the correct area/line from each itinerary leg. | JR West states that actual operations can differ and explicitly prohibits unauthorized duplication/copying/distribution on electronic media. Do not scrape/rehost it. |
| Tokyo Metro official web | [Tokyo Metro service information](https://www.tokyometro.jp/lang_en/unkou/history/ginza.html) | Official web status for expected/actual delays of five minutes or more. | Use ODPT for in-app data and link to this page for confirmation. | Tokyo Metro's page prohibits reproduction/modification without permission. |
| Osaka Metro disruption | [Osaka Metro service information](https://subway.osakametro.co.jp/en/guide/subway_information.php) | Official page posts delays/temporary suspensions of ten minutes or more. No licensed public production API was identified. | Link out from Osaka legs; do not ingest. | Osaka Metro explicitly prohibits secondary use including reproduction, copying, editing, and public transmission without permission. |

## Google Places: stars, hours, status, cost, and policy

The current [Places API Place resource](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places) supports:

- `businessStatus`: operational, temporarily closed, permanently closed, or future opening. `OPERATIONAL` does **not** mean open now.
- `currentOpeningHours.openNow`, `nextOpenTime`, `nextCloseTime`, and seven days of current/special hours.
- `rating` (1–5) and `userRatingCount`.
- `googleMapsUri`, website, time zone, and up to five review objects if requested.

Implementation implications:

- Store a Google Place ID alongside the app's saved venue. Google explicitly allows Place IDs to be stored indefinitely and recommends refreshing IDs older than 12 months; see [Place ID guidance](https://developers.google.com/maps/documentation/places/web-service/place-id).
- On opening a day or restaurant section, call Place Details (New) server-side with the narrow field mask: `id,businessStatus,currentOpeningHours,rating,userRatingCount,googleMapsUri`. Keep the API key server-only and restricted by API/project.
- Do not overwrite the curated ranking with a raw Google star sort. Continue weighting rating **and count**, proximity, meal-window fit, dietary confidence, and reservation needs. Label the source and “checked” time. A 4.8 from 18 ratings is not stronger evidence than a 4.4 from thousands.
- Treat missing hours/ratings as unknown, not closed or unrated. Show “Hours may differ—confirm” and the direct Maps/official-site link, especially around Japanese holidays and temporary closures.
- Do not request review text in v1. It raises the request to Enterprise + Atmosphere and adds author/link/ordering/translation policy obligations.

Cost is material even for simple stars. Google's [Place Details field/SKU documentation](https://developers.google.com/maps/documentation/places/web-service/place-details) classifies `businessStatus` as Pro, while current/regular hours, rating, and rating count trigger **Place Details Enterprise**. The [current global price list](https://developers.google.com/maps/billing-and-pricing/pricing) gives that SKU 1,000 free monthly events, then USD $20 per 1,000 through the first paid volume tier. Reviews trigger Enterprise + Atmosphere: 1,000 free, then USD $25 per 1,000. Search/Autocomplete can create separate billable events. For this private app, on-demand saved-place details should likely remain within the free cap; background-refreshing every restaurant will not.

Google's [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) also matter:

- Places content generally may not be prefetched, cached, or stored beyond stated exceptions; Place IDs are the notable exception.
- Display Google attribution/logo when Places data appears without a Google map, and pass through third-party attributions.
- Reviews require author/source links and an explanation of ordering/filtering; rating/review data is user-generated and not verified by Google, though fake content may be removed.
- A public Terms of Use and Privacy Policy incorporating Google's terms/policy are required even if the trip app itself is access-controlled.

### Popular times / live crowds

Google officially explains that [popular times and live visit data](https://support.google.com/business/answer/6263531?hl=en) are aggregated from users who opted into location history and only appear when enough visit data exists. However, those fields do not exist in the documented Places API Place schema. Therefore:

- There is no supported official Places API integration for popular-times, live busyness, wait time, or visit duration.
- Do not scrape Google Maps/Search or buy a product whose main claim is scraped Google busyness.
- An “Open in Google Maps to check live busyness” link is acceptable. Phrase it as “may be available in Maps,” never as an in-app live crowd signal.
- Tokyo Metro's ODPT passenger survey is aggregate/static ridership, not current crowding; do not relabel it as live congestion.

## Location and privacy design

The [W3C Geolocation specification](https://www.w3.org/TR/geolocation/) requires express permission and recommends requesting location only when necessary, using it only for the stated task, disposing of it afterwards, not retransmitting without express permission, and clearly disclosing collection/retention/sharing. Geolocation is available only in a secure context and user permission can be session-based, time-based, persistent, or denied; [MDN's implementation summary](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) documents the same browser behavior.

For this family PWA:

1. Default to the itinerary's known city for the selected day; most context does not need device location at all.
2. Offer a clearly labelled **Use my location once** button. Do not prompt on page load.
3. Call `getCurrentPosition`, not `watchPosition`; use `enableHighAccuracy: false`, a short timeout, and a reasonable `maximumAge` unless the user explicitly needs finer precision.
4. In the browser, map the coordinate to the nearest fixed trip city/JMA area, then immediately discard latitude/longitude. Send only a coarse city/area code if the server needs to fetch data.
5. Do not write coordinates to D1, logs, analytics, URLs, service-worker caches, or the itinerary history. Persist at most the user's manually chosen city preference.
6. Provide a manual city selector and useful behavior after denial/time-out. Show when location is active and how to revoke it.
7. Set `Permissions-Policy: geolocation=(self)` and do not grant geolocation to third-party frames.

“On-device” here means **this app** performs nearest-city selection and does not transmit raw coordinates to its own server. The browser/OS may still use its platform location provider; the app should not claim that GPS/network resolution itself is entirely offline.

## Suggested delivery order

1. **High value, low cost:** JMA warnings/earthquake/tsunami summary, official source links, freshness/stale UI, and Ministry WBGT/alerts.
2. **Low risk:** one-shot nearest-city selection with no raw-coordinate retention; JMA radar/UV deep links.
3. **Medium effort:** Tokyo Metro ODPT status after registration/licence review; operator deep links for all other rail legs.
4. **Optional paid dependency:** Google Place IDs plus on-demand hours/status/rating/count for saved venues, guarded by a monthly quota/budget alert.
5. **Do not build:** scraped rail pages, reverse-engineered JMA map APIs, public-XML-based Earthquake Early Warning, or scraped popular-times/live-crowd data.
