import { SITE_URLS } from "./site.js";
import { AGENT_LEGAL_NOTICE_LINES } from "./notices.js";
import {
  officialSources,
  verificationFlags,
  type CurrentVerificationFlag,
  type OfficialLegalSource,
} from "./legal-authorities.js";
import { ROUTE_DEFINITIONS, type RouteId } from "./visa-routes.js";

export type ProcessId = "nie-tie" | "residency-clock" | "tax-regime-review";
export type TrackId =
  | "permanent-residency-5-year"
  | "nationality-standard-10-year"
  | "nationality-ibero-2-year"
  | "nationality-special-1-year"
  | "nationality-refugee-5-year";
export type TopicId =
  | "route-selection"
  | "beckham-regime"
  | "tax-regimes"
  | "eu-family-route-check"
  | "nationality-continuity"
  | "legal-fournier-handoff";
export type PackCollectionKind = "routes" | "processes" | "tracks" | "topics";
export type PackKind = "route" | "process" | "track" | "topic";

export interface SecondaryReference extends Record<string, unknown> {
  label: string;
  url: string;
  reason: string;
}

export interface CanonicalPack extends Record<string, unknown> {
  kind: PackKind;
  id: string;
  uri: string;
  title: string;
  summary: string;
  agent_use: string;
  key_rules: string[];
  red_flags: string[];
  follow_up_tools: string[];
  official_legal_sources: OfficialLegalSource[];
  current_verification_flags: CurrentVerificationFlag[];
  secondary_references: SecondaryReference[];
  agent_notices?: string[];
  article_pinpoints?: string[];
  edge_case_notes?: string[];
  decision_cues?: string[];
  stable_requirements?: string[];
  recommended_for?: string[];
  not_for?: string[];
  milestones?: string[];
  common_mistakes?: string[];
  next_actions?: string[];
}

type RoutePackExtras = Pick<
  CanonicalPack,
  | "agent_use"
  | "key_rules"
  | "red_flags"
  | "follow_up_tools"
  | "official_legal_sources"
  | "current_verification_flags"
  | "secondary_references"
> &
  Partial<
    Pick<
      CanonicalPack,
      | "decision_cues"
      | "not_for"
      | "next_actions"
      | "common_mistakes"
      | "milestones"
      | "article_pinpoints"
      | "edge_case_notes"
    >
  >;

const LAST_MODIFIED = "2026-03-25T00:00:00Z";

export const CATALOG_URI = "legalfournier://spain-legal/catalog";
export const ROUTE_TEMPLATE_URI = "legalfournier://spain-legal/routes/{route_id}";
export const PROCESS_TEMPLATE_URI =
  "legalfournier://spain-legal/processes/{process_id}";
export const TRACK_TEMPLATE_URI = "legalfournier://spain-legal/tracks/{track_id}";
export const TOPIC_TEMPLATE_URI = "legalfournier://spain-legal/topics/{topic_id}";

function reference(label: string, url: string, reason: string): SecondaryReference {
  return { label, url, reason };
}

export function getAssistantAnnotations(priority = 1): {
  audience: ("assistant" | "user")[];
  priority: number;
  lastModified: string;
} {
  return {
    audience: ["assistant"],
    priority,
    lastModified: LAST_MODIFIED,
  };
}

export function makeRouteResourceUri(routeId: RouteId): string {
  return `legalfournier://spain-legal/routes/${routeId}`;
}

export function makeProcessResourceUri(processId: ProcessId): string {
  return `legalfournier://spain-legal/processes/${processId}`;
}

export function makeTrackResourceUri(trackId: TrackId): string {
  return `legalfournier://spain-legal/tracks/${trackId}`;
}

export function makeTopicResourceUri(topicId: TopicId): string {
  return `legalfournier://spain-legal/topics/${topicId}`;
}

function routePack(
  routeId: RouteId,
  extras: RoutePackExtras,
): CanonicalPack {
  const route = ROUTE_DEFINITIONS[routeId];

  return {
    kind: "route",
    id: routeId,
    uri: makeRouteResourceUri(routeId),
    title: route.title,
    summary: route.summary,
    stable_requirements: route.evergreenRequirements,
    recommended_for: route.commonUseCases,
    ...extras,
  };
}

