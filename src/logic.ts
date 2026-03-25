import { EU_EEA_SWISS_ALIASES, SITE_URLS } from "./data/site.js";
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
  | "nationality";
export type HelpUrgency = "normal" | "soon" | "urgent";
export type ToolName =
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
  nationality_classification: "eu_eea_swiss" | "non_eu";
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
  return EU_EEA_SWISS_ALIASES.has(normalizeKey(nationality));
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
}): VisaOptionsResult {
  const isEu = isEuEeaSwissNationality(args.nationality);
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
    const familyFit: FitLevel =
      args.eu_family_relationship === "spouse_or_registered_partner" ||
      args.eu_family_relationship === "child_or_dependent_parent"
        ? "strong"
        : "possible";
    const familyScore =
      args.eu_family_relationship === "spouse_or_registered_partner" ||
      args.eu_family_relationship === "child_or_dependent_parent"
        ? 99
        : 87;

    ranked.push(
      buildRoute(
        ROUTE_DEFINITIONS["eu-family-member-card"],
        familyFit,
        familyScore,
        [
          "A non-EU applicant with a qualifying EU-family theory may belong in the community-regime family-card route instead of a standard third-country route.",
          args.eu_family_relationship && args.eu_family_relationship !== "unknown"
            ? `The provided family relationship (${args.eu_family_relationship}) is consistent with an EU-family route screen, subject to proof and residence-basis review.`
            : "The exact family relationship still needs to be checked before the community-regime route can be treated as filing-ready.",
        ],
        "Confirm the exact family relationship, the EU citizen's residence basis in Spain, and whether any retention-of-right issue is in play before choosing another route.",
      ),
    );
    relatedResourceUris.push(makeRouteResourceUri("eu-family-member-card"));
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
      ? "Review the EU family-member branch before filing a standard third-country route."
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

export function checkBeckhamEligibility(args: {
  years_since_last_spanish_residency: number;
  employment_type: EmploymentType;
  move_reason: MoveReason;
  ownership_band?: "none" | "under_25" | "25_or_more";
}): BeckhamEligibilityResult {
  const decisionTrace: DecisionTraceItem[] = [];
  const reasons: string[] = [];
  const blockingIssues: string[] = [];
  const qualifyingPaths: string[] = [];
  const nextSteps: string[] = [];
  const relatedResourceUris = [
    makeTopicResourceUri("beckham-regime"),
    makeProcessResourceUri("tax-regime-review"),
  ];

  const routeUri = employmentRouteUri(args.employment_type, args.move_reason);
  if (routeUri) {
    relatedResourceUris.push(routeUri);
  }

  const hasSufficientGap = args.years_since_last_spanish_residency >= 5;
  const isDirectorCase =
    args.employment_type === "director_lt25" ||
    args.employment_type === "director_gte25";
  const isInnovationSelfEmployment =
    args.employment_type === "self_employed" &&
    args.move_reason === "startup_or_innovation";

  decisionTrace.push({
    factor: "non-residency gap",
    finding: hasSufficientGap
      ? `A ${args.years_since_last_spanish_residency}-year gap was provided.`
      : `A ${args.years_since_last_spanish_residency}-year gap was provided.`,
    impact: hasSufficientGap
      ? "The threshold-style gap question does not block the analysis."
      : "The short gap blocks the normal entry pattern for the regime.",
  });

  if (hasSufficientGap) {
    reasons.push("The non-residency gap looks compatible with Beckham screening.");
  } else {
    blockingIssues.push(
      "The non-residency gap is too short for the usual impatriate-regime entry test.",
    );
  }

  switch (args.employment_type) {
    case "spanish_employee":
      decisionTrace.push({
        factor: "employment structure",
        finding: "Spanish-local employee profile.",
        impact:
          "A Spanish employment move can support Beckham if the relocation is tied to that job.",
      });
      if (
        args.move_reason === "new_spanish_job" ||
        args.move_reason === "intragroup_transfer"
      ) {
        qualifyingPaths.push("Spanish employment route");
        reasons.push(
          "The move reason matches a recognized Spanish employment entry path.",
        );
      } else {
        blockingIssues.push(
          "The relocation reason does not clearly match the normal Spanish-employment entry path.",
        );
      }
      break;
    case "foreign_remote_employee":
      decisionTrace.push({
        factor: "employment structure",
        finding: "Foreign-remote employee profile.",
        impact:
          "A qualifying remote-work move can support Beckham, but only if the relocation is actually tied to that structure.",
      });
      if (args.move_reason === "foreign_remote_work") {
        qualifyingPaths.push("Qualifying foreign-remote work route");
        reasons.push(
          "The move reason aligns with a remote-work structure that can keep Beckham in play.",
        );
      } else {
        blockingIssues.push(
          "Foreign-remote employment was selected, but the move reason does not clearly match that route.",
        );
      }
      break;
    case "director_lt25":
      decisionTrace.push({
        factor: "director ownership",
        finding:
          args.ownership_band === undefined
            ? "Director ownership band was not provided."
            : `Director ownership band provided: ${args.ownership_band}.`,
        impact:
          "Article 93 director cases now need entity-type and related-party review, so a low ownership band is only a partial positive signal.",
      });
      if (args.ownership_band === undefined) {
        blockingIssues.push(
          "A director case still needs ownership, entity-type, and related-party facts before the Beckham analysis is reliable.",
        );
      } else {
        qualifyingPaths.push("Director route subject to entity-type and related-party review");
        reasons.push(
          "A lower ownership band can help, but it does not remove the need to verify patrimonial-entity and linked-entity tests.",
        );
      }
      break;
    case "director_gte25":
      decisionTrace.push({
        factor: "director ownership",
        finding:
          args.ownership_band === undefined
            ? "Higher-ownership director profile with no further entity facts provided."
            : `Higher-ownership director profile with ownership band ${args.ownership_band}.`,
        impact:
          "A high-ownership director profile is not automatically fatal under current law, but it pushes entity-type and related-party review to the center of the analysis.",
      });
      qualifyingPaths.push("Director route subject to patrimonial-entity and related-party review");
      blockingIssues.push(
        "High director ownership requires checking whether the entity is patrimonial and whether the shareholding creates a related-party problem under article 93.",
      );
      break;
    case "self_employed":
      decisionTrace.push({
        factor: "self-employment",
        finding: "Self-employed profile selected.",
        impact:
          "Ordinary self-employment usually falls back to standard resident-tax analysis unless the case fits a currently approvable entrepreneur or highly qualified branch.",
      });
      if (isInnovationSelfEmployment) {
        qualifyingPaths.push(
          "Potential entrepreneur route if the business is approved as innovative",
        );
        reasons.push(
          "The case may fit a current entrepreneur-style entry path, but that approval point still needs review before Beckham can be treated as open.",
        );
        blockingIssues.push(
          "Innovation-driven self-employment needs current entrepreneur-route approval logic before the tax regime can be confirmed.",
        );
      } else {
        blockingIssues.push(
          "Ordinary self-employment is usually outside the strongest Beckham entry paths.",
        );
      }
      break;
    case "highly_qualified_professional":
      decisionTrace.push({
        factor: "professional profile",
        finding: "Highly qualified professional profile.",
        impact:
          "A qualifying specialist or executive move can support Beckham screening.",
      });
      qualifyingPaths.push("Highly qualified professional route");
      reasons.push(
        "The professional profile matches one of the stronger recognized entry paths.",
      );
      break;
    case "unknown":
      decisionTrace.push({
        factor: "employment structure",
        finding: "Employment structure is unknown.",
        impact:
          "The regime cannot be confirmed safely until the move is tied to a qualifying work structure.",
      });
      blockingIssues.push(
        "The employment structure is too vague to confirm Beckham safely.",
      );
      break;
  }

  const requiresMoreFacts =
    args.employment_type === "unknown" ||
    isDirectorCase ||
    isInnovationSelfEmployment;

  let status: BeckhamStatus;
  if (!hasSufficientGap) {
    status = "not_eligible";
  } else if (isDirectorCase || isInnovationSelfEmployment) {
    status = "needs_more_info";
  } else if (requiresMoreFacts && qualifyingPaths.length > 0) {
    status = "needs_more_info";
  } else if (qualifyingPaths.length > 0 && blockingIssues.length === 0) {
    status = "eligible";
  } else if (requiresMoreFacts) {
    status = "needs_more_info";
  } else {
    status = "not_eligible";
  }

  if (status === "eligible") {
    nextSteps.push(
      "Confirm that the relocation documents, employment evidence, and Social Security setup line up with the qualifying path.",
    );
    nextSteps.push(
      "Run a conceptual regime comparison next so the tax answer stays tied to the actual work structure.",
    );
  } else if (status === "needs_more_info") {
    nextSteps.push(
      "Clarify the exact work structure, ownership band, and move basis before giving a definitive Beckham answer.",
    );
    if (isDirectorCase) {
      nextSteps.push(
        "Verify whether the entity is patrimonial and whether the shareholding creates related-party status before treating the director route as eligible or blocked.",
      );
    }
    if (isInnovationSelfEmployment) {
      nextSteps.push(
        "Confirm whether the business actually fits the current entrepreneur approval route before comparing Beckham against standard resident taxation.",
      );
    }
    nextSteps.push(
      "Keep the case in review-needed territory rather than promising eligibility too early.",
    );
  } else {
    nextSteps.push(
      "Treat standard Spanish resident-tax analysis as the default unless the work structure changes materially.",
    );
  }

  const uniqueResourceUris = uniqueStrings(relatedResourceUris);
  const reviewLevel: ReviewLevel =
    status === "needs_more_info"
      ? "high"
      : status === "eligible" &&
          (args.employment_type === "spanish_employee" ||
            args.employment_type === "highly_qualified_professional" ||
            args.employment_type === "foreign_remote_employee")
        ? "low"
        : "medium";

  const summary =
    status === "eligible"
      ? "The profile fits the main qualitative Beckham gatechecks."
      : status === "needs_more_info"
        ? "The profile may fit Beckham, but a key fact pattern is still unresolved."
        : "The profile does not align cleanly with the strongest Beckham entry paths.";

  return {
    status,
    summary,
    decision_trace: decisionTrace,
    key_rules_applied: packRules(uniqueResourceUris),
    review_level: reviewLevel,
    official_legal_sources: packOfficialSources(uniqueResourceUris),
    current_verification_flags: packVerificationFlags(uniqueResourceUris),
    reasons: uniqueStrings(reasons),
    blocking_issues: uniqueStrings(blockingIssues),
    qualifying_paths: uniqueStrings(qualifyingPaths),
    next_steps: uniqueStrings(nextSteps),
    suggested_follow_up_tools:
      status === "eligible"
        ? uniqueTools(["compare_tax_regimes"])
        : status === "needs_more_info"
          ? uniqueTools([
              "get_visa_options",
              "compare_tax_regimes",
              "route_to_legal_fournier_help",
            ])
          : uniqueTools(["compare_tax_regimes"]),
    related_resource_uris: uniqueResourceUris,
    references: packReferences(uniqueResourceUris),
  };
}

export function getResidencyPath(args: {
  current_status: CurrentStatus;
  years_in_spain: number;
  nationality_track?: NationalityTrack;
  special_nationality_basis?: SpecialNationalityBasis;
  has_absence_concerns?: boolean;
}): ResidencyPathResult {
  const track = args.nationality_track ?? "unknown";
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

  switch (track) {
    case "ibero_2_year":
      decisionTrace.push({
        factor: "nationality track",
        finding: "Fast-track two-year nationality branch selected.",
        impact:
          "The nationality analysis may open earlier than the standard ten-year track.",
      });
      if (args.years_in_spain >= 2) {
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
      } else if (args.years_in_spain >= 1) {
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
      if (args.years_in_spain >= 5) {
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
      if (args.years_in_spain >= 10) {
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

  if (args.current_status === "citizenship_applicant") {
    nationalityStatus = "already_in_process";
    milestones.push("Nationality is already in process.");
  }

  const uniqueResourceUris = uniqueStrings(relatedResourceUris);
  const reviewLevel: ReviewLevel =
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
    args.current_status === "eu_citizen_registered" && args.years_in_spain >= 5
      ? "The five-year milestone may support EU permanent residence, while nationality timing still depends on the confirmed nationality track."
      : args.current_status === "eu_family_member_resident" && args.years_in_spain >= 5
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
}): TaxRegimeResult {
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
    !args.employment_type || args.employment_type === "unknown"
      ? "high"
      : recommendation === "depends"
        ? "medium"
        : "low";

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
    case "visa_planning":
      return [
        makeTopicResourceUri("route-selection"),
        makeTopicResourceUri("legal-fournier-handoff"),
      ];
    case "eu_family_route":
      return [
        makeTopicResourceUri("eu-family-route-check"),
        makeRouteResourceUri("eu-family-member-card"),
        makeTopicResourceUri("legal-fournier-handoff"),
      ];
    case "beckham":
      return [
        makeTopicResourceUri("beckham-regime"),
        makeProcessResourceUri("tax-regime-review"),
        makeTopicResourceUri("legal-fournier-handoff"),
      ];
    case "residency_path":
      return [
        makeProcessResourceUri("residency-clock"),
        makeTrackResourceUri("permanent-residency-5-year"),
        makeTopicResourceUri("legal-fournier-handoff"),
      ];
    case "nie_tie":
      return [
        makeProcessResourceUri("nie-tie"),
        makeTopicResourceUri("legal-fournier-handoff"),
      ];
    case "tax_regimes":
      return [
        makeTopicResourceUri("tax-regimes"),
        makeProcessResourceUri("tax-regime-review"),
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

function helpService(area: HelpArea): HelpRouteResult["recommended_service"] {
  switch (area) {
    case "eu_family_route":
      return {
        title: "EU Family Member Card",
        url: SITE_URLS.serviceEuFamilyMemberCard,
        reason:
          "Best fit when the case depends on a community-regime family-card analysis or retention-of-right review.",
      };
    case "beckham":
    case "tax_regimes":
      return {
        title: "Beckham Law",
        url: SITE_URLS.serviceBeckham,
        reason:
          "Best fit when the answer depends on article 93 eligibility, deadlines, or tax-structure review.",
      };
    case "residency_path":
      return {
        title: "Long-Term Residency",
        url: SITE_URLS.serviceLongTermResidency,
        reason:
          "Best fit when the case turns on long-term residence timing, continuity, or status history.",
      };
    case "nationality":
      return {
        title: "Nationality by Residence",
        url: SITE_URLS.serviceNationality,
        reason:
          "Best fit when nationality timing, continuity, or reduced-track eligibility needs lawyer review.",
      };
    case "nie_tie":
      return {
        title: "TIE Card Assistance",
        url: SITE_URLS.serviceTie,
        reason:
          "Best fit when the issue is appointment sequencing, card issuance, or document mismatch.",
      };
    case "visa_planning":
      return {
        title: "Contact Legal Fournier",
        url: SITE_URLS.contact,
        reason:
          "Best fit for mixed or still-unresolved route planning that needs a human intake rather than a single specialist service page.",
      };
  }
}

function helpAreaLabel(area: HelpArea): string {
  switch (area) {
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

function buildHelpIntakeFields(args: {
  area: HelpArea;
  urgency: HelpUrgency;
  blockers: string[];
  preferred_language?: "en" | "es";
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
      guidance: "List Spain arrival dates, residence periods, filing dates, expiry dates, notices, and upcoming appointments.",
    },
    {
      key: "documents_available",
      label: "Documents available",
      value: "",
      required: true,
      status: "needs_input",
      guidance: "List passports, cards, approvals, denials, tax registrations, relationship proof, or other evidence already on hand.",
    },
  ];
}

export function routeToLegalFournierHelp(args: {
  area: HelpArea;
  urgency?: HelpUrgency;
  blockers?: string[];
  preferred_language?: "en" | "es";
  already_filed?: boolean;
}): HelpRouteResult {
  const urgency = args.urgency ?? "normal";
  const blockers = uniqueStrings(args.blockers ?? []);
  const relatedResourceUris = uniqueStrings(helpAreaResourceUris(args.area));
  const service = helpService(args.area);
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
    "Short summary of the route theory or legal question.",
    "Timeline of Spanish residence, filings, deadlines, and any upcoming appointments.",
    "Passports, residence cards, approvals, denials, or notices already issued.",
    args.area === "beckham" || args.area === "tax_regimes"
      ? "Employment structure, ownership details, and any foreign-income or foreign-asset facts."
      : "",
    args.area === "eu_family_route"
      ? "Proof of the EU-family relationship, the EU citizen's own residence basis, and any status-change events such as divorce or departure."
      : "",
    args.area === "nationality" || args.area === "residency_path"
      ? "Absence history, status transitions, and evidence of continuous legal residence."
      : "",
    args.area === "nie_tie"
      ? "Appointment details, forms prepared, payment receipts, and the exact office or procedure label being used."
      : "",
  ]);

  const handoffLanguage =
    args.preferred_language === "es" ? "Spanish" : "English";
  const handoffArticle = handoffLanguage === "English" ? "an" : "a";
  const intakeFields = buildHelpIntakeFields({
    area: args.area,
    urgency,
    blockers,
    preferred_language: args.preferred_language,
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
    booking_url: SITE_URLS.consultationBooking,
    why_now: whyNow,
    what_to_prepare: whatToPrepare,
    intake_fields: intakeFields,
    agent_handoff_message: agentHandoffMessage,
    suggested_follow_up_tools: [],
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
