export type LocalPick = {
  kind: "Hidden/local" | "Viral food" | "Top restaurant" | "Coffee/sweets";
  name: string;
  detail: string;
  walk: string;
  query: string;
  when?: string;
};

export type AreaGuide = {
  tip: string;
  picks: LocalPick[];
};

export type TransportGuide = {
  booking: string;
  seats: string;
  luggage: string;
  fallback: string;
};

export const areaGuides: Record<string, AreaGuide> = {
  shiomi: {
    tip: "Shiomi is a quiet residential base. Use the hotel bath and station convenience stores; save destination dining for Tokyo Station or Toyosu.",
    picks: [
      { kind: "Hidden/local", name: "Shiomi Sazanami Park", detail: "A calm canal-side reset that most visitors never see.", walk: "5–8 min", query: "Shiomi Sazanami Park Tokyo" },
      { kind: "Viral food", name: "Hotel bakery and breakfast buffet", detail: "The practical early-start breakfast; confirm takeaway options the night before.", walk: "On site", query: "Tokyo Bay Shiomi Prince Hotel restaurant", when: "Breakfast" },
      { kind: "Top restaurant", name: "TIDE TABLE Shiomi", detail: "Reliable Japanese-Western family dinner without another train ride.", walk: "On site", query: "TIDE TABLE Shiomi", when: "Dinner" },
    ],
  },
  asakusa: {
    tip: "Look beyond Kaminarimon: the quieter lanes west of the temple preserve old shops, tiny shrines and morning neighbourhood life.",
    picks: [
      { kind: "Hidden/local", name: "Bentendō & Denbōin Street", detail: "Quiet temple details and theatrical old-Edo storefronts before shops fully open.", walk: "2–5 min", query: "Bentendo Sensoji Denboin Street" },
      { kind: "Viral food", name: "Asakusa Kagetsudō melon-pan", detail: "Hot, crisp, oversized sweet bun; share one before the queues build.", walk: "4–6 min", query: "Asakusa Kagetsudo Kaminarimon", when: "Breakfast/snack" },
      { kind: "Top restaurant", name: "Onigiri Asakusa Yadoroku", detail: "Historic specialist counter; small and queue-prone, so treat it as a bonus rather than a fixed stop.", walk: "8–10 min", query: "Onigiri Asakusa Yadoroku", when: "Breakfast/lunch" },
      { kind: "Coffee/sweets", name: "Suzukien matcha gelato", detail: "Famous intensity-ranked matcha gelato; best after 10:00 if the line is short.", walk: "8–10 min", query: "Suzukien Asakusa matcha gelato", when: "Snack" },
    ],
  },
  kappabashi: {
    tip: "Look up for the giant chef head and search side shops for wax-food samples, engraved knives and tiny kitchen tools.",
    picks: [
      { kind: "Hidden/local", name: "Sōgen-ji · Kappa-dera", detail: "Tiny folklore temple that explains the district’s kappa mascot.", walk: "3–5 min", query: "Sogenji Kappa-dera Tokyo" },
      { kind: "Viral food", name: "Fake-food sample workshop", detail: "Make or buy hyper-realistic food replicas; reserve only if you want the full workshop.", walk: "Along the street", query: "Ganso Shokuhin Sample-ya Kappabashi" },
      { kind: "Top restaurant", name: "Iriyama Senbei", detail: "Old-style hand-grilled rice crackers—quick, portable and genuinely local.", walk: "5–8 min", query: "Iriyama Senbei Asakusa", when: "Snack" },
    ],
  },
  skytree: {
    tip: "Stay inside Solamachi during the hottest window. The fourth-floor Japan Experience Zone is better than another observation-deck queue.",
    picks: [
      { kind: "Hidden/local", name: "Postal Museum Japan", detail: "Compact, unusual museum inside Solamachi with historic stamps and interactive exhibits.", walk: "Inside complex", query: "Postal Museum Japan Tokyo Skytree" },
      { kind: "Viral food", name: "Kirby Café", detail: "Elaborate character plates; reservation-only and not worth waiting for without a booking.", walk: "Inside complex", query: "Kirby Cafe Tokyo Skytree", when: "Lunch" },
      { kind: "Top restaurant", name: "Rokurinsha TOKYO Solamachi", detail: "Rich dipping noodles in an air-conditioned, teen-friendly setting.", walk: "Inside complex", query: "Rokurinsha Tokyo Solamachi", when: "Lunch" },
      { kind: "Coffee/sweets", name: "Qu’il Fait Bon Skytree", detail: "Seasonal Japanese fruit tarts; ideal quick cooling dessert.", walk: "Inside complex", query: "Quil Fait Bon Tokyo Skytree", when: "Dessert" },
    ],
  },
  ueno: {
    tip: "The museum’s quieter highlights are the Gallery of Hōryūji Treasures and the garden-facing lounge; do not try to cover every gallery.",
    picks: [
      { kind: "Hidden/local", name: "Kiyomizu Kannon-dō", detail: "A small temple balcony with a circular pine opening and views across the park.", walk: "5–9 min", query: "Kiyomizu Kannon-do Ueno" },
      { kind: "Viral food", name: "Niku no Ōyama menchi-katsu", detail: "Crisp minced-beef croquette eaten standing in Ameyoko.", walk: "8–12 min", query: "Niku no Oyama Ueno", when: "Snack" },
      { kind: "Top restaurant", name: "Izuei Honten", detail: "Long-running unagi restaurant; reserve or arrive off-peak for a calmer meal.", walk: "8–12 min", query: "Izuei Honten Ueno", when: "Lunch/dinner" },
      { kind: "Coffee/sweets", name: "Usagiya dorayaki", detail: "Benchmark red-bean pancakes; buy early because daily stock can sell out.", walk: "10–14 min", query: "Usagiya Ueno dorayaki", when: "Snack" },
    ],
  },
  akihabara: {
    tip: "Go one block beyond Chūō-dōri: shrine steps, specialist card shops and tiny retro-game stores are more memorable than generic electronics chains.",
    picks: [
      { kind: "Hidden/local", name: "Kanda Myōjin", detail: "Historic shrine with modern tech/anime charms on the hill above Akihabara.", walk: "8–12 min", query: "Kanda Myojin Shrine" },
      { kind: "Viral food", name: "Roast Beef Ōno", detail: "Photogenic roast-beef mountain bowls; queues move faster outside peak dinner.", walk: "4–7 min", query: "Roast Beef Ono Akihabara", when: "Dinner" },
      { kind: "Top restaurant", name: "Tonkatsu Marugo", detail: "Celebrated thick-cut tonkatsu; use as a proper sit-down dinner if the queue is reasonable.", walk: "6–9 min", query: "Tonkatsu Marugo Akihabara", when: "Dinner" },
      { kind: "Coffee/sweets", name: "Milk Shop Luck Rakuen", detail: "Tiny platform milk stand for a very local retro refreshment.", walk: "JR station", query: "Milk Shop Luck Rakuen Akihabara", when: "Snack" },
    ],
  },
  harajuku: {
    tip: "At Meiji Jingu, watch for sake barrels, handwashing ritual and wedding processions; on Cat Street, inspect the side lanes rather than only the main strip.",
    picks: [
      { kind: "Hidden/local", name: "Tōgō Shrine", detail: "A tranquil shrine and pond hidden just behind Takeshita Street.", walk: "5–9 min", query: "Togo Shrine Harajuku" },
      { kind: "Viral food", name: "Marion Crêpes", detail: "The classic Harajuku cone crêpe; split one before the longest queues.", walk: "Takeshita Street", query: "Marion Crepes Takeshita Street", when: "Snack" },
      { kind: "Top restaurant", name: "Udon Shin", detail: "Excellent handmade udon near the Shinjuku side; join the digital queue only if it fits the day.", walk: "15–20 min / short train", query: "Udon Shin Tokyo", when: "Lunch/dinner" },
      { kind: "Coffee/sweets", name: "Koffee Mameya", detail: "Minimalist coffee counter focused on bean selection; often a wait, so keep optional.", walk: "8–12 min", query: "Koffee Mameya Omotesando", when: "Coffee" },
    ],
  },
  shibuya: {
    tip: "Use PARCO’s basement Chaos Kitchen, the free Miyashita rooftop and Shibuya Sky’s indoor 46th floor if wind closes the roof.",
    picks: [
      { kind: "Hidden/local", name: "Miyashita Park rooftop", detail: "Free elevated green space and city views between PARCO and the station.", walk: "6–9 min", query: "Miyashita Park rooftop Shibuya" },
      { kind: "Viral food", name: "Gyūkatsu Motomura", detail: "Beef cutlet finished on a personal hot stone; go off-peak or expect a line.", walk: "4–8 min", query: "Gyukatsu Motomura Shibuya", when: "Lunch/dinner" },
      { kind: "Top restaurant", name: "Shibuya PARCO Chaos Kitchen", detail: "A basement cluster of strong Japanese options that keeps the group indoors and together.", walk: "Inside PARCO", query: "Chaos Kitchen Shibuya PARCO", when: "Lunch" },
      { kind: "Coffee/sweets", name: "I'm donut? Shibuya", detail: "Highly viral fresh doughnuts; only attempt if the line is visibly short.", walk: "8–12 min", query: "I'm donut Shibuya", when: "Snack" },
    ],
  },
  odaiba: {
    tip: "The best free Odaiba details are the Statue of Liberty angle, Rainbow Bridge beach view and the retro Shōwa-era arcade inside DECKS.",
    picks: [
      { kind: "Hidden/local", name: "Daiba 1-chōme Shōtengai", detail: "Retro games, candy and haunted-house atmosphere inside DECKS.", walk: "4–8 min", query: "Daiba 1-chome Shotengai DECKS Tokyo Beach" },
      { kind: "Viral food", name: "Odaiba Takoyaki Museum", detail: "Compare Osaka takoyaki styles indoors rather than adding an outdoor queue.", walk: "Inside DECKS", query: "Odaiba Takoyaki Museum", when: "Snack/lunch" },
      { kind: "Top restaurant", name: "bills Odaiba", detail: "Bay-view brunch and ricotta hotcakes; reserve if using it for a late breakfast.", walk: "Inside DECKS", query: "bills Odaiba", when: "Breakfast/brunch" },
    ],
  },
  toyosu: {
    tip: "The Planets garden areas change with season. Wear shorts or trousers that roll above the knee and avoid skirts because of mirrored floors. The wholesale market is closed on Sunday, August 9—use Senkyaku Banrai instead.",
    picks: [
      { kind: "Hidden/local", name: "Toyosu Senkyaku Banrai footbath", detail: "Free rooftop footbath with bay views beside the market complex.", walk: "12–18 min", query: "Toyosu Senkyaku Banrai footbath" },
      { kind: "Viral food", name: "Vegan Ramen UZU Tokyo", detail: "Artful ramen beside teamLab; verify opening and queue on the day.", walk: "At teamLab", query: "Vegan Ramen UZU Tokyo teamLab Planets", when: "Lunch" },
      { kind: "Top restaurant", name: "Senkyaku Banrai food street", detail: "The practical Sunday late-lunch choice after Planets; check the selected tenant's same-day hours.", walk: "7–10 min", query: "Toyosu Senkyaku Banrai restaurants", when: "Late lunch" },
    ],
  },
  tokyo_tower: {
    tip: "Pair the tower with Zōjō-ji’s temple axis and the tiny Atago Shrine staircase; do not buy another observation-deck upgrade.",
    picks: [
      { kind: "Hidden/local", name: "Zōjō-ji & Jizō statues", detail: "Historic temple foreground for the classic Tokyo Tower photograph.", walk: "5–8 min", query: "Zojoji Temple Tokyo Tower" },
      { kind: "Viral food", name: "Tokyo Shiba Tōfuya Ukai", detail: "Atmospheric garden tofu kaiseki beneath the tower; expensive and reservation-essential.", walk: "2–4 min", query: "Tokyo Shiba Tofuya Ukai", when: "Dinner" },
      { kind: "Top restaurant", name: "Savoy Azabudai", detail: "Acclaimed wood-fired pizza for a less formal post-tower dinner.", walk: "10–15 min", query: "Savoy Azabudai pizza", when: "Dinner" },
      { kind: "Coffee/sweets", name: "Le Pain Quotidien Shiba Park", detail: "Easy family seating beside the park when energy is low.", walk: "7–10 min", query: "Le Pain Quotidien Shiba Park", when: "Coffee/dinner" },
    ],
  },
  roppongi: {
    tip: "The free Maman spider, Mori Garden and TV Asahi lobby are enough for this optional late stop; skip the paid observatory.",
    picks: [
      { kind: "Hidden/local", name: "Mori Garden", detail: "Compact illuminated garden tucked below the towers.", walk: "On site", query: "Mori Garden Roppongi Hills" },
      { kind: "Viral food", name: "TsuruTonTan Roppongi", detail: "Huge bowls and creative udon in a late-opening setting.", walk: "6–9 min", query: "TsuruTonTan Roppongi", when: "Late dinner" },
      { kind: "Top restaurant", name: "RIGOLETTO Bar and Grill", detail: "Lively, broad menu and easier family seating than tiny bars.", walk: "On site", query: "Rigoletto Bar and Grill Roppongi", when: "Dinner" },
    ],
  },
  moto_hakone: {
    tip: "Walk a short piece of the old cedar avenue and use Onshi-Hakone Park for quieter lake views; do not wait excessively for one torii photo.",
    picks: [
      { kind: "Hidden/local", name: "Old Tōkaidō cedar avenue", detail: "Towering historic cedars and shade close to the lake road.", walk: "8–12 min", query: "Old Tokaido Cedar Avenue Hakone" },
      { kind: "Viral food", name: "Bakery & Table Hakone", detail: "Lake-view breads and a free footbath terrace; use only if it opens before departure.", walk: "6–9 min", query: "Bakery and Table Hakone", when: "Breakfast/snack" },
      { kind: "Top restaurant", name: "La Terrazza Ashinoko", detail: "Lakefront pizza and Italian dishes; not suitable for the locked early timetable unless plans slip.", walk: "5–8 min", query: "La Terrazza Ashinoko", when: "Lunch" },
    ],
  },
  hakone_museum: {
    tip: "Do not miss the Symphonic Sculpture tower, Picasso Pavilion and the free hot-spring footbath—three very different experiences in one stop.",
    picks: [
      { kind: "Hidden/local", name: "Symphonic Sculpture", detail: "Climb inside the stained-glass tower for one of Hakone’s best hidden views.", walk: "Inside museum", query: "Symphonic Sculpture Hakone Open Air Museum" },
      { kind: "Viral food", name: "Museum footbath", detail: "Free soak inside the grounds; bring a small towel or buy one there.", walk: "Inside museum", query: "Hakone Open Air Museum foot bath" },
      { kind: "Top restaurant", name: "The Hakone Open-Air Museum Café", detail: "The only meal stop that protects the mountain timetable; keep lunch quick.", walk: "Inside museum", query: "Hakone Open Air Museum restaurant", when: "Lunch" },
    ],
  },
  hakone_mountain: {
    tip: "At Sōunzan use the Cu-mo terrace and footbath; at Ōwakudani check gas restrictions before walking beyond the station plaza.",
    picks: [
      { kind: "Hidden/local", name: "Cu-mo Hakone terrace", detail: "Mountain-view terrace and hot-spring footbath directly above Sōunzan Station.", walk: "At station", query: "Cu-mo Hakone Sounzan" },
      { kind: "Viral food", name: "Ōwakudani black eggs", detail: "Sulfur-steamed eggs sold in five-packs; legend says one adds seven years of life.", walk: "At Owakudani", query: "Owakudani black eggs", when: "Snack" },
      { kind: "Top restaurant", name: "Owakudani Station Restaurant", detail: "Curry and simple hot meals; use only if the locked 14:40 departure remains safe.", walk: "At station", query: "Owakudani Station restaurant", when: "Late lunch" },
    ],
  },
  namba: {
    tip: "Hozenji’s moss-covered statue and narrow Ukiyo-kōji are the quiet counterpoint to Dotonbori’s neon.",
    picks: [
      { kind: "Hidden/local", name: "Ukiyo-kōji alley", detail: "A tiny historical lane beside Hozenji that is easy to miss.", walk: "3–6 min", query: "Ukiyo Koji Osaka Hozenji" },
      { kind: "Viral food", name: "Rikuro Ojisan cheesecake", detail: "Jiggly baked cheesecake; buy at Namba and share rather than joining multiple dessert queues.", walk: "5–8 min", query: "Rikuro Ojisan Namba main store", when: "Dessert" },
      { kind: "Top restaurant", name: "Ajinoya Honten", detail: "Well-regarded Osaka-style okonomiyaki; reserve or queue before peak dinner.", walk: "6–9 min", query: "Ajinoya Honten Osaka", when: "Dinner" },
      { kind: "Coffee/sweets", name: "LiLo Coffee Roasters", detail: "Serious coffee near Shinsaibashi for a midday reset.", walk: "12–16 min", query: "LiLo Coffee Roasters Osaka", when: "Coffee" },
    ],
  },
  osaka_castle: {
    tip: "Hōkoku Shrine and the massive dry-stone walls are more authentic than the reconstructed keep; examine the marked giant stones.",
    picks: [
      { kind: "Hidden/local", name: "Hōkoku Shrine", detail: "Quiet shrine to Toyotomi Hideyoshi inside the park.", walk: "3–6 min", query: "Hokoku Shrine Osaka Castle" },
      { kind: "Viral food", name: "MIRAIZA rooftop terrace", detail: "Castle-facing drinks and snacks; opening hours make it a post-museum option only.", walk: "Beside keep", query: "Miraiza Osaka-jo rooftop", when: "Snack" },
      { kind: "Top restaurant", name: "JO-TERRACE OSAKA", detail: "Cluster of easy family lunch options near the station if the schedule slips.", walk: "8–12 min", query: "Jo-Terrace Osaka restaurants", when: "Breakfast/lunch" },
    ],
  },
  nipponbashi: {
    tip: "In Kuromon, compare prices before buying seafood; in Den Den Town, the side streets hold the strongest retro-game and model shops.",
    picks: [
      { kind: "Hidden/local", name: "Namba Yasaka Shrine", detail: "Giant lion-head stage; slightly outside Den Den Town but visually unique.", walk: "12–18 min", query: "Namba Yasaka Shrine" },
      { kind: "Viral food", name: "Maguroya Kurogin", detail: "Tuna bowls and skewers in Kuromon; choose visibly fresh items and avoid over-ordering.", walk: "In market", query: "Maguroya Kurogin Kuromon", when: "Early lunch" },
      { kind: "Top restaurant", name: "Fukutarō Honten", detail: "Popular negiyaki/okonomiyaki near the market; queues peak at dinner.", walk: "6–10 min", query: "Fukutaro Honten Osaka", when: "Lunch/dinner" },
      { kind: "Coffee/sweets", name: "Marufuku Coffee Sennichimae", detail: "Old Osaka kissaten with dark coffee and hotcakes.", walk: "6–10 min", query: "Marufuku Coffee Sennichimae", when: "Coffee" },
    ],
  },
  shinsekai: {
    tip: "Janjan Yokochō, retro shooting galleries and Billiken statues matter more than another tower deck.",
    picks: [
      { kind: "Hidden/local", name: "Janjan Yokochō", detail: "Narrow arcade of old eateries and game parlours south of Tsutenkaku.", walk: "2–5 min", query: "Janjan Yokocho Osaka" },
      { kind: "Viral food", name: "Kushikatsu Daruma", detail: "The famous no-double-dipping fried skewers; choose an outlet with the shortest queue.", walk: "2–5 min", query: "Kushikatsu Daruma Shinsekai", when: "Dinner/snack" },
      { kind: "Top restaurant", name: "Yaekatsu", detail: "Classic counter-style kushikatsu in Janjan; small, cash-friendly and often lined up.", walk: "4–7 min", query: "Yaekatsu Osaka", when: "Early dinner" },
    ],
  },
  sumiyoshi: {
    tip: "Cross the steep Sorihashi bridge slowly, then look for the stone ‘five powers’ pebbles in Goshogozen sacred ground.",
    picks: [
      { kind: "Hidden/local", name: "Goshogozen power stones", detail: "Find stones marked 五・大・力 and return them with a new set after a wish comes true.", walk: "Inside shrine", query: "Goshogozen Sumiyoshi Taisha" },
      { kind: "Viral food", name: "Kagoya warabi-mochi", detail: "Cool traditional sweet suited to an August morning; verify opening before detouring.", walk: "5–10 min", query: "warabi mochi near Sumiyoshi Taisha", when: "Morning snack" },
      { kind: "Top restaurant", name: "Yōshoku Yaroku", detail: "Local western-Japanese croquettes near Sumiyoshi; use only if morning hours align.", walk: "8–12 min", query: "Yoshoku Yaroku Sumiyoshi", when: "Lunch" },
    ],
  },
  tenjinbashi: {
    tip: "At the housing museum, ask about the recreated town’s changing day/night lighting; the covered arcade is ideal heat shelter.",
    picks: [
      { kind: "Hidden/local", name: "Osaka Tenmangū", detail: "Major local shrine hidden one block from the arcade.", walk: "5–9 min", query: "Osaka Tenmangu Shrine" },
      { kind: "Viral food", name: "Nakamuraya croquette", detail: "Cheap, crisp local cult favourite; buy one, not a full meal.", walk: "Along arcade", query: "Nakamuraya croquette Tenjinbashisuji", when: "Snack" },
      { kind: "Top restaurant", name: "Harukoma Sushi", detail: "Generous neighbourhood sushi; lines can be long, so use a nearby branch or backup.", walk: "3–8 min", query: "Harukoma Sushi Tenjinbashisuji", when: "Lunch" },
      { kind: "Coffee/sweets", name: "Coffee no Mori", detail: "Retro kissaten known for thick pancakes and a cooling sit-down break.", walk: "5–9 min", query: "Coffee no Mori Tenjinbashisuji", when: "Coffee" },
    ],
  },
  umeda: {
    tip: "Use Osaka Station’s free rooftop terraces and the depachika food halls; skip the paid skyline deck already removed from the plan.",
    picks: [
      { kind: "Hidden/local", name: "Toki no Hiroba & rooftop gardens", detail: "Free station architecture and elevated city views without another ticket.", walk: "Inside station", query: "Toki no Hiroba Osaka Station" },
      { kind: "Viral food", name: "Okonomiyaki Kiji", detail: "Beloved counter beneath the Umeda Sky area; queue early or use another branch.", walk: "8–12 min", query: "Okonomiyaki Kiji Umeda", when: "Dinner" },
      { kind: "Top restaurant", name: "Hankyu depachika", detail: "Excellent family-friendly choice when everyone wants different Japanese foods.", walk: "Inside Hankyu", query: "Hankyu Umeda depachika", when: "Lunch/dinner" },
      { kind: "Coffee/sweets", name: "Kannonya cheese cake", detail: "Hot Danish-style cheesecake with melted cheese—strange, local and shareable.", walk: "Inside Osaka Station area", query: "Kannonya Osaka Umeda", when: "Dessert" },
    ],
  },
  nakanoshima: {
    tip: "Step inside the Central Public Hall if open and view the retro façades from the shaded riverside rather than walking the whole island.",
    picks: [
      { kind: "Hidden/local", name: "Nakanoshima Children’s Book Forest", detail: "Tadao Ando-designed library; advance entry may be required, so admire exterior if full.", walk: "5–9 min", query: "Nakanoshima Children's Book Forest" },
      { kind: "Viral food", name: "Gokan Kitahama Honten", detail: "Elegant Japanese cakes in a historic building across the river.", walk: "6–10 min", query: "Gokan Kitahama Honten", when: "Dessert" },
      { kind: "Top restaurant", name: "Nakanoshima Social Eat Awake", detail: "Easy family meal inside the Central Public Hall complex.", walk: "On site", query: "Nakanoshima Social Eat Awake", when: "Dinner" },
      { kind: "Coffee/sweets", name: "Brooklyn Roasting Company Kitahama", detail: "River terrace coffee; sit inside during the heat.", walk: "8–12 min", query: "Brooklyn Roasting Company Kitahama", when: "Coffee" },
    ],
  },
  nara_park: {
    tip: "Behind Tōdai-ji, Nigatsudō’s covered veranda and lanes are quieter; bow to deer before offering crackers and show empty hands afterward.",
    picks: [
      { kind: "Hidden/local", name: "Isuien Garden", detail: "Refined borrowed-scenery garden beside Tōdai-ji; add only if heat and timing allow.", walk: "5–8 min", query: "Isuien Garden Nara" },
      { kind: "Viral food", name: "Nakatanidō yomogi mochi", detail: "Famous high-speed mochi pounding; the display is unscheduled, the warm mochi is the real reason to stop.", walk: "12–18 min", query: "Nakatanido Nara", when: "Snack" },
      { kind: "Top restaurant", name: "Mizuya Chaya", detail: "Thatched teahouse near Kasuga’s forest serving simple noodles and sweets.", walk: "5–10 min from Kasuga route", query: "Mizuya Chaya Nara", when: "Lunch" },
      { kind: "Coffee/sweets", name: "Mahoroba Daibutsu Pudding", detail: "Silky pudding in souvenir jars; several central-Nara shops carry it.", walk: "8–15 min", query: "Mahoroba Daibutsu Pudding Nara", when: "Dessert" },
    ],
  },
  naramachi: {
    tip: "Enter Naramachi Kōshi-no-Ie to understand a traditional merchant townhouse, then explore the narrow lanes in shade.",
    picks: [
      { kind: "Hidden/local", name: "Naramachi Kōshi-no-Ie", detail: "Free traditional lattice house showing how merchants lived and worked.", walk: "3–8 min", query: "Naramachi Koshi no Ie" },
      { kind: "Viral food", name: "Kakinoha-zushi Hirasō", detail: "Nara’s persimmon-leaf wrapped sushi; portable and less heavy before Tōkae.", walk: "5–10 min", query: "Hiraso Naramachi kakinoha sushi", when: "Early dinner" },
      { kind: "Top restaurant", name: "Edogawa Naramachi", detail: "Unagi in a restored machiya; reserve if using it for the early dinner.", walk: "3–7 min", query: "Edogawa Naramachi", when: "Early dinner" },
      { kind: "Coffee/sweets", name: "Nakanishi Yosaburo", detail: "Historic wagashi shop and tea room in a machiya courtyard.", walk: "3–7 min", query: "Nakanishi Yosaburo Nara", when: "Tea" },
    ],
  },
  peace_park: {
    tip: "The Rest House basement preserves a pre-bombing shop level; the Memorial Hall’s quiet spiral descent is essential after the outdoor monuments.",
    picks: [
      { kind: "Hidden/local", name: "Peace Memorial Rest House basement", detail: "Preserved basement room connected to survivor Eizo Nomura; ask staff about access.", walk: "Inside park", query: "Hiroshima Peace Memorial Rest House basement" },
      { kind: "Viral food", name: "Nagata-ya okonomiyaki", detail: "Very popular Hiroshima-style layered pancake; use the queue as the deciding factor.", walk: "3–6 min", query: "Nagata-ya Hiroshima", when: "Lunch" },
      { kind: "Top restaurant", name: "Caffè Ponte", detail: "Riverside Italian with indoor seating—a calm decompression backup after the museum.", walk: "2–5 min", query: "Caffe Ponte Hiroshima", when: "Lunch" },
      { kind: "Coffee/sweets", name: "Orizuru Tower café", detail: "Lemon drinks and a high city view; tower admission is optional, not part of the core memorial visit.", walk: "3–5 min", query: "Orizuru Tower cafe Hiroshima", when: "Cooling stop" },
    ],
  },
  central_hiroshima: {
    tip: "Hondōri’s covered side lanes, Okonomimura and the riverside provide a compact evening circuit without more long outdoor walking.",
    picks: [
      { kind: "Hidden/local", name: "Fukuromachi Elementary School Peace Museum", detail: "Small preserved message wall and testimony site, quieter than the main park.", walk: "4–8 min", query: "Fukuromachi Elementary School Peace Museum" },
      { kind: "Viral food", name: "Musashi musubi", detail: "Hiroshima’s beloved rice balls—excellent train food or a light backup meal.", walk: "Several central branches", query: "Musashi musubi Hiroshima", when: "Snack/takeaway" },
      { kind: "Top restaurant", name: "Okonomimura", detail: "Many grills in one building; choose a counter that can seat four together.", walk: "5–10 min", query: "Okonomimura Hiroshima", when: "Dinner" },
      { kind: "Coffee/sweets", name: "Andersen Hiroshima", detail: "Historic bakery café rebuilt near Hondōri with excellent pastries and indoor seating.", walk: "3–6 min", query: "Andersen Hiroshima Honden", when: "Coffee" },
    ],
  },
  shukkeien: {
    tip: "Use the compressed miniature-landscape circuit and tea house; a short shaded loop delivers the essence without heat exposure.",
    picks: [
      { kind: "Hidden/local", name: "Sensuitei tea shop", detail: "Matcha and sweets overlooking the garden pond when open.", walk: "Inside garden", query: "Sensuitei Shukkeien", when: "Tea" },
      { kind: "Viral food", name: "Hasshō okonomiyaki", detail: "Cult-favourite griddle nearby only by taxi and queue; not worth displacing the included Hilton dinner.", walk: "Short taxi", query: "Hassho okonomiyaki Hiroshima", when: "Dinner" },
      { kind: "Top restaurant", name: "Hilton Hiroshima dining", detail: "Dinner is already included—use it rather than adding another reservation after a long day.", walk: "At hotel", query: "Hilton Hiroshima restaurants", when: "Dinner" },
    ],
  },
  miyajima: {
    tip: "Daishō-in’s Henjōkutsu cave, Senjōkaku’s unfinished timber hall and the side lane behind Omotesandō are the island’s strongest quieter experiences.",
    picks: [
      { kind: "Hidden/local", name: "Henjōkutsu cave", detail: "Dark lantern-lit cave beneath Daishō-in lined with pilgrimage icons.", walk: "Inside Daishō-in", query: "Henjokutsu Cave Daishoin" },
      { kind: "Viral food", name: "Age-momiji at Momijidō", detail: "Deep-fried maple-leaf cake served hot; one is enough in the heat.", walk: "3–8 min", query: "Momijido age momiji Miyajima", when: "Snack" },
      { kind: "Top restaurant", name: "Kakiya", detail: "Oyster specialist with a compact set menu and air conditioning; arrive before peak lunch.", walk: "3–7 min", query: "Kakiya Miyajima", when: "Lunch" },
      { kind: "Top restaurant", name: "Anagomeshi Fujitaya", detail: "Highly regarded conger-eel rice; queues can be extreme, so Kakiya or another anago shop is the practical fallback.", walk: "5–9 min", query: "Anagomeshi Fujitaya Miyajima", when: "Lunch" },
    ],
  },
  nijo: {
    tip: "Listen for nightingale floors, inspect the painted transoms and prioritize Ninomaru Palace; the southeast-corner garden is the best quick photo angle.",
    picks: [
      { kind: "Hidden/local", name: "Shinsen-en Garden", detail: "Tiny historic pond garden south of the castle with far fewer visitors.", walk: "6–9 min", query: "Shinsen-en Garden Kyoto" },
      { kind: "Viral food", name: "Menbaka Fire Ramen", detail: "Flaming ramen performance near Nijo; entertaining but hot and queue-prone, so keep optional.", walk: "10–14 min", query: "Menbaka Fire Ramen Kyoto", when: "Lunch" },
      { kind: "Top restaurant", name: "Ikkon Kyoto", detail: "Refined local meal near the castle; reserve if you want a proper arrival-day lunch.", walk: "5–10 min", query: "restaurant near Nijo Castle Kyoto Japanese", when: "Lunch" },
      { kind: "Coffee/sweets", name: "Nijō Wakasaya", detail: "Traditional sweets and summer shaved ice near the castle.", walk: "7–10 min", query: "Nijo Wakasaya Kyoto", when: "Cooling stop" },
    ],
  },
  nishiki: {
    tip: "Look into Nishiki Tenmangū at the market’s east end and watch where its torii gate pierces neighbouring buildings.",
    picks: [
      { kind: "Hidden/local", name: "Nishiki Tenmangū", detail: "Compact lantern-lit shrine embedded in the shopping district.", walk: "At east end", query: "Nishiki Tenmangu Kyoto" },
      { kind: "Viral food", name: "Konnamonja soy-milk doughnuts", detail: "Fresh mini doughnuts and soy soft serve—fast, cheap and shareable.", walk: "Inside market", query: "Konnamonja Nishiki Market", when: "Snack" },
      { kind: "Top restaurant", name: "Katsukura Sanjo", detail: "Reliable Kyoto tonkatsu with family seating just outside the market crush.", walk: "5–8 min", query: "Katsukura Sanjo Kyoto", when: "Early dinner" },
      { kind: "Coffee/sweets", name: "Snoopy Chocolat Kyoto", detail: "Character sweets in nearby Nishiki; optional fun stop for teens.", walk: "3–6 min", query: "Snoopy Chocolat Kyoto Nishiki", when: "Dessert" },
    ],
  },
  demachiyanagi: {
    tip: "For Gozan, the east bank north of the delta gives the cleanest Daimonji line; keep moving after the lighting to avoid the densest station wave.",
    picks: [
      { kind: "Hidden/local", name: "Kawai Shrine", detail: "Beauty-themed sub-shrine at Shimogamo with face-shaped votive plaques.", walk: "8–12 min", query: "Kawai Shrine Kyoto" },
      { kind: "Viral food", name: "Demachi Futaba mame-mochi", detail: "Kyoto’s famous salted bean mochi; buy before late-afternoon sellout, not after Gozan.", walk: "5–8 min", query: "Demachi Futaba Kyoto", when: "Afternoon snack" },
      { kind: "Top restaurant", name: "Bon Bon Café", detail: "Casual riverside café suitable for an early dinner before securing the viewpoint.", walk: "5–8 min", query: "Bon Bon Cafe Demachiyanagi", when: "Early dinner" },
    ],
  },
  fushimi: {
    tip: "Beyond the main torii, find the Omokaru stone, side-path bamboo and tiny fox altars; turn around before the exposed summit becomes the objective.",
    picks: [
      { kind: "Hidden/local", name: "Omokaru-ishi stone", detail: "Lift the fortune stone after making a wish; lighter than expected means a favourable outcome.", walk: "At Okusha", query: "Omokaru stone Fushimi Inari" },
      { kind: "Viral food", name: "Inari sushi at Nezameya", detail: "Historic shop near the shrine selling sweet tofu-pocket sushi and grilled eel.", walk: "3–6 min", query: "Nezameya Fushimi Inari", when: "Breakfast" },
      { kind: "Top restaurant", name: "Vermillion Café", detail: "Good coffee and breakfast near the lower shrine; use its shaded rear terrace only if comfortable.", walk: "5–8 min", query: "Vermillion Cafe Fushimi Inari", when: "Breakfast" },
    ],
  },
  higashiyama: {
    tip: "At Kiyomizu, add Zuigudō’s dark Tainai-meguri only if open; in the lanes, duck into Yasaka Kōshin-dō and Ishibe-kōji.",
    picks: [
      { kind: "Hidden/local", name: "Zuigudō Tainai-meguri", detail: "A pitch-dark symbolic rebirth walk beneath the hall; verify same-day opening.", walk: "At Kiyomizu", query: "Zuigudo Tainai Meguri Kiyomizudera" },
      { kind: "Viral food", name: "% Arabica Kyoto Higashiyama", detail: "Photogenic coffee near Yasaka Pagoda; skip if the outdoor queue is long.", walk: "3–7 min", query: "Arabica Kyoto Higashiyama", when: "Coffee" },
      { kind: "Top restaurant", name: "Omen Kodaiji", detail: "Kyoto udon and seasonal vegetables with proper indoor seating.", walk: "8–12 min", query: "Omen Kodaiji Kyoto", when: "Lunch" },
      { kind: "Coffee/sweets", name: "Starbucks Kyoto Ninenzaka Yasaka Chaya", detail: "Tatami Starbucks in a machiya; interesting architecture, not worth a major queue.", walk: "On route", query: "Starbucks Kyoto Ninenzaka Yasaka Chaya", when: "Cooling stop" },
    ],
  },
  gion: {
    tip: "Use Ishibe-kōji and Shirakawa’s canal for atmosphere; respect private-lane photography rules and never chase geiko or maiko.",
    picks: [
      { kind: "Hidden/local", name: "Gion Shirakawa", detail: "Willow-lined canal and machiya façades, quieter than Hanamikoji.", walk: "5–9 min", query: "Gion Shirakawa Kyoto" },
      { kind: "Viral food", name: "Gion Duck Noodles", detail: "Photogenic duck ramen; tiny room and unpredictable queue make it optional.", walk: "6–10 min", query: "Gion Duck Noodles Kyoto", when: "Dinner" },
      { kind: "Top restaurant", name: "Gion Tanto", detail: "Approachable okonomiyaki beside the canal; reserve or arrive early for four seats.", walk: "5–8 min", query: "Gion Tanto Kyoto", when: "Dinner" },
      { kind: "Coffee/sweets", name: "Kagizen Yoshifusa", detail: "Historic wagashi shop known for chilled kuzu noodles and serene tea room.", walk: "3–6 min", query: "Kagizen Yoshifusa Gion", when: "Tea" },
    ],
  },
  arashiyama: {
    tip: "The bamboo grove is short. The real hidden texture is Rakushisha, Kameyama Park’s river overlook and the moss garden at Giō-ji.",
    picks: [
      { kind: "Hidden/local", name: "Rakushisha Poet’s Hut", detail: "Quiet thatched literary retreat a few minutes beyond the bamboo crowds.", walk: "7–10 min", query: "Rakushisha Arashiyama" },
      { kind: "Viral food", name: "eX café Arashiyama", detail: "Grill-your-own dango in a garden setting; queues can be long after 10:00.", walk: "6–10 min", query: "eX cafe Arashiyama", when: "Snack" },
      { kind: "Top restaurant", name: "Arashiyama Yoshimura", detail: "Soba with bridge and river views; reserve or arrive at opening.", walk: "3–6 min from bridge", query: "Arashiyama Yoshimura soba", when: "Lunch" },
      { kind: "Coffee/sweets", name: "% Arabica Arashiyama", detail: "Iconic riverside coffee; use only when the line is short and stay hydrated.", walk: "2–5 min from bridge", query: "Arabica Arashiyama", when: "Coffee" },
    ],
  },
  north_kyoto: {
    tip: "At Kinkaku-ji, the Sekkatei tea-garden details come after the famous pond view; at Ryōan-ji, sit long enough for the rock composition to change.",
    picks: [
      { kind: "Hidden/local", name: "Ryōan-ji Kyōyōchi pond", detail: "Many visitors leave after the rock garden; the shaded pond circuit is calmer.", walk: "Inside grounds", query: "Ryoanji Kyoyochi Pond" },
      { kind: "Viral food", name: "Kinkaku soft serve", detail: "Gold-leaf ice cream is photogenic but overpriced—share one if curious.", walk: "Outside exit", query: "gold leaf ice cream Kinkakuji", when: "Snack" },
      { kind: "Top restaurant", name: "Seigeiin yudōfu", detail: "Temple-style tofu meal within Ryōan-ji’s grounds; verify serving hours.", walk: "Inside grounds", query: "Seigeiin Ryoanji yudofu", when: "Late lunch" },
      { kind: "Top restaurant", name: "Okonomiyaki Katsu", detail: "Tiny, friendly neighbourhood counter near Ryōan-ji; seating for four may require a wait.", walk: "7–12 min", query: "Okonomiyaki Katsu Kyoto Ryoanji", when: "Lunch/dinner" },
    ],
  },
  shinjuku: {
    tip: "Gyoen’s greenhouse and Taiwan Pavilion are cooler, quieter highlights; at night, use main Kabukicho streets and ignore all touts.",
    picks: [
      { kind: "Hidden/local", name: "Shinjuku Gyoen greenhouse", detail: "Large tropical glasshouse and a reliable heat refuge inside the gardens.", walk: "Inside garden", query: "Shinjuku Gyoen greenhouse" },
      { kind: "Viral food", name: "Fūunji tsukemen", detail: "Famous dipping noodles west of the station; go outside peak hours or expect a line.", walk: "12–18 min", query: "Fuunji Shinjuku", when: "Lunch/dinner" },
      { kind: "Top restaurant", name: "Tsunahachi Sohonten", detail: "Long-running tempura specialist near Shinjuku-sanchome; a solid family farewell option.", walk: "7–12 min", query: "Tsunahachi Sohonten Shinjuku", when: "Dinner" },
      { kind: "Coffee/sweets", name: "Isetan depachika", detail: "Exceptional basement sweets and takeaway food with no restaurant commitment.", walk: "5–10 min", query: "Isetan Shinjuku depachika", when: "Snack/takeaway" },
    ],
  },
  ikebukuro: {
    tip: "Animate’s exhibition floors and Sunshine City’s Bandai Namco areas reward targeted browsing; set a meeting point before splitting up.",
    picks: [
      { kind: "Hidden/local", name: "Ancient Orient Museum", detail: "Quiet, compact archaeology museum high in Sunshine City.", walk: "Inside complex", query: "Ancient Orient Museum Sunshine City" },
      { kind: "Viral food", name: "Kailaku giant gyoza", detail: "Oversized handmade dumplings near the station; fast and inexpensive.", walk: "8–12 min", query: "Kailaku Ikebukuro gyoza", when: "Lunch" },
      { kind: "Top restaurant", name: "Mutekiya ramen", detail: "Famous rich ramen with long queues; use only if the wait display is reasonable.", walk: "10–14 min", query: "Mutekiya Ikebukuro", when: "Lunch" },
      { kind: "Coffee/sweets", name: "Milky Way constellation parfaits", detail: "Retro zodiac-themed dessert café popular with teens.", walk: "7–10 min", query: "Milky Way Cafe Ikebukuro", when: "Dessert" },
    ],
  },
  nakano: {
    tip: "Nakano Broadway’s upper floors hold the rarest Mandarake niches; the basement food market is an overlooked break from collectables.",
    picks: [
      { kind: "Hidden/local", name: "Mandarake specialty floors", detail: "Separate shops for vintage toys, cel art, manga and games—use the floor guide.", walk: "Inside Broadway", query: "Mandarake Nakano Broadway" },
      { kind: "Viral food", name: "Daily Chico eight-layer soft serve", detail: "Towering rainbow cone in the basement; share it and eat quickly.", walk: "Inside Broadway", query: "Daily Chico Nakano Broadway", when: "Snack" },
      { kind: "Top restaurant", name: "Maguro Mart", detail: "Tuna-focused feast that books out; reserve well ahead or use a local izakaya backup.", walk: "6–10 min", query: "Maguro Mart Nakano", when: "Dinner" },
      { kind: "Top restaurant", name: "Aoba Nakano Honten", detail: "Influential double-soup ramen close to Sun Mall.", walk: "4–7 min", query: "Aoba Nakano Honten", when: "Lunch" },
    ],
  },
  koenji: {
    tip: "The best vintage stores lie on PAL, LOOK and the small lanes south of the station; Koenji Hikawa’s weather shrine is a unique local detour.",
    picks: [
      { kind: "Hidden/local", name: "Kōenji Hikawa & Weather Shrine", detail: "Japan’s unusual weather shrine with tiny geta-shaped votive plaques.", walk: "3–6 min", query: "Koenji Hikawa Shrine Weather Shrine" },
      { kind: "Viral food", name: "Tensuke egg tempura", detail: "Signature soft egg tempura over rice; counter is small and lines are common.", walk: "5–8 min", query: "Tensuke Koenji", when: "Dinner" },
      { kind: "Top restaurant", name: "Koenji Junjo Shotengai izakaya", detail: "Pick a busy family-friendly ground-floor restaurant rather than a tiny upstairs bar.", walk: "Station area", query: "family restaurant Koenji Junjo Shotengai", when: "Dinner" },
      { kind: "Coffee/sweets", name: "Floresta Kōenji", detail: "Animal-shaped organic doughnuts—easy teen-friendly dessert.", walk: "5–9 min", query: "Floresta Koenji donuts", when: "Dessert" },
    ],
  },
  tsukiji: {
    tip: "Use parallel side lanes instead of the central crush and watch the knife, tea and dried-seafood specialists—not just raw-fish counters.",
    picks: [
      { kind: "Hidden/local", name: "Namiyoke Inari Shrine", detail: "Market guardian shrine decorated with huge lion heads.", walk: "3–6 min", query: "Namiyoke Inari Shrine Tsukiji" },
      { kind: "Viral food", name: "Kitsuneya horumon bowl", detail: "Rich beef offal stew over rice; queue early and share if heavy breakfasts are not your thing.", walk: "In market", query: "Kitsuneya Tsukiji", when: "Breakfast" },
      { kind: "Top restaurant", name: "Tsukiji Itadori Bekkan", detail: "Seafood bowls with indoor seating; choose freshness and seating over the longest social-media queue.", walk: "In market", query: "Tsukiji Itadori Bekkan", when: "Breakfast" },
      { kind: "Coffee/sweets", name: "Marutake tamagoyaki", detail: "Sweet rolled omelette on a stick—quick, inexpensive and iconic.", walk: "In market", query: "Marutake Tsukiji tamagoyaki", when: "Breakfast snack" },
    ],
  },
  shiodome: {
    tip: "Hamarikyu’s Nakajima tea house is the reason to slow down; frame the garden’s tidal pond against the modern skyline.",
    picks: [
      { kind: "Hidden/local", name: "300-year pine", detail: "One of Tokyo’s largest historic black pines near the Otemon entrance.", walk: "Inside garden", query: "300 year pine Hamarikyu" },
      { kind: "Viral food", name: "Nakajima no Ochaya matcha", detail: "Tea and wagashi over the pond; use it as the planned morning rest.", walk: "Inside garden", query: "Nakajima no Ochaya Hamarikyu", when: "Morning tea" },
      { kind: "Top restaurant", name: "Caretta Shiodome dining floors", detail: "Multiple air-conditioned lunch choices if Borderless timing changes.", walk: "6–10 min", query: "Caretta Shiodome restaurants", when: "Lunch" },
    ],
  },
  azabudai: {
    tip: "Borderless has no fixed route—revisit rooms because artworks migrate. Use Azabudai’s garden and market only after the timed experience.",
    picks: [
      { kind: "Hidden/local", name: "Azabudai Hills central green", detail: "Layered gardens and public art directly above the museum.", walk: "On site", query: "Azabudai Hills Central Green" },
      { kind: "Viral food", name: "% Arabica Azabudai Hills", detail: "Design-forward coffee stop; choose it only if the queue is short.", walk: "On site", query: "Arabica Azabudai Hills", when: "Coffee" },
      { kind: "Top restaurant", name: "Azabudai Hills Market", detail: "High-quality Japanese counters and prepared foods ideal for a flexible post-teamLab lunch.", walk: "On site", query: "Azabudai Hills Market", when: "Lunch" },
    ],
  },
  ginza: {
    tip: "Use Itōya’s upper floors, Kabukiza’s rooftop garden and department-store food halls; Ginza’s best surprises are above and below street level.",
    picks: [
      { kind: "Hidden/local", name: "Kabukiza rooftop garden", detail: "Free roof garden and gallery corridor above the theatre complex.", walk: "5–10 min", query: "Kabukiza rooftop garden", when: "Afternoon" },
      { kind: "Viral food", name: "Ginza Hachigō ramen", detail: "Highly sought-after refined ramen; requires current reservation/queue procedure and should not control the day.", walk: "5–10 min", query: "Ginza Hachigo ramen", when: "Lunch" },
      { kind: "Top restaurant", name: "Ginza Kagari", detail: "Creamy chicken paitan ramen in a polished setting; expect a queue.", walk: "4–8 min", query: "Ginza Kagari Honten", when: "Lunch" },
      { kind: "Coffee/sweets", name: "Ginza West", detail: "Classic Japanese coffee-room cakes and calm table service.", walk: "8–12 min", query: "Ginza West Tokyo", when: "Coffee" },
    ],
  },
  marunouchi: {
    tip: "KITTE’s free rooftop gives the best station-train view; inside Tokyo Station, use Character Street and Ramen Street as separate signed zones.",
    picks: [
      { kind: "Hidden/local", name: "KITTE Garden", detail: "Free rooftop terrace directly facing the red-brick station and train approaches.", walk: "3–6 min", query: "KITTE Garden Tokyo Station" },
      { kind: "Viral food", name: "Rokurinsha Tokyo Ramen Street", detail: "Famous tsukemen; queue is shortest outside normal meal hours.", walk: "Inside station", query: "Rokurinsha Tokyo Station", when: "Dinner" },
      { kind: "Top restaurant", name: "Daimaru depachika", detail: "Excellent bento and sweets for a flexible final meal or next-day airport snacks.", walk: "Inside station", query: "Daimaru Tokyo depachika", when: "Dinner/takeaway" },
      { kind: "Coffee/sweets", name: "Tokyo Station Hotel Lobby Lounge", detail: "Elegant final-trip tea in the historic station building; reserve if important.", walk: "On site", query: "Tokyo Station Hotel Lobby Lounge", when: "Tea" },
    ],
  },
};