export const ROUTE_PACKS: Record<RouteId, CanonicalPack> = {
  "eu-registration": routePack("eu-registration", {
    agent_use:
      "Read first when the client is EU, EEA, or Swiss, because this reframes the problem from visa selection to residence registration.",
    key_rules: [
      "EU, EEA, and Swiss nationals are normally screened into a registration path rather than a third-country visa path.",
      "The legal basis for residence still matters: work, self-employment, study, or sufficient means.",
      "If the case is really about a non-EU family member of an EU citizen, the family route needs a separate review.",
    ],
    decision_cues: [
      "Nationality is within the EU, EEA, or Swiss group.",
      "The move question is about settling in Spain rather than obtaining a visa sticker.",
    ],
    red_flags: [
      "Treating an EU citizen as if they need a non-EU work visa.",
      "Ignoring a linked non-EU family-member issue in the same household.",
    ],
    not_for: [
      "Non-EU nationals who still need a residence authorization before or after arrival.",
    ],
    next_actions: [
      "Confirm the residence basis and documentary evidence that supports it.",
      "If a non-EU family member is involved, run a separate family-route review.",
    ],
    article_pinpoints: [
      "RD 240/2007 art. 7 frames residence beyond three months for EU, EEA, and Swiss citizens around work, self-employment, study, or sufficient means.",
      "RD 240/2007 art. 10 governs the later permanent-residence milestone after five years of continuous legal residence.",
    ],
    edge_case_notes: [
      "If the real applicant is a non-EU family member, the analysis may belong under the family-card route rather than the EU citizen's own registration path.",
      "A five-year answer here should be framed as EU permanent residence, not automatically as third-country long-term residence.",
    ],
    follow_up_tools: ["get_visa_options", "get_residency_path"],
    official_legal_sources: officialSources("rd240_residence", "rd240_permanent"),
    current_verification_flags: verificationFlags("eu_family_facts"),
    secondary_references: [
      reference(
        "Move to Spain guide",
        SITE_URLS.moveToSpainGuide,
        "Firm guidance hub for relocation planning.",
      ),
    ],
  }),
  "eu-family-member-card": routePack("eu-family-member-card", {
    agent_use:
      "Use when the applicant is non-EU but the main residence theory depends on joining or accompanying an EU, EEA, or Swiss family member in Spain.",
    key_rules: [
      "This is a community-regime residence branch for qualifying non-EU family members, not a standard third-country work or passive-income route.",
      "The relationship type and the EU citizen's own residence basis both matter.",
      "Family-status changes can trigger retention or loss questions that need their own review.",
    ],
    decision_cues: [
      "Non-EU spouse, registered partner, child, or dependent parent of an EU citizen.",
      "The user describes joining or accompanying an EU citizen already in Spain or moving there.",
    ],
    red_flags: [
      "Treating the case as an ordinary non-EU work permit despite a qualifying EU family basis.",
      "Assuming the family route survives unchanged after divorce, separation, departure, or death.",
    ],
    not_for: [
      "Purely economic migration with no qualifying EU-family relationship.",
      "Third-country family reunification cases that belong under the general regime instead of the EU regime.",
    ],
    next_actions: [
      "Confirm the exact family relationship and whether the EU citizen's own residence basis is active in Spain.",
      "If the family situation changed recently, review retention-of-right questions before promising the route.",
    ],
    article_pinpoints: [
      "RD 240/2007 art. 8 covers residence beyond three months with the family-member card and the core filing sequence.",
      "RD 240/2007 art. 9 governs retention of residence after death, departure, divorce, separation, or cancellation of the registered partnership.",
      "RD 240/2007 arts. 10, 11, and 14 matter later for permanent residence, card validity, and absence rules.",
    ],
    edge_case_notes: [
      "Dependent ascendant and descendant cases often fail on evidence of dependency rather than on the headline relationship label.",
      "A current or former spouse or partner case can change completely if the underlying family relationship ended before the personal right of residence was secured.",
    ],
    follow_up_tools: [
      "get_visa_options",
      "get_residency_path",
      "route_to_legal_fournier_help",
    ],
    official_legal_sources: officialSources(
      "rd240_family_card",
      "rd240_family_retention",
      "rd240_permanent",
      "rd240_document_validity",
    ),
    current_verification_flags: verificationFlags(
      "eu_family_facts",
      "eu_family_right_retention",
      "continuity_and_absences",
    ),
    secondary_references: [
      reference(
        "EU Family Member Card service",
        SITE_URLS.serviceEuFamilyMemberCard,
        "Firm page for the EU-family route.",
      ),
      reference(
        "Move to Spain guide",
        SITE_URLS.moveToSpainGuide,
        "General relocation context while the community-regime branch is clarified.",
      ),
    ],
  }),
  "digital-nomad-visa": routePack("digital-nomad-visa", {
    agent_use:
      "Use when the facts point to foreign-remote work rather than Spanish-local employment.",
    key_rules: [
      "The core work relationship should remain anchored outside Spain.",
      "Foreign employee and foreign-client freelancer patterns can both fit, but Spanish-market activity changes the analysis.",
      "This route is often the first branch to cross-check with Beckham screening.",
    ],
    decision_cues: [
      "Foreign employer paying the applicant while they live in Spain.",
      "Freelancer mainly serving non-Spanish clients.",
    ],
    red_flags: [
      "Spanish-local employer relationship disguised as remote work.",
      "Pure passive-income relocation with no real work activity.",
    ],
    not_for: [
      "Retirement or passive-income cases.",
      "Ordinary Spanish-local employee sponsorship.",
    ],
    next_actions: [
      "Clarify whether the applicant works for a foreign employer or for foreign clients.",
      "If Spanish income will be material, compare against the self-employed or employee routes.",
    ],
    follow_up_tools: [
      "get_visa_options",
      "check_beckham_eligibility",
      "compare_tax_regimes",
    ],
    official_legal_sources: officialSources("ley14_telework"),
    current_verification_flags: verificationFlags(
      "telework_document_chain",
      "spanish_market_split",
      "tax_entry_path",
    ),
    secondary_references: [
      reference(
        "Digital Nomad Visa service",
        SITE_URLS.serviceDigitalNomad,
        "Firm page for this route.",
      ),
      reference(
        "Digital Nomad eligibility tool",
        SITE_URLS.digitalNomadTool,
        "Secondary public-facing check for the same topic.",
      ),
    ],
  }),
  "non-lucrative-visa": routePack("non-lucrative-visa", {
    agent_use:
      "Use when the move is based on passive means and the applicant is not planning Spanish work activity.",
    key_rules: [
      "This is a residence-without-work route.",
      "Passive income and sufficient means matter more than employment structure.",
      "Working remotely is not interchangeable with passive-income residence.",
    ],
    decision_cues: [
      "Retiree or financially independent applicant.",
      "No planned Spanish work activity.",
    ],
    red_flags: [
      "Applicant actually plans to keep active remote work.",
      "Agent mixes this route with Digital Nomad logic.",
    ],
    not_for: [
      "Applicants who plan to continue working from Spain.",
      "Spanish-sponsored employee cases.",
    ],
    next_actions: [
      "Confirm whether the applicant will stop active work or needs a work-authorizing route instead.",
      "Treat live income thresholds as a filing-time check, not a fixed evergreen number.",
    ],
    follow_up_tools: ["get_visa_options", "get_residency_path"],
    official_legal_sources: officialSources("rd1155_non_lucrative"),
    current_verification_flags: verificationFlags("consular_thresholds"),
    secondary_references: [
      reference(
        "Non-Lucrative Visa service",
        SITE_URLS.serviceNonLucrative,
        "Firm page for the passive-income route.",
      ),
    ],
  }),
  "work-permit-employees": routePack("work-permit-employees", {
    agent_use:
      "Use when the employer relationship is Spanish-local and sponsorship is the core fact pattern.",
    key_rules: [
      "A Spanish employer and local employment relationship point toward sponsorship-based residence authorization.",
      "This route should be distinguished from highly qualified and Blue Card screening, which are narrower branches.",
      "Foreign-remote work should not be forced into this route.",
    ],
    decision_cues: [
      "Spanish job offer already exists.",
      "Employer will sponsor the filing.",
    ],
    red_flags: [
      "No Spanish employer is actually involved.",
      "Role may instead fit the highly qualified or Blue Card branch.",
    ],
    not_for: [
      "Passive-income residence.",
      "Foreign-remote employee cases with no Spanish sponsor.",
    ],
    next_actions: [
      "Collect the contract and confirm who is sponsoring the process.",
      "If the role is senior or specialist, compare against the highly qualified and Blue Card routes.",
    ],
    follow_up_tools: [
      "get_visa_options",
      "check_beckham_eligibility",
      "compare_tax_regimes",
    ],
    official_legal_sources: officialSources("rd1155_employee"),
    current_verification_flags: verificationFlags("salary_or_income_thresholds"),
    secondary_references: [
      reference(
        "Work Permit service",
        SITE_URLS.serviceWorkPermit,
        "Firm page for Spanish-local employee sponsorship.",
      ),
    ],
  }),
  "self-employed-work-permit": routePack("self-employed-work-permit", {
    agent_use:
      "Use when the work is genuine self-employment directed at Spain rather than foreign-remote work.",
    key_rules: [
      "Spain-facing self-employment is a different branch from the foreign-client digital nomad route.",
      "Ordinary freelance activity is not automatically an entrepreneur case.",
      "Business viability and local activity matter more than passive means.",
    ],
    decision_cues: [
      "Spanish clients or Spanish-market activity are central.",
      "Applicant will register and operate as an independent professional in Spain.",
    ],
    red_flags: [
      "Agent assumes every freelancer fits the Digital Nomad Visa.",
      "Innovative startup facts are ignored even though the entrepreneur route may fit better.",
    ],
    not_for: [
      "Pure foreign-remote employee cases.",
      "Passive-income or retirement cases.",
    ],
    next_actions: [
      "Clarify whether the client base is mainly Spanish or mainly foreign.",
      "If the project is innovative and scalable, cross-check the entrepreneur route.",
    ],
    follow_up_tools: ["get_visa_options", "compare_tax_regimes"],
    official_legal_sources: officialSources("rd1155_self_employed"),
    current_verification_flags: verificationFlags(
      "spanish_market_split",
      "entrepreneur_approval",
    ),
    secondary_references: [
      reference(
        "Self-Employed Work Permit service",
        SITE_URLS.serviceSelfEmployed,
        "Firm page for Spain-facing self-employment.",
      ),
    ],
  }),
  "entrepreneur-visa": routePack("entrepreneur-visa", {
    agent_use:
      "Use when the project is an operating business with genuine innovation or startup-route potential.",
    key_rules: [
      "This route is for an operating innovative project, not passive capital placement.",
      "The end of the Golden Visa makes active-business analysis more important for investors.",
      "Ordinary freelance work does not automatically become an entrepreneur case.",
    ],
    decision_cues: [
      "Founder-led business project in Spain.",
      "Innovation or scalability is part of the case theory.",
    ],
    red_flags: [
      "Passive investment only, with no real operating business.",
      "Ordinary freelance facts dressed up as a startup route.",
    ],
    not_for: [
      "Retirees or passive-income applicants.",
      "Applicants with only a normal freelance business and no innovation story.",
    ],
    next_actions: [
      "Pressure-test whether the project is innovative enough for the entrepreneur pathway.",
      "If not, re-screen under self-employment or work-based routes.",
    ],
    follow_up_tools: ["get_visa_options", "compare_tax_regimes"],
    official_legal_sources: officialSources("ley14_entrepreneur"),
    current_verification_flags: verificationFlags("entrepreneur_approval", "tax_entry_path"),
    secondary_references: [
      reference(
        "Entrepreneur Visa service",
        SITE_URLS.serviceEntrepreneur,
        "Firm page for startup-route cases.",
      ),
    ],
  }),
  "highly-qualified-professional-visa": routePack(
    "highly-qualified-professional-visa",
    {
      agent_use:
        "Use when the role is clearly senior, specialist, or executive rather than a generic employee sponsorship case.",
      key_rules: [
        "This branch is narrower than the ordinary employee work permit.",
        "Seniority, specialization, and company context matter.",
        "It is often worth comparing with the EU Blue Card branch when the qualifications are strong.",
      ],
      decision_cues: [
        "Executive, specialist, or senior hire profile.",
        "Spanish company wants a business-immigration route rather than a standard permit.",
      ],
      red_flags: [
        "Role is actually ordinary employee sponsorship.",
        "No clear specialist or senior profile is documented.",
      ],
      not_for: [
        "Passive-income moves.",
        "Ordinary self-employment cases.",
      ],
      next_actions: [
        "Check whether the role is truly senior or specialist.",
        "Compare the case against EU Blue Card screening if qualifications are strong.",
      ],
      follow_up_tools: [
        "get_visa_options",
        "check_beckham_eligibility",
        "compare_tax_regimes",
      ],
      official_legal_sources: officialSources("ley14_hqp"),
      current_verification_flags: verificationFlags(
        "specialist_role_review",
        "salary_or_income_thresholds",
        "tax_entry_path",
      ),
      secondary_references: [
        reference(
          "Highly Qualified Professional service",
          SITE_URLS.serviceHighlyQualified,
          "Firm page for this narrower work route.",
        ),
      ],
    },
  ),
  "eu-blue-card": routePack("eu-blue-card", {
    agent_use:
      "Use for highly qualified non-EU professionals when EU mobility and qualification thresholds are central to the case.",
    key_rules: [
      "This branch depends on qualification and salary rules that must be confirmed at filing time.",
      "It is narrower than general employee sponsorship.",
      "It overlaps with highly qualified screening, so the case should compare both branches.",
    ],
    decision_cues: [
      "Highly qualified non-EU professional.",
      "Case values future EU mobility or a Blue Card-specific framework.",
    ],
    red_flags: [
      "Role or compensation does not actually meet the filing-time threshold.",
      "Agent treats Blue Card as interchangeable with every employee permit.",
    ],
    not_for: [
      "Passive-income cases.",
      "Applicants without a qualifying professional profile.",
    ],
    next_actions: [
      "Verify the filing-time qualification and salary rules.",
      "Compare the Blue Card branch against the highly qualified route before recommending one.",
    ],
    follow_up_tools: [
      "get_visa_options",
      "check_beckham_eligibility",
      "compare_tax_regimes",
    ],
    official_legal_sources: officialSources("ley14_hqp"),
    current_verification_flags: verificationFlags(
      "specialist_role_review",
      "salary_or_income_thresholds",
    ),
    secondary_references: [
      reference(
        "EU Blue Card service",
        SITE_URLS.serviceEuBlueCard,
        "Firm page for Blue Card screening.",
      ),
    ],
  }),
};

