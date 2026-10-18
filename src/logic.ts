import {resolveNationality, type NationalityClassification} from "./data/nationality.js";
import {
  getContactUrl,
  getConsultationBookingUrl,
  SITE_URLS,
  withMcpAttribution,
} from "./data/site.js";
import { REPRESENTATION_NOTICE } from "./data/notices.js";
import {
  type SecondaryReference,
  getPackByUri,
  makeProcessResourceUri,
  makeRouteResourceUri,
  makeTopicResourceUri,
  makeTrackResourceUri,
} from "./data/canonical-packs.js";
import {
  type CurrentVerificationFlag,
  type OfficialLegalSource,
} from "./data/legal-authorities.js";
import {
  ROUTE_DEFINITIONS,
  type RouteDefinition,
  type RouteId,
} from "./data/visa-routes.js";

export type IncomeSource = "employee" | "freelancer" | "passive";
export type Intent = "work" | "retire" | "invest";
export type EmploymentType =
  | "spanish_employee"
  | "foreign_remote_employee"
  | "director_lt25"
  | "director_gte25"
  | "self_employed"
  | "highly_qualified_professional"
  | "unknown";
export type MoveReason =
  | "new_spanish_job"
  | "foreign_remote_work"
  | "startup_or_innovation"
  | "intragroup_transfer"
  | "family_move"
  | "director_appointment"
  | "qualifying_professional_activity"
  | "other";
export type CurrentStatus =
  | "new_arrival"
  | "temporary_resident"
  | "digital_nomad"
  | "eu_citizen_registered"
  | "eu_family_member_resident"
  | "student"
  | "long_term_resident"
  | "irregular_status"
  | "citizenship_applicant";
export type EuFamilyRelationship =
  | "spouse_or_registered_partner"
  | "child_or_dependent_parent"
  | "extended_family_or_other"
  | "unknown";
export type NationalityTrack =
  | "unknown"
  | "standard_10_year"
  | "ibero_2_year"
  | "one_year_special"
  | "refugee_5_year";
export type SpecialNationalityBasis =
  | "not_specified"
  | "born_in_spain"
  | "married_to_spanish"
  | "widowed_from_spanish"
  | "spanish_parent_or_grandparent"
  | "guardianship_of_spanish_person";
export type FitLevel = "strong" | "possible" | "unlikely";
export type BeckhamStatus = "eligible" | "not_eligible" | "needs_more_info";
export type TaxRegimeRecommendation = "beckham" | "standard_irpf" | "depends";
export type ReviewLevel = "low" | "medium" | "high";
export type HelpArea =
  | "visa_planning"
  | "eu_family_route"
  | "beckham"
  | "residency_path"
  | "nie_tie"
  | "tax_regimes"
  | "nationality"
  | "spanish_family_route"
  | "property"
  | "business"
  | "wealth"
  | "inheritance"
  | "appointments"
  | "other";
export type HelpUrgency = "normal" | "soon" | "urgent";
export type HandoffLanguage = "en" | "es" | "fr";
export type ToolName =
  | "find_legal_fournier_tool"
  | "run_legal_fournier_tool"
  | "get_paid_consultation_options"
  | "get_paid_call_availability"
  | "get_visa_options"
  | "check_beckham_eligibility"
  | "get_residency_path"
  | "explain_nie_process"
  | "compare_tax_regimes"
  | "route_to_legal_fournier_help";

export interface DecisionTraceItem extends Record<string, unknown> {
  factor: string;
  finding: string;
  impact: string;
}

export interface RankedRoute extends Record<string, unknown> {
  route_id: RouteId;
  title: string;
  fit: FitLevel;
  score: number;
  why: string[];
  evergreen_requirements: string[];
  common_use_cases: string[];
  next_step: string;
  related_resource_uri: string;
}

export interface VisaOptionsResult extends Record<string, unknown> {
  profile_summary: string;
  nationality_classification: NationalityClassification;
  decision_trace: DecisionTraceItem[];
  key_rules_applied: string[];
  review_level: ReviewLevel;
  official_legal_sources: OfficialLegalSource[];
  current_verification_flags: CurrentVerificationFlag[];
  ranked_routes: RankedRoute[];
  ruled_out_routes: Array<{ title: string; reason: string }>;
  general_notes: string[];
  next_actions: string[];
  suggested_follow_up_tools: ToolName[];
  related_resource_uris: string[];
  references: SecondaryReference[];
}

export interface BeckhamEligibilityResult extends Record<string, unknown> {
  status: BeckhamStatus;
  summary: string;
  decision_trace: DecisionTraceItem[];
  key_rules_applied: string[];
  review_level: ReviewLevel;
  official_legal_sources: OfficialLegalSource[];
  current_verification_flags: CurrentVerificationFlag[];
  reasons: string[];
  blocking_issues: string[];
  qualifying_paths: string[];
  next_steps: string[];
  suggested_follow_up_tools: ToolName[];
  related_resource_uris: string[];
  references: SecondaryReference[];
}

export interface ResidencyPathResult extends Record<string, unknown> {
  summary: string;
  permanent_residency_status:
    | "not_started"
    | "building_time"
    | "review_needed"
    | "likely_eligible"
    | "already_long_term";
  nationality_status:
    | "unknown_track"
    | "review_needed"
    | "building_time"
    | "likely_eligible"
    | "already_in_process";
  decision_trace: DecisionTraceItem[];
  key_rules_applied: string[];
  review_level: ReviewLevel;
  official_legal_sources: OfficialLegalSource[];
  current_verification_flags: CurrentVerificationFlag[];
  milestones: string[];
  next_steps: string[];
  caution_notes: string[];
  suggested_follow_up_tools: ToolName[];
  related_resource_uris: string[];
  references: SecondaryReference[];
}

export interface NieProcessResult extends Record<string, unknown> {
  summary: string;
  decision_trace: DecisionTraceItem[];
  key_rules_applied: string[];
  review_level: ReviewLevel;
  official_legal_sources: OfficialLegalSource[];
  current_verification_flags: CurrentVerificationFlag[];
  key_distinctions: string[];
  forms: string[];
  steps: Array<{ step: number; title: string; detail: string }>;
  common_mistakes: string[];
  next_actions: string[];
  suggested_follow_up_tools: ToolName[];
  related_resource_uris: string[];
  references: SecondaryReference[];
}

export interface TaxRegimeResult extends Record<string, unknown> {
  recommendation: TaxRegimeRecommendation;
  summary: string;
  decision_trace: DecisionTraceItem[];
  key_rules_applied: string[];
  review_level: ReviewLevel;
  official_legal_sources: OfficialLegalSource[];
  current_verification_flags: CurrentVerificationFlag[];
  likely_fit_notes: string[];
  comparison: Array<{
    topic: string;
    beckham: string;
    standard_irpf: string;
  }>;
  caveats: string[];
  next_actions: string[];
  suggested_follow_up_tools: ToolName[];
  related_resource_uris: string[];
  references: SecondaryReference[];
}

