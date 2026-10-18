import {type DigitalNomadIncomeInput, type PropertyInput, type NumericScreen, screenDigitalNomadIncome, screenProperty, validateCalculatorInputs} from "./legal-calculators.js";
import {
  makeProcessResourceUri,
  makeRouteResourceUri,
  makeTopicResourceUri,
} from "./canonical-packs.js";
import { AGENT_LEGAL_NOTICE_LINES } from "./notices.js";
import {
  getConsultationBookingUrl,
  SITE_URLS,
  withMcpAttribution,
} from "./site.js";

export const LEGAL_FOURNIER_TOOL_CATALOG_URI =
  "legalfournier://spain-legal/tools/catalog";

export type LegalFournierToolArea =
  | "immigration"
  | "tax"
  | "property"
  | "business"
  | "wealth"
  | "appointments"
  | "remote_work";

export type LegalFournierToolLanguage = "en" | "es" | "fr";
export type LegalFournierPreferredLanguage =
  | LegalFournierToolLanguage
  | "unknown";

export interface LegalFournierToolLanguageLink extends Record<string, unknown> {
  language: LegalFournierToolLanguage;
  url: string;
  title: string;
}

export interface LegalFournierToolCatalogItem extends Record<string, unknown> {
  id: string;
  title: string;
  category: LegalFournierToolArea;
  url: string;
  description: string;
  use_when: string[];
  not_for: string[];
  keywords: string[];
  complexity_triggers: string[];
  related_mcp_tools: string[];
  related_resource_uris: string[];
  agent_workflow: string[];
  handoff_trigger: string;
  language_links: LegalFournierToolLanguageLink[];
}

export interface FindLegalFournierToolArgs {
  query?: string;
  area?: LegalFournierToolArea | "unknown";
  preferred_language?: LegalFournierPreferredLanguage;
  complexity_signals?: string[];
  include_all_tools?: boolean;
  max_results?: number;
}

export interface MatchedLegalFournierTool extends LegalFournierToolCatalogItem {
  fit: "strong" | "possible";
  score: number;
  selected_url: string;
  selected_language: LegalFournierToolLanguage;
  why: string[];
}

export interface FindLegalFournierToolResult extends Record<string, unknown> {
  query_summary: string;
  catalog_size: number;
  matched_tools: MatchedLegalFournierTool[];
  recommended_mcp_sequence: string[];
  next_actions: string[];
  handoff_url: string;
  catalog_resource_uri: string;
  agent_use_rules: string[];
  legal_notice: string;
}

export interface LegalFournierToolNumberFact extends Record<string, unknown> {
  key: string;
  value: number;
  currency?: "EUR" | "USD" | "other";
  unit?: string;
}

export type LegalFournierDirectOutcome =
  | "possible_fit"
  | "needs_more_facts"
  | "needs_human_review"
  | "does_not_meet_threshold";

export interface RunLegalFournierToolArgs {
  digital_nomad_income?: DigitalNomadIncomeInput;
  property?: PropertyInput;
  tool_id: string;
  user_goal?: string;
  facts?: string[];
  numbers?: LegalFournierToolNumberFact[];
  preferred_language?: LegalFournierPreferredLanguage;
  complexity_signals?: string[];
}

export interface RunLegalFournierToolResult extends Record<string, unknown> {
  tool_id: string;
  title: string;
  outcome: LegalFournierDirectOutcome;
  summary: string;
  selected_url: string;
  selected_language: LegalFournierToolLanguage;
  public_tool_url: string;
  missing_facts: string[];
  complexity_flags: string[];
  direct_screening_notes: string[];
  numeric_notes: string[];
  numerical_status: NumericScreen["status"];
  numeric_result?: Record<string, unknown>;
  handoff_recommended: boolean;
  handoff_reason: string;
  handoff_url: string;
  related_mcp_tools: string[];
  related_resource_uris: string[];
  next_actions: string[];
  update_policy: string[];
  legal_notice: string;
}

const TOOL_SCREENERS_URI = makeTopicResourceUri("tool-screeners");
const HANDOFF_URI = makeTopicResourceUri("legal-fournier-handoff");

const EN_ES_FR_REMOTE_WORK: LegalFournierToolLanguageLink[] = [
  {
    language: "en",
    url: SITE_URLS.remoteWorkTool,
    title: "Can I Work Remotely from Spain?",
  },
  {
    language: "es",
    url: "https://legalfournier.com/es/herramientas/puedo-trabajar-remotamente-desde-espana/",
    title: "Remote work from Spain - Spanish",
  },
  {
    language: "fr",
    url: "https://legalfournier.com/fr/outils/travailler-a-distance-depuis-lespagne/",
    title: "Remote work from Spain - French",
  },
];

const EN_ES_FR_DNV: LegalFournierToolLanguageLink[] = [
  {
    language: "en",
    url: SITE_URLS.digitalNomadTool,
    title: "Digital Nomad Visa Eligibility",
  },
  {
    language: "es",
    url: "https://legalfournier.com/es/herramientas/guia-de-elegibilidad-visado-nomada-digital/",
    title: "Digital Nomad Visa Eligibility - Spanish",
  },
  {
    language: "fr",
    url: "https://legalfournier.com/fr/outils/guide-visa-nomade-numerique/",
    title: "Digital Nomad Visa Eligibility - French",
  },
];

const EN_ES_FR_TAX_RESIDENCY: LegalFournierToolLanguageLink[] = [
  {
    language: "en",
    url: SITE_URLS.taxResidencyTool,
    title: "Spain Tax Residency Explained",
  },
  {
    language: "es",
    url: "https://legalfournier.com/es/herramientas/residencia-fiscal-en-espana-guia-completa/",
    title: "Spain Tax Residency - Spanish",
  },
  {
    language: "fr",
    url: "https://legalfournier.com/fr/outils/residence-fiscale-espagnole-guide-complet/",
    title: "Spain Tax Residency - French",
  },
];

const EN_ES_FR_APPOINTMENTS: LegalFournierToolLanguageLink[] = [
  {
    language: "en",
    url: SITE_URLS.immigrationAppointmentsTool,
    title: "Immigration Appointments",
  },
  {
    language: "es",
    url: "https://legalfournier.com/es/herramientas/citas-inmigracion/",
    title: "Immigration Appointments - Spanish",
  },
  {
    language: "fr",
    url: "https://legalfournier.com/fr/outils/rendez-vous-immigration/",
    title: "Immigration Appointments - French",
  },
];

function englishOnly(url: string, title: string): LegalFournierToolLanguageLink[] {
  return [{ language: "en", url, title }];
}