export const PROCESS_PACKS: Record<ProcessId, CanonicalPack> = {
  "nie-tie": {
    kind: "process",
    id: "nie-tie",
    uri: makeProcessResourceUri("nie-tie"),
    title: "NIE and TIE Process Workflow",
    summary:
      "Canonical pack for distinguishing NIE number handling from TIE card issuance and renewal procedures.",
    agent_use:
      "Read when the user asks procedural questions about appointments, forms, or document sequence.",
    key_rules: [
      "NIE and TIE are not interchangeable: one is the identification number, the other is the physical residence card.",
      "The appointment type must match the exact procedure.",
      "The legal basis for the request and the correct form matter more than generic appointment advice.",
    ],
    decision_cues: [
      "Client needs only an identification number.",
      "Client already has residence approval and now needs a physical card or fingerprints.",
    ],
    red_flags: [
      "Conflating NIE assignment with TIE issuance.",
      "Giving generic booking advice without checking the exact procedure type.",
    ],
    common_mistakes: [
      "Booking the wrong appointment category.",
      "Arriving without the form tied to the actual procedure.",
      "Treating payment proof as optional.",
    ],
    next_actions: [
      "Separate number-only questions from physical-card questions before answering.",
      "Use the stable workflow first and leave office-specific volatility out of the core answer.",
    ],
    follow_up_tools: ["explain_nie_process"],
    official_legal_sources: officialSources(
      "rd1155_tie",
      "forms_index",
      "forms_ex15",
      "forms_ex17",
      "tasa_790_012",
    ),
    current_verification_flags: verificationFlags(
      "office_level_practice",
      "current_fees",
    ),
    secondary_references: [
      reference(
        "NIE service",
        SITE_URLS.serviceNie,
        "Firm page for NIE assistance.",
      ),
      reference(
        "TIE service",
        SITE_URLS.serviceTie,
        "Firm page for TIE assistance.",
      ),
      reference(
        "NIE vs TIE dictionary entry",
        SITE_URLS.dictionaryNieVsTie,
        "Secondary public explanation of the distinction.",
      ),
    ],
  },
  "residency-clock": {
    kind: "process",
    id: "residency-clock",
    uri: makeProcessResourceUri("residency-clock"),
    title: "Residency Clock Review",
    summary:
      "Canonical pack for reasoning about permanent-residence and nationality timelines without flattening all statuses into the same clock.",
    agent_use:
      "Read before answering how many years are left for permanent residence or nationality.",
    key_rules: [
      "Elapsed time is not enough on its own; the legal status behind that time matters.",
      "Long-term residence and nationality are related but distinct tracks.",
      "Student stays, irregular periods, and continuity issues need explicit review rather than generic counting.",
    ],
    decision_cues: [
      "Client wants to know when five-year long-term residence may open.",
      "Client asks whether their nationality creates a faster nationality path.",
    ],
    red_flags: [
      "Counting irregular status as if it were straightforward residence time.",
      "Ignoring nationality-based differences in the nationality clock.",
    ],
    next_actions: [
      "Classify the current status before counting time.",
      "Split permanent-residence analysis from nationality analysis.",
    ],
    article_pinpoints: [
      "RD 1155/2024 arts. 182-185 govern third-country long-term residence under the general regime.",
      "RD 240/2007 art. 10 governs EU permanent residence after five years of continuous legal residence under the community regime.",
      "Código Civil art. 22 sets the ten-year, five-year, two-year, and one-year nationality timelines, and art. 22.3 requires legal, continuous, immediately-prior residence.",
    ],
    edge_case_notes: [
      "EU registration time and EU-family-card time should not be labeled as third-country long-term residence by default.",
      "Absences, student periods, irregular periods, and status changes can change whether the clock is clean enough for a filing-ready answer.",
      "The one-year nationality branch is unusable until the exact legal basis is identified.",
    ],
    follow_up_tools: ["get_residency_path", "route_to_legal_fournier_help"],
    official_legal_sources: officialSources(
      "rd1155_long_term",
      "rd240_permanent",
      "codigo_civil_art22",
    ),
    current_verification_flags: verificationFlags(
      "eu_permanent_vs_long_term",
      "continuity_and_absences",
      "nationality_continuity",
      "one_year_nationality_basis",
    ),
    secondary_references: [
      reference(
        "Residency Renewal service",
        SITE_URLS.serviceResidencyRenewal,
        "Firm page for maintaining the residence timeline.",
      ),
      reference(
        "Long-Term Residency service",
        SITE_URLS.serviceLongTermResidency,
        "Firm page for the five-year long-term route.",
      ),
      reference(
        "Nationality by Residence service",
        SITE_URLS.serviceNationality,
        "Firm page for the nationality track.",
      ),
    ],
  },
  "tax-regime-review": {
    kind: "process",
    id: "tax-regime-review",
    uri: makeProcessResourceUri("tax-regime-review"),
    title: "Tax Regime Review Workflow",
    summary:
      "Canonical pack for deciding when to screen Beckham first and when to stay in standard resident-tax analysis.",
    agent_use:
      "Read when a move question mixes immigration facts with tax-planning consequences.",
    key_rules: [
      "Beckham cannot be analyzed in isolation from the employment and relocation structure.",
      "Ordinary self-employment usually pushes the case back toward standard resident-tax analysis.",
      "Foreign income and foreign assets change the importance of tax-scope questions.",
    ],
    decision_cues: [
      "Client asks about Beckham at the same time as visa selection.",
      "Client has foreign-source income or foreign assets.",
    ],
    red_flags: [
      "Answering Beckham as if every new resident can elect it.",
      "Reducing the tax answer to headline rates only.",
    ],
    next_actions: [
      "Screen the employment route first, then compare tax regimes.",
      "Treat hardcoded annual thresholds as filing-time checks, not timeless doctrine.",
    ],
    follow_up_tools: ["check_beckham_eligibility", "compare_tax_regimes"],
    official_legal_sources: officialSources(
      "irpf_art93",
      "irpf_reg_art113",
      "irpf_reg_art115",
    ),
    current_verification_flags: verificationFlags("tax_entry_path", "tax_deadlines"),
    secondary_references: [
      reference(
        "Beckham Law service",
        SITE_URLS.serviceBeckham,
        "Firm page for the special regime.",
      ),
      reference(
        "Tax residency tool",
        SITE_URLS.taxResidencyTool,
        "Secondary public tool for resident-tax questions.",
      ),
    ],
  },
};