export const areaByItem: Record<string, string> = {
  h1: "shiomi",
  a1: "asakusa", a1b: "asakusa", a1c: "kappabashi", a1d: "skytree",
  a2: "ueno", "tok-ueno-park": "ueno", "tok-ameyoko": "ueno", a55: "akihabara", a61: "akihabara",
  a5: "harajuku", a6: "harajuku", a7: "shibuya", a60: "shibuya", "tok-hachiko": "shibuya", "tok-megadonki": "shibuya", a8: "shibuya", a8b: "shibuya",
  a12: "odaiba", a10: "odaiba", a9: "toyosu", a09c: "tokyo_tower", a09d: "roppongi", a09b: "azabudai",
  a13: "moto_hakone", a16: "hakone_museum", a14x: "hakone_mountain", a15: "hakone_mountain",
  h2: "namba", a17: "osaka_castle", a18: "osaka_castle", a18b: "nipponbashi", a19: "nipponbashi", a20: "shinsekai", a21: "namba",
  a22: "sumiyoshi", a23: "tenjinbashi", a24: "tenjinbashi", a24b: "nakanoshima", a25: "umeda",
  a26: "nara_park", a27: "nara_park", a28: "nara_park", a29: "nara_park", a30: "naramachi", a30b: "naramachi",
  h3: "central_hiroshima", "hr-hypo": "peace_park", a31: "peace_park", "hr-remnants": "peace_park", "hr-hall": "peace_park", a32: "peace_park", "hr-hondori": "central_hiroshima", a33: "shukkeien",
  a34: "miyajima", a35: "miyajima", a36: "miyajima", "miy-tide": "miyajima", "miy-senjokaku": "miyajima",
  h4: "nijo", a37: "nijo", a50: "nishiki", a38: "demachiyanagi", a39: "fushimi", a40: "higashiyama", a41: "higashiyama", a42: "higashiyama", a43: "gion",
  a44: "arashiyama", a45: "arashiyama", a46: "arashiyama", a47: "arashiyama", a48: "north_kyoto", a49: "north_kyoto",
  h5: "shinjuku", a51: "shinjuku", a51b: "shinjuku", a52: "shinjuku", "tok-west-hanazono": "shinjuku",
  "tok-west-animate": "ikebukuro", "tok-west-sunshine": "ikebukuro", "tok-west-nakano": "nakano", "tok-west-koenji": "koenji",
  a56: "tsukiji", a57: "shiodome", a58: "ginza", "tok-imperial": "marunouchi", a59: "marunouchi",
};