export const LEGAL_FOURNIER_TOOLS: LegalFournierToolCatalogItem[] = [
  {
    id: "best-visa-spain",
    title: "Find Your Best Visa for Spain",
    category: "immigration",
    url: SITE_URLS.visaEligibilityTool,
    description:
      "Public route finder for choosing between Spain residence and visa routes without presenting the ended Golden Visa as available.",
    use_when: [
      "The user has not chosen a route yet.",
      "The case mixes work, passive income, family, founder, or long-stay facts.",
      "An agent needs a Legal Fournier URL for route-screening analytics.",
    ],
    not_for: [
      "Filing-ready route advice with deadlines or a refusal history.",
      "Current consular threshold verification without checking official sources.",
    ],
    keywords: [
      "best visa",
      "visa route",
      "move to spain",
      "non lucrative",
      "digital nomad",
      "entrepreneur visa",
      "self employed",
      "golden visa ended",
      "residence route",
    ],
    complexity_triggers: [
      "mixed income",
      "family members",
      "prior refusal",
      "deadline",
      "investor alternative",
      "already in Spain",
    ],
    related_mcp_tools: ["get_visa_options", "route_to_legal_fournier_help"],
    related_resource_uris: [
      TOOL_SCREENERS_URI,
      makeTopicResourceUri("route-selection"),
      HANDOFF_URI,
    ],
    agent_workflow: [
      "Call get_visa_options when enough facts are available.",
      "Use this public tool when the user wants an interactive route screen.",
      "Escalate with route_to_legal_fournier_help if multiple routes remain plausible.",
    ],
    handoff_trigger:
      "Escalate when the result depends on a live deadline, a previous filing, family status, or conflicting route facts.",
    language_links: englishOnly(
      SITE_URLS.visaEligibilityTool,
      "Find Your Best Visa for Spain",
    ),
  },
  {
    id: "digital-nomad-visa-eligibility",
    title: "Digital Nomad Visa Eligibility",
    category: "immigration",
    url: SITE_URLS.digitalNomadTool,
    description:
      "Public Digital Nomad Visa eligibility screener for remote employees, contractors, and families moving to Spain.",
    use_when: [
      "The user works remotely for non-Spanish employers or clients.",
      "Income source, contract age, social security, or family dependants need pre-screening.",
      "The user wants a plain-language DNV page in English, Spanish, or French.",
    ],
    not_for: [
      "Spanish-client-heavy freelancer cases without human review.",
      "Current income thresholds without a live official-source check.",
    ],
    keywords: [
      "digital nomad visa",
      "remote employee",
      "remote contractor",
      "foreign employer",
      "family dependants",
      "telework visa",
      "dnv",
      "income threshold",
    ],
    complexity_triggers: [
      "Spanish clients",
      "self employed",
      "social security certificate",
      "new company",
      "family application",
      "lower income",
    ],
    related_mcp_tools: [
      "get_visa_options",
      "check_beckham_eligibility",
      "route_to_legal_fournier_help",
    ],
    related_resource_uris: [
      TOOL_SCREENERS_URI,
      makeRouteResourceUri("digital-nomad-visa"),
      makeTopicResourceUri("beckham-regime"),
      HANDOFF_URI,
    ],
    agent_workflow: [
      "Use get_visa_options to confirm DNV is the right branch.",
      "Use check_beckham_eligibility if the move also raises tax-regime planning.",
      "Send the user to the language-matched public DNV screener for self-serve intake.",
    ],
    handoff_trigger:
      "Escalate when income is below threshold, the client mix is Spanish-heavy, or family members change the calculation.",
    language_links: EN_ES_FR_DNV,
  },
  {
    id: "digital-nomad-visa-beckham-law",
    title: "Spain Digital Nomad Visa Tax and Income Calculator",
    category: "tax",
    url: SITE_URLS.digitalNomadTaxTool,
    description:
      "Combined Digital Nomad Visa, income, and Beckham Law fit check for high-income remote workers and founders.",
    use_when: [
      "The user is comparing visa fit and tax-regime fit in one flow.",
      "The facts include remote work, high income, prior Spain residence, or director ownership.",
      "An agent needs to preserve complexity signals before booking.",
    ],
    not_for: [
      "Exact tax filing or annual rate calculations.",
      "Director or ownership edge cases without human review.",
    ],
    keywords: [
      "digital nomad tax",
      "beckham law",
      "income calculator",
      "remote worker tax",
      "high income",
      "director",
      "ownership",
      "prior Spanish residence",
    ],
    complexity_triggers: [
      "director",
      "ownership over 25",
      "prior tax resident",
      "Spanish clients",
      "mixed income",
      "foreign assets",
    ],
    related_mcp_tools: [
      "get_visa_options",
      "check_beckham_eligibility",
      "compare_tax_regimes",
      "route_to_legal_fournier_help",
    ],
    related_resource_uris: [
      TOOL_SCREENERS_URI,
      makeRouteResourceUri("digital-nomad-visa"),
      makeTopicResourceUri("beckham-regime"),
      makeProcessResourceUri("tax-regime-review"),
      HANDOFF_URI,
    ],
    agent_workflow: [
      "Call check_beckham_eligibility and compare_tax_regimes before giving tax-regime direction.",
      "Use this public calculator when visa and tax fit should be screened together.",
      "Preserve the calculator summary in the consultation handoff.",
    ],
    handoff_trigger:
      "Escalate when the user has director ownership, prior Spanish tax residence, foreign assets, or income below DNV thresholds.",
    language_links: englishOnly(
      SITE_URLS.digitalNomadTaxTool,
      "Spain Digital Nomad Visa Tax and Income Calculator",
    ),
  },
  {
    id: "beckham-law-savings",
    title: "Beckham Law Spain Calculator",
    category: "tax",
    url: SITE_URLS.beckhamCalculator,
    description:
      "High-income Beckham Law savings and eligibility screener for executives, employees, remote workers, and founders.",
    use_when: [
      "The user asks whether Beckham Law could reduce Spanish tax exposure.",
      "The case involves a new Spanish work move, remote worker path, or high compensation.",
      "The agent needs a public calculator before a tax consultation.",
    ],
    not_for: [
      "Final tax savings, filing eligibility, or model-specific tax advice.",
      "Cases with prior Spanish residence or ownership issues without review.",
    ],
    keywords: [
      "beckham law",
      "tax savings",
      "high income",
      "executive",
      "foreign worker",
      "impatriate tax",
      "director",
      "24 percent",
    ],
    complexity_triggers: [
      "prior Spanish tax residence",
      "director ownership",
      "foreign assets",
      "stock options",
      "self employed",
      "filing deadline",
    ],
    related_mcp_tools: [
      "check_beckham_eligibility",
      "compare_tax_regimes",
      "route_to_legal_fournier_help",
    ],
    related_resource_uris: [
      TOOL_SCREENERS_URI,
      makeTopicResourceUri("beckham-regime"),
      makeProcessResourceUri("tax-regime-review"),
      HANDOFF_URI,
    ],
    agent_workflow: [
      "Call check_beckham_eligibility first.",
      "Use compare_tax_regimes when the user also asks about standard resident taxation.",
      "Use the public calculator for a user-facing estimate and then escalate edge cases.",
    ],
    handoff_trigger:
      "Escalate when eligibility turns on prior residence, director ownership, filing timing, or non-salary compensation.",
    language_links: englishOnly(
      SITE_URLS.beckhamCalculator,
      "Beckham Law Spain Calculator",
    ),
  },
  {
    id: "tax-residency",
    title: "Spain Tax Residency Explained",
    category: "tax",
    url: SITE_URLS.taxResidencyTool,
    description:
      "Tax-residency screener covering day count, family center, economic interests, and foreign-asset warning signs.",
    use_when: [
      "The user asks whether they become tax resident in Spain.",
      "The case includes day-count, family, economic-center, or asset-reporting facts.",
      "The user needs a language-matched explanation in English, Spanish, or French.",
    ],
    not_for: [
      "Formal tax-residence certificate analysis.",
      "Treaty tie-breaker conclusions without document review.",
    ],
    keywords: [
      "tax residency",
      "183 days",
      "family in Spain",
      "economic interests",
      "foreign assets",
      "model 720",
      "tax resident",
      "tie breaker",
    ],
    complexity_triggers: [
      "dual residence",
      "treaty",
      "family center",
      "foreign assets",
      "company management",
      "large portfolio",
    ],
    related_mcp_tools: ["compare_tax_regimes", "route_to_legal_fournier_help"],
    related_resource_uris: [
      TOOL_SCREENERS_URI,
      makeTopicResourceUri("tax-regimes"),
      makeProcessResourceUri("tax-regime-review"),
      HANDOFF_URI,
    ],
    agent_workflow: [
      "Use compare_tax_regimes for conceptual regime comparison.",
      "Send the user to this public screener for day-count and center-of-interest intake.",
      "Escalate when treaty or foreign-asset facts matter.",
    ],
    handoff_trigger:
      "Escalate when there is possible dual tax residence, treaty tie-breaker analysis, foreign assets, or company management from Spain.",
    language_links: EN_ES_FR_TAX_RESIDENCY,
  },
  {
    id: "work-remotely-spain",
    title: "Can I Work Remotely from Spain?",
    category: "remote_work",
    url: SITE_URLS.remoteWorkTool,
    description:
      "Remote-work screener for immigration route, employer location, Spanish-client exposure, and tax-risk triage.",
    use_when: [
      "The user asks if remote work from Spain is allowed.",
      "The case is early-stage and may fit DNV, EU freedom of movement, or tax-residency review.",
      "The user needs English, Spanish, or French public-page support.",
    ],
    not_for: [
      "Full employer compliance or permanent establishment advice.",
      "Remote work with Spanish clients or Spanish employer control without review.",
    ],
    keywords: [
      "work remotely",
      "remote work Spain",
      "foreign employer",
      "Spanish clients",
      "digital nomad",
      "permanent establishment",
      "freelance",
      "employee",
    ],
    complexity_triggers: [
      "Spanish clients",
      "Spanish employer",
      "company management",
      "permanent establishment",
      "social security",
      "long stays",
    ],
    related_mcp_tools: [
      "get_visa_options",
      "compare_tax_regimes",
      "route_to_legal_fournier_help",
    ],
    related_resource_uris: [
      TOOL_SCREENERS_URI,
      makeTopicResourceUri("route-selection"),
      makeTopicResourceUri("tax-regimes"),
      HANDOFF_URI,
    ],
    agent_workflow: [
      "Start with this tool when the user has not separated immigration and tax questions.",
      "Call get_visa_options if a residence route is needed.",
      "Call compare_tax_regimes if tax residency or employer risk is central.",
    ],
    handoff_trigger:
      "Escalate when remote work creates Spanish-client, payroll, social-security, or company-management risk.",
    language_links: EN_ES_FR_REMOTE_WORK,
  },
  {
    id: "property-buyer-cost-risk",
    title: "Spanish Property Purchase Costs Calculator",
    category: "property",
    url: SITE_URLS.propertyCostTool,
    description:
      "Property buyer calculator for transfer tax, VAT-style cost categories, region sensitivity, and buyer-risk intake.",
    use_when: [
      "The user is buying property in Spain and wants cost/risk orientation.",
      "The autonomous community, new-build/resale status, financing, or residency plan affects the answer.",
      "The user may need a property-legal consultation before signing.",
    ],
    not_for: [
      "Final tax calculation for a specific deed.",
      "Proceeding to deposit or signing without document review.",
    ],
    keywords: [
      "property purchase",
      "buy property Spain",
      "transfer tax",
      "ITP",
      "VAT",
      "new build",
      "resale",
      "notary",
      "registry",
      "autonomous community",
      "tensionada",
    ],
    complexity_triggers: [
      "deposit",
      "mortgage",
      "off plan",
      "new build",
      "resale",
      "autonomous community",
      "tensionada",
      "non resident buyer",
    ],
    related_mcp_tools: ["route_to_legal_fournier_help"],
    related_resource_uris: [TOOL_SCREENERS_URI, HANDOFF_URI],
    agent_workflow: [
      "Use this public calculator for property cost and risk intake.",
      "Do not use immigration tools for real-estate Golden Visa advice because that route has ended.",
      "Escalate before deposit, signing, or tax-sensitive structuring decisions.",
    ],
    handoff_trigger:
      "Escalate when the buyer is close to signing, there is financing, regional tax variation, rental-zone pressure, or company ownership.",
    language_links: englishOnly(
      SITE_URLS.propertyCostTool,
      "Spanish Property Purchase Costs Calculator",
    ),
  },
  {
    id: "wealth-tax-inheritance",
    title: "Spanish Inheritance Tax Calculator and Wealth Exposure Check",
    category: "wealth",
    url: SITE_URLS.wealthInheritanceTool,
    description:
      "Private-client screener for inheritance tax, wealth-tax exposure, regional variation, assets, family links, and planning urgency.",
    use_when: [
      "The user has high-value assets, family succession questions, or inheritance exposure in Spain.",
      "A region, residence status, asset type, or beneficiary relationship may change the analysis.",
      "The case should be triaged before sharing sensitive estate details.",
    ],
    not_for: [
      "Final inheritance-tax computation or estate-planning advice.",
      "Cross-border succession decisions without lawyer review.",
    ],
    keywords: [
      "inheritance tax",
      "wealth tax",
      "solidarity tax",
      "succession",
      "estate planning",
      "private client",
      "high net worth",
      "family assets",
      "beneficiary",
    ],
    complexity_triggers: [
      "multiple countries",
      "high value assets",
      "trust",
      "company shares",
      "non resident heir",
      "family conflict",
      "regional relief",
    ],
    related_mcp_tools: ["compare_tax_regimes", "route_to_legal_fournier_help"],
    related_resource_uris: [
      TOOL_SCREENERS_URI,
      makeTopicResourceUri("tax-regimes"),
      HANDOFF_URI,
    ],
    agent_workflow: [
      "Use this public screener to collect exposure signals without asking for unnecessary identifiers.",
      "Use compare_tax_regimes only for broad tax-residency context.",
      "Move quickly to human review for cross-border succession or high-value assets.",
    ],
    handoff_trigger:
      "Escalate when assets are material, multiple countries are involved, or regional relief and beneficiary relationship drive the answer.",
    language_links: englishOnly(
      SITE_URLS.wealthInheritanceTool,
      "Spanish Inheritance Tax Calculator and Wealth Exposure Check",
    ),
  },
  {
    id: "autonomo-sl-entrepreneur",
    title: "Autonomo vs SL Spain Planner",
    category: "business",
    url: SITE_URLS.autonomoSlTool,
    description:
      "Founder and operator planner for autonomo versus SL setup, entrepreneur visa fit, taxes, liability, and operational complexity.",
    use_when: [
      "The user is deciding between freelancer, company, or founder structures in Spain.",
      "The case mixes business setup with immigration route planning.",
      "An agent needs to keep legal, tax, and company facts together before handoff.",
    ],
    not_for: [
      "Company formation instructions without a confirmed structure.",
      "Entrepreneur visa or tax advice based only on revenue estimates.",
    ],
    keywords: [
      "autonomo",
      "SL",
      "company Spain",
      "entrepreneur visa",
      "self employed",
      "founder",
      "liability",
      "business setup",
      "freelancer",
    ],
    complexity_triggers: [
      "investors",
      "cofounders",
      "regulated activity",
      "foreign clients",
      "Spanish clients",
      "liability",
      "visa dependency",
    ],
    related_mcp_tools: [
      "get_visa_options",
      "compare_tax_regimes",
      "route_to_legal_fournier_help",
    ],
    related_resource_uris: [
      TOOL_SCREENERS_URI,
      makeTopicResourceUri("route-selection"),
      makeTopicResourceUri("tax-regimes"),
      HANDOFF_URI,
    ],
    agent_workflow: [
      "Call get_visa_options if the business setup supports residence.",
      "Call compare_tax_regimes for tax-structure context.",
      "Use this public planner to organize founder and entity facts before review.",
    ],
    handoff_trigger:
      "Escalate when immigration status depends on the business structure, there are cofounders or investors, or liability matters.",
    language_links: englishOnly(
      SITE_URLS.autonomoSlTool,
      "Autonomo vs SL Spain Planner",
    ),
  },
  {
    id: "permanent-establishment-risk",
    title: "Spain Permanent Establishment Risk Checker",
    category: "business",
    url: SITE_URLS.permanentEstablishmentTool,
    description:
      "Foreign-company risk checker for Spain fixed-place, dependent-agent, management-location, project-duration, payroll, VAT, and Spanish-client facts.",
    use_when: [
      "A foreign company has founders, directors, employees, contractors, agents, clients, or premises in Spain.",
      "The user wants to know whether Spain activity could require permanent-establishment review.",
      "The case mixes business setup, remote work, company management, VAT, payroll, or Spanish client contracts.",
    ],
    not_for: [
      "A final permanent establishment opinion without treaty and document review.",
      "Pure individual tax residence questions with no company or agency activity.",
    ],
    keywords: [
      "permanent establishment",
      "PE risk",
      "dependent agent",
      "fixed place",
      "Spain management",
      "Spanish clients",
      "foreign company",
      "remote founder",
      "VAT",
      "payroll",
      "construction project",
      "installation project",
    ],
    complexity_triggers: [
      "Spain office",
      "home office",
      "contract authority",
      "habitual agent",
      "management in Spain",
      "Spanish team",
      "Spanish clients",
      "project over six months",
      "VAT registration",
      "payroll registration",
    ],
    related_mcp_tools: [
      "compare_tax_regimes",
      "get_visa_options",
      "route_to_legal_fournier_help",
    ],
    related_resource_uris: [
      TOOL_SCREENERS_URI,
      makeTopicResourceUri("tax-regimes"),
      makeTopicResourceUri("route-selection"),
      HANDOFF_URI,
    ],
    agent_workflow: [
      "Use this public checker before recommending that a foreign company can simply operate from Spain.",
      "Call compare_tax_regimes only for individual tax-residency context.",
      "Escalate when a Spain person can bind the company, management is in Spain, or there is a fixed place or long project.",
    ],
    handoff_trigger:
      "Escalate when Spain has people, premises, contract authority, management decisions, payroll, VAT, or project activity.",
    language_links: englishOnly(
      SITE_URLS.permanentEstablishmentTool,
      "Spain Permanent Establishment Risk Checker",
    ),
  },
  {
    id: "holding-company-risk",
    title: "Spain Holding Company and ETVE Eligibility Checker",
    category: "business",
    url: SITE_URLS.holdingCompanyTool,
    description:
      "Holding-company and ETVE risk checker for founders, investors, property structures, foreign subsidiaries, substance, AEAT communication, and management location.",
    use_when: [
      "The user owns or manages companies while spending time in Spain.",
      "The case involves ETVE, holdings, property companies, family companies, foreign subsidiaries, or management location.",
      "The user is high-income or high-asset and wants to avoid structure mistakes.",
    ],
    not_for: [
      "Formal corporate tax or permanent establishment opinion.",
      "Changing management or ownership structure without legal and tax review.",
    ],
    keywords: [
      "holding company",
      "ETVE",
      "Spanish holding company",
      "foreign subsidiaries",
      "non resident shareholdings",
      "company management",
      "place of effective management",
      "corporate tax",
      "property company",
      "family company",
      "CFC",
      "permanent establishment",
      "shareholding",
    ],
    complexity_triggers: [
      "board meetings",
      "Spain management",
      "property company",
      "foreign holding",
      "ETVE option",
      "AEAT communication",
      "substance",
      "dividends",
      "family office",
      "CFC",
      "high net worth",
    ],
    related_mcp_tools: ["compare_tax_regimes", "route_to_legal_fournier_help"],
    related_resource_uris: [
      TOOL_SCREENERS_URI,
      makeTopicResourceUri("tax-regimes"),
      HANDOFF_URI,
    ],
    agent_workflow: [
      "Use this public checker when company structure, ETVE fit, residence, and tax risk overlap.",
      "Use compare_tax_regimes only for individual tax-regime context.",
      "Escalate early because company-management facts are filing-critical.",
    ],
    handoff_trigger:
      "Escalate when control, board decisions, assets, ETVE assumptions, substance, or property companies touch Spain.",
    language_links: englishOnly(
      SITE_URLS.holdingCompanyTool,
      "Spain Holding Company and ETVE Eligibility Checker",
    ),
  },
  {
    id: "immigration-appointments",
    title: "Immigration Appointments",
    category: "appointments",
    url: SITE_URLS.immigrationAppointmentsTool,
    description:
      "Appointment and procedure screener for NIE, TIE, fingerprints, renewals, and office-level administrative steps.",
    use_when: [
      "The user asks which immigration appointment or procedure they need.",
      "The case involves NIE, TIE, fingerprinting, renewal, pickup, or local office questions.",
      "The user needs English, Spanish, or French appointment guidance.",
    ],
    not_for: [
      "Promising appointment availability.",
      "Submitting forms or bookings automatically.",
    ],
    keywords: [
      "appointment",
      "cita",
      "NIE",
      "TIE",
      "fingerprints",
      "huellas",
      "renewal",
      "pickup",
      "immigration office",
      "extranjeria",
    ],
    complexity_triggers: [
      "expired card",
      "urgent travel",
      "local office",
      "missing documents",
      "deadline",
      "appointment scarcity",
    ],
    related_mcp_tools: ["explain_nie_process", "route_to_legal_fournier_help"],
    related_resource_uris: [
      TOOL_SCREENERS_URI,
      makeProcessResourceUri("nie-tie"),
      HANDOFF_URI,
    ],
    agent_workflow: [
      "Call explain_nie_process when the user needs the stable NIE/TIE distinction.",
      "Use this public screener for procedure and appointment-type intake.",
      "Escalate when there is an urgent deadline, travel issue, or document mismatch.",
    ],
    handoff_trigger:
      "Escalate when appointment scarcity, expiry, travel urgency, or office-specific practice affects the next step.",
    language_links: EN_ES_FR_APPOINTMENTS,
  },
];