export const TRACK_PACKS: Record<TrackId, CanonicalPack> = {
  "permanent-residency-5-year": {
    kind: "track",
    id: "permanent-residency-5-year",
    uri: makeTrackResourceUri("permanent-residency-5-year"),
    title: "Permanent Residence Five-Year Track",
    summary:
      "Canonical pack for the ordinary long-term residence milestone after sustained lawful residence.",
    agent_use:
      "Read when the user asks whether they are close to permanent or long-term residence.",
    key_rules: [
      "Five years is the headline milestone, but continuity and status quality still matter.",
      "Renewal history and absences can matter as much as elapsed time.",
      "This is separate from nationality timing.",
    ],
    milestones: [
      "Build a clean residence history.",
      "Reach the five-year milestone in qualifying status.",
      "Review continuity and absences before filing.",
    ],
    red_flags: [
      "Assuming every year in Spain counts the same way.",
      "Ignoring residence-quality issues before the five-year mark is reached.",
    ],
    next_actions: [
      "Maintain valid status and document continuity.",
      "Review absences and residence transitions before filing long-term residence.",
    ],
    article_pinpoints: [
      "RD 1155/2024 arts. 182-185 cover the general five-year long-term residence branch.",
      "This pack is for the general regime and should not displace the EU permanent-residence track governed by RD 240/2007 art. 10.",
    ],
    edge_case_notes: [
      "A person who spent the five years under the EU regime may need an EU permanent-residence answer instead of this long-term residence answer.",
      "Status conversions and long absences can matter as much as the raw five-year count.",
    ],
    follow_up_tools: ["get_residency_path", "route_to_legal_fournier_help"],
    official_legal_sources: officialSources("rd1155_long_term"),
    current_verification_flags: verificationFlags("continuity_and_absences"),
    secondary_references: [
      reference(
        "Long-Term Residency service",
        SITE_URLS.serviceLongTermResidency,
        "Firm page for this track.",
      ),
    ],
  },
  "nationality-standard-10-year": {
    kind: "track",
    id: "nationality-standard-10-year",
    uri: makeTrackResourceUri("nationality-standard-10-year"),
    title: "Standard Ten-Year Nationality Track",
    summary:
      "Canonical pack for the ordinary nationality-by-residence timeline when no reduced track applies.",
    agent_use:
      "Read when nationality is being asked about and no reduced track has been identified.",
    key_rules: [
      "The ordinary nationality clock is longer than the long-term residence clock.",
      "Nationality and long-term residence should not be merged into the same answer.",
      "The nationality track depends on nationality class and special personal circumstances.",
    ],
    milestones: [
      "Identify that no reduced nationality track applies.",
      "Maintain continuous lawful residence toward the standard timeline.",
      "Prepare the nationality evidence and exam branch later in the process.",
    ],
    red_flags: [
      "Applying the ten-year clock to someone who may qualify for a shorter path.",
      "Assuming permanent residence automatically means nationality is open.",
    ],
    next_actions: [
      "Confirm whether the applicant belongs to a reduced nationality track before answering definitively.",
    ],
    article_pinpoints: [
      "Código Civil art. 22.1 sets the ordinary ten-year nationality-by-residence timeline.",
      "Código Civil art. 22.3 requires legal, continuous residence immediately before the application.",
    ],
    edge_case_notes: [
      "A clean year count is not enough if absences or status irregularities break continuity.",
      "Reduced tracks should be screened first so the agent does not overstate the ten-year path.",
    ],
    follow_up_tools: ["get_residency_path", "route_to_legal_fournier_help"],
    official_legal_sources: officialSources("codigo_civil_art22"),
    current_verification_flags: verificationFlags(
      "continuity_and_absences",
      "nationality_continuity",
    ),
    secondary_references: [
      reference(
        "Nationality by Residence service",
        SITE_URLS.serviceNationality,
        "Firm page for this track.",
      ),
    ],
  },
  "nationality-ibero-2-year": {
    kind: "track",
    id: "nationality-ibero-2-year",
    uri: makeTrackResourceUri("nationality-ibero-2-year"),
    title: "Ibero-American Two-Year Nationality Track",
    summary:
      "Canonical pack for the reduced nationality path commonly available to Ibero-American nationals and certain equivalent groups.",
    agent_use:
      "Read when the applicant may qualify for the fast-track nationality timeline.",
    key_rules: [
      "This is a nationality shortcut, not a replacement for long-term residence analysis.",
      "Nationality group classification must be correct before promising the shorter track.",
      "Continuous lawful residence still matters.",
    ],
    milestones: [
      "Confirm the nationality group.",
      "Reach the reduced residence milestone.",
      "Prepare the nationality-specific evidence pack.",
    ],
    red_flags: [
      "Using the two-year track without confirming the nationality group.",
      "Assuming every Latin America-related case automatically qualifies without checking nationality.",
    ],
    next_actions: [
      "Verify the nationality group before giving a firm timeline.",
    ],
    article_pinpoints: [
      "Código Civil art. 22.1 provides the reduced two-year track for nationals of origin from the listed groups.",
      "Código Civil art. 22.3 still requires legal, continuous residence immediately before the application.",
    ],
    edge_case_notes: [
      "The reduced group analysis depends on nationality of origin, not on a broad regional label alone.",
      "Absence and continuity problems can still block the apparently shorter track.",
    ],
    follow_up_tools: ["get_residency_path", "route_to_legal_fournier_help"],
    official_legal_sources: officialSources("codigo_civil_art22"),
    current_verification_flags: verificationFlags(
      "continuity_and_absences",
      "nationality_continuity",
    ),
    secondary_references: [
      reference(
        "Nationality by Residence service",
        SITE_URLS.serviceNationality,
        "Firm page for nationality-track review.",
      ),
    ],
  },
  "nationality-special-1-year": {
    kind: "track",
    id: "nationality-special-1-year",
    uri: makeTrackResourceUri("nationality-special-1-year"),
    title: "Special One-Year Nationality Track",
    summary:
      "Canonical pack for reduced one-year nationality paths tied to specific personal circumstances.",
    agent_use:
      "Read when the user may fall into a one-year nationality exception rather than the standard or two-year track.",
    key_rules: [
      "One-year nationality routes depend on the exact special basis.",
      "The special basis must be identified before giving a reliable timeline.",
      "These cases should not be generalized from nationality alone.",
    ],
    milestones: [
      "Identify the special basis.",
      "Confirm lawful residence and supporting evidence for that basis.",
    ],
    red_flags: [
      "Giving a one-year answer without identifying the legal basis.",
    ],
    next_actions: [
      "Confirm the special basis before finalizing the nationality path.",
    ],
    article_pinpoints: [
      "Código Civil art. 22.2 lists the one-year exception bases.",
      "Código Civil art. 22.3 still requires legal, continuous residence immediately before the application.",
    ],
    edge_case_notes: [
      "A one-year timeline is unusable until the exact basis is identified, such as birth in Spain, marriage to a Spanish citizen, or Spanish parent or grandparent origin.",
      "Continuity and immediately-prior residence are still part of the answer even when the headline period is only one year.",
    ],
    follow_up_tools: ["get_residency_path", "route_to_legal_fournier_help"],
    official_legal_sources: officialSources("codigo_civil_art22"),
    current_verification_flags: verificationFlags(
      "one_year_nationality_basis",
      "continuity_and_absences",
      "nationality_continuity",
    ),
    secondary_references: [
      reference(
        "Nationality by Residence service",
        SITE_URLS.serviceNationality,
        "Firm page for nationality exceptions.",
      ),
    ],
  },
  "nationality-refugee-5-year": {
    kind: "track",
    id: "nationality-refugee-5-year",
    uri: makeTrackResourceUri("nationality-refugee-5-year"),
    title: "Refugee Five-Year Nationality Track",
    summary:
      "Canonical pack for the nationality timeline tied to refugee status.",
    agent_use:
      "Read only when the case clearly involves the refugee nationality branch.",
    key_rules: [
      "This is a nationality-specific reduced track linked to refugee status.",
      "Do not generalize it to other residence categories.",
    ],
    milestones: [
      "Confirm refugee-status basis.",
      "Measure time against the nationality branch for that status.",
    ],
    red_flags: [
      "Using the refugee timeline in a case without the qualifying status.",
    ],
    next_actions: [
      "Confirm the precise status basis before promising the reduced path.",
    ],
    article_pinpoints: [
      "Código Civil art. 22.1 provides the reduced five-year nationality track for refugees.",
      "Código Civil art. 22.3 still requires legal, continuous residence immediately before the application.",
    ],
    edge_case_notes: [
      "The reduced five-year nationality route does not replace the need to confirm the underlying status basis and residence continuity.",
    ],
    follow_up_tools: ["get_residency_path", "route_to_legal_fournier_help"],
    official_legal_sources: officialSources("codigo_civil_art22"),
    current_verification_flags: verificationFlags(
      "continuity_and_absences",
      "nationality_continuity",
    ),
    secondary_references: [
      reference(
        "Nationality by Residence service",
        SITE_URLS.serviceNationality,
        "Firm page for nationality-track review.",
      ),
    ],
  },
};

