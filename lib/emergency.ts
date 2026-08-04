export type EmergencyCall = {
  id: string;
  label: string;
  number: string;
  href: string;
  purpose: string;
  availability: string;
  languageNote: string;
  sourceUrl: string;
  verifiedAt: string;
};

export type EmergencyLiveLink = {
  id: string;
  label: string;
  publisher: string;
  href: string;
  purpose: string;
  internetRequired: true;
  verifiedAt: string;
};

export type FamilyEmergencyContact = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  notes?: string;
};

export type FamilyEmergencyContext = {
  hotel?: { name: string; address: string; phone?: string; nearestStation?: string };
  contacts: FamilyEmergencyContact[];
  instructions?: string;
};

const VERIFIED_AT = "2026-08-04";

const calls: EmergencyCall[] = [
  {
    id: "police",
    label: "Police",
    number: "110",
    href: "tel:110",
    purpose: "Crime, traffic accident, or immediate danger",
    availability: "Emergency number while in Japan",
    languageNote: "English support is not guaranteed nationwide.",
    sourceUrl: "https://www.japan.travel/en/plan/hotline/",
    verifiedAt: VERIFIED_AT,
  },
  {
    id: "ambulance-fire",
    label: "Ambulance or fire",
    number: "119",
    href: "tel:119",
    purpose: "Medical emergency, ambulance, or fire",
    availability: "Emergency number while in Japan",
    languageNote: "English support varies by fire department.",
    sourceUrl: "https://www.japan.travel/en/plan/hotline/",
    verifiedAt: VERIFIED_AT,
  },
  {
    id: "coast-guard",
    label: "Coast Guard",
    number: "118",
    href: "tel:118",
    purpose: "Emergency or accident at sea",
    availability: "Emergency number while in Japan",
    languageNote: "No nationwide English-language promise is published.",
    sourceUrl: "https://www.kaiho.mlit.go.jp/doc/tel118.html",
    verifiedAt: VERIFIED_AT,
  },
  {
    id: "visitor-hotline",
    label: "Japan Visitor Hotline",
    number: "050-3816-2787",
    href: "tel:05038162787",
    purpose: "Tourist help during emergencies, illness, or accidents",
    availability: "24 hours a day, 365 days a year",
    languageNote: "English, Chinese, and Korean.",
    sourceUrl: "https://www.japan.travel/en/plan/hotline/",
    verifiedAt: VERIFIED_AT,
  },
  {
    id: "canada-consular",
    label: "Canada 24/7 consular emergency",
    number: "+1-613-996-8885",
    href: "tel:+16139968885",
    purpose: "Urgent consular help for a Canadian abroad",
    availability: "24 hours a day, 7 days a week",
    languageNote: "English and French.",
    sourceUrl: "https://travel.gc.ca/assistance/emergency-assistance",
    verifiedAt: VERIFIED_AT,
  },
];

const liveLinks: EmergencyLiveLink[] = [
  {
    id: "jma",
    label: "Weather, earthquake and tsunami warnings",
    publisher: "JMA",
    href: "https://www.jma.go.jp/bosai/map.html?lang=en",
    purpose: "Current official Japan Meteorological Agency warnings",
    internetRequired: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    id: "jnto-safe-travel",
    label: "Japan Safe Travel Information",
    publisher: "JNTO",
    href: "https://www.japan.travel/en/japan-safe-travel-information/",
    purpose: "Official visitor safety and disruption information",
    internetRequired: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    id: "nhk-news",
    label: "NHK World Japan news",
    publisher: "NHK",
    href: "https://www3.nhk.or.jp/nhkworld/en/news/",
    purpose: "Current English-language news",
    internetRequired: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    id: "nhk-live",
    label: "NHK World live television",
    publisher: "NHK",
    href: "https://www3.nhk.or.jp/nhkworld/en/live_tv/",
    purpose: "Current live English-language television",
    internetRequired: true,
    verifiedAt: VERIFIED_AT,
  },
  {
    id: "canada-japan",
    label: "Canada travel advice for Japan",
    publisher: "Government of Canada",
    href: "https://travel.gc.ca/destinations/japan",
    purpose: "Current Canadian travel advice and advisories",
    internetRequired: true,
    verifiedAt: VERIFIED_AT,
  },
];

export const officialEmergencyDirectory = Object.freeze({
  verifiedAt: VERIFIED_AT,
  calls: Object.freeze(calls),
  liveLinks: Object.freeze(liveLinks),
});

export function emergencyView(input: {
  authorized: boolean;
  family?: FamilyEmergencyContext;
}) {
  return {
    official: officialEmergencyDirectory.calls,
    liveLinks: officialEmergencyDirectory.liveLinks,
    family: input.authorized && input.family ? input.family : null,
  };
}
