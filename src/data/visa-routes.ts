import { SITE_URLS } from "./site.js";

export type RouteId =
  | "eu-registration"
  | "eu-family-member-card"
  | "digital-nomad-visa"
  | "non-lucrative-visa"
  | "work-permit-employees"
  | "self-employed-work-permit"
  | "entrepreneur-visa"
  | "highly-qualified-professional-visa"
  | "eu-blue-card";

export interface RouteDefinition {
  id: RouteId;
  title: string;
  summary: string;
  evergreenRequirements: string[];
  commonUseCases: string[];
  siteUrl: string;
}

export const ROUTE_DEFINITIONS: Record<RouteId, RouteDefinition> = {
  "eu-registration": {
    id: "eu-registration",
    title: "EU/EEA/Swiss Registration Route",
    summary:
      "EU, EEA, and Swiss nationals generally do not need a third-country visa and instead register their residence in Spain.",
    evergreenRequirements: [
      "Qualifying EU, EEA, or Swiss nationality.",
      "A basis for residence such as work, self-employment, study, or sufficient means.",
      "Municipal and immigration registration steps once in Spain.",
    ],
    commonUseCases: [
      "EU employee relocating directly to Spain.",
      "EU freelancer or retiree settling in Spain.",
    ],
    siteUrl: SITE_URLS.moveToSpainGuide,
  },
  "eu-family-member-card": {
    id: "eu-family-member-card",
    title: "EU Family Member Card",
    summary:
      "Best fit for non-EU family members accompanying or joining a qualifying EU, EEA, or Swiss citizen in Spain under the community-regime residence route.",
    evergreenRequirements: [
      "Qualifying family relationship to an EU, EEA, or Swiss citizen covered by the community regime.",
      "The EU citizen's residence basis in Spain must support the family route.",
      "Relationship evidence, identity documents, and residence-proof sequence matched to the family-card filing.",
    ],
    commonUseCases: [
      "Non-EU spouse or registered partner of an EU citizen in Spain.",
      "Non-EU dependent child or dependent ascendant joining a qualifying EU family member.",
    ],
    siteUrl: SITE_URLS.serviceEuFamilyMemberCard,
  },
  "digital-nomad-visa": {
    id: "digital-nomad-visa",
    title: "Digital Nomad Visa",
    summary:
      "Best fit for people working remotely for foreign employers or clients while living in Spain.",
    evergreenRequirements: [
      "Remote work relationship with non-Spanish clients or employer as the core model.",
      "Professional track record and supporting documents.",
      "Economic means tied to the applicable legal benchmark at filing time.",
    ],
    commonUseCases: [
      "Foreign employee keeping a non-Spanish job while moving.",
      "Freelancer serving mainly non-Spanish clients.",
    ],
    siteUrl: SITE_URLS.serviceDigitalNomad,
  },
  "non-lucrative-visa": {
    id: "non-lucrative-visa",
    title: "Non-Lucrative Visa",
    summary:
      "Best fit for retirees or financially independent applicants who will not work in Spain.",
    evergreenRequirements: [
      "No local work activity in Spain.",
      "Economic means tied to the applicable legal benchmark at filing time.",
      "Private health cover and supporting personal documents.",
    ],
    commonUseCases: [
      "Retirees with pensions or investments.",
      "Applicants relocating on passive income.",
    ],
    siteUrl: SITE_URLS.serviceNonLucrative,
  },
  "work-permit-employees": {
    id: "work-permit-employees",
    title: "Work Permit for Employees",
    summary:
      "Best fit for non-EU applicants hired by a Spanish employer under a local employment relationship.",
    evergreenRequirements: [
      "Spanish employer sponsorship.",
      "Employment contract and business justification.",
      "Standard immigration compliance documents.",
    ],
    commonUseCases: [
      "Non-EU employee with a Spanish job offer.",
      "Employer-led relocation to Spain.",
    ],
    siteUrl: SITE_URLS.serviceWorkPermit,
  },
  "self-employed-work-permit": {
    id: "self-employed-work-permit",
    title: "Self-Employed Work Permit",
    summary:
      "Best fit for non-EU freelancers or business owners working in the Spanish market.",
    evergreenRequirements: [
      "Self-employment or business activity plan focused on Spain.",
      "Economic viability and professional credentials.",
      "Standard immigration compliance documents.",
    ],
    commonUseCases: [
      "Freelancer serving Spanish clients.",
      "Independent professional opening a Spanish activity.",
    ],
    siteUrl: SITE_URLS.serviceSelfEmployed,
  },
  "entrepreneur-visa": {
    id: "entrepreneur-visa",
    title: "Entrepreneur Visa",
    summary:
      "Best fit for founders whose project is innovative enough to use Spain's entrepreneur route rather than a standard self-employment permit.",
    evergreenRequirements: [
      "Innovative or scalable business case.",
      "Project dossier and approval workflow for the startup route.",
      "Supporting corporate and personal documentation.",
    ],
    commonUseCases: [
      "Founder launching an innovative company in Spain.",
      "Investor building an operating business rather than seeking passive residence.",
    ],
    siteUrl: SITE_URLS.serviceEntrepreneur,
  },
  "highly-qualified-professional-visa": {
    id: "highly-qualified-professional-visa",
    title: "Highly Qualified Professional Visa",
    summary:
      "Best fit for executives, specialists, and senior hires entering Spain under a qualifying professional role.",
    evergreenRequirements: [
      "Qualifying senior or specialist role with a Spanish company.",
      "Employer-led filing and corporate documentation.",
      "Evidence of qualifications or seniority.",
    ],
    commonUseCases: [
      "Executive relocation to a Spanish entity.",
      "Specialist hire through Spain's business immigration channels.",
    ],
    siteUrl: SITE_URLS.serviceHighlyQualified,
  },
  "eu-blue-card": {
    id: "eu-blue-card",
    title: "EU Blue Card",
    summary:
      "Best fit for highly qualified non-EU professionals seeking a route with broader EU mobility logic.",
    evergreenRequirements: [
      "Qualifying professional profile and salary threshold in force at filing time.",
      "Spanish employment offer.",
      "Educational or equivalent professional background evidence.",
    ],
    commonUseCases: [
      "Highly qualified professional hired in Spain.",
      "Applicant prioritizing medium-term EU mobility options.",
    ],
    siteUrl: SITE_URLS.serviceEuBlueCard,
  },
};