export const TOPIC_PACKS: Record<TopicId, CanonicalPack> = {
  "route-selection": {
    kind: "topic",
    id: "route-selection",
    uri: makeTopicResourceUri("route-selection"),
    title: "Route Selection Heuristics",
    summary:
      "Canonical pack for deciding which Spain immigration branch to screen before discussing detailed documents or tax consequences.",
    agent_use:
      "Read first in ambiguous move-to-Spain cases before selecting a route-specific resource pack.",
    key_rules: [
      "Nationality classification comes first: EU, EEA, or Swiss versus non-EU.",
      "Spanish-local employment, foreign-remote work, passive-income residence, and operating-business projects are different branches.",
      "The end of the Golden Visa means passive investment is no longer a residence route by itself.",
    ],
    decision_cues: [
      "Foreign employer or foreign clients point toward digital nomad logic.",
      "Spanish employer points toward employee, highly qualified, or Blue Card logic.",
      "Passive means with no work point toward non-lucrative logic.",
      "Operating business projects require self-employment versus entrepreneur screening.",
    ],
    red_flags: [
      "Trying to answer Beckham before the employment structure is known.",
      "Treating passive investors as if the Golden Visa still existed.",
      "Assuming all freelancers fit the same route.",
    ],
    next_actions: [
      "Call get_visa_options first, then read the related resource URIs before answering in prose.",
    ],
    follow_up_tools: [
      "get_visa_options",
      "check_beckham_eligibility",
      "compare_tax_regimes",
    ],
    official_legal_sources: officialSources(
      "rd240_residence",
      "rd1155_non_lucrative",
      "rd1155_employee",
      "rd1155_self_employed",
      "ley14_entrepreneur",
      "ley14_telework",
    ),
    current_verification_flags: verificationFlags(
      "eu_family_facts",
      "consular_thresholds",
      "salary_or_income_thresholds",
      "telework_document_chain",
      "entrepreneur_approval",
    ),
    secondary_references: [
      reference(
        "Move to Spain guide",
        SITE_URLS.moveToSpainGuide,
        "Firm relocation guide.",
      ),
      reference(
        "Legal tools hub",
        SITE_URLS.tools,
        "Secondary public landing page for tools.",
      ),
    ],
  },
  "beckham-regime": {
    kind: "topic",
    id: "beckham-regime",
    uri: makeTopicResourceUri("beckham-regime"),
    title: "Beckham Regime Screening Pack",
    summary:
      "Canonical pack for deciding whether the facts support a Beckham analysis or only a standard resident-tax analysis.",
    agent_use:
      "Read before giving any direct answer on Beckham eligibility or value.",
    key_rules: [
      "A sufficient non-residency gap is a threshold question.",
      "The employment or relocation structure must fit one of the recognized entry paths.",
      "Director cases need entity-type and related-party analysis, so a flat ownership shortcut is not enough.",
      "Ordinary self-employment does not equal a qualifying entrepreneur path without current approval logic.",
    ],
    decision_cues: [
      "Spanish employment move.",
      "Foreign-remote work under a qualifying nomad structure.",
      "Highly qualified or qualifying director profile.",
    ],
    red_flags: [
      "Insufficient non-residency gap.",
      "Ordinary self-employment with no qualifying entrepreneur angle.",
      "Director control above the cleaner ownership band.",
    ],
    next_actions: [
      "Run check_beckham_eligibility before promising any tax result.",
      "If the entry path is unclear, stay in review-needed territory rather than forcing a yes/no answer.",
    ],
    follow_up_tools: ["check_beckham_eligibility", "compare_tax_regimes"],
    official_legal_sources: officialSources(
      "irpf_art93",
      "irpf_reg_art113",
      "irpf_reg_art115",
      "ley14_entrepreneur",
      "ley14_hqp",
      "ley14_telework",
    ),
    current_verification_flags: verificationFlags(
      "director_related_entity",
      "tax_entry_path",
      "tax_deadlines",
      "entrepreneur_approval",
    ),
    secondary_references: [
      reference(
        "Beckham Law service",
        SITE_URLS.serviceBeckham,
        "Firm page for this regime.",
      ),
      reference(
        "Beckham dictionary entry",
        SITE_URLS.dictionaryBeckham,
        "Secondary public explanation of the regime.",
      ),
    ],
  },
  "tax-regimes": {
    kind: "topic",
    id: "tax-regimes",
    uri: makeTopicResourceUri("tax-regimes"),
    title: "Spanish Tax Regime Comparison Pack",
    summary:
      "Canonical pack for comparing Beckham and ordinary resident-tax logic without flattening the answer into headline percentages.",
    agent_use:
      "Read when the user asks whether Beckham or standard resident taxation is better.",
    key_rules: [
      "The real comparison is scope, entry path, and fit to the income profile, not just headline rate talk.",
      "Foreign income and foreign assets make scope-of-taxation analysis more important.",
      "Standard resident taxation stays the baseline when Beckham does not cleanly fit.",
    ],
    decision_cues: [
      "Client has foreign-source income.",
      "Client values predictable treatment.",
      "Client has a work structure that may open Beckham screening.",
    ],
    red_flags: [
      "Reducing the answer to rate tables.",
      "Ignoring whether Beckham is even available before comparing benefits.",
    ],
    next_actions: [
      "Run compare_tax_regimes after route and employment structure are reasonably clear.",
    ],
    follow_up_tools: ["check_beckham_eligibility", "compare_tax_regimes"],
    official_legal_sources: officialSources(
      "irpf_art93",
      "irpf_reg_art113",
      "irpf_reg_art115",
    ),
    current_verification_flags: verificationFlags("tax_entry_path", "tax_deadlines"),
    secondary_references: [
      reference(
        "Tax residency tool",
        SITE_URLS.taxResidencyTool,
        "Secondary public tool for residency framing.",
      ),
      reference(
        "Beckham Law service",
        SITE_URLS.serviceBeckham,
        "Firm page for the special regime.",
      ),
    ],
  },
  "eu-family-route-check": {
    kind: "topic",
    id: "eu-family-route-check",
    uri: makeTopicResourceUri("eu-family-route-check"),
    title: "EU Family Route Check",
    summary:
      "Canonical pack for flagging that an EU family-member route may change the primary immigration analysis.",
    agent_use:
      "Read when an EU family link appears in a non-EU move-to-Spain case.",
    key_rules: [
      "An EU family link can change the route analysis materially.",
      "This branch should be checked before locking in a standard non-EU route recommendation.",
    ],
    decision_cues: [
      "Non-EU applicant mentions an EU spouse, partner, or family basis.",
    ],
    red_flags: [
      "Ignoring the EU family link and forcing the case into a generic non-EU route.",
    ],
    next_actions: [
      "Treat the family link as a branch that requires separate review before final route advice.",
    ],
    article_pinpoints: [
      "RD 240/2007 art. 8 governs the family-member card for non-EU relatives accompanying or joining a qualifying EU citizen.",
      "RD 240/2007 art. 9 matters if the family relationship changed and the user wants to know whether the right survives personally.",
      "RD 240/2007 arts. 10, 11, and 14 matter later for permanence, document validity, and absence limits.",
    ],
    edge_case_notes: [
      "Some family cases belong under the EU regime while others belong under general-regime family reunification, so the family theory has to be checked before route selection is finalized.",
      "A family card already held by the client does not automatically mean the right survives after divorce, separation, or departure of the EU citizen.",
    ],
    follow_up_tools: ["get_visa_options", "route_to_legal_fournier_help"],
    official_legal_sources: officialSources(
      "rd240_family_card",
      "rd240_family_retention",
      "rd240_permanent",
      "rd240_document_validity",
    ),
    current_verification_flags: verificationFlags(
      "eu_family_facts",
      "eu_family_right_retention",
      "continuity_and_absences",
    ),
    secondary_references: [
      reference(
        "Move to Spain guide",
        SITE_URLS.moveToSpainGuide,
        "General firm relocation guide while the family branch is clarified.",
      ),
    ],
  },
  "nationality-continuity": {
    kind: "topic",
    id: "nationality-continuity",
    uri: makeTopicResourceUri("nationality-continuity"),
    title: "Nationality Continuity Review",
    summary:
      "Canonical pack for checking whether nationality timing is clean enough once continuity, absences, and immediately-prior legal residence are taken seriously.",
    agent_use:
      "Read when a nationality answer is at risk of being overstated from elapsed years alone.",
    key_rules: [
      "Nationality by residence depends on legal and continuous residence immediately before the application, not only on a headline year count.",
      "Reduced nationality tracks still need continuity review.",
      "Absences and status gaps can force the answer back into review-needed territory.",
    ],
    decision_cues: [
      "The user asks whether they already qualify for nationality based mostly on time spent in Spain.",
      "The case includes long absences, changes of status, or uncertainty about continuous legal residence.",
    ],
    red_flags: [
      "Treating a simple calendar count as if it automatically proves nationality eligibility.",
      "Ignoring immediately-prior legal residence when a reduced track is claimed.",
    ],
    next_actions: [
      "Use get_residency_path with the best available track and continuity facts before giving a filing-ready nationality answer.",
    ],
    article_pinpoints: [
      "Código Civil art. 22.1 and 22.2 set the nationality timelines.",
      "Código Civil art. 22.3 adds the continuity requirement of legal, continuous residence immediately before the application.",
    ],
    edge_case_notes: [
      "A user can hit the headline year count and still need review because of absences or status breaks.",
      "The one-year track is especially easy to overstate unless the exact basis and continuity are both confirmed.",
    ],
    follow_up_tools: ["get_residency_path", "route_to_legal_fournier_help"],
    official_legal_sources: officialSources("codigo_civil_art22"),
    current_verification_flags: verificationFlags(
      "continuity_and_absences",
      "nationality_continuity",
      "one_year_nationality_basis",
    ),
    secondary_references: [
      reference(
        "Nationality by Residence service",
        SITE_URLS.serviceNationality,
        "Firm page for cases that need continuity-sensitive nationality review.",
      ),
    ],
  },
  "legal-fournier-handoff": {
    kind: "topic",
    id: "legal-fournier-handoff",
    uri: makeTopicResourceUri("legal-fournier-handoff"),
    title: "Legal Fournier Handoff Guide",
    summary:
      "Canonical pack for deciding when an agent should escalate a Spain legal matter to Legal Fournier and what the handoff should contain.",
    agent_use:
      "Read when the answer has moved from evergreen screening into deadline-sensitive, fact-conflicted, or filing-grade legal help.",
    key_rules: [
      "Escalate when the answer turns on conflicting routes, continuity problems, EU-family retention, director Beckham issues, or office-specific procedure.",
      "A good handoff includes the route theory, blockers, timeline urgency, and the documents or facts that are still missing.",
      "The handoff should point to the most relevant Legal Fournier service line rather than sending a generic contact link without context.",
    ],
    decision_cues: [
      "The MCP result carries multiple high-review warnings.",
      "The case includes a live deadline, already-filed application, rejection, or complex status change.",
    ],
    red_flags: [
      "Sending the user to a generic help page without summarizing the blockers and facts.",
      "Treating a filing-grade issue as if the evergreen MCP output is enough on its own.",
    ],
    next_actions: [
      "Use route_to_legal_fournier_help to generate a structured human-handoff recommendation.",
      "If the user wants direct legal advice now, prefer the consultation booking path or a structured contact request instead of a generic link drop.",
    ],
    edge_case_notes: [
      "Agents should escalate earlier when a user already has a deadline, denial, or document mismatch, even if the underlying route seems obvious.",
      "A short, structured handoff is more useful to the firm than a raw transcript dump.",
    ],
    follow_up_tools: ["route_to_legal_fournier_help"],
    official_legal_sources: [],
    current_verification_flags: [],
    agent_notices: AGENT_LEGAL_NOTICE_LINES,
    secondary_references: [
      reference(
        "Contact Legal Fournier",
        SITE_URLS.contact,
        "Primary contact page for human legal help.",
      ),
      reference(
        "Legal Notice",
        SITE_URLS.legalNotice,
        "Website legal notice covering informational use and no automatic lawyer-client relationship.",
      ),
      reference(
        "Legal tools hub",
        SITE_URLS.tools,
        "Useful if the user still needs a self-serve screening step before contacting the firm.",
      ),
    ],
  },
};