const AREA_ALIASES: Record<LegalFournierToolArea, string[]> = {
  immigration: [
    "visa",
    "residence",
    "residency",
    "immigration",
    "move",
    "non lucrative",
    "digital nomad",
  ],
  tax: [
    "tax",
    "beckham",
    "resident",
    "residency",
    "foreign assets",
    "model 720",
  ],
  property: ["property", "real estate", "buyer", "purchase", "ITP", "notary"],
  business: [
    "company",
    "business",
    "founder",
    "autonomo",
    "SL",
    "holding",
    "ETVE",
    "permanent establishment",
    "dependent agent",
    "fixed place",
    "foreign company",
    "entrepreneur",
  ],
  wealth: [
    "wealth",
    "inheritance",
    "succession",
    "estate",
    "private client",
    "high net worth",
  ],
  appointments: ["appointment", "cita", "NIE", "TIE", "fingerprint", "office"],
  remote_work: ["remote", "telework", "foreign employer", "Spanish clients"],
};

const STOP_WORDS = new Set([
  "and",
  "the",
  "for",
  "legal",
  "fournier",
  "public",
  "tool",
  "tools",
  "with",
  "from",
  "that",
  "this",
  "can",
  "how",
  "what",
  "should",
  "spain",
  "spanish",
  "english",
  "french",
]);