export const transportGuides: Record<string, TransportGuide> = {
  nex_arrival: {
    booking: "Do not lock a train before landing. Buy the next available reserved Ordinary seat after customs; Green Car adds space, not useful time savings.",
    seats: "Ordinary is a comfortable 2+2 layout. Choose two adjacent pairs in the same row or two rows together; there is no must-have scenic side.",
    luggage: "Use the lockable large-bag area at the end of the car and keep valuables at your seat.",
    fallback: "If N’EX timing is poor, compare Keisei Skyliner plus a Tokyo transfer; use staff or the official route planner before switching.",
  },
  nex_departure: {
    booking: "Reserve N’EX 17 now. Ordinary reserved is sufficient; Green Car is optional luxury, not an airport advantage.",
    seats: "Book four seats together in the 2+2 layout. Pick a car convenient to the luggage area; views are urban/suburban and not seat-side dependent.",
    luggage: "Place large bags in the end-of-car lockable racks and photograph the lock code/seat numbers.",
    fallback: "N’EX 19 is the planned backup. Do not wait beyond it unless the flight buffer is recalculated.",
  },
  tokaido_fuji: {
    booking: "Reserve immediately in SmartEX. Ordinary reserved is best value; Green Car gives a true 2+2 layout if the family values space on the long ride.",
    seats: "Choose D/E in two consecutive rows so all four share the Fuji side. E is the window seat on the Mount Fuji side in both directions.",
    luggage: "Any bag over 160 cm total dimensions needs a seat with oversized-baggage area. Those seats are limited—book them with the ticket.",
    fallback: "Use only a confirmed direct backup. Changes are easiest in SmartEX before the booked train departs.",
  },
  tokaido_short: {
    booking: "Reserve Ordinary seats together; this 33-minute leg is too short to justify Green Car.",
    seats: "D/E pairs are comfortable, but the classic Mount Fuji view occurs beyond Odawara, so do not choose this leg for scenery.",
    luggage: "Travel with daypacks only; the main bags should already be forwarded to Osaka.",
    fallback: "Kodama services are frequent, but protect the first Hakone bus by keeping the booked 06:30 departure.",
  },
  sanyo_west: {
    booking: "Use the Kansai–Hiroshima Area Pass to reserve Ordinary seats. Green Car is not included and is unnecessary for this short run.",
    seats: "Take two D/E pairs in consecutive rows so the family stays together. There is no reliable headline-view side worth compromising family seating for on this run.",
    luggage: "With only overnight bags, use overhead racks. Oversized bags still require the designated baggage-area seats.",
    fallback: "Hold the nearby 07:23 and 07:34 departures as live-inventory alternatives; Obon Nozomi trains are reserved-seat-only.",
  },
  sanyo_east: {
    booking: "Reserve Ordinary seats with the regional pass as soon as inventory is available. Do not pay for Green Car unless upgrading outside the pass.",
    seats: "Take two D/E pairs in consecutive rows so the family stays together. There is no reliable headline-view side worth compromising family seating for on this run.",
    luggage: "Overnight bags fit overhead. Keep the Kyoto forwarding receipt accessible in case the main luggage has not arrived.",
    fallback: "Use the 07:18 service if the target is unavailable; keep enough Shin-Osaka transfer time for a frequent Special Rapid.",
  },
  kintetsu: {
    booking: "The planned semi-express/rapid trains are ordinary commuter services—no reservation or class choice. Tap an IC card for each traveller.",
    seats: "Board at Osaka-Namba early and take any four seats together. There is no meaningful best-view side; comfort matters before the long Nara day.",
    luggage: "Carry only daypacks and keep aisles clear.",
    fallback: "Use the next Kintetsu Nara Line service. For the return, protect the listed 20:20 target and 20:49 backup after Tōkae.",
  },
  hakone_local: {
    booking: "No seat reservations. Use the digital Hakone Freepass and check live operations before leaving Odawara.",
    seats: "On the mountain bus, prioritize seats near the front for motion comfort. On ropeway/cable car, views depend more on weather than side.",
    luggage: "Daypacks only; keep hands free for transfers and crowded platforms.",
    fallback: "If ropeway or cable car suspends, use official replacement buses and cut the optional museum/mountain extras before risking Hikari 653.",
  },
  miyajima: {
    booking: "JR local train and ferry need no reservation and are covered by the regional pass; pay the separate visitor tax.",
    seats: "Use the outdoor deck for arrival views. The very early ferry may not operate the daytime close-to-torii sightseeing course.",
    luggage: "Bring only the overnight/day bag and keep it with you on the ferry.",
    fallback: "If the target ferry is missed, take the next JR ferry and use the 07:30 shrine-opening fallback already in the agenda.",
  },
  metro: {
    booking: "No reservation or class choice. Tap one IC card per person and follow the exact line/exit listed on the card.",
    seats: "There is no scenic side worth optimizing. Stand near the door only when it reduces a tight transfer; otherwise sit and cool down.",
    luggage: "Avoid rush-hour doors with large bags; use the first/last car or a taxi when the agenda explicitly says so.",
    fallback: "Take the next service—urban trains are frequent. Use the card’s live-directions link if a line is disrupted.",
  },
  taxi: {
    booking: "Prebook early-morning rides and request a vehicle for four people plus the stated luggage. Put the Japanese destination/entrance in the booking notes.",
    seats: "No class choice; a larger wagon is worth more than a premium sedan for four travellers.",
    luggage: "Confirm trunk capacity when booking and keep one small essentials bag in the cabin.",
    fallback: "Have GO and Uber Taxi installed, plus the hotel front desk as backup. Leave 10–15 minutes of dispatch buffer.",
  },
  forwarding: {
    booking: "Arrange at the hotel desk before the stated cutoff and write the next hotel’s full Japanese address, guest name and check-in date.",
    seats: "Not applicable—this service protects your train and sightseeing comfort.",
    luggage: "Photograph every waybill and keep medication, one change of clothes and valuables in the overnight bag.",
    fallback: "If next-day delivery is not guaranteed during Obon, send one day earlier or use station lockers/limited bags instead.",
  },
};