const ALL_PACKS: CanonicalPack[] = [
  ...Object.values(ROUTE_PACKS),
  ...Object.values(PROCESS_PACKS),
  ...Object.values(TRACK_PACKS),
  ...Object.values(TOPIC_PACKS),
];

const PACKS_BY_URI = new Map(ALL_PACKS.map((pack) => [pack.uri, pack]));

function renderListSection(
  title: string,
  items?: string[],
  formatter: (item: string) => string = (item) => `- ${item}`,
): string[] {
  if (!items || items.length === 0) {
    return [];
  }

  return [`## ${title}`, ...items.map(formatter), ""];
}

function renderReferenceSection(references: SecondaryReference[]): string[] {
  if (references.length === 0) {
    return [];
  }

  return [
    "## Secondary References",
    ...references.map((ref) => `- [${ref.label}](${ref.url}): ${ref.reason}`),
    "",
  ];
}

function renderOfficialSourceSection(sources: OfficialLegalSource[]): string[] {
  if (sources.length === 0) {
    return [];
  }

  return [
    "## Official Legal Sources",
    ...sources.map(
      (source) =>
        `- [${source.title}](${source.url}) (${source.authority}): ${source.relevance}`,
    ),
    "",
  ];
}

function renderVerificationSection(flags: CurrentVerificationFlag[]): string[] {
  if (flags.length === 0) {
    return [];
  }

  return [
    "## Current Verification Needed",
    ...flags.map(
      (flag) =>
        `- ${flag.area}: ${flag.reason} Check when: ${flag.check_when} Official hint: ${flag.official_source_hint}`,
    ),
    "",
  ];
}