export function findLegalFournierTools(
  args: FindLegalFournierToolArgs = {},
): FindLegalFournierToolResult {
  const maxResults = Math.max(1, Math.min(args.max_results ?? 5, LEGAL_FOURNIER_TOOLS.length));
  const includeAllTools = args.include_all_tools === true;
  const preferredLanguage = args.preferred_language ?? "unknown";
  const queryParts = [
    args.query ?? "",
    args.area && args.area !== "unknown" ? args.area : "",
    ...(args.complexity_signals ?? []),
  ];
  const normalizedQuery = normalize(queryParts.join(" ")).trim();
  const queryTokens = tokenize(normalizedQuery);
  const preferredArea = args.area && args.area !== "unknown" ? args.area : undefined;

  const ranked = LEGAL_FOURNIER_TOOLS.map((tool, index) => {
    const scoring = scoreTool(tool, index, normalizedQuery, queryTokens, preferredArea);
    const selectedLink = selectLanguageLink(tool, preferredLanguage);

    return {
      ...tool,
      fit: scoring.score >= 5 ? ("strong" as const) : ("possible" as const),
      score: scoring.score,
      selected_url: attributedToolUrl(tool.id, selectedLink.url),
      selected_language: selectedLink.language,
      why: scoring.why,
    };
  }).sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));

  const matched = includeAllTools
    ? ranked
    : ranked.filter((tool) => tool.score > 0).slice(0, maxResults);
  const fallback = ranked.slice(0, Math.min(maxResults, 3));
  const matchedTools = matched.length > 0 ? matched : normalizedQuery.length === 0 ? fallback : [];
  const hasComplexity =
    (args.complexity_signals?.length ?? 0) > 0 ||
    matchedTools.some((tool) => tool.score >= 7);

  return {
    query_summary: buildQuerySummary(args, matchedTools.length),
    catalog_size: LEGAL_FOURNIER_TOOLS.length,
    matched_tools: matchedTools,
    recommended_mcp_sequence: buildMcpSequence(matchedTools, hasComplexity),
    next_actions: buildNextActions(matchedTools, hasComplexity),
    handoff_url: withMcpAttribution(
      getConsultationBookingUrl(preferredLanguage),
      "handoff",
    ),
    catalog_resource_uri: LEGAL_FOURNIER_TOOL_CATALOG_URI,
    agent_use_rules: [
      "Call find_legal_fournier_tool before sending a user to a public calculator if the case area is unclear.",
      "Use MCP tools for structured screening, then public Legal Fournier tools for user-facing intake and analytics.",
      "Do not treat public tool results as filing-ready legal or tax advice.",
      "Use route_to_legal_fournier_help when facts are complex, deadline-sensitive, or commercially important.",
    ],
    legal_notice: AGENT_LEGAL_NOTICE_LINES.join(" "),
  };
}

