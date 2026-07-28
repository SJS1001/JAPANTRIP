import fs from "node:fs";

const file = new URL("../data/restaurant-guides.json", import.meta.url);
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const gm = (name) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name).replace(/%20/g, "+")}`;
const normalizeReservation = (value) => {
  const text = value.toLowerCase();
  if (text.includes("required")) return "required";
  if (text.includes("recommended") || text.includes("reservation") || text.includes("booking")) return "recommended";
  if (text.includes("walk-in") || text.includes("queue") || text.includes("ticket")) return "walk-in";
  return "unknown";
};
const r = (rank, name, cuisine, rating, reviews, walk, reservation, reserveUrl, why) => ({
  rank, name, cuisine, rating, reviews, walk, reservation: normalizeReservation(reservation),
  placeUrl: gm(name), reserveUrl, why,
});

const sets = {
  namba: [
    r(1,"Ajinoya Honten","Okonomiyaki",3.60,1729,"6-9 min","recommended / queue", "https://tabelog.com/en/osaka/A2701/A270202/27001439/","Volume-tested Osaka classic near the hotel."),
    r(2,"Gluten-Free and Vegan Okonomiyaki Vim","Dedicated gluten-free okonomiyaki",4.6,135,"5-8 min","recommended", "https://www.godotonbori.com/shop/gluten-freevegan-okonomiyaki-vim/","Safest way to experience Osaka's signature dish; Google rating snapshot."),
    r(3,"Fukutaro Honten","Okonomiyaki / negiyaki",3.74,2664,"7-10 min","walk-in queue", "https://tabelog.com/en/osaka/A2701/A270202/27002665/","Strongest Tabelog rating-volume signal among central casual classics."),
    r(4,"Menya Joroku Namba","Ramen",3.73,2669,"8-12 min","walk-in queue", "https://tabelog.com/en/osaka/A2701/A270202/rank/","High-volume local ramen benchmark."),
    r(5,"Chitose Honten","Udon",3.73,2224,"10-15 min","walk-in queue", "https://tabelog.com/en/osaka/A2701/A270202/rank/","Classic Osaka udon with a very strong rating signal."),
    r(6,"Creperie Alcyon","Crepes / galettes",3.72,2244,"6-10 min","walk-in / limited booking", "https://tabelog.com/en/osaka/A2701/A270202/rank/","Excellent air-conditioned dessert or light-meal break."),
    r(7,"Naniwa Menjiro","Ramen",3.71,2098,"inside Osaka-Namba Station","walk-in queue", "https://tabelog.com/en/osaka/A2701/A270202/rank/","Most efficient high-rated bowl near the hotel and station."),
    r(8,"Alcyon Houzenji Honten","Cake / tea",3.70,1176,"5-8 min","online reservation available", "https://tabelog.com/en/osaka/A2701/A270202/rank/","Bookable cooling stop beside Hozenji and Dotonbori."),
    r(9,"Rikuro Ojisan Namba","Cheesecake",null,null,"5-8 min","walk-in queue", "https://www.rikuro.co.jp/shoplist/","Iconic Osaka takeaway cheesecake."),
    r(10,"Marufuku Coffee Sennichimae","Kissaten cafe",3.42,840,"6-10 min","walk-in", "https://tabelog.com/en/osaka/A2701/A270202/27001450/","Reliable historic coffee and pancake break."),
  ],
  asakusa: [
    r(1,"Onigiri Asakusa Yadoroku","Onigiri",3.49,652,"8-10 min from Senso-ji","walk-in", "http://onigiriyadoroku.com/","Historic, efficient lunch with a strong current rating signal."),
    r(2,"MISOJYU Asakusa","Miso soup and rice",3.48,742,"5-8 min","walk-in", "https://tabelog.com/en/tokyo/A1311/A131102/13223128/","Family-friendly Japanese set meal close to the temple."),
    r(3,"Sometaro","Okonomiyaki / monjayaki",null,283,"10-15 min","walk-in only July-September", "https://tabelog.com/en/tokyo/A1311/A131102/13003710/","Atmospheric local meal; August reservations are not accepted."),
    r(4,"Kameju","Dorayaki / wagashi",3.79,4350,"2-4 min","walk-in queue", "https://tabelog.com/en/tokyo/A1311/A131102/rank/","Very high-volume signature Asakusa sweet."),
    r(5,"Yoshikami Asakusa","Yoshoku",3.73,3374,"5-8 min","walk-in queue", "https://tabelog.com/en/tokyo/A1311/A131102/rank/","Long-running western-Japanese comfort-food institution."),
    r(6,"Fruit Parlor Goto Asakusa","Fruit parfait / cafe",3.77,1653,"7-10 min","walk-in", "https://tabelog.com/en/tokyo/A1311/A131102/rank/","Excellent cold dessert break in August heat."),
    r(7,"Asakusa Naniwaya","Taiyaki / kakigori",3.76,1648,"6-10 min","walk-in", "https://tabelog.com/en/tokyo/A1311/A131102/rank/","Highly rated traditional sweet and shaved-ice stop."),
    r(8,"Asakusa Imahan Kokusai-dori Honten","Sukiyaki / shabu-shabu",null,null,"10-12 min","recommended", "https://www.asakusaimahan.co.jp/english/","Reliable reserved family meal when a queue is undesirable."),
    r(9,"Kura Asakusa","Japanese cuisine",3.57,139,"5-10 min","recommended", "https://tabelog.com/en/japanese/tokyo/A1311/A131102/rank/","Higher-end Japanese choice with online availability."),
    r(10,"Asakusa Kagetsudo","Melonpan / snack",null,null,"3-6 min","walk-in", "https://asakusa-kagetudo.com/","Fast viral snack after the early temple visit."),
  ],
  ueno: [
    r(1,"Ramen Kamo to Negi Ueno Okachimachi","Duck ramen",3.73,4635,"1 min Okachimachi / 6-7 min Ueno","walk-in queue", "https://tabelog.com/en/tokyo/A1311/A131101/13210392/","Outstanding rating-volume signal and efficient market location."),
    r(2,"Inshotei Ueno","Japanese kaiseki",3.65,1610,"inside Ueno Park","recommended", "https://tabelog.com/en/japanese/tokyo/A1311/rank/","Most atmospheric seated meal inside the park."),
    r(3,"Niku no Oyama Ueno","Croquettes / meat",3.49,2378,"2-4 min from Ameyoko","walk-in", "https://tabelog.com/en/tokyo/A1311/A131101/13016728/","Fast, popular market snack with huge review volume."),
    r(4,"Izuei Honten","Unagi",3.48,984,"8-12 min","recommended", "http://www.izuei.co.jp/","Long-established Ueno specialty with family seating."),
    r(5,"DELHI Ueno","Indian curry",3.79,3615,"8-12 min","walk-in queue", "https://tabelog.com/en/tokyo/A1311/A131101/rank/","Very strong rating-volume signal and quick service."),
    r(6,"Usagiya Ueno","Dorayaki / wagashi",3.84,3894,"8-10 min","walk-in", "https://tabelog.com/en/tokyo/A1311/rank/","One of the district's highest-volume classic sweets."),
    r(7,"Kuriya Kurogi","Japanese sweets / kakigori",3.80,1602,"8-12 min","walk-in queue", "https://tabelog.com/en/tokyo/A1311/A131101/rank/","Premium cold-dessert break near the park."),
    r(8,"Ponta Honke","Yoshoku / pork cutlet",3.78,2016,"10-15 min","recommended", "https://tabelog.com/en/tokyo/A1311/A131101/rank/","Historic yoshoku destination with a strong rating signal."),
    r(9,"Ueno Sakae","Sushi",3.54,599,"5-10 min","recommended", "https://tabelog.com/en/tokyo/A1311/","Bookable, non-smoking higher-end sushi for a planned meal."),
    r(10,"Hard Rock Cafe Uyeno-Eki","American / burgers",null,null,"inside Ueno Station","recommended", "https://cafe.hardrock.com/tokyo-uyeno-eki/","Easy family fallback with a published gluten-free menu."),
  ],
  akihabara: [
    r(1,"Tonkatsu Marugo","Tonkatsu",3.75,3340,"4-6 min","walk-in; closed Mon/Tue", "https://tabelog.com/en/tokyo/A1310/A131001/13000379/","District benchmark, but only if the queue and weekday work."),
    r(2,"Umakara Curry Hakuyotei Akihabara","Japanese curry",3.57,470,"2-4 min","walk-in", "https://tabelog.com/en/tokyo/A1310/A131001/?genre_name=tonkatsu","High-rated practical curry close to the station."),
    r(3,"Roast Beef Ohno Akihabara","Roast-beef rice bowl",3.48,869,"4-6 min","walk-in", "https://tabelog.com/en/tokyo/A1310/A131001/13187964/","Fast, teen-friendly meal."),
    r(4,"Gyukatsu Ichi Ni San","Beef cutlet",null,null,"4-6 min","walk-in queue", "https://www.google.com/maps/search/?api=1&query=Gyukatsu+Ichi+Ni+San+Akihabara","Popular interactive beef-cutlet option."),
    r(5,"Kyushu Jangara Akihabara","Ramen",null,null,"2-4 min","walk-in", "https://kyushujangara.co.jp/","Long-running, efficient ramen stop."),
    r(6,"Kanda Matsuya","Soba",null,null,"8-12 min","walk-in queue", "https://www.kanda-matsuya.jp/","Historic soba house within a reasonable walk."),
    r(7,"Kanda Yabu Soba","Soba",null,null,"10-12 min","walk-in queue", "https://www.yabusoba.net/","Classic Kanda meal with atmospheric surroundings."),
    r(8,"Jiromaru Akihabara","Standing yakiniku",null,null,"3-5 min","walk-in", "https://www.google.com/maps/search/?api=1&query=Jiromaru+Akihabara","Quick individual-cut yakiniku experience."),
    r(9,"Hitachino Brewing Lab Akihabara","Beer hall / grill",3.28,119,"3-5 min","recommended at dinner", "https://tabelog.com/en/tokyo/A1310/A131001/?genre_name=tonkatsu","Useful seated cooling break over the railway."),
    r(10,"Gluten Free T's Kitchen Ueno-Hirokoji","Japanese gluten-free",null,null,"12-18 min","recommended", "https://glutenfree.co.jp/home-en/","Nearest robust dedicated gluten-free meal."),
  ],
  shibuya: [
    r(1,"Shibuya PARCO Chaos Kitchen","Multi-restaurant food floor",null,null,"on site","walk-in / varies", "https://shibuya.parco.jp/restaurant/","Best family flexibility beside Pokémon Center and Nintendo Tokyo."),
    r(2,"Jikasei MENSHO Shibuya PARCO","Ramen",null,null,"inside PARCO","walk-in queue", "https://menya-shono.com/","No-detour high-quality ramen."),
    r(3,"Kiwamiya Shibuya PARCO","Hamburg steak",null,null,"inside PARCO","walk-in queue", "https://www.google.com/maps/search/?api=1&query=Kiwamiya+Shibuya+PARCO","Interactive hot-stone meal popular with families."),
    r(4,"Uobei Shibuya Dogenzaka","Conveyor sushi",3.08,192,"4-7 min","walk-in / app queue", "https://www.genkisushi.co.jp/en/","Fast, inexpensive and teen-friendly."),
    r(5,"Gyukatsu Motomura Shibuya","Beef cutlet",null,697,"5-10 min","walk-in queue", "https://www.gyukatsu-motomura.com/","Popular signature meal if the queue is manageable."),
    r(6,"Sushi no Midori Shibuya Mark City","Sushi",null,null,"5-8 min","queue ticket", "https://www.sushino-midori.co.jp/","Reliable family sushi with electronic queueing."),
    r(7,"Toritake Shibuya","Yakitori / chicken",null,null,"3-5 min","walk-in queue", "https://www.google.com/maps/search/?api=1&query=Toritake+Shibuya","Old-school local counter near the station."),
    r(8,"Han no Daidokoro Kadochika","Wagyu yakiniku",null,null,"7-10 min","recommended", "https://www.tablecheck.com/en/shops/hannodaidokoro-kadochika/reserve","Bookable family splurge with private-room potential."),
    r(9,"Nabezo Shibuya Koen-dori","Shabu-shabu / sukiyaki",null,null,"5-8 min","recommended", "https://nabe-zo.com/en/","High-capacity, bookable family meal near PARCO."),
    r(10,"Gluten Free T's Kitchen Harajuku","Japanese gluten-free",null,null,"15-20 min walk/transit","recommended", "https://glutenfree.co.jp/home-en/","Strongest nearby dedicated gluten-free choice."),
  ],
  shinjuku: [
    r(1,"Fuunji Shinjuku","Tsukemen",3.76,5247,"12-18 min from Cava House","walk-in queue", "https://tabelog.com/en/tokyo/A1304/A130401/13044091/","Outstanding rating-volume signal."),
    r(2,"Shinjuku Kappo Nakajima","Japanese / sardine lunch",3.67,1514,"8-12 min","walk-in lunch; reserve dinner", "https://tabelog.com/japanese/tokyo/A1304/A130401/rank/","Excellent-value Michelin-linked lunch near Shinjuku-sanchome."),
    r(3,"Tsukemen Gonokami Seisakujo","Shrimp tsukemen",3.77,5317,"12-18 min","walk-in queue", "https://tabelog.com/en/tokyo/A1304/A130401/rank/","One of Shinjuku's strongest casual rating-volume choices."),
    r(4,"Menya Sho Honten","Ramen",3.77,4550,"15-20 min","walk-in queue", "https://tabelog.com/en/tokyo/A1304/A130401/rank/","High-volume ramen benchmark."),
    r(5,"FISH Shinjuku","Spice curry",3.79,2679,"15-20 min","walk-in queue", "https://tabelog.com/en/tokyo/A1304/A130401/rank/","Strong curry option with a very high review count."),
    r(6,"Tempura Shinjuku Tsunahachi Keio","Tempura",3.12,91,"10-15 min","reservations after 15:00", "https://tabelog.com/en/tokyo/A1304/A130401/13017310/","Verified replacement for the closed/on-hold Sohonten."),
    r(7,"Udon Shin","Handmade udon",null,null,"15-20 min","online queue", "https://www.udonshin.com/","Excellent noodles without a fixed reservation."),
    r(8,"Oiwake Dango Honpo Shinjuku","Wagashi / cafe",3.76,2159,"5-8 min","walk-in", "https://tabelog.com/en/tokyo/A1304/A130401/rank/","Ideal cold sweet and tea break near Cava House."),
    r(9,"noix de beurre Shinjuku Isetan","Patisserie",3.79,1867,"5-8 min","walk-in", "https://tabelog.com/en/tokyo/A1304/A130401/rank/","High-rated takeaway sweet at Isetan."),
    r(10,"HealthyTOKYO Cafe Shinjuku","Vegan / gluten-free options",null,null,"8-15 min","walk-in", "https://www.healthytokyo.com/","Best local dietary fallback; confirm current cross-contact policy."),
  ],
  ginza: [
    r(1,"Gluten-Free Kushiage Su","Gluten-free kushiage omakase",null,8,"5-12 min","reservation required", "https://www.tablecheck.com/en/shops/glutenfree-kushiage-su/reserve","Distinctive six-seat dedicated gluten-free meal."),
    r(2,"Ginza Hachigo","Ramen",3.95,2420,"8-12 min","TableCheck reservation", "https://www.google.com/maps/search/?api=1&query=Ginza+Hachigo","Exceptional rating, but difficult ticketing."),
    r(3,"Tempura Kondo","Tempura",null,null,"3-6 min","reservation required", "https://www.tempura-kondo.com/english/","Renowned Ginza splurge; book well ahead."),
    r(4,"GINZA KUKI","Japanese / fermented cuisine",null,null,"5-10 min","reservation required", "https://ginzakuki.com/en/","High-confidence planned meal with GF course support."),
    r(5,"Ginza Kagari Honten","Chicken paitan ramen",null,null,"3-8 min","walk-in queue", "https://www.google.com/maps/search/?api=1&query=Ginza+Kagari+Honten","Acclaimed casual ramen in central Ginza."),
    r(6,"Ginza Bairin Honten","Tonkatsu",null,null,"5-8 min","walk-in / limited booking", "https://ginza-bairin.com/","Historic tonkatsu specialist."),
    r(7,"Mugi to Olive Ginza","Ramen",null,null,"5-8 min","walk-in queue", "https://www.google.com/maps/search/?api=1&query=Mugi+to+Olive+Ginza","Popular lighter ramen option."),
    r(8,"Shiseido Parlour Salon de Cafe","Cafe / parfait",null,null,"5-10 min","walk-in queue", "https://parlour.shiseido.co.jp/en/","Classic air-conditioned Ginza dessert stop."),
    r(9,"Ginza West Main Shop","Tea room / cakes",null,null,"8-12 min","walk-in", "https://www.ginza-west.com/","Traditional quiet tea-room break."),
    r(10,"Ginza Kimuraya","Bakery / anpan",null,null,"2-5 min","walk-in", "https://www.kimuraya-sohonten.co.jp/","Quick historic snack directly on Chuo-dori."),
  ],
  marunouchi: [
    r(1,"Rokurinsha Tokyo Station","Tsukemen",3.77,7634,"inside Tokyo Station","walk-in queue", "https://tabelog.com/en/tokyo/A1302/A130201/13093047/","Extraordinary rating-volume signal; queue dependent."),
    r(2,"Soranoiro NIPPON","Ramen with GF option",null,null,"inside Tokyo Station","walk-in queue", "https://soranoiro-vege.com/store-menu/soranoiro-nippon/","Best station-area gluten-aware bowl."),
    r(3,"Nemuro Hanamaru KITTE Marunouchi","Conveyor sushi",null,1716,"1 min from Marunouchi South Exit","queue ticket", "https://www.sushi-hanamaru.com/","High-volume Hokkaido sushi directly across from the station."),
    r(4,"Tsujihan Tokyo Midtown Yaesu","Seafood rice bowl",null,null,"5-8 min","walk-in queue", "https://www.google.com/maps/search/?api=1&query=Tsujihan+Tokyo+Midtown+Yaesu","Popular signature seafood bowl without leaving the station district."),
    r(5,"Manten Sushi Marunouchi","Sushi omakase",null,null,"5-10 min","reservation recommended", "https://www.tablecheck.com/en/shops/manten-sushi-marunouchi/reserve","Compact, bookable omakase experience."),
    r(6,"TsuruTonTan Tokyo Building TOKIA","Udon",null,null,"5-8 min","recommended", "https://www.tsurutontan.co.jp/shop/tokyo/","Large bowls and family seating close to Marunouchi South Exit."),
    r(7,"T's Tantan Tokyo Station","Vegan ramen",null,null,"inside station","walk-in", "https://www.jr-cross.co.jp/ts-tantan/","Fast vegan choice; confirm current GF status separately."),
    r(8,"Menya Itto Tokyo Station","Ramen / tsukemen",null,null,"inside station","walk-in queue", "https://www.tokyoeki-1bangai.co.jp/street/ramen/","Strong Ramen Street alternative when Rokurinsha queue is excessive."),
    r(9,"Daimaru Tokyo Depachika","Department-store food hall",null,null,"inside station","walk-in", "https://www.daimaru.co.jp/tokyo/","Best flexible takeaway selection for a family split."),
    r(10,"Ippudo Marunouchi","Tonkotsu ramen",null,null,"5-10 min","walk-in", "https://stores.ippudo.com/en/","Reliable familiar ramen with predictable service."),
  ],
  umeda: [
    r(1,"Okonomiyaki Kiji Honten","Okonomiyaki",3.67,2121,"inside Shin-Umeda dining street","walk-in queue", "https://tabelog.com/en/osaka/A2701/A270101/27000297/","Top practical rating-volume choice in the station area."),
    r(2,"Okonomiyaki Kiji Umeda Sky Building","Okonomiyaki",3.69,878,"10-12 min","walk-in queue", "https://tabelog.com/en/osaka/A2701/A270101/rstLst/RC0109","Slightly higher rating with a location beside the scheduled district."),
    r(3,"Hanadako","Takoyaki",null,null,"inside Shin-Umeda Shokudogai","walk-in queue", "https://www.google.com/maps/search/?api=1&query=Hanadako+Umeda","Iconic quick Osaka snack."),
    r(4,"Kushikatsu Matsuba Sohonten","Kushikatsu",null,null,"inside Shin-Umeda Shokudogai","walk-in", "https://www.google.com/maps/search/?api=1&query=Kushikatsu+Matsuba+Sohonten+Umeda","Classic standing fried-skewer stop."),
    r(5,"Mugito Mensuke","Ramen",null,null,"12-18 min toward Nakatsu","walk-in queue", "https://www.google.com/maps/search/?api=1&query=Mugito+Mensuke+Osaka","One of north Osaka's strongest ramen choices."),
    r(6,"Ramen Yashichi","Ramen",null,null,"12-18 min toward Nakatsu","walk-in queue", "https://www.google.com/maps/search/?api=1&query=Ramen+Yashichi+Osaka","Well-regarded local ramen alternative."),
    r(7,"Okonomiyaki Sakura Umeda","Okonomiyaki",null,null,"5-8 min","walk-in queue", "https://www.google.com/maps/search/?api=1&query=Okonomiyaki+Sakura+Umeda","Convenient fallback when Kiji's line is too long."),
    r(8,"TsuruTonTan Top Chefs Kitashinchi","Udon",null,null,"8-12 min","recommended", "https://www.tsurutontan.co.jp/shop/kitashinchi/","Bookable seated family dinner with a broad menu."),
    r(9,"Rikuro Ojisan Daimaru Umeda","Cheesecake",null,null,"inside Daimaru","walk-in queue", "https://www.rikuro.co.jp/shoplist/","Easy Osaka cheesecake stop at the station."),
    r(10,"Hankyu Umeda Depachika","Department-store food hall",null,null,"inside station district","walk-in", "https://www.hankyu-dept.co.jp/honten/","Best flexible air-conditioned family backup."),
  ],
  gion: [
    r(1,"Gion Soy Milk Ramen UNO","Dedicated gluten-free ramen",null,null,"3-10 min","recommended", "https://www.gluten-free-japan.com/guide/kyoto","Best casual dietary-confidence choice."),
    r(2,"Gion Endo","Japanese kaiseki",3.88,140,"5-10 min","reservation required", "https://tabelog.com/en/kyoto/A2601/A260301/26019418/","Highest verified rating signal among practical central choices."),
    r(3,"Gion Duck Noodles","Duck ramen",3.68,984,"5-10 min","walk-in queue", "https://tabelog.com/en/ramen/kyoto/A2601/A260301/rank/","Strong casual rating-volume option."),
    r(4,"Gion Karyo","Japanese kaiseki",null,null,"5-10 min","reservation recommended", "https://www.gion-karyo.com/","Refined but more accessible alternative to elite counters."),
    r(5,"Izuju Sushi","Kyoto-style pressed sushi",null,null,"2-5 min from Yasaka Shrine","walk-in queue", "https://www.google.com/maps/search/?api=1&query=Izuju+Sushi+Kyoto","Historic, distinctive Kyoto specialty."),
    r(6,"Hisago Kyoto","Oyakodon / soba",null,null,"8-12 min","walk-in queue", "https://www.google.com/maps/search/?api=1&query=Hisago+Kyoto+Higashiyama","Famous casual bowl near the Higashiyama route."),
    r(7,"Kagizen Yoshifusa Gion","Wagashi / tea",null,null,"3-6 min","walk-in", "https://www.kagizen.co.jp/","Excellent traditional cooling stop."),
    r(8,"Gion Tanto","Okonomiyaki",3.29,70,"5-8 min","walk-in queue", "https://tabelog.com/en/kyoto/A2601/A260301/26007590/","Approachable but wheat-heavy and current smoking conditions require checking."),
    r(9,"Tempura Endo Yasaka","Tempura",null,null,"8-12 min","reservation required", "https://www.gion-endo.com/english/","Bookable Kyoto tempura splurge."),
    r(10,"Gion Kyomen","Kyoto noodles / Japanese",null,null,"3-8 min","walk-in", "https://www.google.com/maps/search/?api=1&query=Gion+Kyomen+Kyoto","Practical family fallback close to the evening route."),
  ],
  peace_park: [
    r(1,"Caffe Ponte Italiano Hiroshima","Italian / cafe",3.47,460,"2-5 min","recommended", "https://tabelog.com/en/hiroshima/A3401/A340116/34004795/","Best indoor decompression meal beside the memorial park."),
    r(2,"Mitchan Sohonten Orizuru Tower","Hiroshima okonomiyaki",null,null,"4 min from Peace Memorial Park","walk-in / booking check", "https://www.orizurutower.jp/en/shop/","Best same-cuisine replacement for Nagata-ya, directly beside the Atomic Bomb Dome."),
    r(3,"Musubi Musashi Dobashi","Onigiri / bento",null,null,"8-12 min","walk-in", "https://www.city.hiroshima.lg.jp/english/hiroshima-brand-en/1032092/1032094/1014814.html","Fast local bento choice when the museum visit runs late."),
    r(4,"Koguma Hiroshima","Gluten-free okonomiyaki",null,null,"short tram/taxi","reservation required", "https://www.hiroshimayaki.biz/?mode=f7","Best gluten-aware signature meal; separate GF grill stated by the restaurant."),
  ],
};

for (const [key, restaurants] of Object.entries(sets)) {
  data[key].restaurants = restaurants;
  data[key].updatedAt = "2026-07-27";
  data[key].ratingSource = "Tabelog and official-source snapshots 2026-07-27; null where no current score/review pair was independently captured";
  delete data[key].availabilityNote;
}

for (const guide of Object.values(data)) {
  for (const restaurant of guide.restaurants) {
    if (restaurant.reserveUrl?.includes("google.com/maps") || restaurant.reserveUrl?.includes("maps.google")) {
      restaurant.reserveUrl = null;
    }
  }
  if (guide.restaurants.length < 10) {
    guide.availabilityNote = `Only ${guide.restaurants.length} credible/practical nearby choices were verified; the list is intentionally not padded with distant, closed, weakly evidenced, or schedule-incompatible venues.`;
  } else {
    delete guide.availabilityNote;
  }
}

fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