function renderArticlePinpointSection(pinpoints?: string[]): string[] {
  if (!pinpoints || pinpoints.length === 0) {
    return [];
  }

  return ["## Article Pinpoints", ...pinpoints.map((item) => `- ${item}`), ""];
}

function renderEdgeCaseSection(notes?: string[]): string[] {
  if (!notes || notes.length === 0) {
    return [];
  }

  return ["## Edge Cases", ...notes.map((item) => `- ${item}`), ""];
}

function renderAgentNoticeSection(notices?: string[]): string[] {
  if (!notices || notices.length === 0) {
    return [];
  }

  return ["## Legal Notice For Agents", ...notices.map((item) => `- ${item}`), ""];
}

export function renderCanonicalPackMarkdown(pack: CanonicalPack): string {
  const lines: string[] = [
    `# ${pack.title}`,
    "",
    `**Kind:** ${pack.kind}`,
    `**Resource URI:** \`${pack.uri}\``,
    "",
    pack.summary,
    "",
    "## Agent Use",
    pack.agent_use,
    "",
    ...renderListSection("Core Rules", pack.key_rules),
    ...renderListSection("Decision Cues", pack.decision_cues),
    ...renderListSection("Stable Requirements", pack.stable_requirements),
    ...renderListSection("Recommended For", pack.recommended_for),
    ...renderListSection("Not For", pack.not_for),
    ...renderListSection("Milestones", pack.milestones),
    ...renderListSection("Common Mistakes", pack.common_mistakes),
    ...renderListSection("Red Flags", pack.red_flags),
    ...renderListSection("Next Actions", pack.next_actions),
    ...renderArticlePinpointSection(pack.article_pinpoints),
    ...renderEdgeCaseSection(pack.edge_case_notes),
    ...renderAgentNoticeSection(pack.agent_notices),
    ...renderOfficialSourceSection(pack.official_legal_sources),
    ...renderVerificationSection(pack.current_verification_flags),
    ...renderListSection(
      "Related MCP Tools",
      pack.follow_up_tools,
      (tool) => `- \`${tool}\``,
    ),
    ...renderReferenceSection(pack.secondary_references),
  ];

  return lines.join("\n").trim();
}