export interface HelpRouteResult extends Record<string, unknown> {
  should_escalate: boolean;
  urgency: HelpUrgency;
  summary: string;
  representation_notice: string;
  recommended_service: {
    title: string;
    url: string;
    reason: string;
  };
  booking_url: string;
  why_now: string[];
  what_to_prepare: string[];
  intake_fields: Array<{
    key: string;
    label: string;
    value: string;
    required: boolean;
    status: "filled" | "needs_input";
    guidance: string;
  }>;
  agent_handoff_message: string;
  suggested_follow_up_tools: ToolName[];
  related_resource_uris: string[];
  references: SecondaryReference[];
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function uniqueTools(values: ToolName[]): ToolName[] {
  return [...new Set(values)];
}

function uniqueReferences(references: SecondaryReference[]): SecondaryReference[] {
  const seen = new Set<string>();
  const deduped: SecondaryReference[] = [];

  for (const reference of references) {
    const key = `${reference.url}::${reference.label}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(reference);
  }

  return deduped;
}

function uniqueOfficialSources(
  sources: OfficialLegalSource[],
): OfficialLegalSource[] {
  const seen = new Set<string>();
  const deduped: OfficialLegalSource[] = [];

  for (const source of sources) {
    const key = `${source.url}::${source.title}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(source);
  }

  return deduped;
}

function uniqueVerificationFlags(
  flags: CurrentVerificationFlag[],
): CurrentVerificationFlag[] {
  const seen = new Set<string>();
  const deduped: CurrentVerificationFlag[] = [];

  for (const flag of flags) {
    const key = `${flag.area}::${flag.check_when}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(flag);
  }

  return deduped;
}

function packReferences(resourceUris: string[]): SecondaryReference[] {
  return uniqueReferences(
    resourceUris.flatMap((uri) => getPackByUri(uri)?.secondary_references ?? []),
  );
}

function packRules(resourceUris: string[], limit = 8): string[] {
  return uniqueStrings(
    resourceUris.flatMap((uri) => getPackByUri(uri)?.key_rules ?? []),
  ).slice(0, limit);
}

function packNextActions(resourceUris: string[], limit = 6): string[] {
  return uniqueStrings(
    resourceUris.flatMap((uri) => getPackByUri(uri)?.next_actions ?? []),
  ).slice(0, limit);
}

function packOfficialSources(
  resourceUris: string[],
  limit = 8,
): OfficialLegalSource[] {
  return uniqueOfficialSources(
    resourceUris.flatMap((uri) => getPackByUri(uri)?.official_legal_sources ?? []),
  ).slice(0, limit);
}

function packVerificationFlags(
  resourceUris: string[],
  limit = 6,
): CurrentVerificationFlag[] {
  return uniqueVerificationFlags(
    resourceUris.flatMap(
      (uri) => getPackByUri(uri)?.current_verification_flags ?? [],
    ),
  ).slice(0, limit);
}

export function isEuEeaSwissNationality(nationality: string): boolean {
  const nationalityClass = resolveNationality(nationality).classification;
  return nationalityClass === "eu_eea_swiss" || nationalityClass === "spanish";
}

function buildRoute(
  route: RouteDefinition,
  fit: FitLevel,
  score: number,
  why: string[],
  nextStep: string,
): RankedRoute {
  return {
    route_id: route.id,
    title: route.title,
    fit,
    score,
    why,
    evergreen_requirements: route.evergreenRequirements,
    common_use_cases: route.commonUseCases,
    next_step: nextStep,
    related_resource_uri: makeRouteResourceUri(route.id),
  };
}

function determineVisaReviewLevel(args: {
  isEu: boolean;
  employer_location?: "spain" | "outside_spain" | "mixed" | "unknown";
  has_eu_family_link?: boolean;
  ranked_routes: RankedRoute[];
}): ReviewLevel {
  const [top, second] = args.ranked_routes;

  if (
    args.has_eu_family_link ||
    args.employer_location === "mixed" ||
    args.employer_location === "unknown"
  ) {
    return "high";
  }

  if (!top) {
    return "high";
  }

  if (
    second &&
    top.fit === "strong" &&
    second.fit === "strong" &&
    Math.abs(top.score - second.score) <= 4
  ) {
    return "high";
  }

  if (args.isEu || (top.fit === "strong" && !second)) {
    return "low";
  }

  return "medium";
}

function nationalityTrackUri(track: NationalityTrack): string | undefined {
  switch (track) {
    case "standard_10_year":
      return makeTrackResourceUri("nationality-standard-10-year");
    case "ibero_2_year":
      return makeTrackResourceUri("nationality-ibero-2-year");
    case "one_year_special":
      return makeTrackResourceUri("nationality-special-1-year");
    case "refugee_5_year":
      return makeTrackResourceUri("nationality-refugee-5-year");
    case "unknown":
      return undefined;
  }
}

function specialNationalityBasisLabel(
  basis: SpecialNationalityBasis,
): string {
  switch (basis) {
    case "born_in_spain":
      return "born in Spain";
    case "married_to_spanish":
      return "one year married to a Spanish citizen";
    case "widowed_from_spanish":
      return "widowed from a Spanish citizen without prior separation";
    case "spanish_parent_or_grandparent":
      return "Spanish parent or grandparent origin basis";
    case "guardianship_of_spanish_person":
      return "guardianship or foster-care basis tied to a Spanish citizen or institution";
    case "not_specified":
      return "not specified";
  }
}

function employmentRouteUri(
  employmentType?: EmploymentType,
  moveReason?: MoveReason,
): string | undefined {
  switch (employmentType) {
    case "spanish_employee":
      return makeRouteResourceUri("work-permit-employees");
    case "foreign_remote_employee":
      return makeRouteResourceUri("digital-nomad-visa");
    case "self_employed":
      return moveReason === "startup_or_innovation"
        ? makeRouteResourceUri("entrepreneur-visa")
        : makeRouteResourceUri("self-employed-work-permit");
    case "highly_qualified_professional":
      return makeRouteResourceUri("highly-qualified-professional-visa");
    default:
      return undefined;
  }
}

export function getVisaOptions(args: {
  nationality: string;
  income_source: IncomeSource;
  intent: Intent;
  employer_location?: "spain" | "outside_spain" | "mixed" | "unknown";
  has_spanish_job_offer?: boolean;
  has_eu_family_link?: boolean;
  eu_family_relationship?: EuFamilyRelationship;
  investment_profile?: "passive_capital" | "operating_business" | "none";
  sponsor_nationality?: string;
  sponsor_exercised_free_movement?: boolean;
}): VisaOptionsResult {
  const nationalityClass = resolveNationality(args.nationality).classification;
  const isEu = nationalityClass === "eu_eea_swiss";
  const sponsor = resolveNationality(args.sponsor_nationality).classification;
  const ranked: RankedRoute[] = [];
  const decisionTrace: DecisionTraceItem[] = [];
  const generalNotes = [
    "This screening uses evergreen route logic rather than annual thresholds or rate tables.",
    "If a route depends on SMI, IPREM, salary floors, or consular practice, confirm the live filing rule before submission.",
  ];
  const ruledOutRoutes: Array<{ title: string; reason: string }> = [
    {
      title: "Golden Visa",
      reason:
        "Spain ended the Golden Visa, so passive capital alone is no longer a residence route.",
    },
  ];
  const relatedResourceUris = [makeTopicResourceUri("route-selection")];
  if (nationalityClass === "unknown" || nationalityClass === "spanish") {
    const spanish = nationalityClass === "spanish";
    return {
      profile_summary: spanish ? "Spanish citizen relocating to Spain." : "Nationality could not be resolved safely.",
      nationality_classification: nationalityClass,
      decision_trace: [{factor:"nationality", finding:spanish ? "Spanish citizenship supplied." : "Missing, unrecognized or ambiguous nationality.", impact:spanish ? "A Spanish citizen does not need a third-country visa or a foreign EU registration certificate." : "No immigration regime is inferred until citizenship is clarified."}],
      key_rules_applied: spanish ? ["Spanish citizens have their own nationality status in Spain; foreigner registration routes are not applicable to the citizen."] : [],
      review_level: spanish ? "low" : "high",
      official_legal_sources: [], current_verification_flags: [], ranked_routes: [], ruled_out_routes: ruledOutRoutes,
      general_notes: spanish ? ["A non-Spanish family member needs a separate application and sponsor/free-movement review."] : ["Supply one unambiguous nationality using a country name or ISO alpha-2/alpha-3 code. Assess multiple citizenships separately."],
      next_actions: spanish ? ["Review any non-Spanish family member separately; prepare ordinary civil and municipal registration as applicable."] : ["Confirm the applicant's citizenship before selecting a visa route."],
      suggested_follow_up_tools: spanish ? [] : ["route_to_legal_fournier_help"],
      related_resource_uris: relatedResourceUris, references: packReferences(relatedResourceUris),
    };
  }


  decisionTrace.push({
    factor: "nationality",
    finding: isEu ? "EU/EEA/Swiss nationality detected." : "Non-EU nationality detected.",
    impact: isEu
      ? "Screen the case as residence registration first, not as a third-country visa tree."
      : "Third-country residence and work routes remain in scope.",
  });

  if (args.has_eu_family_link) {
    relatedResourceUris.push(makeTopicResourceUri("eu-family-route-check"));
    decisionTrace.push({
      factor: "EU family link",
      finding:
        args.eu_family_relationship && args.eu_family_relationship !== "unknown"
          ? `An EU family connection was flagged in the intake with relationship type ${args.eu_family_relationship}.`
          : "An EU family connection was flagged in the intake.",
      impact:
        "A family-member branch may displace a standard third-country route and should be reviewed before filing.",
    });
    generalNotes.push(
      "An EU family link can materially change the route analysis and should be reviewed before locking a standard third-country filing strategy.",
    );
  }

  if (isEu) {
    ranked.push(
      buildRoute(
        ROUTE_DEFINITIONS["eu-registration"],
        "strong",
        100,
        [
          "EU, EEA, and Swiss nationals usually register residence in Spain instead of applying for a third-country visa.",
          "The main issue becomes the residence basis and document sequence rather than visa eligibility.",
        ],
        "Confirm the residence basis for the move and prepare the registration evidence that supports it.",
      ),
    );
    relatedResourceUris.push(makeRouteResourceUri("eu-registration"));

    const uniqueResourceUris = uniqueStrings(relatedResourceUris);

    return {
      profile_summary: `${args.nationality} national with ${args.income_source} income and ${args.intent} intent.`,
      nationality_classification: "eu_eea_swiss",
      decision_trace: decisionTrace,
      key_rules_applied: packRules(uniqueResourceUris),
      review_level: determineVisaReviewLevel({
        isEu,
        employer_location: args.employer_location,
        has_eu_family_link: args.has_eu_family_link,
        ranked_routes: ranked,
      }),
      official_legal_sources: packOfficialSources(uniqueResourceUris),
      current_verification_flags: packVerificationFlags(uniqueResourceUris),
      ranked_routes: ranked,
      ruled_out_routes: ruledOutRoutes,
      general_notes: generalNotes.concat([
        "Third-country work and residence authorizations are usually unnecessary for this nationality class.",
      ]),
      next_actions: uniqueStrings([
        ranked[0].next_step,
        ...packNextActions(uniqueResourceUris),
      ]),
      suggested_follow_up_tools: uniqueTools(["get_residency_path"]),
      related_resource_uris: uniqueResourceUris,
      references: packReferences(uniqueResourceUris),
    };
  }

  if (args.has_eu_family_link) {
    const knownRelationship = args.eu_family_relationship && args.eu_family_relationship !== "unknown";
    if (sponsor === "spanish" && args.sponsor_exercised_free_movement !== undefined) {
      ranked.push(buildRoute(ROUTE_DEFINITIONS["spanish-national-family"], knownRelationship ? "strong" : "possible", knownRelationship ? 99 : 87,
        ["A separate residence route for qualifying relatives of Spanish nationals applies under RD 1155/2024, articles 93–99.", args.sponsor_exercised_free_movement ? "A returning Spanish sponsor may also support an EU-family option if the earlier free-movement residence meets the applicable conditions." : "The Spanish sponsor has not exercised free movement, so the EU-family card is not assumed to be the default."],
        "Check the exact family category, dependency where required, sponsor's Spanish nationality, residence history and filing location."));
      relatedResourceUris.push(makeRouteResourceUri("spanish-national-family"));
    }
    if (sponsor === "eu_eea_swiss" || (sponsor === "spanish" && args.sponsor_exercised_free_movement === true)) {
      ranked.push(buildRoute(ROUTE_DEFINITIONS["eu-family-member-card"], knownRelationship ? "strong" : "possible", knownRelationship ? 98 : 86,
        ["The sponsor nationality supports an EU-family route screen, subject to the precise relationship and qualifying residence basis.", ...(sponsor === "spanish" ? ["The EU route requires evidence of qualifying prior residence under free-movement law; it is an alternative to the Spanish-national-family route."] : [])],
        "Verify relationship evidence and the sponsor's qualifying residence basis before choosing the family-card procedure."));
      relatedResourceUris.push(makeRouteResourceUri("eu-family-member-card"));
    }
    if (sponsor === "unknown" || (sponsor === "spanish" && args.sponsor_exercised_free_movement === undefined)) {
      generalNotes.push("The family route remains unresolved. Supply the sponsor's nationality and, for a Spanish sponsor, whether qualifying free movement was exercised. No EU-family card is assumed from the family flag alone.");
    }
    if (sponsor === "non_eu") generalNotes.push("The sponsor is not Spanish or EU/EEA/Swiss. Check ordinary family reunification separately; the EU-family flag does not establish eligibility.");
  }

  if (args.intent === "retire" || args.income_source === "passive") {
    decisionTrace.push({
      factor: "income and intent",
      finding: "The profile is passive-income or retirement led.",
      impact:
        "Residence-without-work logic becomes primary and work-authorizing routes weaken.",
    });

    ranked.push(
      buildRoute(
        ROUTE_DEFINITIONS["non-lucrative-visa"],
        "strong",
        98,
        [
          "The profile centers on passive means or retirement instead of active work in Spain.",
          "This route is designed for lawful residence without local work activity.",
        ],
        "Confirm that the move is genuinely passive-income based and gather the financial and health-cover evidence for filing.",
      ),
    );
  }

  if (args.intent === "work" && args.income_source === "employee") {
    if (args.employer_location === "outside_spain") {
      decisionTrace.push({
        factor: "employer location",
        finding: "The employer is outside Spain.",
        impact:
          "Foreign-remote work logic is strong and the digital nomad branch moves to the front of the screening order.",
      });

      ranked.push(
        buildRoute(
          ROUTE_DEFINITIONS["digital-nomad-visa"],
          "strong",
          95,
          [
            "Employee income tied to a non-Spanish employer is the core digital nomad pattern.",
            "This route often needs a parallel Beckham screen once the work structure is confirmed.",
          ],
          "Verify the remote-employment documents and confirm that the working relationship remains anchored outside Spain.",
        ),
      );
    }

    if (args.has_spanish_job_offer || args.employer_location === "spain") {
      decisionTrace.push({
        factor: "Spanish job offer",
        finding: "A Spanish-local employment relationship is part of the facts.",
        impact:
          "Sponsorship-based employee routes move ahead of remote-work routes.",
      });

      ranked.push(
        buildRoute(
          ROUTE_DEFINITIONS["work-permit-employees"],
          "strong",
          94,
          [
            "A Spanish job offer points toward local employer sponsorship.",
            "This is the default branch for ordinary Spanish-local employment.",
          ],
          "Collect the contract, sponsoring employer information, and role summary for route validation.",
        ),
      );
      ranked.push(
        buildRoute(
          ROUTE_DEFINITIONS["highly-qualified-professional-visa"],
          "possible",
          84,
          [
            "If the role is senior or specialist, the highly qualified route may be more appropriate than the standard employee permit.",
          ],
          "Check whether the position is senior or specialized enough for the highly qualified route.",
        ),
      );
      ranked.push(
        buildRoute(
          ROUTE_DEFINITIONS["eu-blue-card"],
          "possible",
          80,
          [
            "The Blue Card remains a comparison branch when the role and qualifications are strong enough at filing time.",
          ],
          "Compare the role against the current Blue Card qualification and salary rules before relying on it.",
        ),
      );
    }

    if (
      !args.has_spanish_job_offer &&
      (!args.employer_location || args.employer_location === "unknown")
    ) {
      decisionTrace.push({
        factor: "employer structure",
        finding: "The employer location is unresolved.",
        impact:
          "The screening stays tentative because foreign-remote and Spanish-local work branches lead to different routes.",
      });

      ranked.push(
        buildRoute(
          ROUTE_DEFINITIONS["digital-nomad-visa"],
          "possible",
          78,
          [
            "If the employer remains abroad, the digital nomad route may fit.",
          ],
          "Clarify whether the employer is Spanish or foreign before final route selection.",
        ),
      );
      ranked.push(
        buildRoute(
          ROUTE_DEFINITIONS["work-permit-employees"],
          "possible",
          76,
          [
            "If the job is actually with a Spanish employer, sponsorship logic will control.",
          ],
          "Clarify whether a Spanish employer is sponsoring the role.",
        ),
      );
    }

    if (args.employer_location === "mixed") {
      decisionTrace.push({
        factor: "mixed employer footprint",
        finding: "The facts suggest both Spanish and foreign work links.",
        impact:
          "The agent should confirm which relationship is primary before locking a route recommendation.",
      });

      ranked.push(
        buildRoute(
          ROUTE_DEFINITIONS["digital-nomad-visa"],
          "possible",
          82,
          [
            "Mixed facts may still fit a remote-work branch if the foreign relationship is primary.",
          ],
          "Confirm whether the Spanish work footprint is incidental or central to the move.",
        ),
      );
      ranked.push(
        buildRoute(
          ROUTE_DEFINITIONS["work-permit-employees"],
          "possible",
          81,
          [
            "If the Spanish-local role is primary, sponsorship-based work authorization may be the cleaner fit.",
          ],
          "Confirm which employment relationship is primary for the move.",
        ),
      );
    }
  }

  if (args.intent === "work" && args.income_source === "freelancer") {
    decisionTrace.push({
      factor: "work model",
      finding: "The profile is freelance rather than employee-based.",
      impact:
        "The screening should separate foreign-client nomad logic from Spain-facing self-employment logic.",
    });

    if (args.employer_location === "outside_spain") {
      ranked.push(
        buildRoute(
          ROUTE_DEFINITIONS["digital-nomad-visa"],
          "strong",
          96,
          [
            "Freelance income from outside Spain fits the foreign-client nomad branch.",
          ],
          "Confirm that the client base remains primarily non-Spanish before relying on the nomad route.",
        ),
      );
    }

    if (!args.employer_location || args.employer_location === "unknown") {
      ranked.push(
        buildRoute(
          ROUTE_DEFINITIONS["digital-nomad-visa"],
          "possible",
          82,
          [
            "The nomad route remains possible if the client base proves to be foreign-led.",
          ],
          "Clarify whether the client base is mainly foreign or mainly Spanish.",
        ),
      );
    }

    ranked.push(
      buildRoute(
        ROUTE_DEFINITIONS["self-employed-work-permit"],
        args.employer_location === "outside_spain" ? "possible" : "strong",
        args.employer_location === "outside_spain" ? 86 : 91,
        [
          "Spain-facing self-employment usually belongs in the self-employed permit branch.",
        ],
        "Decide whether the business is mainly Spain-facing or foreign-client-facing before choosing the filing route.",
      ),
    );
    ranked.push(
      buildRoute(
        ROUTE_DEFINITIONS["entrepreneur-visa"],
        args.investment_profile === "operating_business" ? "strong" : "possible",
        args.investment_profile === "operating_business" ? 88 : 74,
        [
          "The entrepreneur route gets stronger when the project is an innovative business rather than ordinary freelance work.",
        ],
        "Pressure-test whether the project is innovative enough for Spain's entrepreneur pathway.",
      ),
    );
  }

  if (args.intent === "invest") {
    decisionTrace.push({
      factor: "investment intent",
      finding: "The move is framed as investment-led.",
      impact:
        "The remaining evergreen branch is an active operating-business route, not passive-investment residence.",
    });

    ranked.push(
      buildRoute(
        ROUTE_DEFINITIONS["entrepreneur-visa"],
        args.investment_profile === "operating_business" ? "strong" : "possible",
        args.investment_profile === "operating_business" ? 92 : 76,
        [
          "Spain no longer offers passive-investment residence, so active business formation matters.",
          "The entrepreneur route is the surviving investment-adjacent branch when the project is operational and innovative.",
        ],
        "Frame the plan as an operating business project and not as passive capital deployment.",
      ),
    );
  }

  ranked.sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    ranked.push(
      buildRoute(
        ROUTE_DEFINITIONS["work-permit-employees"],
        "possible",
        70,
        [
          "The intake facts are too incomplete to rank a cleaner route with confidence.",
        ],
        "Clarify the employer location, work model, and whether the move involves active work or passive means.",
      ),
    );
    generalNotes.push(
      "The intake is incomplete enough that the route ranking should be treated as provisional until the work model is clarified.",
    );
  }

  const uniqueResourceUris = uniqueStrings([
    ...relatedResourceUris,
    ...ranked.slice(0, 3).map((route) => route.related_resource_uri),
  ]);

  const nextActions = uniqueStrings([
    ranked[0]?.next_step ?? "",
    ...packNextActions(uniqueResourceUris),
    args.has_eu_family_link
      ? "Resolve the sponsor nationality and the appropriate Spanish-national or EU-family branch before selecting a filing route."
      : "",
  ]).slice(0, 6);

  const suggestedFollowUpTools =
    args.intent === "work"
      ? uniqueTools(
          args.has_eu_family_link
            ? [
                "check_beckham_eligibility",
                "compare_tax_regimes",
                "route_to_legal_fournier_help",
              ]
            : ["check_beckham_eligibility", "compare_tax_regimes"],
        )
      : uniqueTools(
          args.has_eu_family_link
            ? ["get_residency_path", "route_to_legal_fournier_help"]
            : ["get_residency_path"],
        );

  return {
    profile_summary: `${args.nationality} national with ${args.income_source} income and ${args.intent} intent.`,
    nationality_classification: "non_eu",
    decision_trace: decisionTrace,
    key_rules_applied: packRules(uniqueResourceUris),
    review_level: determineVisaReviewLevel({
      isEu,
      employer_location: args.employer_location,
      has_eu_family_link: args.has_eu_family_link,
      ranked_routes: ranked,
    }),
    official_legal_sources: packOfficialSources(uniqueResourceUris),
    current_verification_flags: packVerificationFlags(uniqueResourceUris),
    ranked_routes: ranked,
    ruled_out_routes: ruledOutRoutes,
    general_notes: generalNotes,
    next_actions: nextActions,
    suggested_follow_up_tools: suggestedFollowUpTools,
    related_resource_uris: uniqueResourceUris,
    references: packReferences(uniqueResourceUris),
  };
}

export interface BeckhamEligibilityArgs {
  /** Legacy elapsed-time hint; never substitutes for the five tax-period check. */
  years_since_last_spanish_residency?: number;
  employment_type: EmploymentType;
  move_reason: MoveReason;
  ownership_band?: "none" | "under_25" | "25_or_more";
  move_year?: number;
  spanish_tax_resident_years?: number[];
  prior_tax_periods_confirmed?: boolean;
  qualifying_activity_confirmed?: boolean;
  income_mix_requirement_met?: boolean;
  relocation_link_confirmed?: boolean;
  no_disqualifying_permanent_establishment?: boolean;
  election_deadline_met?: boolean;
  director_entity_is_patrimonial?: boolean;
  director_is_related_party?: boolean;
}
export function checkBeckhamEligibility(args: BeckhamEligibilityArgs): BeckhamEligibilityResult {
  const decisionTrace: DecisionTraceItem[] = [];
  const reasons: string[] = [];
  const missing: string[] = [];
  const blockers: string[] = [];
  const qualifyingPaths: string[] = [];
  const relatedResourceUris = [makeTopicResourceUri("beckham-regime"), makeProcessResourceUri("tax-regime-review")];
  const routeUri = employmentRouteUri(args.employment_type, args.move_reason);
  if (routeUri) relatedResourceUris.push(routeUri);
  const year = args.move_year;
  const history = args.spanish_tax_resident_years;
  const priorYears = year === undefined ? [] : Array.from({length:5}, (_, index) => year - index - 1);
  const residentInPriorPeriod = priorYears.filter(period => history?.includes(period));
  if (year !== undefined && year < 2023) missing.push("This screen covers the post-2023 article 93 rules; an earlier move needs the historical regime checked.");
  if (residentInPriorPeriod.length) blockers.push(`Spanish tax residence was supplied for prior tax period(s) ${residentInPriorPeriod.join(", ")}, within the five periods before the move year.`);
  if (year === undefined || history === undefined || args.prior_tax_periods_confirmed !== true) missing.push("Confirm the move year and a complete list of Spanish tax-residence years covering each of the five prior tax periods. An elapsed-year gap is not that evidence.");
  else if (!residentInPriorPeriod.length) reasons.push(`No Spanish tax residence was declared in the five tax periods ${priorYears.slice().reverse().join(", ")}.`);
  decisionTrace.push({factor:"prior tax periods", finding:year === undefined ? "Move year was not supplied." : `Move year ${year}; checked prior periods ${priorYears.slice().reverse().join(", ")}.`, impact:residentInPriorPeriod.length ? "A prior-period residence condition fails." : "A complete confirmed tax-year history is needed before the condition can pass."});
  const requireConfirmed = (value: boolean | undefined, label: string) => {
    if (value === false) blockers.push(label + " was reported as not satisfied.");
    else if (value !== true) missing.push("Confirm " + label.toLowerCase() + ".");
  };
  requireConfirmed(args.relocation_link_confirmed, "The causal link between the qualifying activity and relocation, including the permitted timing");
  requireConfirmed(args.qualifying_activity_confirmed, "The legally qualifying activity and applicable exclusions");
  requireConfirmed(args.no_disqualifying_permanent_establishment, "Absence of disqualifying permanent-establishment income under the applicable article 93 branch");
  requireConfirmed(args.election_deadline_met, "The applicable Modelo 149 election deadline and supporting registration dates");
  switch (args.employment_type) {
    case "spanish_employee":
      if (["new_spanish_job", "intragroup_transfer"].includes(args.move_reason)) qualifyingPaths.push("Qualifying Spanish employment or employer-ordered transfer");
      else missing.push("Tie the move to qualifying Spanish employment or an employer-ordered transfer; a family-move label does not establish that path.");
      break;
    case "foreign_remote_employee":
      if (args.move_reason === "foreign_remote_work") qualifyingPaths.push("Qualifying employee remote-work relocation");
      else missing.push("Confirm that the relocation follows qualifying remote employment, rather than inferring it from a profession label.");
      break;
    case "director_lt25":
    case "director_gte25":
      if (args.move_reason === "director_appointment") qualifyingPaths.push("Director appointment route subject to the entity tests");
      else missing.push("Confirm the move follows the acquisition of director status.");
      if (args.director_entity_is_patrimonial === undefined) missing.push("Determine whether the director's entity is patrimonial under the Corporate Tax Act.");
      if (args.director_entity_is_patrimonial === true) {
        if (args.director_is_related_party === true) blockers.push("A director of a patrimonial entity cannot have a shareholding that makes the entity related under the applicable test.");
        else if (args.director_is_related_party !== false) missing.push("Resolve the related-party shareholding test for the patrimonial entity.");
      }
      break;
    case "self_employed":
      if (args.move_reason === "startup_or_innovation") qualifyingPaths.push("Entrepreneur activity qualified under article 70 of Law 14/2013");
      else missing.push("Ordinary self-employment alone does not establish an article 93 entry path; identify any approved entrepreneur or qualifying professional activity.");
      break;
    case "highly_qualified_professional":
      if (args.move_reason === "qualifying_professional_activity") qualifyingPaths.push("Highly qualified activity for an eligible startup or qualifying training, research, development or innovation");
      else missing.push("Identify the qualifying professional-activity relocation. A highly-qualified job title or immigration permit alone is insufficient for this tax path.");
      requireConfirmed(args.income_mix_requirement_met, "Qualifying remuneration exceeding 40% of combined business, professional and employment income");
      break;
    default:
      missing.push("Identify an article 93 qualifying work or activity path.");
  }
  decisionTrace.push({factor:"qualifying path", finding:qualifyingPaths[0] ?? "No qualifying path established.", impact:"The activity, relocation, timing and exclusions must all be supported before eligibility can be screened positively."});
  const status: BeckhamStatus = blockers.length ? "not_eligible" : missing.length || !qualifyingPaths.length ? "needs_more_info" : "eligible";
  const resources = uniqueStrings(relatedResourceUris);
  return {
    status,
    summary:status === "eligible" ? "The supplied, explicitly confirmed facts pass this preliminary article 93 screen; document and filing review remain necessary." : status === "not_eligible" ? "At least one supplied fact fails this article 93 screen." : "Beckham eligibility remains unresolved until the listed legal and timing facts are confirmed.",
    decision_trace:decisionTrace,
    key_rules_applied:packRules(resources),
    review_level:status === "eligible" ? "medium" : "high",
    official_legal_sources:packOfficialSources(resources),
    current_verification_flags:packVerificationFlags(resources),
    reasons:uniqueStrings(reasons),
    blocking_issues:uniqueStrings([...blockers, ...missing]),
    qualifying_paths:qualifyingPaths,
    next_steps:status === "eligible" ? ["Check the supporting evidence and Modelo 149 filing dates with the actual relocation chronology.", "Compare the tax regimes using the same confirmed eligibility facts."] : uniqueStrings([...missing, ...blockers, "Keep standard resident taxation as the baseline until any unresolved special-regime conditions are reviewed."]),
    suggested_follow_up_tools:status === "eligible" ? ["compare_tax_regimes"] : ["compare_tax_regimes", "route_to_legal_fournier_help"],
    related_resource_uris:resources,
    references:packReferences(resources),
  };
}

export function getResidencyPath(args: {
  current_status: CurrentStatus;
  years_in_spain: number;
  nationality_track?: NationalityTrack;
  special_nationality_basis?: SpecialNationalityBasis;
  has_absence_concerns?: boolean;
  qualifying_legal_residence_years?: number;
  continuity_confirmed?: boolean;
}): ResidencyPathResult {
  const track = args.nationality_track ?? "unknown";
  const qualifyingYears = args.qualifying_legal_residence_years;
  const nationalityClockVerified = qualifyingYears !== undefined && qualifyingYears >= 0 && qualifyingYears <= args.years_in_spain && args.continuity_confirmed === true && !args.has_absence_concerns && !["student", "irregular_status", "new_arrival"].includes(args.current_status);
  const specialBasis = args.special_nationality_basis ?? "not_specified";
  const decisionTrace: DecisionTraceItem[] = [];
  const milestones: string[] = [];
  const nextSteps: string[] = [];
  const cautionNotes: string[] = [];
  const relatedResourceUris = [
    makeProcessResourceUri("residency-clock"),
    makeTrackResourceUri("permanent-residency-5-year"),
  ];
  const trackUri = nationalityTrackUri(track);
  if (trackUri) {
    relatedResourceUris.push(trackUri);
  }
  if (track !== "unknown" || args.has_absence_concerns) {
    relatedResourceUris.push(makeTopicResourceUri("nationality-continuity"));
  }
  if (args.current_status === "eu_citizen_registered") {
    relatedResourceUris.push(makeRouteResourceUri("eu-registration"));
  }
  if (args.current_status === "eu_family_member_resident") {
    relatedResourceUris.push(makeRouteResourceUri("eu-family-member-card"));
    relatedResourceUris.push(makeTopicResourceUri("eu-family-route-check"));
  }

  let permanentResidencyStatus: ResidencyPathResult["permanent_residency_status"] =
    "not_started";
  let nationalityStatus: ResidencyPathResult["nationality_status"] = "unknown_track";

  decisionTrace.push({
    factor: "current status",
    finding: `Current status supplied: ${args.current_status}.`,
    impact:
      "Time in Spain only helps once the legal status behind that time is understood.",
  });
  decisionTrace.push({
    factor: "time in Spain",
    finding: `${args.years_in_spain} year(s) supplied.`,
    impact:
      "Permanent residence and nationality depend on elapsed time, but not every status counts the same way.",
  });
  if (args.has_absence_concerns) {
    decisionTrace.push({
      factor: "absence or continuity concern",
      finding: "The intake flagged possible absences or continuity issues.",
      impact:
        "The timeline should stay in review territory until the continuity facts are checked.",
    });
    cautionNotes.push(
      "Absences or continuity concerns can interrupt both residence and nationality clocks even when the headline year count looks sufficient.",
    );
    nextSteps.push(
      "Audit the absence history and status continuity before treating any residence or nationality timeline as filing-ready.",
    );
  }

  if (args.current_status === "long_term_resident") {
    permanentResidencyStatus = "already_long_term";
    milestones.push("Long-term residence status is already in place.");
  } else if (
    args.current_status === "eu_citizen_registered" ||
    args.current_status === "eu_family_member_resident"
  ) {
    decisionTrace.push({
      factor: "residence regime",
      finding:
        args.current_status === "eu_citizen_registered"
          ? "EU free-movement residence status was selected."
          : "EU-family-member residence status was selected.",
      impact:
        "The five-year milestone points to EU permanent residence under Real Decreto 240/2007, not automatically to third-country long-term residence under Real Decreto 1155/2024.",
    });
    if (args.years_in_spain >= 5) {
      permanentResidencyStatus = "likely_eligible";
      milestones.push(
        args.current_status === "eu_citizen_registered"
          ? "The five-year EU permanent residence milestone may already be open."
          : "The five-year EU-family permanent residence milestone may already be open.",
      );
      nextSteps.push(
        args.current_status === "eu_citizen_registered"
          ? "Verify the continuous EU residence record and use the EU permanent-residence route rather than labeling the case as third-country long-term residence by default."
          : "Verify the continuous EU-family residence record and use the permanent family-card route rather than labeling the case as third-country long-term residence by default.",
      );
      cautionNotes.push(
        "This looks like an EU permanent-residence analysis, not a third-country long-term residence filing under the general foreigners regulation.",
      );
    } else if (args.years_in_spain > 0) {
      permanentResidencyStatus = "building_time";
      milestones.push(
        args.current_status === "eu_citizen_registered"
          ? "The profile is building toward the five-year EU permanent residence milestone."
          : "The profile is building toward the five-year permanent EU-family residence milestone.",
      );
      nextSteps.push(
        args.current_status === "eu_citizen_registered"
          ? "Keep the EU residence basis and continuity record clean before counting toward the permanent EU certificate."
          : "Keep the family-card basis and continuity record clean before counting toward permanent residence under the EU-family regime.",
      );
      cautionNotes.push(
        "Do not flatten EU registration time into the third-country long-term residence track without checking the underlying regime.",
      );
    } else {
      permanentResidencyStatus = "not_started";
      milestones.push(
        args.current_status === "eu_citizen_registered"
          ? "The EU permanent residence clock has not meaningfully started yet."
          : "The EU-family permanent residence clock has not meaningfully started yet.",
      );
    }
  } else if (args.current_status === "irregular_status") {
    permanentResidencyStatus = "review_needed";
    milestones.push("Status needs regularization before the long-term residence clock can be relied on.");
    nextSteps.push("Solve status regularization before counting toward long-term residence.");
    cautionNotes.push("Irregular periods should not be treated like clean residence time.");
  } else if (args.current_status === "student") {
    permanentResidencyStatus = "review_needed";
    milestones.push("Student stay needs case-specific counting review.");
    nextSteps.push("Review whether status conversion is needed before relying on the long-term residence timeline.");
    cautionNotes.push("Student periods do not map automatically onto the ordinary long-term residence clock.");
  } else if (args.years_in_spain >= 5) {
    permanentResidencyStatus = "likely_eligible";
    milestones.push("The five-year long-term residence milestone may already be open.");
    nextSteps.push("Review continuity, absences, and residence history for the long-term filing.");
  } else if (args.years_in_spain > 0) {
    permanentResidencyStatus = "building_time";
    milestones.push("The profile is building toward the five-year long-term residence milestone.");
    nextSteps.push("Maintain a clean renewal history and track absences from Spain.");
  } else {
    permanentResidencyStatus = "not_started";
    milestones.push("The long-term residence clock has not meaningfully started yet.");
    nextSteps.push("Establish and maintain qualifying lawful residence before counting toward long-term residence.");
  }

  if (track !== "unknown" && !nationalityClockVerified) {
    nationalityStatus = "review_needed";
    milestones.push("The nationality clock is not verified; elapsed time in Spain alone does not establish qualifying residence.");
    cautionNotes.push("Nationality requires legal, continuous residence immediately before applying. Student stay, irregular periods and unresolved absences cannot be counted as qualifying nationality residence.");
    nextSteps.push("Supply the number of qualifying legal-residence years and confirm continuity immediately before filing, with status and absence evidence.");
  } else {
  switch (track) {
    case "ibero_2_year":
      decisionTrace.push({
        factor: "nationality track",
        finding: "Fast-track two-year nationality branch selected.",
        impact:
          "The nationality analysis may open earlier than the standard ten-year track.",
      });
      if ((qualifyingYears ?? 0) >= 2) {
        nationalityStatus = "likely_eligible";
        milestones.push("The reduced nationality timeline may already be open.");
        nextSteps.push("Prepare the nationality evidence pack and review exam requirements if they apply.");
      } else {
        nationalityStatus = "building_time";
        milestones.push("The reduced nationality clock is still running.");
      }
      break;
    case "one_year_special":
      decisionTrace.push({
        factor: "nationality track",
        finding: "Special one-year nationality branch selected.",
        impact:
          "The answer depends on the exact special basis, so the track should be confirmed carefully.",
      });
      decisionTrace.push({
        factor: "special basis",
        finding: `Special basis provided: ${specialNationalityBasisLabel(specialBasis)}.`,
        impact:
          specialBasis === "not_specified"
            ? "The one-year track cannot be treated as filing-ready until the article 22 basis is identified."
            : "The claimed one-year path is tied to a concrete article 22 basis that can be checked.",
      });
      if (specialBasis === "not_specified") {
        nationalityStatus = "review_needed";
        milestones.push(
          "A one-year nationality exception was selected, but the legal basis was not identified.",
        );
        nextSteps.push(
          "Identify the exact article 22 basis before promising a one-year nationality route.",
        );
      } else if ((qualifyingYears ?? 0) >= 1) {
        nationalityStatus = "likely_eligible";
        milestones.push(
          `The one-year nationality path may be open through the basis: ${specialNationalityBasisLabel(specialBasis)}.`,
        );
        nextSteps.push(
          "Check that the special article 22 basis and the residence continuity evidence are both documented before filing nationality.",
        );
      } else {
        nationalityStatus = "building_time";
        milestones.push("The one-year nationality clock is still running.");
      }
      cautionNotes.push(
        "The one-year nationality path only works if the specific legal basis and immediately-prior legal residence can both be proven.",
      );
      break;
    case "refugee_5_year":
      decisionTrace.push({
        factor: "nationality track",
        finding: "Refugee nationality branch selected.",
        impact:
          "Nationality timing should be screened under the refugee-specific track rather than the standard path.",
      });
      if ((qualifyingYears ?? 0) >= 5) {
        nationalityStatus = "likely_eligible";
        milestones.push("The refugee nationality timeline may be complete.");
      } else {
        nationalityStatus = "building_time";
        milestones.push("The refugee nationality clock is still running.");
      }
      break;
    case "standard_10_year":
      decisionTrace.push({
        factor: "nationality track",
        finding: "Standard ten-year nationality branch selected.",
        impact:
          "Nationality remains a longer track than long-term residence in this case.",
      });
      if ((qualifyingYears ?? 0) >= 10) {
        nationalityStatus = "likely_eligible";
        milestones.push("The standard nationality timeline may be complete.");
      } else {
        nationalityStatus = "building_time";
        milestones.push("The standard nationality clock is still running.");
      }
      break;
    case "unknown":
      decisionTrace.push({
        factor: "nationality track",
        finding: "No nationality track was provided.",
        impact:
          "The tool can still answer the long-term residence side, but the nationality timeline stays provisional.",
      });
      nationalityStatus = "unknown_track";
      cautionNotes.push("Confirm the nationality track before giving a final nationality timeline.");
      break;
  }

  }
  if (args.current_status === "citizenship_applicant") {
    nationalityStatus = "already_in_process";
    milestones.push("Nationality is already in process.");
  }

  if (args.has_absence_concerns && permanentResidencyStatus === "likely_eligible") {
    permanentResidencyStatus = "review_needed";
    for (let index = milestones.length - 1; index >= 0; index--) if (/milestone may already be open/.test(milestones[index])) milestones.splice(index, 1);
    milestones.push("Permanent-residence timing needs continuity and absence review.");
  }
  const uniqueResourceUris = uniqueStrings(relatedResourceUris);
  const reviewLevel: ReviewLevel =
    (track !== "unknown" && !nationalityClockVerified) ||
    args.current_status === "irregular_status" ||
    args.current_status === "student" ||
    args.has_absence_concerns ||
    (track === "one_year_special" && specialBasis === "not_specified")
      ? "high"
      : track === "unknown" ||
          args.current_status === "new_arrival" ||
          args.current_status === "eu_citizen_registered" ||
          args.current_status === "eu_family_member_resident"
        ? "medium"
        : "low";

  const summary =
    args.current_status === "eu_citizen_registered" && permanentResidencyStatus === "likely_eligible"
      ? "The five-year milestone may support EU permanent residence, while nationality timing still depends on the confirmed nationality track."
      : args.current_status === "eu_family_member_resident" && permanentResidencyStatus === "likely_eligible"
        ? "The five-year milestone may support permanent residence under the EU-family regime, while nationality timing still depends on the confirmed track and continuity."
      : permanentResidencyStatus === "already_long_term"
      ? "The long-term residence milestone is already satisfied; the remaining question is nationality timing or document maintenance."
      : permanentResidencyStatus === "likely_eligible"
        ? "The case may already be ripe for long-term residence, with nationality timing depending on the chosen track."
        : "The case is still building toward long-term residence or needs a status review before the clock can be trusted.";

  return {
    summary,
    permanent_residency_status: permanentResidencyStatus,
    nationality_status: nationalityStatus,
    decision_trace: decisionTrace,
    key_rules_applied: packRules(uniqueResourceUris),
    review_level: reviewLevel,
    official_legal_sources: packOfficialSources(uniqueResourceUris),
    current_verification_flags: packVerificationFlags(uniqueResourceUris),
    milestones: uniqueStrings(milestones),
    next_steps: uniqueStrings([
      ...nextSteps,
      ...packNextActions(uniqueResourceUris),
    ]),
    caution_notes: uniqueStrings(cautionNotes),
    suggested_follow_up_tools:
      args.current_status === "new_arrival"
        ? uniqueTools(["explain_nie_process"])
        : reviewLevel === "high"
          ? uniqueTools(["route_to_legal_fournier_help"])
          : [],
    related_resource_uris: uniqueResourceUris,
    references: packReferences(uniqueResourceUris),
  };
}

export function explainNieProcess(): NieProcessResult {
  const relatedResourceUris = [makeProcessResourceUri("nie-tie")];

  return {
    summary:
      "The stable workflow is to separate NIE number assignment from TIE card issuance, then match the appointment, form, and supporting documents to the exact procedure.",
    decision_trace: [
      {
        factor: "procedure type",
        finding: "NIE number handling and TIE card issuance are separate procedures.",
        impact:
          "The first step is always to identify whether the client needs a number, a card, or a card renewal.",
      },
      {
        factor: "administrative sequence",
        finding: "Spanish immigration offices expect the appointment type to match the procedure exactly.",
        impact:
          "Agents should answer with the correct sequence instead of generic appointment advice.",
      },
    ],
    key_rules_applied: packRules(relatedResourceUris),
    review_level: "low",
    official_legal_sources: packOfficialSources(relatedResourceUris),
    current_verification_flags: packVerificationFlags(relatedResourceUris),
    key_distinctions: [
      "The NIE is an identification number, not the physical residence card.",
      "The TIE is the physical foreigner identity card issued after or alongside residence authorization steps.",
      "The appointment category, form, and payment proof must match the exact procedure requested.",
    ],
    forms: [
      "EX-15 for number-assignment style NIE requests.",
      "EX-17 for TIE issuance or renewal after the residence basis exists.",
      "Modelo 790 payment form tied to the actual procedure in use.",
    ],
    steps: [
      {
        step: 1,
        title: "Classify the request",
        detail:
          "Decide whether the client needs only a foreigner identification number, an initial TIE card, fingerprints, or a card renewal.",
      },
      {
        step: 2,
        title: "Match the legal basis",
        detail:
          "Tie the request to the legal reason for being in Spain, because the same office will not treat every NIE or TIE question the same way.",
      },
      {
        step: 3,
        title: "Prepare the form set",
        detail:
          "Use the form and payment proof that correspond to the actual procedure, together with passport and residence-supporting documents.",
      },
      {
        step: 4,
        title: "Book the correct appointment",
        detail:
          "Choose the appointment category that matches the exact procedure rather than a generic immigration slot.",
      },
      {
        step: 5,
        title: "Attend and submit",
        detail:
          "Bring originals, copies, payment proof, and any authorization or residence evidence that supports the request.",
      },
      {
        step: 6,
        title: "Complete the post-appointment step",
        detail:
          "For TIE cases, this usually means fingerprints, pickup tracking, and card collection using the office's sequence.",
      },
    ],
    common_mistakes: [
      "Treating NIE and TIE as interchangeable.",
      "Booking the wrong appointment category.",
      "Bringing the wrong form for the actual procedure.",
      "Treating payment proof as optional.",
    ],
    next_actions: packNextActions(relatedResourceUris),
    suggested_follow_up_tools: [],
    related_resource_uris: relatedResourceUris,
    references: packReferences(relatedResourceUris),
  };
}

export function compareTaxRegimes(args: {
  employment_type?: EmploymentType;
  has_foreign_income?: boolean;
  has_significant_foreign_assets?: boolean;
  prefers_predictability?: boolean;
  beckham_assessment?: BeckhamEligibilityArgs;
}): TaxRegimeResult {
  const assessment = args.beckham_assessment ? checkBeckhamEligibility(args.beckham_assessment) : undefined;
  const assessmentMatches = !!args.beckham_assessment && args.beckham_assessment.employment_type === args.employment_type;
  const eligibilityConfirmed = assessmentMatches && assessment?.status === "eligible";
  const decisionTrace: DecisionTraceItem[] = [];
  const likelyFitNotes: string[] = [];
  const caveats = [
    "This comparison is conceptual and intentionally excludes hardcoded annual rates and thresholds.",
    "Beckham should be screened through the actual relocation and work structure before treating it as available.",
    "Foreign income and foreign assets can change the importance of tax-scope questions even when the immigration route stays the same.",
  ];
  const relatedResourceUris = [
    makeTopicResourceUri("tax-regimes"),
    makeProcessResourceUri("tax-regime-review"),
    makeTopicResourceUri("beckham-regime"),
  ];

  const routeUri = employmentRouteUri(args.employment_type);
  if (routeUri) {
    relatedResourceUris.push(routeUri);
  }

  let beckhamSignals = 0;
  let standardSignals = 0;

  switch (args.employment_type) {
    case "spanish_employee":
    case "foreign_remote_employee":
    case "highly_qualified_professional":
      beckhamSignals += 2;
      decisionTrace.push({
        factor: "employment structure",
        finding: `Employment type ${args.employment_type} can keep Beckham in play.`,
        impact:
          "The comparison should test regime fit rather than assuming the standard resident regime is the only option.",
      });
      likelyFitNotes.push(
        "The work structure is at least compatible with a Beckham screen, so the special regime remains a live branch.",
      );
      break;
    case "director_lt25":
      beckhamSignals += 1;
      standardSignals += 1;
      decisionTrace.push({
        factor: "employment structure",
        finding:
          "Lower-ownership director profile selected, but director cases still need entity-type and related-party review.",
        impact:
          "The comparison can keep Beckham in play, but should not prefer it without checking the current director tests under article 93.",
      });
      likelyFitNotes.push(
        "A director profile below the cleaner ownership band still needs current entity-type review before Beckham is treated as available.",
      );
      break;
    case "self_employed":
      standardSignals += 2;
      decisionTrace.push({
        factor: "employment structure",
        finding: `Employment type ${args.employment_type} is structurally weaker for Beckham.`,
        impact:
          "Standard resident-tax analysis becomes the more reliable baseline unless other facts materially change the structure.",
      });
      likelyFitNotes.push(
        "The work structure leans away from Beckham and back toward standard resident taxation.",
      );
      break;
    case "director_gte25":
      beckhamSignals += 1;
      standardSignals += 2;
      decisionTrace.push({
        factor: "employment structure",
        finding:
          "Higher-ownership director profile selected, which raises patrimonial-entity and related-party concerns.",
        impact:
          "The comparison should usually stay in depends-or-standard territory until the current director tests are verified.",
      });
      likelyFitNotes.push(
        "Do not use a simple ownership cutoff as a final Beckham answer for director cases.",
      );
      break;
    case "unknown":
    case undefined:
      decisionTrace.push({
        factor: "employment structure",
        finding: "Employment structure is missing or unknown.",
        impact:
          "The comparison can explain tradeoffs, but not recommend Beckham safely without a qualifying entry path.",
      });
      likelyFitNotes.push(
        "The work structure is not clear enough to prefer Beckham or standard resident taxation confidently.",
      );
      break;
  }

  if (args.has_foreign_income) {
    beckhamSignals += 1;
    decisionTrace.push({
      factor: "foreign income",
      finding: "Material foreign-source income was flagged.",
      impact:
        "Scope-of-taxation questions become more important than headline rate comparisons.",
    });
    likelyFitNotes.push(
      "Foreign-source income makes the scope difference between regimes more important.",
    );
  }

  if (args.has_significant_foreign_assets) {
    beckhamSignals += 1;
    decisionTrace.push({
      factor: "foreign assets",
      finding: "Material foreign assets were flagged.",
      impact:
        "Foreign-asset reporting and scope issues matter more than a simple rate comparison.",
    });
    likelyFitNotes.push(
      "Foreign assets increase the importance of scope and reporting analysis.",
    );
  }

  if (args.prefers_predictability) {
    beckhamSignals += 1;
    decisionTrace.push({
      factor: "preference",
      finding: "The user values predictability.",
      impact:
        "A more bounded regime can be attractive when the entry path is available, but it still has to be legally open first.",
    });
    likelyFitNotes.push(
      "If Beckham is available, its bounded structure may better match a predictability preference.",
    );
  }

  let recommendation: TaxRegimeRecommendation;
  if (!args.employment_type || args.employment_type === "unknown") {
    recommendation = "depends";
  } else if (standardSignals >= beckhamSignals + 2) {
    recommendation = "standard_irpf";
  } else if (beckhamSignals >= standardSignals + 2) {
    recommendation = "beckham";
  } else {
    recommendation = "depends";
  }

  if (!eligibilityConfirmed && recommendation === "beckham") recommendation = "depends";
  if (assessmentMatches && assessment?.status === "not_eligible") recommendation = "standard_irpf";
  if (!eligibilityConfirmed) {
    decisionTrace.push({factor:"Beckham eligibility", finding:assessmentMatches ? assessment?.summary ?? "Eligibility unresolved." : "No matching complete Beckham assessment supplied.", impact:"Foreign income, assets and preferences cannot make an unavailable or unverified tax regime eligible."});
    caveats.push(...(assessment?.blocking_issues ?? ["Run check_beckham_eligibility and pass the same full facts as beckham_assessment before preferring Beckham."]));
  }
  const nextActions =
    recommendation === "beckham"
      ? [
          "Run a Beckham eligibility check against the actual move structure before relying on the regime.",
          "Inventory foreign income and foreign assets so the scope comparison stays fact-based.",
        ]
      : recommendation === "standard_irpf"
        ? [
            "Use standard resident-tax analysis as the baseline unless the work structure changes materially.",
            "If the move route is still unclear, confirm the immigration and work structure before revisiting Beckham.",
          ]
        : [
            "Clarify the employment structure before giving a firm regime recommendation.",
            "Treat the answer as a scope-and-fit analysis rather than a headline-rate comparison.",
          ];

  const comparison = [
    {
      topic: "Entry path",
      beckham:
        "Requires the move and work structure to fit a recognized impatriate-style entry path.",
      standard_irpf:
        "Applies as the default resident-tax regime once the person becomes tax resident in Spain.",
    },
    {
      topic: "Tax scope framing",
      beckham:
        "Often matters most when the client wants a more bounded tax-scope analysis tied to the qualifying regime.",
      standard_irpf:
        "Treats the person as an ordinary Spanish tax resident and becomes the baseline when Beckham is unavailable.",
    },
    {
      topic: "Foreign income",
      beckham:
        "Can be attractive when foreign-source income is material and the regime is actually available.",
      standard_irpf:
        "Requires a fuller ordinary resident analysis of foreign-source income and related compliance.",
    },
    {
      topic: "Foreign assets and reporting",
      beckham:
        "Still needs careful review, but the scope question is usually central to why clients ask about the regime.",
      standard_irpf:
        "Foreign assets sit inside the ordinary resident-tax review and should be screened in full.",
    },
    {
      topic: "Practical comparison style",
      beckham:
        "Should be discussed as availability plus scope, not as a shortcut to a single headline number.",
      standard_irpf:
        "Remains the safest baseline when the special regime cannot be confirmed cleanly.",
    },
  ];

  const uniqueResourceUris = uniqueStrings(relatedResourceUris);
  const reviewLevel: ReviewLevel =
    !eligibilityConfirmed || !args.employment_type || args.employment_type === "unknown"
      ? "high"
      : recommendation === "depends"
        ? "medium"
        : assessment?.review_level ?? "medium";

  const summary =
    recommendation === "beckham"
      ? "The profile conceptually leans toward a Beckham-first review, subject to route-based eligibility."
      : recommendation === "standard_irpf"
        ? "The profile conceptually leans toward standard Spanish resident-tax treatment."
        : "The tax answer depends on clarifying the qualifying work structure before preferring Beckham or standard resident taxation.";

  return {
    recommendation,
    summary,
    decision_trace: decisionTrace,
    key_rules_applied: packRules(uniqueResourceUris),
    review_level: reviewLevel,
    official_legal_sources: packOfficialSources(uniqueResourceUris),
    current_verification_flags: packVerificationFlags(uniqueResourceUris),
    likely_fit_notes: uniqueStrings(likelyFitNotes),
    comparison,
    caveats,
    next_actions: nextActions,
    suggested_follow_up_tools:
      recommendation === "beckham"
        ? uniqueTools(["check_beckham_eligibility"])
        : recommendation === "depends"
          ? uniqueTools([
              "get_visa_options",
              "check_beckham_eligibility",
              "route_to_legal_fournier_help",
            ])
          : uniqueTools(["get_visa_options"]),
    related_resource_uris: uniqueResourceUris,
    references: packReferences(uniqueResourceUris),
  };
}

function helpAreaResourceUris(area: HelpArea): string[] {
  switch (area) {
    case "spanish_family_route": return [makeRouteResourceUri("spanish-national-family"), makeTopicResourceUri("legal-fournier-handoff")];
    case "property":
    case "business":
    case "wealth":
    case "inheritance":
    case "other": return [makeTopicResourceUri("tool-screeners"), makeTopicResourceUri("legal-fournier-handoff")];
    case "visa_planning":
      return [
        makeTopicResourceUri("route-selection"),
        makeTopicResourceUri("tool-screeners"),
        makeTopicResourceUri("legal-fournier-handoff"),
      ];
    case "eu_family_route":
      return [
        makeTopicResourceUri("eu-family-route-check"),
        makeRouteResourceUri("eu-family-member-card"),
        makeTopicResourceUri("tool-screeners"),
        makeTopicResourceUri("legal-fournier-handoff"),
      ];
    case "beckham":
      return [
        makeTopicResourceUri("beckham-regime"),
        makeProcessResourceUri("tax-regime-review"),
        makeTopicResourceUri("tool-screeners"),
        makeTopicResourceUri("legal-fournier-handoff"),
      ];
    case "residency_path":
      return [
        makeProcessResourceUri("residency-clock"),
        makeTrackResourceUri("permanent-residency-5-year"),
        makeTopicResourceUri("legal-fournier-handoff"),
      ];
    case "appointments":
    case "nie_tie":
      return [
        makeProcessResourceUri("nie-tie"),
        makeTopicResourceUri("tool-screeners"),
        makeTopicResourceUri("legal-fournier-handoff"),
      ];
    case "tax_regimes":
      return [
        makeTopicResourceUri("tax-regimes"),
        makeProcessResourceUri("tax-regime-review"),
        makeTopicResourceUri("tool-screeners"),
        makeTopicResourceUri("legal-fournier-handoff"),
      ];
    case "nationality":
      return [
        makeProcessResourceUri("residency-clock"),
        makeTopicResourceUri("nationality-continuity"),
        makeTopicResourceUri("legal-fournier-handoff"),
      ];
  }
}

function helpService(
  area: HelpArea,
  preferredLanguage: HandoffLanguage = "en",
): HelpRouteResult["recommended_service"] {
  switch (area) {
    case "property":
    case "business":
    case "wealth":
    case "inheritance":
    case "other":
    case "spanish_family_route":
      return {title: area === "property" ? "Property purchase and conveyancing review" : area === "business" ? "Business structure and commercial review" : area === "wealth" ? "Wealth and cross-border asset review" : area === "inheritance" ? "Inheritance and succession review" : area === "spanish_family_route" ? "Spanish-national family residence review" : "General legal intake",
        url:withMcpAttribution(getContactUrl(preferredLanguage), "handoff"),
        reason:`Route this ${helpAreaLabel(area)} matter to the relevant Legal Fournier service team with its specific facts and documents.`};
    case "eu_family_route":
      return {
        title: "EU Family Member Card",
        url: withMcpAttribution(SITE_URLS.serviceEuFamilyMemberCard, "handoff"),
        reason:
          "Best fit when the case depends on a community-regime family-card analysis or retention-of-right review.",
      };
    case "beckham":
    case "tax_regimes":
      return {
        title: "Beckham Law",
        url: withMcpAttribution(SITE_URLS.serviceBeckham, "handoff"),
        reason:
          "Best fit when the answer depends on article 93 eligibility, deadlines, or tax-structure review.",
      };
    case "residency_path":
      return {
        title: "Long-Term Residency",
        url: withMcpAttribution(SITE_URLS.serviceLongTermResidency, "handoff"),
        reason:
          "Best fit when the case turns on long-term residence timing, continuity, or status history.",
      };
    case "nationality":
      return {
        title: "Nationality by Residence",
        url: withMcpAttribution(SITE_URLS.serviceNationality, "handoff"),
        reason:
          "Best fit when nationality timing, continuity, or reduced-track eligibility needs lawyer review.",
      };
    case "appointments":
    case "nie_tie":
      return {
        title: "TIE Card Assistance",
        url: withMcpAttribution(SITE_URLS.serviceTie, "handoff"),
        reason:
          "Best fit when the issue is appointment sequencing, card issuance, or document mismatch.",
      };
    case "visa_planning":
      return {
        title: "Contact Legal Fournier",
        url: withMcpAttribution(getContactUrl(preferredLanguage), "handoff"),
        reason:
          "Best fit for mixed or still-unresolved route planning that needs a human intake rather than a single specialist service page.",
      };
  }
}

function helpAreaLabel(area: HelpArea): string {
  switch (area) {
    case "property": return "property";
    case "business": return "business";
    case "wealth": return "wealth";
    case "inheritance": return "inheritance";
    case "appointments": return "appointments";
    case "other": return "general legal";
    case "spanish_family_route": return "Spanish-national family residence";
    case "visa_planning":
      return "visa planning";
    case "eu_family_route":
      return "EU family route";
    case "beckham":
      return "Beckham";
    case "residency_path":
      return "residency path";
    case "nie_tie":
      return "NIE/TIE";
    case "tax_regimes":
      return "tax regimes";
    case "nationality":
      return "nationality";
  }
}

function helpPreparation(area: HelpArea): string[] {
  switch (area) {
    case "property": return ["Property location, price, ownership share, intended use and tax/reference value.", "Reservation, deposit, signing and finance deadlines.", "Draft purchase contract, title or registry extract, cadastral data and any mortgage terms."];
    case "business": return ["Business activity, company countries, ownership, management location and expected revenue.", "Incorporation, investment, contract and filing deadlines.", "Company registry documents, ownership chart, draft contracts and financial assumptions."];
    case "wealth": return ["Tax residence, regional and country links, asset categories, values and ownership.", "Tax-year, reporting and planned-transfer dates.", "Asset schedule, valuations, relevant tax filings and ownership records."];
    case "inheritance": return ["Deceased's and heirs' country links, relationships, residence, assets and intended succession outcome.", "Date of death, acceptance steps and applicable tax or probate deadlines.", "Will, death certificate, kinship records, asset values and any succession documents."];
    case "other": return ["A short description of the legal objective and countries involved.", "Relevant events, contract dates, notices and deadlines.", "Relevant contracts, correspondence, decisions or other documents already available."];
    default: return ["Short summary of the route theory or legal question.", "Timeline of Spanish residence, filings, deadlines and upcoming appointments.", "Passports, residence cards, approvals, denials or notices already issued."];
  }
}

function buildHelpIntakeFields(args: {
  area: HelpArea;
  urgency: HelpUrgency;
  blockers: string[];
  preferred_language?: HandoffLanguage;
  already_filed?: boolean;
  service: HelpRouteResult["recommended_service"];
}): HelpRouteResult["intake_fields"] {
  const preferredLanguage = args.preferred_language ?? "en";
  const blockerValue =
    args.blockers.length > 0
      ? args.blockers.join("; ")
      : "No blockers supplied yet. Add the exact legal issue, deadline, or uncertainty before sending the handoff.";

  return [
    {
      key: "legal_area",
      label: "Legal area",
      value: helpAreaLabel(args.area),
      required: true,
      status: "filled",
      guidance: "Use the main issue label so the matter reaches the right service line quickly.",
    },
    {
      key: "urgency",
      label: "Urgency",
      value: args.urgency,
      required: true,
      status: "filled",
      guidance: "Flag urgent matters when a filing, appointment, notice, or decision deadline is live.",
    },
    {
      key: "preferred_language",
      label: "Preferred language",
      value: preferredLanguage,
      required: true,
      status: "filled",
      guidance: "Set the language the user expects for intake and follow-up.",
    },
    {
      key: "already_filed_or_active_procedure",
      label: "Already filed or active procedure",
      value: args.already_filed ? "yes" : "no or unknown",
      required: true,
      status: "filled",
      guidance: "Mark this clearly if there is already a filing, denial, request for documents, or live procedure.",
    },
    {
      key: "recommended_service",
      label: "Recommended service",
      value: `${args.service.title} | ${args.service.url}`,
      required: true,
      status: "filled",
      guidance: "Keep the service match attached so intake does not lose the routing context.",
    },
    {
      key: "blockers_summary",
      label: "Blockers summary",
      value: blockerValue,
      required: true,
      status: args.blockers.length > 0 ? "filled" : "needs_input",
      guidance: "Summarize the legal blocker, missing fact, or live risk in one short paragraph.",
    },
    {
      key: "case_summary",
      label: "Case summary",
      value: "",
      required: true,
      status: "needs_input",
      guidance: "State the route theory, what the user wants to achieve, and why the MCP result was not enough on its own.",
    },
    {
      key: "timeline_and_deadlines",
      label: "Timeline and deadlines",
      value: "",
      required: true,
      status: "needs_input",
      guidance: helpPreparation(args.area)[1],
    },
    {
      key: "documents_available",
      label: "Documents available",
      value: "",
      required: true,
      status: "needs_input",
      guidance: helpPreparation(args.area)[2],
    },
  ];
}

export function routeToLegalFournierHelp(args: {
  area: HelpArea;
  urgency?: HelpUrgency;
  blockers?: string[];
  preferred_language?: HandoffLanguage;
  already_filed?: boolean;
}): HelpRouteResult {
  const urgency = args.urgency ?? "normal";
  const blockers = uniqueStrings(args.blockers ?? []);
  const relatedResourceUris = uniqueStrings(helpAreaResourceUris(args.area));
  const preferredLanguage = args.preferred_language ?? "en";
  const service = helpService(args.area, preferredLanguage);
  const escalationTriggers = [
    ...blockers,
    args.already_filed ? "already filed or active procedure" : "",
    urgency === "urgent" ? "urgent timeline" : "",
  ].filter(Boolean);

  const shouldEscalate =
    urgency !== "normal" || args.already_filed === true || blockers.length > 0;

  const whyNow = uniqueStrings([
    blockers.length > 0
      ? "The case still has blockers that are too fact-sensitive or filing-sensitive for a purely evergreen answer."
      : "",
    args.already_filed
      ? "A live or already-filed procedure should be handled with human review rather than generic screening alone."
      : "",
    urgency === "urgent"
      ? "The user has an urgent timeline, so escalation is safer than iterative self-serve screening."
      : urgency === "soon"
        ? "The matter appears time-sensitive enough that a human review can reduce avoidable filing risk."
        : "",
    service.reason,
  ]);

  const whatToPrepare = uniqueStrings([
    ...helpPreparation(args.area),
    args.area === "beckham" || args.area === "tax_regimes"
      ? "Employment structure, ownership details, and any foreign-income or foreign-asset facts."
      : "",
    args.area === "spanish_family_route"
      ? "Spanish sponsor nationality, relationship/dependency evidence, free-movement history and existing residence documents."
      : args.area === "eu_family_route"
      ? "Proof of the EU-family relationship, the EU citizen's own residence basis, and any status-change events such as divorce or departure."
      : "",
    args.area === "nationality" || args.area === "residency_path"
      ? "Absence history, status transitions, and evidence of continuous legal residence."
      : "",
    args.area === "nie_tie" || args.area === "appointments"
      ? "Appointment details, forms prepared, payment receipts, and the exact office or procedure label being used."
      : "",
  ]);

  const handoffLanguage =
    preferredLanguage === "es"
      ? "Spanish"
      : preferredLanguage === "fr"
        ? "French"
        : "English";
  const handoffArticle = handoffLanguage === "English" ? "an" : "a";
  const intakeFields = buildHelpIntakeFields({
    area: args.area,
    urgency,
    blockers,
    preferred_language: preferredLanguage,
    already_filed: args.already_filed,
    service,
  });
  const agentHandoffMessage =
    `Please review this ${helpAreaLabel(args.area)} matter for ${handoffArticle} ${handoffLanguage.toLowerCase()}-language intake. ` +
    `Urgency: ${urgency}. ` +
    (escalationTriggers.length > 0
      ? `Current blockers or triggers: ${escalationTriggers.join("; ")}. `
      : "") +
    `Recommended service line: ${service.title}. ` +
    `The agent should send the route theory, timeline, key documents, unresolved blockers, and the intake fields payload with the contact request.`;

  return {
    should_escalate: shouldEscalate,
    urgency,
    summary: shouldEscalate
      ? "Escalation to Legal Fournier is recommended for this case."
      : "Escalation is optional, but a structured handoff is ready if the user wants human review.",
    representation_notice: REPRESENTATION_NOTICE,
    recommended_service: service,
    booking_url: withMcpAttribution(
      getConsultationBookingUrl(preferredLanguage),
      "handoff",
    ),
    why_now: whyNow,
    what_to_prepare: whatToPrepare,
    intake_fields: intakeFields,
    agent_handoff_message: agentHandoffMessage,
    suggested_follow_up_tools: ["get_paid_consultation_options"],
    related_resource_uris: relatedResourceUris,
    references: uniqueReferences([
      ...packReferences(relatedResourceUris),
      {
        label: "Legal Notice",
        url: SITE_URLS.legalNotice,
        reason:
          "Website legal notice covering informational use and when representation formally begins.",
      },
    ]),
  };
}