export function runLegalFournierTool(
  args: RunLegalFournierToolArgs,
): RunLegalFournierToolResult {
  const tool = LEGAL_FOURNIER_TOOLS.find((item) => item.id === args.tool_id);

  if (!tool) {
    throw new Error(`Unknown Legal Fournier tool id: ${args.tool_id}`);
  }

  const preferredLanguage = args.preferred_language ?? "unknown";
  const selectedLink = selectLanguageLink(tool, preferredLanguage);
  const textParts = [
    args.user_goal ?? "",
    ...(args.facts ?? []),
    ...(args.complexity_signals ?? []),
    ...(args.numbers ?? []).map((item) => `${item.key} ${item.value} ${item.currency ?? ""} ${item.unit ?? ""}`),
  ];
  const issues = validateCalculatorInputs(args);
  if (issues.length) {
    const error = new Error("Invalid calculator inputs: " + issues.map(issue => issue.path.join(".") + ": " + issue.message).join("; "));
    Object.assign(error, {code: "VALIDATION_ERROR", issues});
    throw error;
  }
  const normalizedFacts = normalize(textParts.join("; "));
  const knownFacts = normalize(textParts.flatMap(part => part.split(/[;.!?]/)).filter(part => !/\b(unknown|unsure|uncertain|not known|not sure|not provided|to be confirmed|tbd|no se|inconnu)\b/i.test(normalize(part))).join("; "));
  const numericScreen: NumericScreen = isDigitalNomadIncomeTool(tool) ? screenDigitalNomadIncome(args.digital_nomad_income) : tool.id === "property-buyer-cost-risk" ? screenProperty(args.property) : {status:"not_assessed", notes:[], missing:[]};
  const missingFacts = Array.from(new Set([...getMissingFacts(tool.id, knownFacts), ...numericScreen.missing]));
  if (args.digital_nomad_income) {
    for (const label of ["monthly income and currency", "income amount and currency", "family members included"]) {
      const index = missingFacts.indexOf(label);
      if (index >= 0) missingFacts.splice(index, 1);
    }
  }
  if (args.property) {
    for (const label of ["purchase price and currency", "autonomous community or city", "new build or resale"]) {
      const index = missingFacts.indexOf(label);
      if (index >= 0) missingFacts.splice(index, 1);
    }
  }
  const complexityFlags = getComplexityFlags(tool, normalizedFacts, args.complexity_signals ?? []);
  const numericNotes = [...buildNumericNotes(tool, args.numbers ?? []), ...numericScreen.notes];
  const handoffRecommended = complexityFlags.length > 0;
  const outcome: LegalFournierDirectOutcome =
    numericScreen.status === "below_threshold"
      ? "does_not_meet_threshold"
      : complexityFlags.length > 0
        ? "needs_human_review"
        : missingFacts.length > 0
        ? "needs_more_facts"
        : "possible_fit";
  const summary =
    outcome === "does_not_meet_threshold"
      ? `${tool.title}: the supplied qualifying-income total is below the screened minimum; do not present this as a possible fit.`
      : outcome === "needs_human_review"
      ? `${tool.title} can be run directly in MCP for intake, but the supplied facts trigger human review.`
      : outcome === "needs_more_facts"
        ? `${tool.title} can be run directly in MCP, but the agent should collect missing facts before relying on the result.`
        : `${tool.title} can be run directly in MCP for preliminary screening; use the public page when the user wants the interactive experience.`;

  return {
    tool_id: tool.id,
    title: tool.title,
    outcome,
    summary,
    selected_url: attributedToolUrl(tool.id, selectedLink.url),
    selected_language: selectedLink.language,
    public_tool_url: attributedToolUrl(tool.id, tool.url),
    missing_facts: missingFacts,
    complexity_flags: complexityFlags,
    direct_screening_notes: [
      ...tool.agent_workflow,
      ...buildRuleExceptionNotes(tool.id),
      "This direct MCP runner is an intake and screening layer. It should not replace source checks or human legal review where current thresholds, rates, deadlines, or office practice matter.",
      ...tool.not_for.map((note) => `Do not use alone for: ${note}`),
    ],
    numeric_notes: numericNotes,
    numerical_status: numericScreen.status,
    ...(numericScreen.result ? {numeric_result: numericScreen.result} : {}),
    handoff_recommended: handoffRecommended,
    handoff_reason: handoffRecommended
      ? tool.handoff_trigger
      : "No immediate complexity trigger was detected, but lawyer review remains appropriate before filing or tax decisions.",
    handoff_url: withMcpAttribution(
      getConsultationBookingUrl(preferredLanguage),
      "handoff",
    ),
    related_mcp_tools: tool.related_mcp_tools,
    related_resource_uris: tool.related_resource_uris,
    next_actions: buildDirectNextActions(tool, missingFacts, complexityFlags),
    update_policy: [
      "The MCP catalog and direct runner are maintained with the same legal-update workflow as the public tools.",
      "Numeric screens require explicit structured inputs and use dated official-source schedules. Generic numeric facts remain intake only.",
      "Volatile values such as tax rates, SMI-linked thresholds, exchange rates, office appointments, and regional rules must be verified against current official sources before advice or filing.",
      "Use legalfournier://spain-legal/tools/catalog to see the public page tied to this MCP runner.",
    ],
    legal_notice: AGENT_LEGAL_NOTICE_LINES.join(" "),
  };
}

