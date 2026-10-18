export const SITE_URLS = {
  about: "https://legalfournier.com/en/about/",
  contact: "https://legalfournier.com/en/contact/",
  legalNotice: "https://legalfournier.com/en/legal-notice/",
  faq: "https://legalfournier.com/en/faq/",
  tools: "https://legalfournier.com/en/legal-tools/",
  consultationBooking: "https://legalfournier.com/en/agent-book-consultation/",
  moveToSpainGuide: "https://legalfournier.com/en/legal-tools/move-to-spain/",
  visaEligibilityTool:
    "https://legalfournier.com/en/tools/spain-visa-eligibility-checker/",
  digitalNomadTool:
    "https://legalfournier.com/en/tools/digital-nomad-visa-eligibility/",
  digitalNomadTaxTool:
    "https://legalfournier.com/en/tools/digital-nomad-visa-beckham-law-checker/",
  beckhamCalculator:
    "https://legalfournier.com/en/tools/beckham-law-savings-calculator/",
  taxResidencyTool:
    "https://legalfournier.com/en/tools/spain-tax-residency-explained/",
  remoteWorkTool: "https://legalfournier.com/en/tools/work-remotely-spain/",
  propertyCostTool:
    "https://legalfournier.com/en/tools/spain-property-buyer-cost-risk-calculator/",
  wealthInheritanceTool:
    "https://legalfournier.com/en/tools/spain-wealth-tax-inheritance-exposure-checker/",
  autonomoSlTool:
    "https://legalfournier.com/en/tools/autonomo-sl-entrepreneur-visa-planner/",
  permanentEstablishmentTool:
    "https://legalfournier.com/en/tools/spain-permanent-establishment-risk-checker/",
  holdingCompanyTool:
    "https://legalfournier.com/en/tools/spain-holding-company-structure-risk-checker/",
  immigrationAppointmentsTool:
    "https://legalfournier.com/en/tools/immigration-appointments/",
  dictionaryNie: "https://legalfournier.com/en/dictionary/what-is-nie/",
  dictionaryNieVsTie:
    "https://legalfournier.com/en/dictionary/nie-vs-tie-difference/",
  dictionaryBeckham:
    "https://legalfournier.com/en/dictionary/what-is-beckham-law/",
  serviceDigitalNomad:
    "https://legalfournier.com/en/service/digital-nomad-visa/",
  serviceNonLucrative:
    "https://legalfournier.com/en/service/non-lucrative-visa/",
  serviceWorkPermit:
    "https://legalfournier.com/en/service/work-permit-employees/",
  serviceSelfEmployed:
    "https://legalfournier.com/en/service/self-employed-work-permit/",
  serviceEntrepreneur:
    "https://legalfournier.com/en/service/entrepreneur-visa/",
  serviceHighlyQualified:
    "https://legalfournier.com/en/service/highly-qualified-professional-visa/",
  serviceEuBlueCard: "https://legalfournier.com/en/service/eu-blue-card/",
  serviceEuFamilyMemberCard:
    "https://legalfournier.com/en/service/eu-family-member-card/",
  serviceNationality:
    "https://legalfournier.com/en/service/spanish-nationality-residence/",
  serviceResidencyRenewal:
    "https://legalfournier.com/en/service/residency-renewal/",
  serviceLongTermResidency:
    "https://legalfournier.com/en/service/long-term-residency/",
  serviceBeckham: "https://legalfournier.com/en/service/beckham-law/",
  serviceNie: "https://legalfournier.com/en/service/nie-number/",
  serviceTie: "https://legalfournier.com/en/service/tie-card/",
} as const;

export type SitePreferredLanguage = "en" | "es" | "fr" | "unknown";

const CONTACT_URLS: Record<"en" | "es" | "fr", string> = {
  en: SITE_URLS.contact,
  es: "https://legalfournier.com/es/contacto/",
  fr: "https://legalfournier.com/fr/contact/",
};

const CONSULTATION_BOOKING_URLS: Record<"en" | "es" | "fr", string> = {
  en: SITE_URLS.consultationBooking,
  es: SITE_URLS.consultationBooking,
  fr: SITE_URLS.consultationBooking,
};

export function getContactUrl(language: SitePreferredLanguage = "en"): string {
  return CONTACT_URLS[language === "unknown" ? "en" : language];
}

export function getConsultationBookingUrl(
  language: SitePreferredLanguage = "en",
): string {
  return CONSULTATION_BOOKING_URLS[language === "unknown" ? "en" : language];
}

export function withMcpAttribution(url: string, campaign: string): string {
  const parsed = new URL(url);

  parsed.searchParams.set("utm_source", "mcp");
  parsed.searchParams.set("utm_medium", "agent");
  parsed.searchParams.set("utm_campaign", campaign);

  return parsed.toString();
}

export const EU_EEA_SWISS_ALIASES = new Set<string>([
  "austria",
  "at",
  "belgium",
  "be",
  "bulgaria",
  "bg",
  "croatia",
  "hr",
  "cyprus",
  "cy",
  "czechrepublic",
  "czechia",
  "cz",
  "denmark",
  "dk",
  "estonia",
  "ee",
  "finland",
  "fi",
  "france",
  "fr",
  "germany",
  "de",
  "greece",
  "gr",
  "hungary",
  "hu",
  "ireland",
  "ie",
  "italy",
  "it",
  "latvia",
  "lv",
  "lithuania",
  "lt",
  "luxembourg",
  "lu",
  "malta",
  "mt",
  "netherlands",
  "nl",
  "poland",
  "pl",
  "portugal",
  "pt",
  "romania",
  "ro",
  "slovakia",
  "sk",
  "slovenia",
  "si",
  "spain",
  "es",
  "sweden",
  "se",
  "iceland",
  "is",
  "liechtenstein",
  "li",
  "norway",
  "no",
  "switzerland",
  "ch",
]);
