# Flip-card enrichment: nearby secrets, food and transport

Research date: 27 July 2026. Scope is the live `data/seed.json`. Distances are practical approximations from the named attraction entrance/area, not precise geodesic calculations. Recommendations deliberately favor **0–10 minute additions** and reject famous detours that would damage the itinerary.

## Editorial rules for the app

- Show at most **two** nearby suggestions on a card by default; a third may sit behind “more nearby.”
- `hidden` means a less-obvious detail or micro-stop, not a second headline attraction.
- `food` is included only when the card is near a meal/snack window. “Viral” places carry a queue warning and never replace a reservation-critical attraction.
- Do not repeat a candidate on multiple adjacent cards. The ID mapping below assigns each suggestion to one owner card.
- Hours change by tenant. Display `Check today's hours` for malls/markets and never promise a table.

## Source key

| Key | Primary / high-trust source |
|---|---|
| `TOKYO-ASAKUSA` | [GO TOKYO Asakusa guide](https://www.gotokyo.org/en/destinations/eastern-tokyo/asakusa/index.html) |
| `TOKYO-UENO` | [GO TOKYO Ueno walk](https://www.gotokyo.org/en/story/walks-and-tours/ueno/index.html) |
| `TOKYO-SHOP` | [GO TOKYO shopping guide](https://www.gotokyo.org/en/see-and-do/shopping/index.html) |
| `SOLAMACHI` | [Tokyo Solamachi official site and 2026 hours](https://en.www.tokyo-solamachi.jp/) |
| `SHIBUYA` | [GO TOKYO Shibuya guide](https://www.gotokyo.org/en/destinations/western-tokyo/shibuya/index.html) |
| `HARAJUKU` | [GO TOKYO Harajuku guide](https://www.gotokyo.org/en/destinations/western-tokyo/harajuku/index.html) |
| `ODAIBA` | [GO TOKYO Odaiba guide](https://www.gotokyo.org/en/destinations/southern-tokyo/odaiba/) |
| `TOYOSU` | [GO TOKYO Toyosu guide](https://www.gotokyo.org/en/destinations/eastern-tokyo/toyosu/) |
| `TOWER` | [GO TOKYO Tokyo Tower walk](https://www.gotokyo.org/en/story/walks-and-tours/tokyo-tower/index.html) |
| `SHINJUKU` | [GO TOKYO Shinjuku dining/shopping](https://www.gotokyo.org/en/story/guide/shinjuku-shop/index.html) |
| `IKEBUKURO` | [GO TOKYO Ikebukuro guide](https://www.gotokyo.org/en/destinations/northern-tokyo/ikebukuro/index.html) |
| `IKE-ANIME` | [GO TOKYO official anime/Ikebukuro guide](https://www.gotokyo.org/en/anime-and-manga/entertainment-now-ikebukuro/index.html) |
| `KOENJI` | [Tokyo official Suginami guide; Weather Shrine](https://www.gotokyo.org/book/wp-content/uploads/2026/03/AO_2603_suginamichuo_low_EN.pdf) |
| `TSUKIJI` | [Tsukiji Outer Market official guide](https://www.tsukiji.or.jp/english/how-to-enjoy/) |
| `HAMARIKYU` | [Hamarikyu official viewpoints](https://www.tokyo-park.or.jp/teien/en/hama-rikyu/view.html) |
| `GINZA` | [GO TOKYO Ginza guide](https://www.gotokyo.org/en/destinations/central-tokyo/ginza/) |
| `TOKYO-STN` | [GO TOKYO Tokyo Station guide](https://www.gotokyo.org/en/destinations/central-tokyo/tokyo-station-and-marunouchi/index.html) |
| `HAKONE` | [Hakone Navi Moto-Hakone](https://www.hakonenavi.jp/international/en/destination/motohakone) |
| `HAKONE-OAM` | [Open-Air Museum official facilities](https://www.hakone-oam.or.jp/en/) |
| `HAKONE-SOUNZAN` | [Hakone Navi Sounzan station](https://www.hakonenavi.jp/international/en/station/sounzan) |
| `HAKONE-OWAKUDANI` | [Hakone Navi Owakudani](https://www.hakonenavi.jp/international/en/spot/99) |

## Candidate registry — Tokyo and Hakone

| Key | Type | Recommendation | Approx. distance | Practical note | Source |
|---|---|---|---:|---|---|
| `asakusa-shrine` | hidden | **Asakusa Shrine** behind Senso-ji: a quieter Shinto counterpoint to the Buddhist complex | 150 m / 2 min | Open-air, ideal before Nakamise shops open; 10–15 min | `TOKYO-ASAKUSA` |
| `asakusa-kagetsudo` | food | **Asakusa Kagetsudo jumbo melonpan** | 250 m / 4 min | Opens later than the 06:05 temple visit; use only as the group heads toward Kappabashi after breakfast. Expect a queue. [Venue listing](https://www.asakusaomatsuri.com/kagetsudo) | official venue |
| `sumida-azuma` | hidden | **Azumabashi bridge angle** for Skytree + Asahi flame + river in one frame | 0–200 m | Five-minute photo stop; no detour | `TOKYO-ASAKUSA` |
| `kappa-niimi` | hidden | **Niimi giant chef-head landmark** at Kappabashi's south entrance | on route | Photo marker; do not make a separate stop | `TOKYO-ASAKUSA` |
| `kappa-samples` | experience | Ask a food-sample specialist about **wax tempura/lettuce demonstrations or same-day workshops** | 0–400 m | Availability varies; only join if immediately available and under 30 min | [GO TOKYO Kappabashi](https://www.gotokyo.org/en/spot/59/index.html) |
| `skytree-postal` | hidden | **Postal Museum** inside Skytree Town, a compact rainy/heat backup | 0 m | Use only if schedule gains 30–45 min; paid | `SOLAMACHI` |
| `skytree-uoriki` | food | **Uoriki-zushi, 30F Solamachi**: sushi plus view without buying a tower ticket | 0 m | Opens 11:00; request window, but never wait long enough to delay the museum | [Solamachi restaurant directory](https://en.www.tokyo-solamachi.jp/shop/) |
| `tnm-library` | hidden | **International Library of Children's Literature**: restored imperial-era architecture and free interiors | ~450 m / 6 min | 20–30 min only if museum visit ends early; check Monday/holiday closures | [National Diet Library official site](https://www.kodomo.go.jp/english/) |
| `ueno-toshogu` | hidden | **Ueno Toshogu shrine and lantern approach** | ~500 m / 7 min | Grounds-level look in 15 min; avoid paid inner area if behind | `TOKYO-UENO` |
| `ameyoko-ohyama` | food | **Niku no Ohyama** fried menchi/croquette | ~120 m / 2 min | Quick takeaway; famous but generally faster than a ramen queue. [Official shop](https://www.ohyama.com/ueno) | official venue |
| `akiba-2k540` | hidden | **2k540 Aki-Oka Artisan**, Japanese craft studios under the railway | ~650 m / 8–10 min | Best non-anime counterpoint; place before Ameyoko or skip if heat/fatigue | `TOKYO-SHOP` |
| `akiba-kanda` | hidden | **Kanda Myojin**, shrine associated with electronics and pop culture | ~700 m / 9 min | Better assigned to Hareruya2; 20 min including walk uphill | [Official shrine](https://www.kandamyoujin.or.jp/english/) |
| `akiba-gyukatsu` | food | **Gyukatsu Ichi Ni San** | ~300 m / 4 min | Viral beef cutlet; queues can exceed 45 min. Show as `only if line ≤20 min`, not a planned dinner | [Official group site](https://www.gyukatsu-motomura.com/) |
| `meiji-meoto` | hidden | **Meoto Kusu “married” camphor trees** beside the main sanctuary | 0 m | Easy detail many visitors miss; no extra time | [Meiji Jingu official site](https://www.meijijingu.or.jp/en/) |
| `harajuku-harakado` | hidden | **Harakado rooftop/terrace** over the Omotesando–Meiji crossing | ~250 m / 3 min | Use near 10:00 only if public terrace is open; 10–15 min | `HARAJUKU` |
| `harajuku-sakuratei` | food | **Sakura-tei** cook-your-own okonomiyaki in Design Festa Gallery | ~450 m / 6 min | Opens around lunch; not useful before 10:00. Better fallback than a viral crêpe line. [GO TOKYO listing](https://www.gotokyo.org/en/story/guide/shibuya-shop/index.html) | tourism authority |
| `parco-roof` | hidden | **Shibuya PARCO rooftop park** | 0 m | 10-minute breather after the 6F game/character floor | `SHIBUYA` |
| `parco-chaos` | food | **CHAOS KITCHEN B1** | 0 m | Multiple choices for four people; use after Pokémon at 12:00 to avoid another transfer | [PARCO official restaurants](https://shibuya.parco.jp.e.aiv.hp.transer.com/restaurant/) |
| `pokemon-mewtwo` | hidden | Life-size **Mewtwo incubation display** and customizable Design Lab shirts | inside | Merchandise detail, not a second attraction; check Design Lab cutoff on arrival | [Pokémon Center official store](https://www.pokemon.co.jp/shop/en/pokecen/shibuya/) |
| `shibuya-stream` | hidden | **Shibuya Stream river walk** and elevated old-Toyoko rail trace | ~400 m / 5 min | Good 15-minute low-crowd reset after Shibuya Sky, before Hachiko | `SHIBUYA` |
| `hachiko-moyai` | hidden | **Moyai statue** on the station's west side | ~200 m / 3 min | Quick companion photo; do not cross station twice just for it | `SHIBUYA` |
| `donki-uobei` | food | **Uobei Shibuya Dogenzaka** conveyor-style sushi | ~250 m / 4 min | Viral/teen-friendly; use numbered queue system. Skip if wait >30 min | [Official restaurant](https://www.genkisushi.co.jp/en/search/map.php?id=180) |
| `bon-nonbei` | hidden | **Nonbei Yokocho** lantern alley | ~450 m / 6 min | Walk-through after the festival; tiny bars are generally not suitable for a family dinner | [GO TOKYO yokocho guide](https://www.gotokyo.org/en/story/guide/drink-and-dine-like-a-local-a-guide-to-exploring-yokocho-alleyways/index.html) |
| `odaiba-liberty` | hidden | **Odaiba Statue of Liberty** and Rainbow Bridge framing | ~250 m / 3 min | Put on Marine Park card; 10 min | `ODAIBA` |
| `divercity-gundambase` | experience | **THE GUNDAM BASE TOKYO** inside DiverCity | 0 m | Opens with the mall; check same-day entry/lottery notices before joining a line | [Official Gundam Base](https://www.gundam-base.net/) |
| `divercity-takoyaki` | food | **Takoyaki Museum at DECKS** | ~850 m / 11 min | Too far for the current 10:20–11:45 block; show only as `if Marine Park is skipped`, not a default add-on | `ODAIBA` |
| `toyosu-senkyaku` | food | **Toyosu Senkyaku Banrai food street** | ~550 m / 7 min | Best late-lunch choice after Planets; the wholesale market itself is closed Sunday, but this visitor complex operates separately. Verify tenant hours. | `TOYOSU` |
| `teamlab-garden` | hidden | At Planets, do not rush the separate **Garden Area**; it is part of the timed experience | inside | No extra ticket; allow the full two hours | [teamLab Planets official](https://www.teamlab.art/e/planets/) |
| `tower-shiba` | hidden | **Shiba Park ground-level tower view** | ~250 m / 3 min | Best blue-hour photo after descending; 10 min | `TOWER` |
| `tower-ukai` | food | **Tokyo Shiba Tofuya Ukai** | ~100 m / 2 min | High-end kaiseki/tofu in a garden; reservation essential and expensive. Only offer as a deliberate farewell-style dinner, not a walk-in | [Official venue](https://www.ukai.co.jp/english/shiba/) |
| `roppongi-maman` | hidden | Louise Bourgeois **Maman** spider at Roppongi Hills | 0 m | Free, visible late; ideal justification for the optional stop | [Roppongi Hills official art](https://www.roppongihills.com/en/) |
| `gyoen-greenhouse` | hidden | **Shinjuku Gyoen greenhouse** | inside | Go first after 15:30 because indoor facilities close earlier than the grounds | [Official garden](https://www.env.go.jp/garden/shinjukugyoen/english/) |
| `sanchome-sekaido` | hidden | **Sekaido flagship art-supply store** | ~150 m / 2 min | Excellent Japanese stationery/art stop; air-conditioned | [Official store](https://www.sekaido.co.jp/store/77) |
| `sanchome-takano` | food | **Takano Fruit Parlour** seasonal parfait | ~650 m / 8 min | Good cooling stop; weekend queues possible | `SHINJUKU` |
| `shinjuku-omoide` | hidden | **Omoide Yokocho** alley | ~700 m from Kabukicho / 9 min | Atmospheric walk; tiny counters often cannot seat four together | [GO TOKYO food guide](https://www.gotokyo.org/en/see-and-do/drinking-and-dining/index.html) |
| `shinjuku-godzilla` | hidden | **Godzilla Head** at Hotel Gracery | central Kabukicho | Free street view; terrace access can vary | [Shinjuku tourism guide](https://www.kanko-shinjuku.jp/) |
| `hanazono-golden-am` | hidden | **Golden Gai in quiet morning light** | ~100 m / 2 min | Architecture/photo walk only; bars open late and some lanes restrict photography | [GO TOKYO Golden Gai](https://www.gotokyo.org/en/spot/62/index.html) |
| `ike-anime-station` | hidden | **Anime Tokyo Station** archive/exhibition space | ~350 m / 5 min | Free; opens later than Animate, so place after the store | `IKE-ANIME` |
| `ike-naka-park` | hidden | **Naka-Ikebukuro Park** anime-event gathering spot | ~50 m / 1 min | Five-minute look; event-dependent | `IKE-ANIME` |
| `sunshine-otome` | hidden | **Otome Road** specialty stores | ~150 m / 2 min | Compact continuation; cap at 30 min to protect Nakano | `IKEBUKURO` |
| `sunshine-namja` | food | **NAMJATOWN gyoza/dessert area** | inside Sunshine City | Paid entertainment complex; only if the family wants an indoor food attraction and can give it 60+ min | `IKEBUKURO` |
| `nakano-dailychico` | food | **Daily Chico eight-layer soft serve** in Nakano Broadway basement | 0 m | Viral and shareable; confirm current opening before descending | [Nakano Broadway official site](https://nakano-broadway.com/) |
| `nakano-sidealleys` | hidden | **Sun Mall side alleys** for tiny record shops and old-school eateries | 0–200 m | Wander after Broadway; no extra transit | [GO TOKYO anime guide](https://www.gotokyo.org/en/anime-and-manga/index.html) |
| `koenji-weather` | hidden | **Kisho (Weather) Shrine** at Koenji Hikawa Shrine | ~650 m / 8 min | Unique weather-votive shrine; do before dinner while light remains | `KOENJI` |
| `koenji-tensuke` | food | **Tensuke** egg-tempura bowl | ~350 m / 5 min | Famous tiny counter; family seating and queues are poor. Show as `only if queue short`; otherwise use the covered shopping streets | local specialty; verify same-day |
| `tsukiji-namiyoke` | hidden | **Namiyoke Inari Shrine** and giant lion heads | ~150 m / 2 min | Official market's own short itinerary includes it; 10 min | `TSUKIJI` |
| `tsukiji-kitsuneya` | food | **Kitsuneya horumon-don** | ~100 m / 2 min | Rich miso offal bowl; famous queue. One order each is expected at busy counters. [Venue profile](https://www.tsukihotel.com/en/guide/kitsuneya/) | venue profile |
| `tsukiji-tamago` | food | **Fresh tamagoyaki** from one official-market-listed specialist | 0–150 m | Fast snack; eat at the vendor, not while walking. Pick one line, not several | [Official market store list](https://www.tsukiji.or.jp/english/shoplist/) |
| `hamarikyu-tidepond` | hidden | **Shioiri-no-ike seawater pond + 300-year pine** | inside | These are the garden's distinctive features; prioritize over a full perimeter loop | `HAMARIKYU` |
| `azabudai-market` | food | **Azabudai Hills Market** | 0 m | Best post-Borderless cooling/lunch choice; tenant hours vary | [Azabudai Hills official dining](https://www.azabudai-hills.com/en/shops_restaurants/) |
| `ginza-itoya` | hidden | **Ginza Itoya** stationery/design flagship | ~250 m / 3 min | Air-conditioned and distinctly Japanese; roof/hydroponic floor access varies | `GINZA` |
| `ginza-kimuraya` | food | **Ginza Kimuraya anpan** | ~150 m / 2 min | Historic sweet bun, quick takeaway, typically faster than a café queue | [Official bakery](https://www.kimuraya-sohonten.co.jp/) |
| `imperial-wadakura` | hidden | **Wadakura Fountain Park** | ~550 m / 7 min | Cooling pause on the walk toward Tokyo Station; 10–15 min | [Official Imperial Palace area](https://www.kunaicho.go.jp/e-about/shisetsu/kokyo.html) |
| `station-kitte` | hidden | **KITTE rooftop garden** overlooking Tokyo Station | ~350 m / 5 min | Free exterior view; best before dark or at blue hour | `TOKYO-STN` |
| `station-rokurinsha` | food | **Rokurinsha tsukemen, Tokyo Ramen Street** | 0 m | Very popular; use only if queue fits the dinner window. Numerous alternatives are adjacent | `TOKYO-STN` |
| `station-okashi` | food | **Tokyo Okashi Land fresh snacks** (including Calbee) | 0 m | Easy teen-friendly tasting while shopping; no separate detour | [First Avenue official tourism listing](https://www.gotokyo.org/en/spot/660/index.html) |
| `hakone-bakerytable` | food | **Bakery & Table Hakone** lake-view bakery/footbath | ~650 m / 8 min from shrine approach | Only if shrine/torii finishes early; Pan de Soft is quick, restaurant is not. Morning opening must be checked | [Hakone Navi venue page](https://www.hakonenavi.jp/international/en/spot/599) |
| `hakone-onshi` | hidden | **Onshi-Hakone Park viewpoint** | ~1.4 km / 18 min | Too far for the locked day; display only as `not recommended today` so it does not become scope creep | `HAKONE` |
| `oam-footbath` | hidden | **Forest hot-spring footbath** | inside museum | Distinctive 10-minute recovery; bring/use towel | `HAKONE-OAM` |
| `oam-symphonic` | hidden | **Symphonic Sculpture** stained-glass tower | inside museum | Must-see internal detail; include within existing 105-min visit | `HAKONE-OAM` |
| `oam-cafe` | food | **Open-Air Museum Café / Dining** | inside museum | Café 09:00–17:00; dining from 10:00. Best quick lunch because leaving the site risks the timetable. [Official dining](https://www.hakone-oam.or.jp/en/restaurantsandshops/) | official venue |
| `sounzan-cumo` | hidden | **cu-mo observation terrace and footbath** | inside station | Existing 15-minute block is exactly enough; do not add another stop | `HAKONE-SOUNZAN` |
| `sounzan-cumopan` | food | **Cumopan / cloud-style drink** | inside station | Buy only if no line; the 13:35 ropeway departure is the priority | [Hakone Navi pass itinerary](https://www.hakonenavi.jp/international/en/article/4252) |
| `owakudani-geomuseum` | hidden | **Hakone GeoMuseum** | ~100 m / 2 min | Compact indoor explanation of the volcanic landscape; use if visibility is poor | [Hakone Navi recommendation](https://www.hakonenavi.jp/international/en/article/867) |
| `owakudani-egg` | food | **Kuro-tamago black eggs** | on site | Signature snack; one bag contains several eggs, so the family can share | `HAKONE-OWAKUDANI` |
| `owakudani-curry` | food | **Owakudani Station curry** | inside station | Only weather/visibility fallback; the agenda already has a museum lunch | [Hakone Navi pass itinerary](https://www.hakonenavi.jp/international/en/article/4252) |

## Proposed item-ID mapping — Tokyo and Hakone

This is intentionally compact and parseable YAML. Candidate keys resolve to the registry above.

```yaml
a1: [asakusa-shrine]
a1b: [sumida-azuma]
a1c: [kappa-niimi, kappa-samples, asakusa-kagetsudo]
a1d: [skytree-postal, skytree-uoriki]
a2: [tnm-library]
tok-ueno-park: [ueno-toshogu]
tok-ameyoko: [ameyoko-ohyama]
a55: [akiba-2k540, akiba-gyukatsu]
a61: [akiba-kanda]
a5: [meiji-meoto]
a6: [harajuku-harakado, harajuku-sakuratei]
a7: [parco-roof, parco-chaos]
a60: [pokemon-mewtwo]
a8: [shibuya-stream]
tok-hachiko: [hachiko-moyai]
tok-megadonki: [donki-uobei]
a8b: [bon-nonbei]
a12: [odaiba-liberty]
a10: [divercity-gundambase, divercity-takoyaki]
a9: [teamlab-garden, toyosu-senkyaku]
a09c: [tower-shiba, tower-ukai]
a09d: [roppongi-maman]
a13: [hakone-bakerytable, hakone-onshi]
a16: [oam-footbath, oam-symphonic, oam-cafe]
a14x: [sounzan-cumo, sounzan-cumopan]
a15: [owakudani-geomuseum, owakudani-egg, owakudani-curry]
a51: [gyoen-greenhouse]
a51b: [sanchome-sekaido, sanchome-takano]
a52: [shinjuku-omoide, shinjuku-godzilla]
tok-west-hanazono: [hanazono-golden-am]
tok-west-animate: [ike-anime-station, ike-naka-park]
tok-west-sunshine: [sunshine-otome, sunshine-namja]
tok-west-nakano: [nakano-dailychico, nakano-sidealleys]
tok-west-koenji: [koenji-weather, koenji-tensuke]
a56: [tsukiji-namiyoke, tsukiji-kitsuneya, tsukiji-tamago]
a57: [hamarikyu-tidepond]
a09b: [azabudai-market]
a58: [ginza-itoya, ginza-kimuraya]
tok-imperial: [imperial-wadakura]
a59: [station-kitte, station-rokurinsha, station-okashi]
```

## Candidate registry — Osaka, Nara, Hiroshima, Miyajima and Kyoto

| Key | Type | Recommendation | Approx. distance | Practical note | Source |
|---|---|---|---:|---|---|
| `castle-hokoku` | hidden | **Hokoku Shrine** south of Osaka Castle keep | ~450 m / 5–7 min | Free, 10 min; only if the group reaches the keep early | [Osaka official tourism](https://osaka-info.jp/experience/en/osaka/spot/448) |
| `castle-miraiza` | hidden/heat | **Miraiza Osaka-Jo** in the former military HQ | ~150 m / 2 min | Public areas, café and AC; useful 10–20 min buffer opposite the keep | [Osaka official tourism](https://osaka-info.jp/experience/en/osaka/spot/492) |
| `kuromon-doguyasuji` | hidden | **Sennichimae Doguyasuji** kitchenware arcade | ~600 m / 8 min | Naturally on the Kuromon→Den Den/Namba route; cap at 20 min | [Osaka official tourism](https://osaka-info.jp/en/spot/genre.html?cat=38&genre=246) |
| `shinsekai-janjan` | hidden | **Janjan Yokocho** retro covered arcade | ~300 m / 4 min | 15–20 min, south of Tsutenkaku | [Osaka official area guide](https://osaka-info.jp/en/areas/shinsekai-tennoji-abenno/) |
| `shinsekai-daruma` | food | **Kushikatsu Daruma** | 0–300 m | Signature Osaka snack; Mountain Day queues likely, so use only a short line | [Official locations](https://www.kushikatu-daruma.com/location/) |
| `dotonbori-ukiyoe` | hidden | **Kamigata Ukiyo-e Museum** beside Hozenji | <100 m / 1 min | Current 19:00 slot is after last entry; show only if Dotonbori moves before 17:30 | [Osaka official tourism](https://osaka-info.jp/en/spot/kamigata-ukiyoe-museum/) |
| `dotonbori-daruma` | food | **Daruma Hozenji branch** | ~150 m / 2 min | Accepts reservations for 2+; more dependable for four than chasing a tiny viral counter | [Official locations](https://www.kushikatu-daruma.com/location/) |
| `sumiyoshi-sorihashi` | hidden | **Sorihashi arched bridge** inside Sumiyoshi Taisha | inside | Built-in signature detail; no additional stop | [Official shrine](https://www.sumiyoshitaisha.net/) |
| `housing-edo-street` | hidden | Join the museum's **full-scale Edo Osaka street** sound/light cycle | inside | Core exhibit, not a separate destination; ask staff for next cycle | [Official museum](https://www.osaka-angenet.jp/konjyakukan/guide) |
| `tenjin-osakatemmangu` | hidden | **Osaka Tenmangu** | ~600 m / 8 min | Logical at the south end of Tenjinbashisuji; 15 min if heat permits | [Official shrine](https://osakatemmangu.or.jp/) |
| `umeda-rikuro` | food | **Rikuro Ojisan fresh cheesecake**, Daimaru Umeda B1 | inside station | Takeaway; expect a line but it moves faster than seated dessert | [Official branch](https://www.rikuro.co.jp/shoplist/136.html) |
| `nakanoshima-hall` | hidden/heat | **Osaka Central Public Hall basement exhibition** | immediate | Free, air-conditioned, 15–20 min | [Osaka official tourism](https://osaka-info.jp/en/spot/osaka-central-public-hall/) |
| `nakanoshima-gokan` | food | **Gokan Kitahama** cake/tea in a historic building | ~550 m / 7 min east | 30–45 min only if ahead; not a mandatory dinner | [Osaka hidden-gems guide](https://osaka-info.jp/en/osaka/basic/hidden-osaka/) |
| `nara-ukimido` | hidden | **Ukimido pavilion** on Sagi Pond | ~550 m / 7 min from central park | Quiet early-morning photo, but skip if it delays Todai-ji opening | [Nara official tourism](https://www.visitnara.jp/) |
| `todaiji-yoshikien` | hidden | **Yoshikien Garden** | ~650 m / 7–10 min west | Free to foreign visitors with passport; opens later, so only after Todai-ji if ahead | [Nara garden guide](https://www.visitnara.jp/lists-and-stories/story/great-gardens-of-nara/) |
| `nigatsudo-sangatsudo` | hidden | **Sangatsudo and Tamukeyama Hachiman** beside Nigatsudo | ~150–300 m / 2–4 min | Quiet 10–15 min, almost no routing cost | [Nara official tourism](https://www.visitnara.jp/) |
| `kasuga-lanternhall` | hidden | **Fujinami-no-ya lantern hall** inside Kasuga's paid special-worship area | inside | 15–20 min; delivers Mantoro atmosphere without returning Aug 14/15 | [Nara official venue](https://www.visitnara.jp/venues/A00487/) |
| `kasuga-ninai` | food | **Kasuga Ninai Jaya** | ~150 m / 2 min | 10:00–16:30; Manyo-gayu / kakinoha sushi, useful early lunch; carry cash | [Nara official venue](https://www.visitnara.jp/venues/D01056/) |
| `naramachi-koshi` | hidden | **Naramachi Koshi-no-Ie** traditional machiya | 0–400 m / 0–5 min | Free, 15–20 min, scheduled day open 09:00–17:00 | [Nara official venue](https://visitnara.jp/venues/S01099/) |
| `naramachi-nakanishi` | food | **Nakanishi Yosaburo** wagashi and matcha | ~350 m / 5 min | Cooling 20–30 min; Thursday open | [Nara official venue](https://www.visitnara.jp/venues/S01120/) |
| `nara-nakatanido` | food | **Nakatanido fast-pounded mochi** | ~150 m / 2 min from Sarusawa | Put before the early dinner/19:00 lighting; closes around 19:00, displays are not guaranteed | [Nara official venue](https://www.visitnara.jp/venues/S01048/) |
| `toka-sarusawa` | hidden | **Sarusawa Pond reflection area** | at festival zone | Best compact lantern view before walking to the station; no extra route | [Tōkae official site](https://www.toukae.jp/) |
| `peace-resthouse` | hidden/heat | **Peace Memorial Park Rest House** | ~250 m / 3–5 min | Historic A-bomb survivor building, information and AC; 15–20 min | [Hiroshima official tourism](https://dive-hiroshima.com/en/explore/2994/) |
| `peace-testimony` | hidden | Use the Memorial Hall's **survivor testimony/audio archive** rather than only its architecture | inside | Built into the current stop; 10–15 focused minutes | [Official memorial hall](https://www.hiro-tsuitokinenkan.go.jp/en/) |
| `hondori-andersen` | food/history | **Hiroshima Andersen** | on/near Hondori, 0–4 min | Bakery/café cooling stop in a building with preserved A-bomb history | [Hiroshima tourism](https://dive-hiroshima.com/en/explore/3512/) · [venue history](https://www.andersen.co.jp/hiroshima/english/about/history/) |
| `shukkeien-art` | hidden/heat | **Hiroshima Prefectural Art Museum** | directly adjacent | Severe-heat/rain substitute; collection 30–45 min, high-school age and under free | [Hiroshima official tourism](https://dive-hiroshima.com/en/explore/312/) |
| `miyajima-daiganji` | hidden | **Daiganji Temple** immediately beside Itsukushima | ~100 m / 1–2 min | Quiet 10 min on the route to Daisho-in | [Official Miyajima brochure](https://miyajima.or.jp/english/brochure/pdf/MiyajimaBrochure2023_En.pdf) |
| `miyajima-machiya` | hidden | **Machiya Street**, parallel to Omotesando | ~200 m / 2–5 min | Quieter townhouse street and cooling cafés; use after tide revisit | [Hiroshima official tourism](https://dive-hiroshima.com/en/feature/world_heritage-about_miyajima/) |
| `daishoin-henjokutsu` | hidden | **Henjokutsu cave** and 88-temple icons under Daisho-in | inside | Essential built-in feature; no route penalty | [Daisho-in official site](https://daisho-in.com/en/) |
| `miyajima-fujitaya` | food | **Fujitaya anagomeshi** | ~350 m / 4–6 min | 11:00–17:00, no reservations; cap queue at 20 min or use backup | [Official venue](https://www.fujitayamiyajima.com/) |
| `miyajima-kakiya` | food | **Kakiya oyster specialist** | ~400–600 m / 5–8 min | Practical backup for Fujitaya; check live queue | [Official venue](https://www.kaki-ya.jp/) |
| `miyajima-agemomiji` | food | **Momijido age-momiji** | ~250 m / 3–5 min | Quick viral snack; 09:00/09:30–17:30 | [Official venue](https://momijido.com/agemomi/) |
| `shishiiwa-view` | hidden | **Shishiiwa lookout** at the upper ropeway station | at station | The intended endpoint; do not convert this into a summit hike | [Official ropeway](https://miyajima-ropeway.info/english/?lang=en) |
| `nijo-shinsenen` | hidden | **Shinsen-en** historic pond/shrine | ~450 m / 5–7 min | Free, 10–15 min, only if Nijo/arrival runs early | [Official site](https://shinsenen.org/) |
| `nishiki-tenmangu` | hidden | **Nishiki Tenmangu** at the market's east end | on route | 10 min, zero detour | [Kyoto Nishiki guide](https://kyoto.travel/en/destinations/kyoto-nishiki-food-market/) |
| `nishiki-shopbite` | food | One **dashimaki, soy-doughnut or pickle** tasting from a shop with an eating area | inside market | Market etiquette: eat at the shop, not while walking; do not stack queues | [Kyoto Nishiki guide](https://kyoto.travel/en/destinations/kyoto-nishiki-food-market/) |
| `gozan-noaddon` | editorial | **No extra stop** before Gozan | 0 | The viewing position and crowd exit buffer are more valuable than a viral snack | [Kyoto official Gozan guide](https://kyoto.travel/en/travel-inspiration/gozan-okuribi-bonfire/) |
| `fushimi-omokaru` | hidden | **Omokaru stone** behind the main Fushimi Inari precinct | inside | Quick fortune ritual before climbing; minimal detour | [Fushimi Inari official site](https://inari.jp/en/) |
| `fushimi-no-breakfast` | editorial | **Carry breakfast**; do not promise a specialist café at 08:00 | 0 | Many praised shops open at 09:00–10:00; protect the early-start advantage | [Kyoto official listings](https://kyoto.travel/en/) |
| `kiyomizu-tainai` | hidden | **Zuigudo Tainai-meguri** dark rebirth passage | within Kiyomizu | 10–15 min only if open and queue <10 min | [Kiyomizu official site](https://www.kiyomizudera.or.jp/en/visit/) |
| `ninen-kasagiya` | food | **Kasagiya** traditional tea, ohagi and matcha | on Ninenzaka, 0–2 min | 20–30 min cooling stop; skip if line >15 min | [Kyoto official venue](https://kyoto.travel/en/see-and-do/kasagiya.html) |
| `higashiyama-ishibe` | hidden | **Ishibe-koji** quiet stone lane / Entoku-in route | 0–250 m / 0–3 min | Respectful 10-min walk between Kodai-ji and Yasaka; avoid intrusive photography | [Kyoto crowd-avoidance guide](https://kyoto.travel/en/travel-inspiration/how-to-avoid-the-crowds-while-accessing-kiyomizu-temple-and-higashiyama-areas/) |
| `pontocho-takara` | food | **Pontocho Takara** kaiseki | on Pontocho, 0–2 min | Reserve for four and confirm family seating/menu; open scheduled date | [Kyoto official restaurant listing](https://kyoto.travel/en/restaurants/91.html) |
| `bamboo-nonomiya` | hidden | **Nonomiya Shrine** beside the bamboo route | on route | Five–10 min early, before crowds | [Kyoto Arashiyama guide](https://kyoto.travel/en/destinations/arashiyama/) |
| `togetsu-arabica` | food | **% Arabica Arashiyama** | ~100 m / 1–2 min | Coffee only if line is short; Tenryu-ji opening remains priority | [Official venue](https://arabica.coffee/en/location/arabica-kyoto-arashiyama/) |
| `tenryu-hyakka` | hidden | **Hyakka-en garden** on the north-gate route | inside Tenryu-ji | Built-in detail, no detour | [Tenryu-ji precincts](https://www.tenryuji.com/en/precincts/index.html) |
| `tenryu-shigetsu` | food | **Shigetsu Zen vegetarian lunch** inside Tenryu-ji | inside | 11:00–14:00; reserve now. The 10:50 Monkey Park finish can support ~11:15–11:30 lunch | [Official restaurant](https://www.tenryuji.com/en/shigetsu/) |
| `monkey-view` | hidden | **Kyoto panorama from the feeding building** | inside park | This is the reward; do not add the summit as a separate destination | [Official park](https://www.monkeypark.jp/eng-index.html) |
| `kinkaku-sekkatei` | hidden | **Sekkatei teahouse** within Kinkaku grounds | inside | Five–10 min built-in detail | [Kyoto official listing](https://kyoto.travel/en/shrine_temple/165.html) |
| `ryoanji-pond` | hidden | **Kyoyochi pond and veranda cooling** | inside | Keep this as the final slow stop; no additional attraction | [Kyoto official guide](https://kyoto.travel/en/destinations/ryoanji-temple/) |

## Proposed item-ID mapping — Kansai/Hiroshima/Kyoto

```yaml
a17: [castle-hokoku]
a18: [castle-miraiza]
a18b: [kuromon-doguyasuji]
a19: []
a20: [shinsekai-janjan, shinsekai-daruma]
a21: [dotonbori-ukiyoe, dotonbori-daruma]
a22: [sumiyoshi-sorihashi]
a23: [housing-edo-street]
a24: [tenjin-osakatemmangu]
a25: [umeda-rikuro]
a24b: [nakanoshima-hall, nakanoshima-gokan]
a26: [nara-ukimido]
a27: [todaiji-yoshikien]
a28: [nigatsudo-sangatsudo]
a29: [kasuga-lanternhall, kasuga-ninai]
a30: [naramachi-koshi, naramachi-nakanishi, nara-nakatanido]
a30b: [toka-sarusawa]
hr-hypo: []
a31: [peace-resthouse]
hr-remnants: []
hr-hall: [peace-testimony]
a32: []
hr-hondori: [hondori-andersen]
a33: [shukkeien-art]
a34: [miyajima-daiganji]
a35: [daishoin-henjokutsu]
miy-tide: [miyajima-machiya]
miy-senjokaku: []
a36: [shishiiwa-view]
# Attach food keys to the Miyajima food/meal card if supported; otherwise to miy-tide:
miy-food: [miyajima-fujitaya, miyajima-kakiya, miyajima-agemomiji]
a37: [nijo-shinsenen]
a50: [nishiki-tenmangu, nishiki-shopbite]
a38: [gozan-noaddon]
a39: [fushimi-omokaru, fushimi-no-breakfast]
a40: [kiyomizu-tainai]
a41: [ninen-kasagiya]
a42: [higashiyama-ishibe]
a43: [pontocho-takara]
a44: [bamboo-nonomiya]
a45: [togetsu-arabica]
a46: [tenryu-hyakka, tenryu-shigetsu]
a47: [monkey-view]
a48: [kinkaku-sekkatei]
a49: [ryoanji-pond]
```

## Reserved/intercity transport enrichment

| Item IDs | Booking and family-seating guidance | View / luggage guidance | Backup caveat | Official source |
|---|---|---|---|---|
| `t1`, `t9` N'EX | Ordinary class is sufficient. Cars use 2+2 seating, so reserve one complete row for four. All seats are reserved. | Use the dedicated lockable luggage area; keep valuables at seats. The 14-day round-trip tourist product does not fit this 16-day trip. | Do not precommit the arrival N'EX before clearing customs; do reserve the Aug 22 departure now. | [JR East N'EX](https://www.jreast.co.jp/multi/nex/) · [luggage](https://www.jreast.co.jp/en/multi/luggage-area/index.html) |
| `t2` Tokyo→Odawara, `t3` Odawara→Shin-Osaka | Reserve ordinary class via SmartEX. For four people, two adjacent **D/E pairs in consecutive rows** give two Fuji-side windows without splitting cars; choose one 5-seat row only if sitting face-to-face matters more. | Standard-class **E** is the best Mt Fuji seat; D is the adjacent aisle. Bags 160–250 cm total need an oversized-baggage-area seat; measure before booking. Buy food before boarding because ordinary class has no trolley sales. | Hakone delays: change Hikari 653 in SmartEX before departure; do not board a later train assuming the same reserved seat. | [JR Central seat/view guide](https://global.jr-central.co.jp/en/goldenroute/shinkansen/) · [SmartEX baggage](https://smart-ex.jp/en/entraining/oversized-baggage/) |
| `t5` Shin-Osaka→Hiroshima, `t7` Hiroshima→Shin-Osaka | During the 2026 Obon Nozomi all-reserved period, reserve through the Kansai–Hiroshima Pass now. Ordinary reserved seats are adequate; two D/E pairs in consecutive rows are easiest for a family. | No reliable headline-view side is worth compromising family seating. Oversized-baggage rules still apply on the Sanyo Shinkansen. | Exact train times remain targets until confirmed; seasonal trains/platforms can change. Pass covers the Sanyo Shinkansen only in its area and not a Tokaido Shinkansen hop Shin-Osaka→Kyoto. | [JR West pass](https://www.westjr.co.jp/travel-information/en/tickets-passes/jrwest-rail-pass/kansai_hiroshima/) · [Nozomi peak rules](https://global.jr-central.co.jp/en/nozomi/) · [baggage](https://smart-ex.jp/en/entraining/oversized-baggage/) |
| `t8` Kyoto→Tokyo | Reserve through SmartEX; use two adjacent D/E pairs. | Seat **E** is still the Fuji-side window. Because this is the most likely clear late-morning Fuji encounter, prioritize E seats here if not available on Aug 10. | SmartEX changes are normally possible before train departure if the ticket has not been collected/used; confirm fare conditions. | [JR Central view guide](https://global.jr-central.co.jp/en/goldenroute/shinkansen/) · [SmartEX changes](https://smart-ex.jp/en/reservation/change/) |
| `t4`, `t4b` Kintetsu Nara | The semi-express/rapid services in the agenda are not reserved. Board at Osaka-Namba early and line up together; no upgrade is necessary for the short run. | Day bags only; there is no need to forward or reserve luggage space. | Aug 13 uses holiday/weekend timetable. Keep the 20:49 return backup visible. | [Kintetsu timetable](https://eki.kintetsu.co.jp/english/T7?dw=1&sf=5213&time=0550&tx=1-10009) |
| `t6b`, `t6c` Miyajima | JR ferry requires no seat reservation and is covered by the area pass. Current first sailing is 06:25, then 07:05. | Day bags only; ¥100 visitor tax per person is separate. Upper/outdoor deck is scenic but heat-exposed. | Peak queues can cause one sailing's delay; preserve the return buffer. | [JR West Miyajima Ferry](https://jr-miyajimaferry.co.jp/en/timetable/) |
| `t7b` Shin-Osaka→Kyoto | JR Special Rapid is covered and does not take reservations. Move promptly from the Shinkansen platform; family may not sit together. | Luggage forwarding makes this transfer much safer. | If the 08:40 target is missed, take the next Special Rapid; do not substitute the uncovered Tokaido Shinkansen. | [JR West pass coverage](https://www.westjr.co.jp/travel-information/en/tickets-passes/jrwest-rail-pass/kansai_hiroshima/) |
| `t10b`, `t10c`, `t10d`, `t10e`, `t10f` Hakone | Buy the digital Freepass before arrival. H-Line uses Odawara platform 3; current 07:20 target and 07:45 backup. The museum bus stop is Ninotaira-iriguchi plus a 6-minute walk. | No luggage beyond daypacks. At Sounzan/Owakudani prioritize the first available gondola rather than trying to keep the family in one cabin. | Bus traffic and ropeway weather suspensions are the main threats. Preserve the 17:00 Odawara target and cut the museum extras first. | [Official bus timetable PDF](https://www.hakonenavi.jp/bus_schedule/release/10101_003001.pdf) · [museum bus access](https://www.hakone-oam.or.jp/en/aboutus/access) · [ropeway](https://www.hakonenavi.jp/international/en/transportation/hakone-ropeway) |
| `t07start`, `t08start`, `t10a`, `t17a`, `t18a` early taxis | Prebook a vehicle sized for four plus day bags. Put the exact pickup entrance and Japanese destination address in the reservation. | For Aug 10, large luggage should already be forwarded; a standard taxi can then work. | Keep local-transit fallback text, but do not link taxi cards to unrelated JR timetables. | Operator booking confirmation is the source of truth |

## Known recommendations intentionally rejected

- **Toyosu wholesale market on Aug 9:** closed Sundays/holidays; do not send the family there. `TOYOSU`
- **Onshi-Hakone Park / Hakone Checkpoint:** good sites, but too far for the locked transfer day.
- **Skytree observatory, Sunshine observatory, Roppongi City View:** redundant after Shibuya Sky and Tokyo Tower.
- **Long standalone viral-food queues:** Gyukatsu, Uobei, Kitsuneya and Tensuke remain conditional, not scheduled anchors.
- **Miyajima summit hike:** deliberately excluded from enrichment; the live itinerary correctly limits the ropeway to a conditional Shishiiwa visit after the high-tide window.