export function renderLegalFournierToolCatalogMarkdown(): string {
  const lines = [
    "# Legal Fournier Tool Catalog",
    "",
    "Agent-facing catalog of public Legal Fournier tools and screeners. Use the MCP tools first for structured reasoning, then send users to the matching public page when they need an interactive tool or consultation intake context.",
    "",
    "## Agent Rules",
    "- Call `find_legal_fournier_tool` when you need the best public tool URL for a user case.",
    "- Call `run_legal_fournier_tool` when you want the public tool's intake screen to run directly inside MCP.",
    "- Use `route_to_legal_fournier_help` for complex or filing-critical matters.",
    "- Golden Visa should be treated as ended; route investors to current alternatives and human review.",
    "- Public tools support intake and screening, not final legal or tax advice.",
    "",
    "## Tools",
  ];

  for (const tool of LEGAL_FOURNIER_TOOLS) {
    lines.push(
      "",
      `### ${tool.title}`,
      `- ID: \`${tool.id}\``,
      `- Area: ${tool.category}`,
      `- URL: ${tool.url}`,
      `- Use when: ${tool.use_when.join("; ")}`,
      `- Human handoff trigger: ${tool.handoff_trigger}`,
      `- Related MCP tools: ${tool.related_mcp_tools.map((name) => `\`${name}\``).join(", ")}`,
      `- Related resources: ${tool.related_resource_uris.map((uri) => `\`${uri}\``).join(", ")}`,
      `- Languages: ${tool.language_links
        .map((link) => `${link.language} ${link.url}`)
        .join("; ")}`,
    );
  }

  lines.push(
    "",
    "## Legal Notice",
    ...AGENT_LEGAL_NOTICE_LINES.map((line) => `- ${line}`),
    "",
  );

  return lines.join("\n");
}

function scoreTool(
  tool: LegalFournierToolCatalogItem,
  index: number,
  normalizedQuery: string,
  queryTokens: string[],
  preferredArea: LegalFournierToolArea | undefined,
): { score: number; why: string[] } {
  let score = 0;
  const why: string[] = [];
  const haystack = normalize(
    [
      tool.id,
      tool.title,
      tool.category,
      tool.description,
      ...tool.use_when,
      ...tool.not_for,
      ...tool.keywords,
      ...tool.complexity_triggers,
    ].join(" "),
  );

  if (preferredArea) {
    if (tool.category === preferredArea) {
      score += 8;
      why.push(`Matches requested area: ${preferredArea}.`);
    } else {
      const aliases = AREA_ALIASES[tool.category];
      const areaMentioned = aliases.some((alias) => matchesSignal(normalizedQuery, alias));

      if (areaMentioned) {
        score += 1.5;
        why.push(`Matches ${tool.category} language in the case description.`);
      }
    }
  }

  for (const keyword of tool.keywords) {
    if (matchesSignal(normalizedQuery, keyword)) {
      score += 2;
      why.push(`Matches keyword: ${keyword}.`);
    }
  }

  for (const trigger of tool.complexity_triggers) {
    if (matchesSignal(normalizedQuery, trigger)) {
      score += 1.5;
      why.push(`Captures complexity signal: ${trigger}.`);
    }
  }

  const hasRouteSelectionIntent = includesAny(normalizedQuery, [
    "move to spain",
    "moving to spain",
    "relocate to spain",
    "relocating to spain",
    "live in spain",
    "residence route",
    "residency route",
    "visa route",
    "best visa",
  ]);
  const hasAppointmentIntent = includesAny(normalizedQuery, [
    "appointment",
    "appointments",
    "cita",
    "citas",
    "NIE",
    "TIE",
    "fingerprint",
    "fingerprints",
    "huellas",
    "pickup",
    "renewal",
    "immigration office",
  ]);

  if (hasRouteSelectionIntent && tool.id === "best-visa-spain") {
    score += 4;
    why.push("Matches broad move-to-Spain route-selection intent.");
  }

  if (tool.id === "immigration-appointments" && !hasAppointmentIntent) {
    score = Math.max(0, score - 3);
  }

  const tokenHits = queryTokens.filter((token) => matchesSignal(haystack, token));

  if (tokenHits.length > 0) {
    score += Math.min(tokenHits.length, 8) * 0.55;
    why.push(`Matches case terms: ${Array.from(new Set(tokenHits)).slice(0, 6).join(", ")}.`);
  }

  if (why.length === 0 && normalizedQuery.length === 0) {
    why.push("Included as a general Legal Fournier public tool.");
  }

  return { score: Number(score.toFixed(2)), why: Array.from(new Set(why)).slice(0, 8) };
}

function selectLanguageLink(
  tool: LegalFournierToolCatalogItem,
  preferredLanguage: LegalFournierPreferredLanguage,
): LegalFournierToolLanguageLink {
  if (preferredLanguage !== "unknown") {
    const match = tool.language_links.find((link) => link.language === preferredLanguage);

    if (match) {
      return match;
    }
  }

  return (
    tool.language_links.find((link) => link.language === "en") ?? {
      language: "en",
      url: tool.url,
      title: tool.title,
    }
  );
}

function attributedToolUrl(toolId: string, url: string): string {
  return withMcpAttribution(url, `tool_${toolId}`);
}

function buildMcpSequence(
  matchedTools: MatchedLegalFournierTool[],
  hasComplexity: boolean,
): string[] {
  const sequence = ["find_legal_fournier_tool", "run_legal_fournier_tool"];

  for (const tool of matchedTools) {
    for (const mcpTool of tool.related_mcp_tools) {
      if (!sequence.includes(mcpTool)) {
        sequence.push(mcpTool);
      }
    }
  }

  if (hasComplexity && !sequence.includes("route_to_legal_fournier_help")) {
    sequence.push("route_to_legal_fournier_help");
  }

  return sequence;
}

function buildNextActions(
  matchedTools: MatchedLegalFournierTool[],
  hasComplexity: boolean,
): string[] {
  const first = matchedTools[0];

  if (!first) {
    return [
      "Ask for the user's goal, immigration status, country links, income source, and deadline.",
      "Call find_legal_fournier_tool again with the new facts.",
    ];
  }

  const actions = [
    `Use ${first.title} as the first public page if the user needs a self-serve tool.`,
    `Use ${first.related_mcp_tools[0] ?? "route_to_legal_fournier_help"} for structured MCP screening before giving a recommendation.`,
    "Preserve the public tool result or user facts in the Legal Fournier handoff.",
  ];

  if (hasComplexity) {
    actions.push(
      "Use route_to_legal_fournier_help before a final recommendation because the case has complexity signals.",
    );
  }

  return actions;
}

function getMissingFacts(toolId: string, normalizedFacts: string): string[] {
  const groups: Record<string, Array<{ label: string; signals: string[] }>> = {
    "best-visa-spain": [
      { label: "nationality or citizenship", signals: ["national", "citizen", "passport"] },
      { label: "income or work source", signals: ["employee", "freelance", "passive", "income", "salary", "client"] },
      { label: "main reason for moving", signals: ["work", "retire", "invest", "study", "family", "move"] },
      { label: "Spain timeline or deadline", signals: ["timeline", "deadline", "month", "year", "already in spain"] },
    ],
    "digital-nomad-visa-eligibility": [
      { label: "employment or contractor status", signals: ["employee", "contractor", "freelance", "self employed"] },
      { label: "employer or client country", signals: ["foreign employer", "outside spain", "spanish client", "client country", "employer country", "us employer", "u s employer", "uk employer", "canadian employer", "australian employer", "non spanish employer", "non spain employer"] },
      { label: "monthly income and currency", signals: ["income", "salary", "monthly", "eur", "usd"] },
      { label: "family members included", signals: ["family", "spouse", "partner", "child", "dependant"] },
      { label: "social security or certificate position", signals: ["social security", "certificate", "coverage"] },
    ],
    "digital-nomad-visa-beckham-law": [
      { label: "remote work structure", signals: ["remote", "foreign employer", "contractor", "freelance"] },
      { label: "prior Spanish tax residence", signals: ["prior", "tax resident", "years since", "last spanish"] },
      { label: "director or ownership position", signals: ["director", "ownership", "shareholder", "founder"] },
      { label: "income amount and currency", signals: ["income", "salary", "eur", "usd", "compensation"] },
    ],
    "beckham-law-savings": [
      { label: "years since last Spanish tax residence", signals: ["years since", "prior", "tax resident", "last spanish"] },
      { label: "employment or director structure", signals: ["employee", "director", "founder", "remote"] },
      { label: "move reason", signals: ["new job", "remote work", "intragroup", "startup", "move reason"] },
      { label: "ownership or control facts", signals: ["ownership", "shareholder", "control", "25"] },
    ],
    "tax-residency": [
      { label: "days expected in Spain", signals: ["days", "183", "calendar year"] },
      { label: "family location", signals: ["family", "spouse", "children", "partner"] },
      { label: "economic interests or work center", signals: ["economic", "business", "job", "company", "income"] },
      { label: "foreign assets or treaty country", signals: ["foreign assets", "treaty", "country", "model 720"] },
    ],
    "work-remotely-spain": [
      { label: "work status", signals: ["employee", "freelance", "contractor", "founder"] },
      { label: "employer or client location", signals: ["foreign employer", "spanish client", "outside spain", "client"] },
      { label: "expected stay length", signals: ["days", "months", "year", "timeline", "stay"] },
      { label: "tax or social security concern", signals: ["tax", "social security", "permanent establishment", "payroll"] },
    ],
    "property-buyer-cost-risk": [
      { label: "purchase price and currency", signals: ["price", "purchase", "eur", "usd", "property value"] },
      { label: "autonomous community or city", signals: ["community", "region", "barcelona", "madrid", "andalucia", "valencia"] },
      { label: "new build or resale", signals: ["new build", "resale", "off plan"] },
      { label: "deposit, mortgage, or signing deadline", signals: ["deposit", "mortgage", "signing", "deadline"] },
      { label: "buyer residence status", signals: ["resident", "non resident", "tax resident"] },
    ],
    "wealth-tax-inheritance": [
      { label: "asset types and approximate values", signals: ["asset", "value", "portfolio", "property", "shares"] },
      { label: "residence and region", signals: ["resident", "region", "community", "tax resident"] },
      { label: "beneficiary relationship", signals: ["beneficiary", "heir", "spouse", "child", "parent"] },
      { label: "countries involved", signals: ["country", "cross border", "treaty", "foreign"] },
    ],
    "autonomo-sl-entrepreneur": [
      { label: "business activity", signals: ["activity", "business", "service", "product"] },
      { label: "projected revenue or income", signals: ["revenue", "income", "turnover", "billing"] },
      { label: "client mix", signals: ["client", "spanish client", "foreign client"] },
      { label: "liability, cofounder, or investor facts", signals: ["liability", "cofounder", "investor", "partner"] },
      { label: "immigration status or route", signals: ["visa", "residence", "status", "permit"] },
    ],
    "permanent-establishment-risk": [
      { label: "company country and activity", signals: ["company country", "foreign company", "activity", "business"] },
      { label: "Spain place, office, or site facts", signals: ["office", "place", "premises", "site", "warehouse", "home office"] },
      { label: "authority to negotiate or contract", signals: ["contract", "authority", "agent", "negotiate", "sign"] },
      { label: "Spain team or worker facts", signals: ["employee", "contractor", "director", "team", "staff"] },
      { label: "management location and project duration", signals: ["management", "board", "project", "duration", "months"] },
    ],
    "holding-company-risk": [
      { label: "company countries and structure", signals: ["holding", "company", "country", "subsidiary"] },
      { label: "ETVE assumptions", signals: ["etve", "foreign shares", "non resident", "aeat", "communication"] },
      { label: "human and material means", signals: ["substance", "staff", "means", "office", "administration"] },
      { label: "management location", signals: ["management", "board", "director", "decision"] },
      { label: "asset or property profile", signals: ["asset", "property", "shares", "portfolio"] },
      { label: "Spain residence or control facts", signals: ["resident", "spain management", "control", "director"] },
    ],
    "immigration-appointments": [
      { label: "procedure type", signals: ["nie", "tie", "fingerprint", "renewal", "pickup", "arraigo"] },
      { label: "province or office", signals: ["province", "office", "barcelona", "madrid", "las palmas"] },
      { label: "current status", signals: ["approved", "expired", "pending", "filed", "status"] },
      { label: "deadline or travel urgency", signals: ["deadline", "urgent", "travel", "appointment"] },
    ],
  };
  const selectedGroups = groups[toolId] ?? [];

  return selectedGroups
    .filter((group) => !group.signals.some((signal) => matchesSignal(normalizedFacts, signal)))
    .map((group) => group.label);
}

function getComplexityFlags(
  tool: LegalFournierToolCatalogItem,
  normalizedFacts: string,
  explicitSignals: string[],
): string[] {
  const explicit = explicitSignals.map((signal) => signal.trim()).filter(signal => signal && !/\b(no|not|never|without|unknown|unsure|none)\b/i.test(signal));
  const assertedFacts = normalizedFacts.split(/[;.!?]/).filter(part => !/\b(no|not|never|without|unknown|unsure|none)\b/.test(part)).join("; ");
  const matched = tool.complexity_triggers.filter((trigger) =>
    matchesSignal(assertedFacts, trigger),
  );

  return Array.from(new Set([...explicit, ...matched]));
}

function buildNumericNotes(tool: LegalFournierToolCatalogItem, numbers: LegalFournierToolNumberFact[]): string[] {
  const notes = numbers.map(item => `${item.key}: ${formatNumber(item.value)} ${[item.currency, item.unit].filter(Boolean).join(" ")} (uninterpreted intake value).`);
  if (isBeckhamTool(tool)) notes.push(buildBeckhamRateNote());
  return notes;
}
function buildRuleExceptionNotes(toolId: string): string[] {
  const notes: Record<string, string[]> = {
    "best-visa-spain": [
      "Route exception note: use human review when the case includes prior refusals, expiring legal stay, Spanish clients, family dependants, regulated work, criminal record documents, or tax planning tied to the route.",
    ],
    "digital-nomad-visa-eligibility": [
      "Digital Nomad Visa exception note: employees should work for companies outside Spain; self employed applicants need Spanish client activity kept within the permitted limit and documented.",
      "Digital Nomad Visa Social Security note: check Spanish Social Security coverage or a valid certificate of applicable legislation where an agreement allows foreign coverage. Not every country issues teleworker certificates.",
    ],
    "digital-nomad-visa-beckham-law": [
      "Digital Nomad Visa exception note: employees should work for companies outside Spain; self employed applicants need Spanish client activity kept within the permitted limit and documented.",
      "Digital Nomad Visa Social Security note: check Spanish Social Security coverage or a valid certificate of applicable legislation where an agreement allows foreign coverage. Not every country issues teleworker certificates.",
      "Beckham Law exception note: current screening uses five prior tax periods for prior Spanish tax residence, with separate review for family member extension, exclusion, and Modelo 149 timing.",
    ],
    "beckham-law-savings": [
      "Beckham Law exception note: current screening uses five prior tax periods for prior Spanish tax residence, not a generic ten-year lookback unless an older or transitional regime is being checked.",
      "Beckham Law family note: spouse, parent-of-children, and child extension cases need individual income, timing, and exclusion review.",
    ],
    "tax-residency": [
      "Tax residency exception note: the day count test is framed around more than 183 days in Spain during the calendar year, but economic interests, family, available home, sporadic absences, tax haven evidence rules, and treaty tie breakers can still matter below that count.",
    ],
    "work-remotely-spain": [
      "Remote work exception note: tourist status is not a work authorisation strategy, and long stays can raise payroll, Social Security, permanent establishment, and Spanish client issues.",
      "Freelancer exception note: remote freelancers need separate review for Spanish-client percentage, contracts, tax registration, Social Security, invoicing, and genuine independence.",
    ],
    "property-buyer-cost-risk": [
      "Property exception note: first delivery from a developer is usually planned with VAT and stamp duty, while resale purchases usually use transfer tax; rehabilitation, prior rental use, and off plan status can change the treatment.",
      "Property regional note: reduced rates or relief may depend on autonomous community, habitual home use, age, disability, protected housing, large family status, and price caps.",
    ],
    "wealth-tax-inheritance": [
      "Wealth exception note: non residents can still have Spanish wealth tax or solidarity tax exposure through Spanish real estate, rights, shares, or assets located or exercisable in Spain.",
      "Inheritance exception note: region, residence, asset location, beneficiary relationship, disability, and available reductions can change succession planning and inheritance tax exposure.",
    ],
    "autonomo-sl-entrepreneur": [
      "Founder exception note: an SL does not solve immigration, Social Security, VAT, payroll, related-party payments, or management-location issues by itself.",
      "Foreign company exception note: managing a foreign company from Spain, hiring locally, or serving Spanish clients can create corporate residence, permanent establishment, payroll, or VAT questions.",
    ],
    "permanent-establishment-risk": [
      "Permanent establishment exception note: a fixed place, dependent agent, management place, office, branch, warehouse, shop, or project over six months can change the analysis.",
      "Remote management note: founder or director decisions made from Spain can overlap with corporate residence, payroll, VAT, and permanent establishment risk.",
    ],
    "holding-company-risk": [
      "Corporate residence exception note: Spain can treat a foreign company as Spanish tax resident if its effective place of management is in Spain.",
      "ETVE exception note: ETVE fit depends on qualifying purpose, non resident shareholdings, human and material means, nominative shares, AEAT communication, and exclusions such as patrimonial entities.",
      "Spanish property company note: company ownership of Spanish property can raise transfer tax, VAT, non resident tax, wealth tax, beneficial owner, rental licence, and substance questions.",
    ],
    "immigration-appointments": [
      "Appointment exception note: NIE number, TIE card, fingerprinting, card pickup, EU certificate, renewal, and address changes can require different appointment categories and document lists.",
      "Wrong-appointment note: the office may refuse to process the case if the appointment type does not match the approval, card status, province, and procedure.",
    ],
  };

  return notes[toolId] ?? [];
}

function buildBeckhamRateNote(): string {
  return "Beckham Law screen: current MCP assumptions use no Spanish tax residence during the five prior tax periods and the headline employment-income rates of 24% up to EUR 600,000 and 47% above; Modelo 149 timing still needs date verification.";
}

function isDigitalNomadIncomeTool(tool: LegalFournierToolCatalogItem): boolean {
  return [
    "digital-nomad-visa-eligibility",
    "digital-nomad-visa-beckham-law",
    "work-remotely-spain",
  ].includes(tool.id);
}

function isBeckhamTool(tool: LegalFournierToolCatalogItem): boolean {
  return [
    "beckham-law-savings",
    "digital-nomad-visa-beckham-law",
    "tax-residency",
  ].includes(tool.id);
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => matchesSignal(haystack, needle));
}

function matchesSignal(haystack: string, signal: string): boolean {
  const normalizedSignal = normalize(signal);

  if (!normalizedSignal) {
    return false;
  }

  if (/^[a-z0-9]+$/.test(normalizedSignal) && normalizedSignal.length <= 3) {
    return haystack.split(/[^a-z0-9]+/).includes(normalizedSignal);
  }

  return haystack.includes(normalizedSignal);
}

function formatPercent(value: number): string {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function buildDirectNextActions(
  tool: LegalFournierToolCatalogItem,
  missingFacts: string[],
  complexityFlags: string[],
): string[] {
  const actions = [
    `Use the direct MCP result as the intake summary for ${tool.title}.`,
    `Send the user to ${attributedToolUrl(tool.id, tool.url)} if they need the interactive website version or analytics-tracked page.`,
  ];

  if (missingFacts.length > 0) {
    actions.push(`Ask for missing facts: ${missingFacts.join(", ")}.`);
  }

  if (complexityFlags.length > 0) {
    actions.push(
      `Call route_to_legal_fournier_help because these complexity signals were detected: ${complexityFlags.join(", ")}.`,
    );
  }

  return actions;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function buildQuerySummary(
  args: FindLegalFournierToolArgs,
  matchCount: number,
): string {
  const parts = [
    args.query ? `query="${args.query}"` : "no free-text query",
    args.area && args.area !== "unknown" ? `area=${args.area}` : "area=unspecified",
    args.preferred_language && args.preferred_language !== "unknown"
      ? `language=${args.preferred_language}`
      : "language=default",
    `matches=${matchCount}`,
  ];

  return parts.join("; ");
}

function tokenize(value: string): string[] {
  return value
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