function renderCatalogSection(title: string, packs: CanonicalPack[]): string[] {
  return [
    `## ${title}`,
    ...packs.map((pack) => `- \`${pack.uri}\` - ${pack.title}: ${pack.summary}`),
    "",
  ];
}

export function renderCatalogMarkdown(): string {
  const lines = [
    "# Spain Legal Catalog",
    "",
    "Use this catalog when an agent needs to discover the canonical Spain Legal resources before choosing a tool or a topic-specific pack.",
    "",
    "## Suggested Starting Points",
    `- \`${makeTopicResourceUri("route-selection")}\` - first-read heuristics for route selection.`,
    `- \`${makeProcessResourceUri("residency-clock")}\` - first-read workflow for timeline questions.`,
    `- \`${makeTopicResourceUri("beckham-regime")}\` - first-read pack for Beckham screening.`,
    `- \`${makeProcessResourceUri("nie-tie")}\` - first-read pack for procedural NIE/TIE questions.`,
    "",
    "## Resource Templates",
    `- \`${ROUTE_TEMPLATE_URI}\``,
    `- \`${PROCESS_TEMPLATE_URI}\``,
    `- \`${TRACK_TEMPLATE_URI}\``,
    `- \`${TOPIC_TEMPLATE_URI}\``,
    "",
    ...renderCatalogSection("Route Packs", Object.values(ROUTE_PACKS)),
    ...renderCatalogSection("Process Packs", Object.values(PROCESS_PACKS)),
    ...renderCatalogSection("Track Packs", Object.values(TRACK_PACKS)),
    ...renderCatalogSection("Topic Packs", Object.values(TOPIC_PACKS)),
    "## Link Policy",
    "- Treat Legal Fournier URLs as secondary references only.",
    "- Prefer resource content, tool structured output, and prompt workflows before opening a website.",
  ];

  return lines.join("\n").trim();
}

export function getPackByUri(uri: string): CanonicalPack | undefined {
  return PACKS_BY_URI.get(uri);
}

export function getResourceText(uri: string): string | undefined {
  if (uri === CATALOG_URI) {
    return renderCatalogMarkdown();
  }

  const pack = getPackByUri(uri);
  return pack ? renderCanonicalPackMarkdown(pack) : undefined;
}

export function listPackResources(kind: PackCollectionKind) {
  const packs =
    kind === "routes"
      ? Object.values(ROUTE_PACKS)
      : kind === "processes"
        ? Object.values(PROCESS_PACKS)
        : kind === "tracks"
          ? Object.values(TRACK_PACKS)
          : Object.values(TOPIC_PACKS);

  return packs.map((pack) => ({
    uri: pack.uri,
    name: `${pack.kind}-${pack.id}`,
    title: pack.title,
    description: pack.summary,
    mimeType: "text/markdown",
    annotations: getAssistantAnnotations(1),
  }));
}

export function listPackIds(kind: PackCollectionKind): string[] {
  const packs =
    kind === "routes"
      ? Object.keys(ROUTE_PACKS)
      : kind === "processes"
        ? Object.keys(PROCESS_PACKS)
        : kind === "tracks"
          ? Object.keys(TRACK_PACKS)
          : Object.keys(TOPIC_PACKS);

  return packs.sort();
}

export function completePackId(
  kind: PackCollectionKind,
  value: string,
): string[] {
  const normalized = value.toLowerCase();
  return listPackIds(kind).filter((id) => id.startsWith(normalized));
}