export const transportGuideByItem: Record<string, string> = {
  t1: "nex_arrival", t9: "nex_departure",
  t2: "tokaido_short", t3: "tokaido_fuji", t8: "tokaido_fuji",
  t5: "sanyo_west", t7: "sanyo_east",
  t4: "kintetsu", t4b: "kintetsu",
  t10b: "hakone_local", t10c: "hakone_local", t10d: "hakone_local", t10e: "hakone_local", t10f: "hakone_local",
  t6b: "miyajima", t6c: "miyajima",
  t07start: "taxi", t08start: "taxi", t10a: "taxi", t5b: "taxi", t6: "taxi", t7a: "taxi", t7c: "taxi", t17a: "taxi", t18a: "taxi", t8a: "taxi", t9a: "taxi",
  lug2: "forwarding",
  t1b: "metro", t09start: "metro", t09a: "metro", t09b: "metro", t10g: "metro", t11start: "metro", t12start: "metro", t13start: "metro", t4walk: "metro", t14start: "metro", t15walk: "metro", t7b: "metro", t7d: "metro", t7e: "metro", t17return: "metro", t18b: "metro", t18c: "metro", t8b: "metro", "tok-west-to-ike": "metro", "tok-west-to-nakano": "metro", "tok-west-to-koenji": "metro", "tok-west-return": "metro", t21start: "metro", t21borderless: "taxi",
};
