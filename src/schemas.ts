import * as z from "zod/v4";

export const reviewLevelSchema = z
  .enum(["low", "medium", "high"])
  .describe("How much human review is still advisable before treating the result as filing-ready.");

export const toolNameSchema = z.enum([
  "search",
  "fetch",
  "find_legal_fournier_tool",
  "run_legal_fournier_tool",
  "get_paid_consultation_options",
  "get_paid_call_availability",
  "get_visa_options",
  "check_beckham_eligibility",
  "get_residency_path",
  "explain_nie_process",
  "compare_tax_regimes",
  "route_to_legal_fournier_help",
  "create_legal_fournier_contact_request",
]);

export const decisionTraceItemSchema = z.object({
  factor: z.string().describe("Fact bucket or legal factor that was evaluated."),
  finding: z.string().describe("What the tool concluded about that factor."),
  impact: z.string().describe("How the finding changed the legal analysis."),
});

export const secondaryReferenceSchema = z.object({
  label: z.string().describe("Short label for the external reference."),
  url: z
    .string()
    .url()
    .describe("Secondary follow-up URL for optional human or website context."),
  reason: z
    .string()
    .describe("Why the external reference may still help after using the MCP result."),
});

export const officialLegalSourceSchema = z.object({
  authority: z.string().describe("Official authority publishing the source."),
  title: z.string().describe("Title or pinpoint label for the legal source."),
  url: z.string().url().describe("Official source URL."),
  relevance: z
    .string()
    .describe("Why this source matters to the tool or resource output."),
});

export const currentVerificationFlagSchema = z.object({
  area: z.string().describe("Area of the answer that may need live verification."),
  reason: z
    .string()
    .describe("Why the answer cannot safely freeze this point as timeless."),
  check_when: z
    .string()
    .describe("When the agent should stop and verify the current rule or practice."),
  official_source_hint: z
    .string()
    .describe("Official-source hint for the verification step."),
});

export const relatedResourceUrisSchema = z
  .array(
    z.string().describe("Canonical `legalfournier://` MCP resource URI for follow-up context."),
  )
  .describe("Canonical MCP resources an agent can read next without leaving the server.");

export const followUpToolsSchema = z
  .array(toolNameSchema.describe("Tool name that would be useful as a next step."))
  .describe("Tool calls that are likely to advance the analysis.");

export const rankedRouteSchema = z.object({
  route_id: z.string().describe("Stable route identifier."),
  title: z.string().describe("Human-readable route title."),
  fit: z
    .enum(["strong", "possible", "unlikely"])
    .describe("How well the route fits the described profile."),
  score: z.number().describe("Internal ranking score used to order the routes."),
  why: z
    .array(z.string().describe("Profile-specific reason for this route ranking."))
    .describe("Reasons the route was ranked here."),
  evergreen_requirements: z
    .array(z.string().describe("Stable, non-volatile requirement logic for the route."))
    .describe("Stable requirement summary."),
  common_use_cases: z
    .array(z.string().describe("Typical factual pattern for the route."))
    .describe("Typical use cases for the route."),
  next_step: z
    .string()
    .describe("Immediate next action to validate or progress the route."),
  related_resource_uri: z
    .string()
    .describe("Canonical MCP resource URI for the route pack."),
});

export const getVisaOptionsInput = {
  sponsor_nationality: z.string().trim().min(1).max(100).optional(),
  sponsor_exercised_free_movement: z.boolean().optional(),
  nationality: z
    .string()
    .trim().min(1).max(100)
    .describe("Applicant nationality as a country name or ISO-style country code."),
  income_source: z
    .enum(["employee", "freelancer", "passive"])
    .describe("Main source of income for the move."),
  intent: z.enum(["work", "retire", "invest"]).describe("Main relocation intent."),
  employer_location: z
    .enum(["spain", "outside_spain", "mixed", "unknown"])
    .optional()
    .describe("Where the main employer or client base is located, if known."),
  has_spanish_job_offer: z
    .boolean()
    .optional()
    .describe("Whether the applicant already has a Spanish job offer."),
  has_eu_family_link: z
    .boolean()
    .optional()
    .describe("Whether an EU family-member route may need separate review."),
  eu_family_relationship: z
    .enum([
      "spouse_or_registered_partner",
      "child_or_dependent_parent",
      "extended_family_or_other",
      "unknown",
    ])
    .optional()
    .describe("Optional relationship label when an EU-family route may be relevant."),
  investment_profile: z
    .enum(["passive_capital", "operating_business", "none"])
    .optional()
    .describe("Whether the investment plan is passive or tied to an operating business."),
};

export const getVisaOptionsOutput = {
  profile_summary: z.string().describe("One-line summary of the screened profile."),
  nationality_classification: z
    .enum(["eu_eea_swiss", "non_eu", "spanish", "unknown"])
    .describe("High-level nationality bucket used by the route logic."),
  decision_trace: z
    .array(decisionTraceItemSchema)
    .describe("Structured trace of the main route-selection factors."),
  key_rules_applied: z
    .array(z.string().describe("Stable legal rule used by the screening logic."))
    .describe("Stable rules that drove the recommendation."),
  review_level: reviewLevelSchema,
  official_legal_sources: z
    .array(officialLegalSourceSchema)
    .describe("Official legal sources that anchor the recommendation."),
  current_verification_flags: z
    .array(currentVerificationFlagSchema)
    .describe("Live-verification warnings for volatile or fact-sensitive points."),
  ranked_routes: z.array(rankedRouteSchema).describe("Ranked visa or residence routes."),
  ruled_out_routes: z
    .array(
      z.object({
        title: z.string().describe("Route that was intentionally ruled out."),
        reason: z
          .string()
          .describe("Why that route is not being recommended under stable logic."),
      }),
    )
    .describe("Common routes ruled out by stable legal logic."),
  general_notes: z
    .array(z.string().describe("General note about the recommendation set."))
    .describe("General notes that apply across the route list."),
  next_actions: z
    .array(z.string().describe("Immediate next action for the agent or user."))
    .describe("Next actions to progress the analysis."),
  suggested_follow_up_tools: followUpToolsSchema,
  related_resource_uris: relatedResourceUrisSchema,
  references: z
    .array(secondaryReferenceSchema)
    .describe("Secondary Legal Fournier references, demoted behind MCP-native context."),
};

export const checkBeckhamInput = {
  director_entity_is_patrimonial: z.boolean().optional(),
  director_is_related_party: z.boolean().optional(),
  move_year: z.number().int().min(2023).max(2100).optional().describe("Calendar year of the relocation supporting the current article 93 entry path."),
  spanish_tax_resident_years: z.array(z.number().int().min(1900).max(2100)).max(100).optional(),
  prior_tax_periods_confirmed: z.boolean().optional().describe("True only when the supplied tax-residence year list completely covers all five tax periods before move_year."),
  qualifying_activity_confirmed: z.boolean().optional().describe("Confirm the statutory activity and exclusions: qualifying ordinary/statutory employment excluding professional sport; an eligible director appointment; an approved entrepreneur activity; or eligible startup services/training/R&D/innovation for the professional branch."),
  income_mix_requirement_met: z.boolean().optional().describe("For the qualifying professional branch, confirm the applicable greater-than-40-percent remuneration requirement."),
  relocation_link_confirmed: z.boolean().optional().describe("Confirm the causal link and permitted timing between the qualifying activity and the move to Spain."),
  no_disqualifying_permanent_establishment: z.boolean().optional().describe("Confirm no disqualifying permanent-establishment income under the applicable article 93 entry branch."),
  election_deadline_met: z.boolean().optional().describe("Confirm the election deadline and required registration/evidence dates were met."),
  years_since_last_spanish_residency: z
    .number()
    .min(0)
    .max(120).optional()
    .describe("Deprecated elapsed-year gap; the five prior tax periods require the move year and tax-residence years."),
  employment_type: z
    .enum([
      "spanish_employee",
      "foreign_remote_employee",
      "director_lt25",
      "director_gte25",
      "self_employed",
      "highly_qualified_professional",
      "unknown",
    ])
    .describe("Employment structure that will support the move."),
  move_reason: z
    .enum([
      "new_spanish_job",
      "foreign_remote_work",
      "startup_or_innovation",
      "intragroup_transfer",
      "director_appointment",
      "qualifying_professional_activity",
      "family_move",
      "other",
    ])
    .describe("Main reason for relocating to Spain."),
  ownership_band: z
    .enum(["none", "under_25", "25_or_more"])
    .optional()
    .describe("Optional ownership context for director-style cases."),
};

export const beckhamAssessmentSchema = z.object(checkBeckhamInput).refine((args) => !args.spanish_tax_resident_years || new Set(args.spanish_tax_resident_years).size === args.spanish_tax_resident_years.length, { message: "List each tax year once.", path: ["spanish_tax_resident_years"] });

export const checkBeckhamOutput = {
  status: z
    .enum(["eligible", "not_eligible", "needs_more_info"])
    .describe("High-level Beckham eligibility outcome."),
  summary: z.string().describe("One-line explanation of the result."),
  decision_trace: z
    .array(decisionTraceItemSchema)
    .describe("Structured trace of the main Beckham screening factors."),
  key_rules_applied: z
    .array(z.string().describe("Stable rule that drove the Beckham screen."))
    .describe("Stable rules applied by the tool."),
  review_level: reviewLevelSchema,
  official_legal_sources: z
    .array(officialLegalSourceSchema)
    .describe("Official legal sources anchoring the Beckham analysis."),
  current_verification_flags: z
    .array(currentVerificationFlagSchema)
    .describe("Live-verification warnings for fact-sensitive or time-sensitive Beckham points."),
  reasons: z
    .array(z.string().describe("Positive signal supporting eligibility."))
    .describe("Positive signals supporting the result."),
  blocking_issues: z
    .array(z.string().describe("Issue currently blocking or weakening eligibility."))
    .describe("Blocking or weakening issues."),
  qualifying_paths: z
    .array(z.string().describe("Recognized regime entry path that may apply."))
    .describe("Potential qualifying paths."),
  next_steps: z
    .array(z.string().describe("Immediate next action for the applicant or agent."))
    .describe("Suggested next steps."),
  suggested_follow_up_tools: followUpToolsSchema,
  related_resource_uris: relatedResourceUrisSchema,
  references: z
    .array(secondaryReferenceSchema)
    .describe("Secondary Legal Fournier references."),
};

export const residencyPathInput = {
  qualifying_legal_residence_years: z.number().min(0).max(120).optional(),
  continuity_confirmed: z.boolean().optional(),
  current_status: z
    .enum([
      "new_arrival",
      "temporary_resident",
      "digital_nomad",
      "eu_citizen_registered",
      "eu_family_member_resident",
      "student",
      "long_term_resident",
      "irregular_status",
      "citizenship_applicant",
    ])
    .describe("Current Spanish immigration or nationality status."),
  years_in_spain: z
    .number()
    .min(0)
    .max(120)
    .describe("Years already spent in Spain under the relevant stay or residence history."),
  nationality_track: z
    .enum([
      "unknown",
      "standard_10_year",
      "ibero_2_year",
      "one_year_special",
      "refugee_5_year",
    ])
    .optional()
    .describe("Optional nationality timeline group for a more specific nationality answer."),
  special_nationality_basis: z
    .enum([
      "not_specified",
      "born_in_spain",
      "married_to_spanish",
      "widowed_from_spanish",
      "spanish_parent_or_grandparent",
      "guardianship_of_spanish_person",
    ])
    .optional()
    .describe("Optional basis for the one-year nationality track when that exception is being claimed."),
  has_absence_concerns: z
    .boolean()
    .optional()
    .describe("Whether absences or continuity problems may weaken the residence or nationality clock."),
};

export const residencyPathOutput = {
  summary: z.string().describe("Short explanation of where the person sits on the path."),
  permanent_residency_status: z
    .enum([
      "not_started",
      "building_time",
      "review_needed",
      "likely_eligible",
      "already_long_term",
    ])
    .describe("Long-term residence stage."),
  nationality_status: z
    .enum([
      "unknown_track",
      "review_needed",
      "building_time",
      "likely_eligible",
      "already_in_process",
    ])
    .describe("Nationality stage given the provided track information."),
  decision_trace: z
    .array(decisionTraceItemSchema)
    .describe("Structured trace of the main timing factors."),
  key_rules_applied: z
    .array(z.string().describe("Stable rule used in the timeline analysis."))
    .describe("Stable rules applied by the tool."),
  review_level: reviewLevelSchema,
  official_legal_sources: z
    .array(officialLegalSourceSchema)
    .describe("Official legal sources anchoring the residence and nationality timeline analysis."),
  current_verification_flags: z
    .array(currentVerificationFlagSchema)
    .describe("Live-verification warnings for route, continuity, or timing issues."),
  milestones: z
    .array(z.string().describe("Milestone that has been reached or remains pending."))
    .describe("Key milestones on the path."),
  next_steps: z
    .array(z.string().describe("Immediate next action."))
    .describe("Immediate next steps."),
  caution_notes: z
    .array(z.string().describe("Important caution for this path."))
    .describe("Important cautions."),
  suggested_follow_up_tools: followUpToolsSchema,
  related_resource_uris: relatedResourceUrisSchema,
  references: z
    .array(secondaryReferenceSchema)
    .describe("Secondary Legal Fournier references."),
};

export const explainNieOutput = {
  summary: z.string().describe("Short overview of the NIE/TIE process."),
  decision_trace: z
    .array(decisionTraceItemSchema)
    .describe("Structured trace of the procedural distinctions that matter."),
  key_rules_applied: z
    .array(z.string().describe("Stable procedural rule applied by the tool."))
    .describe("Stable procedural rules applied by the tool."),
  review_level: reviewLevelSchema,
  official_legal_sources: z
    .array(officialLegalSourceSchema)
    .describe("Official legal and administrative sources anchoring the procedure."),
  current_verification_flags: z
    .array(currentVerificationFlagSchema)
    .describe("Live-verification warnings for office-level or fee-level volatility."),
  key_distinctions: z
    .array(z.string().describe("Stable distinction between NIE and TIE handling."))
    .describe("Key distinctions that agents should preserve."),
  forms: z
    .array(z.string().describe("Relevant form or administrative reference."))
    .describe("Relevant forms and administrative references."),
  steps: z
    .array(
      z.object({
        step: z.number().describe("Step number in the procedure."),
        title: z.string().describe("Short title for the step."),
        detail: z.string().describe("What happens in that step."),
      }),
    )
    .describe("Ordered process steps."),
  common_mistakes: z
    .array(z.string().describe("Common mistake applicants make."))
    .describe("Common mistakes in NIE/TIE processing."),
  next_actions: z
    .array(z.string().describe("Immediate next procedural action."))
    .describe("Next actions to progress the procedure."),
  suggested_follow_up_tools: followUpToolsSchema,
  related_resource_uris: relatedResourceUrisSchema,
  references: z
    .array(secondaryReferenceSchema)
    .describe("Secondary Legal Fournier references."),
};

export const compareTaxInput = {
  beckham_assessment: beckhamAssessmentSchema.optional(),
  employment_type: z
    .enum([
      "spanish_employee",
      "foreign_remote_employee",
      "director_lt25",
      "director_gte25",
      "self_employed",
      "highly_qualified_professional",
      "unknown",
    ])
    .optional()
    .describe("Employment structure to test against the conceptual tax comparison."),
  has_foreign_income: z
    .boolean()
    .optional()
    .describe("Whether foreign-source income is material to the profile."),
  has_significant_foreign_assets: z
    .boolean()
    .optional()
    .describe("Whether foreign assets are materially relevant to planning."),
  prefers_predictability: z
    .boolean()
    .optional()
    .describe("Whether the applicant values a simpler, more predictable regime structure."),
};

export const compareTaxOutput = {
  recommendation: z
    .enum(["beckham", "standard_irpf", "depends"])
    .describe("Conceptual starting recommendation."),
  summary: z.string().describe("Short explanation of the recommendation."),
  decision_trace: z
    .array(decisionTraceItemSchema)
    .describe("Structured trace of the main tax-comparison factors."),
  key_rules_applied: z
    .array(z.string().describe("Stable rule used in the tax comparison."))
    .describe("Stable rules applied by the tool."),
  review_level: reviewLevelSchema,
  official_legal_sources: z
    .array(officialLegalSourceSchema)
    .describe("Official tax and mobility sources anchoring the comparison."),
  current_verification_flags: z
    .array(currentVerificationFlagSchema)
    .describe("Live-verification warnings for entry-path, timing, or filing issues."),
  likely_fit_notes: z
    .array(z.string().describe("Why the recommendation leans this way."))
    .describe("Why the profile leans toward a given regime."),
  comparison: z
    .array(
      z.object({
        topic: z.string().describe("Comparison topic."),
        beckham: z.string().describe("How Beckham generally behaves on that topic."),
        standard_irpf: z
          .string()
          .describe("How the standard resident-tax regime behaves on that topic."),
      }),
    )
    .describe("Topic-by-topic conceptual comparison."),
  caveats: z
    .array(z.string().describe("Important caveat."))
    .describe("Caveats that limit the comparison."),
  next_actions: z
    .array(z.string().describe("Immediate next action for the analysis."))
    .describe("Next actions that sharpen the tax answer."),
  suggested_follow_up_tools: followUpToolsSchema,
  related_resource_uris: relatedResourceUrisSchema,
  references: z
    .array(secondaryReferenceSchema)
    .describe("Secondary Legal Fournier references."),
};

export const helpAreaSchema = z.enum([
  "visa_planning",
  "eu_family_route",
  "beckham",
  "residency_path",
  "nie_tie",
  "tax_regimes",
  "nationality",
  "spanish_family_route",
  "property",
  "business",
  "wealth",
  "inheritance",
  "appointments",
  "other",
]);

export const helpUrgencySchema = z.enum(["normal", "soon", "urgent"]);

export const intakeFieldSchema = z.object({
  key: z.string().describe("Stable intake field key for downstream routing or form mapping."),
  label: z.string().describe("Human-readable intake field label."),
  value: z
    .string()
    .describe("Current field value or an empty string when the user still needs to supply it."),
  required: z.boolean().describe("Whether the field should be collected before handoff."),
  status: z
    .enum(["filled", "needs_input"])
    .describe("Whether the intake field is already filled or still needs user input."),
  guidance: z
    .string()
    .describe("Why the field matters or how the agent should fill it."),
});

export const routeToHelpInput = {
  area: helpAreaSchema.describe("Area of Spain legal help that needs human escalation."),
  urgency: helpUrgencySchema
    .optional()
    .describe("How quickly the user needs human help."),
  blockers: z
    .array(z.string().max(1000).describe("Specific blocker, uncertainty, or live issue requiring human review."))
    .max(50)
    .optional()
    .describe("Known blockers that make a self-serve answer less reliable."),
  preferred_language: z
    .enum(["en", "es", "fr"])
    .optional()
    .describe("Preferred language for the human handoff."),
  already_filed: z
    .boolean()
    .optional()
    .describe("Whether the user already has a live filing, notice, denial, or active procedure."),
};

export const routeToHelpOutput = {
  should_escalate: z
    .boolean()
    .describe("Whether human escalation is recommended from the supplied facts."),
  urgency: helpUrgencySchema.describe("Urgency level used for the handoff recommendation."),
  summary: z.string().describe("Short explanation of the handoff recommendation."),
  representation_notice: z
    .string()
    .describe("Legal notice explaining that contact or booking does not itself create representation."),
  recommended_service: z.object({
    title: z.string().describe("Best-fit Legal Fournier service line or contact route."),
    url: z.string().url().describe("Service or contact URL for the handoff."),
    reason: z.string().describe("Why this route fits the case."),
  }),
  booking_url: z
    .string()
    .url()
    .describe("Preferred consultation-booking URL when the user wants direct legal advice now."),
  why_now: z
    .array(z.string().describe("Reason the handoff should happen now."))
    .describe("Reasons supporting escalation."),
  what_to_prepare: z
    .array(z.string().describe("Fact or document to prepare before contacting the firm."))
    .describe("What the agent should gather for the handoff."),
  intake_fields: z
    .array(intakeFieldSchema)
    .describe("Structured intake payload an agent can map into a contact form, CRM, or booking handoff."),
  agent_handoff_message: z
    .string()
    .describe("Ready-to-send summary an agent can reuse when escalating to Legal Fournier."),
  suggested_follow_up_tools: followUpToolsSchema,
  related_resource_uris: relatedResourceUrisSchema,
  references: z
    .array(secondaryReferenceSchema)
    .describe("Secondary Legal Fournier references for the handoff."),
};

export const contactRequestLegalAreaSchema = z.enum([
  "visa_planning",
  "eu_family_route",
  "beckham",
  "residency_path",
  "nie_tie",
  "tax_regimes",
  "nationality",
  "property",
  "business",
  "wealth",
  "appointments",
  "other",
  "spanish_family_route",
  "inheritance",
]);

export const contactRequestSourceSurfaceSchema = z.enum([
  "mcp",
  "openapi",
  "chatgpt_actions",
  "claude_connector",
  "zapier",
  "make",
  "n8n",
  "relevance_ai",
  "cursor",
  "vscode",
  "gemini_cli",
  "claude_code",
  "other",
]);

export const createContactRequestInput = {
  confirmed_consent: z
    .literal(true)
    .describe("Must be true only after the user explicitly asks the agent to contact Legal Fournier."),
  consent_to_contact: z
    .literal(true)
    .describe("Must be true only after the user consents to Legal Fournier contacting them."),
  name: z.string().trim().min(1).max(160).describe("User's name for Legal Fournier follow-up."),
  email: z.string().trim().toLowerCase().email().max(254).describe("User's email address for Legal Fournier follow-up."),
  phone: z.string().max(80).optional().describe("Optional phone or WhatsApp number."),
  preferred_language: z
    .enum(["en", "es", "fr"])
    .optional()
    .describe("Preferred follow-up language."),
  legal_area: contactRequestLegalAreaSchema.describe("Main legal or tax area for the request."),
  urgency: helpUrgencySchema.optional().describe("Requested urgency for Legal Fournier review."),
  case_summary: z
    .string()
    .trim().min(20)
    .max(3000)
    .describe("Non-sensitive summary of the matter to send to Legal Fournier."),
  agent_handoff_message: z
    .string()
    .max(3000)
    .optional()
    .describe("Agent-prepared handoff summary, ideally from route_to_legal_fournier_help."),
  risk_flags: z
    .array(z.string().max(220))
    .max(12)
    .optional()
    .describe("Known risk flags or complexity triggers."),
  missing_facts: z
    .array(z.string().max(220))
    .max(12)
    .optional()
    .describe("Important facts still missing for lawyer review."),
  related_resource_uris: z
    .array(z.string().max(260))
    .max(12)
    .optional()
    .describe("MCP resource URIs already used in the analysis."),
  tool_context: z
    .string()
    .max(1600)
    .optional()
    .describe("Short note about the tool flow that produced this lead."),
  source_surface: contactRequestSourceSurfaceSchema
    .optional()
    .describe("Agent surface sending the request."),
  agent_app: z.string().max(120).optional().describe("Name of the agent app or connector."),
  tool_name: z
    .string()
    .max(120)
    .optional()
    .describe("Tool or workflow that generated this contact request."),
  source_url: z.string().url().optional().describe("Optional URL where the agent flow started."),
  referrer_url: z.string().url().optional().describe("Optional referrer URL."),
  lead_id: z.string().max(120).optional().describe("Optional upstream lead ID."),
  idempotency_key: z
    .string()
    .min(8)
    .max(160)
    .regex(/^[A-Za-z0-9_.:-]{8,160}$/)
    .optional()
    .describe("Stable idempotency key for safe retries."),
};

export const createContactRequestOutput = {
  idempotency_key: z.string(),
  notification_status: z.enum(["pending", "processed", "needs_reconciliation", "unknown"]).optional().describe("Status of internal notification attempts; processed does not guarantee email delivery."),
  ok: z.boolean().describe("Whether the request was accepted by Legal Fournier."),
  entry_id: z.number().describe("Internal WordPress lead entry ID."),
  lead_id: z.string().describe("Public lead identifier recorded in WordPress."),
  lead_status: z
    .enum(["created", "duplicate"])
    .describe("Whether this was a new accepted lead or an idempotent duplicate."),
  admin_queue: z.string().describe("Where Legal Fournier staff can review the request."),
  source: z.literal("agent").describe("Lead source bucket."),
  source_surface: z.string().describe("Agent surface recorded for attribution."),
  message: z.string().describe("Human-readable confirmation message."),
  representation_notice: z
    .string()
    .describe("Notice that contact request submission does not create representation."),
  booking_url: z
    .string()
    .url()
    .describe("Site-controlled consultation booking URL to offer when the user wants to speak with Legal Fournier now."),
  next_actions: z
    .array(z.string())
    .describe("Safe follow-up instructions for the calling agent."),
};

export const findLegalFournierToolAreaSchema = z.enum([
  "immigration",
  "tax",
  "property",
  "business",
  "wealth",
  "appointments",
  "remote_work",
  "unknown",
]);

export const findLegalFournierToolLanguageSchema = z.enum(["en", "es", "fr", "unknown"]);

export const legalFournierToolLanguageLinkSchema = z.object({
  language: z.enum(["en", "es", "fr"]).describe("Language for this public tool URL."),
  url: z.string().url().describe("Language-specific public tool URL."),
  title: z.string().describe("Human-readable title for this language URL."),
});

export const matchedLegalFournierToolSchema = z.object({
  id: z.string().describe("Stable Legal Fournier public tool identifier."),
  title: z.string().describe("Public tool title."),
  category: z
    .enum(["immigration", "tax", "property", "business", "wealth", "appointments", "remote_work"])
    .describe("Primary case area for the tool."),
  url: z.string().url().describe("Canonical English public tool URL."),
  selected_url: z
    .string()
    .url()
    .describe("Best public URL after applying the preferred language."),
  selected_language: z
    .enum(["en", "es", "fr"])
    .describe("Language used for selected_url."),
  description: z.string().describe("Short description of the public tool."),
  fit: z.enum(["strong", "possible"]).describe("How strongly this public tool fits the case."),
  score: z.number().describe("Internal ranking score used to order tools."),
  why: z.array(z.string()).describe("Reasons this public tool matched the case."),
  use_when: z.array(z.string()).describe("When agents should send users to this tool."),
  not_for: z.array(z.string()).describe("Cases where the tool should not be used alone."),
  keywords: z.array(z.string()).describe("Search and matching terms for the tool."),
  complexity_triggers: z
    .array(z.string())
    .describe("Signals that should push the case toward human review."),
  related_mcp_tools: z
    .array(toolNameSchema)
    .describe("MCP tools that pair with this public tool."),
  related_resource_uris: relatedResourceUrisSchema,
  agent_workflow: z.array(z.string()).describe("Suggested agent workflow for this tool."),
  handoff_trigger: z.string().describe("When the agent should escalate this tool flow."),
  language_links: z
    .array(legalFournierToolLanguageLinkSchema)
    .describe("Available translated versions of the public tool page."),
});

export const findLegalFournierToolInput = {
  query: z
    .string().max(3000)
    .optional()
    .describe("Natural-language user goal or case summary, such as 'high-income founder buying property in Spain'."),
  area: findLegalFournierToolAreaSchema
    .optional()
    .describe("Optional broad area when the agent already knows it."),
  preferred_language: findLegalFournierToolLanguageSchema
    .optional()
    .describe("Preferred public-page language when an equivalent translated tool exists."),
  complexity_signals: z
    .array(z.string().max(500).describe("Specific complexity signal, blocker, or risk fact.")).max(50)
    .optional()
    .describe("Signals that should affect matching and escalation."),
  include_all_tools: z
    .boolean()
    .optional()
    .describe("Return the full Legal Fournier public tool catalog instead of only top matches."),
  max_results: z
    .number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .describe("Maximum number of matched public tools to return when include_all_tools is false."),
};

export const findLegalFournierToolOutput = {
  query_summary: z.string().describe("Short summary of the matching inputs and result count."),
  catalog_size: z.number().describe("Number of public Legal Fournier tools in the MCP catalog."),
  matched_tools: z
    .array(matchedLegalFournierToolSchema)
    .describe("Ranked public tools and their agent workflow guidance."),
  recommended_mcp_sequence: followUpToolsSchema.describe(
    "Recommended MCP tool sequence before the public-page or human handoff.",
  ),
  next_actions: z
    .array(z.string())
    .describe("Immediate actions for the agent after matching the public tool."),
  handoff_url: z.string().url().describe("Site-controlled consultation handoff URL."),
  catalog_resource_uri: z
    .string()
    .describe("Canonical MCP resource URI for the complete public tool catalog."),
  agent_use_rules: z
    .array(z.string())
    .describe("Rules for agents using the public tools with MCP outputs."),
  legal_notice: z
    .string()
    .describe("General legal notice that agents must preserve when using tool results."),
};

export const legalFournierPublicToolIdSchema = z.enum([
  "best-visa-spain",
  "digital-nomad-visa-eligibility",
  "digital-nomad-visa-beckham-law",
  "beckham-law-savings",
  "tax-residency",
  "work-remotely-spain",
  "property-buyer-cost-risk",
  "wealth-tax-inheritance",
  "autonomo-sl-entrepreneur",
  "permanent-establishment-risk",
  "holding-company-risk",
  "immigration-appointments",
]);

export const legalFournierToolNumberFactSchema = z.object({
  key: z
    .string()
    .trim().min(1).max(80)
    .describe("Stable key for the number, such as monthly_income, property_price, asset_value, or revenue."),
  value: z.number().min(0).max(1e12).describe("Finite non-negative numeric value supplied by the user; individual calculators apply stricter rules."),
  currency: z
    .enum(["EUR", "USD", "other"])
    .optional()
    .describe("Currency when the number is monetary."),
  unit: z.string().max(40).optional().describe("Optional unit when the value is not monetary."),
});

const calendarDate = z.iso.date();
export const digitalNomadIncomeInput = z.object({
  income_sources: z.array(z.object({
    amount: z.number().min(0).max(1e9), currency: z.literal("EUR"),
    period: z.enum(["monthly", "annual"]), category: z.enum(["employment", "self_employment"]),
    source_id: z.string().trim().min(1).max(80),
  })).min(1).max(30),
  accompanying_family: z.array(z.object({
    member_id: z.string().trim().min(1).max(80),
    relationship: z.enum(["spouse", "partner", "child", "parent", "other"]),
  })).max(30),
  assessment_date: calendarDate,
});
export const propertyInput = z.object({
  purchase_price_eur: z.number().positive().max(1e10).describe("Agreed price in EUR for the whole property."),
  taxable_value_eur: z.number().positive().max(1e10).describe("Confirmed tax base for the whole property, including the applicable reference-value comparison. Do not assume this equals the purchase price."),
  region: z.string().trim().min(1).max(100).describe("Autonomous community where the property is situated, not the buyer’s residence."),
  property_type: z.enum(["resale", "new_build"]),
  special_tax_regime: z.enum(["general", "special_or_reduced", "unknown"]).describe("Use general only after confirming no special, reduced or exempt treatment applies."),
  transaction_date: calendarDate,
  full_ownership: z.boolean().optional().describe("True only when acquiring full ownership of the entire property; partial shares need separate review."),
});
export const runLegalFournierToolInput = {
  digital_nomad_income: digitalNomadIncomeInput.optional(),
  property: propertyInput.optional(),
  tool_id: legalFournierPublicToolIdSchema.describe(
    "Public Legal Fournier tool to run directly inside MCP.",
  ),
  user_goal: z
    .string().max(3000)
    .optional()
    .describe("Natural-language user goal or case summary."),
  facts: z
    .array(z.string().max(3000).describe("Non-sensitive fact supplied by the user."))
    .max(50)
    .optional()
    .describe("General facts for the direct MCP screening run."),
  numbers: z
    .array(legalFournierToolNumberFactSchema).max(50)
    .optional()
    .describe("Optional numeric facts for calculator-style intake."),
  preferred_language: findLegalFournierToolLanguageSchema
    .optional()
    .describe("Preferred public page language for selected_url."),
  complexity_signals: z
    .array(z.string().max(500).describe("Specific blocker, edge case, or risk signal."))
    .max(50)
    .optional()
    .describe("Signals that should trigger human review."),
};

export const runLegalFournierToolOutput = {
  numerical_status: z.enum(["not_assessed", "needs_more_info", "meets_threshold", "below_threshold"]).optional(),
  numeric_result: z.record(z.string(), z.unknown()).optional(),
  tool_id: legalFournierPublicToolIdSchema.describe("Tool that was run directly in MCP."),
  title: z.string().describe("Public tool title."),
  outcome: z
    .enum(["possible_fit", "needs_more_facts", "needs_human_review", "does_not_meet_threshold"])
    .describe("Direct MCP screening outcome."),
  summary: z.string().describe("Short explanation of the direct MCP run."),
  selected_url: z
    .string()
    .url()
    .describe("Best public URL after applying preferred language."),
  selected_language: z.enum(["en", "es", "fr"]).describe("Language used for selected_url."),
  public_tool_url: z.string().url().describe("Canonical English public tool URL."),
  missing_facts: z
    .array(z.string())
    .describe("Facts the agent should collect before relying on the screening output."),
  complexity_flags: z
    .array(z.string())
    .describe("Signals that make human review advisable."),
  direct_screening_notes: z
    .array(z.string())
    .describe("Direct MCP screening notes and usage caveats."),
  numeric_notes: z
    .array(z.string())
    .describe("Calculator-style numeric notes, with current-law caveats."),
  handoff_recommended: z
    .boolean()
    .describe("Whether the direct MCP run recommends Legal Fournier human review."),
  handoff_reason: z.string().describe("Reason for the handoff recommendation or caveat."),
  handoff_url: z.string().url().describe("Legal Fournier consultation handoff URL."),
  related_mcp_tools: followUpToolsSchema.describe("Other MCP tools paired with this direct run."),
  related_resource_uris: relatedResourceUrisSchema,
  next_actions: z
    .array(z.string())
    .describe("Immediate next actions for the agent."),
  update_policy: z
    .array(z.string())
    .describe("How this direct MCP runner should be updated and verified."),
  legal_notice: z.string().describe("General legal notice agents must preserve."),
};

export const paidConsultationOfferSchema = z.object({
  id: z.enum(["email_consultation", "call_consultation"]),
  name: z.string(),
  price_usd: z.string(),
  amount_atomic: z.string(),
  currency: z.literal("USDC"),
  network: z.string(),
  payment_protocol: z.literal("x402-v2"),
  availability: z.enum(["asynchronous", "scheduled"]),
  quote_endpoint: z.string().url(),
  payment_endpoint: z.string().url(),
  response_sla: z.string().optional(),
  duration_minutes: z.number().int().positive().optional(),
  availability_endpoint: z.string().url().optional(),
  confirmation: z.string().optional(),
});

export const paidConsultationOptionsOutput = {
  success: z.literal(true),
  openapi_url: z.string().url(),
  offers: z.array(paidConsultationOfferSchema),
  settlement_notice: z.string(),
  agent_instructions: z.array(z.string()),
};

export const paidCallAvailabilityInput = {
  from: z
    .string()
    .refine((value) => Number.isFinite(Date.parse(value)), "Must be a valid date-time")
    .describe("Start of the availability window as an ISO 8601 date-time."),
  to: z
    .string()
    .refine((value) => Number.isFinite(Date.parse(value)), "Must be a valid date-time")
    .describe("End of the availability window as an ISO 8601 date-time."),
  timezone: z
    .string()
    .min(1)
    .max(100)
    .describe("IANA timezone for the customer, such as Europe/Madrid."),
};

export const paidCallAvailabilityOutput = {
  success: z.literal(true),
  openapi_url: z.string().url(),
  timezone: z.string(),
  duration_minutes: z.number().int().positive(),
  booking_enabled: z.boolean(),
  fulfillment_mode: z.string(),
  fulfillment_notice: z.string(),
  slots: z.array(z.object({ start: z.string(), end: z.string() })),
  quote_endpoint: z.string().url(),
  payment_endpoint: z.string().url(),
};


export const searchInput = {
  query: z.string().trim().max(500).default(""),
  max_results: z.number().int().min(1).max(20).optional(),
  language: z.enum(["en", "es", "fr", "und"]).optional(),
  type: z.enum(["article", "video", "resource"]).optional(),
  topic: z.string().trim().min(1).max(80).optional(),
};
export const fetchInput = {
  id: z.string().trim().min(1).max(300).optional(),
  uri: z.string().trim().min(1).max(500).optional(),
  offset: z.number().int().min(0).max(1e7).optional(),
  max_chars: z.number().int().min(1000).max(40000).optional(),
};
export const searchOutput = {
  query: z.string(),
  resources: z.array(z.object({
    uri: z.string(), title: z.string(), score: z.number(),
    id: z.string().optional(), url: z.string().url().optional(),
    description: z.string().optional(), excerpt: z.string().optional(),
    language: z.string().optional(), type: z.string().optional(),
    topics: z.array(z.string()).optional(), mime_type: z.string().optional(),
    source_modified_at: z.string().nullable().optional(),
    reviewed_at: z.string().nullable().optional(),
  }).passthrough()),
  next_action: z.string(),
  index_updated_at: z.string().nullable().optional(),
  index_status: z.string().optional(),
};
export const fetchOutput = {
  uri: z.string(), content_type: z.string(), text: z.string(),
  id: z.string().optional(), url: z.string().url().optional(), title: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  total_chars: z.number().int().optional(), offset: z.number().int().optional(),
  next_offset: z.number().int().nullable().optional(),
};
export const inputSchemas = {
  find_legal_fournier_tool: z.object(findLegalFournierToolInput),
  run_legal_fournier_tool: z.object(runLegalFournierToolInput),
  get_visa_options: z.object(getVisaOptionsInput),
  check_beckham_eligibility: beckhamAssessmentSchema,
  get_residency_path: z.object(residencyPathInput).refine((args) => args.qualifying_legal_residence_years === undefined || args.qualifying_legal_residence_years <= args.years_in_spain, { message: "Qualifying legal residence cannot exceed the supplied elapsed years in Spain.", path: ["qualifying_legal_residence_years"] }),
  explain_nie_process: z.object({}),
  compare_tax_regimes: z.object(compareTaxInput),
  route_to_legal_fournier_help: z.object(routeToHelpInput),
  create_legal_fournier_contact_request: z.object(createContactRequestInput),
  get_paid_consultation_options: z.object({}),
  get_paid_call_availability: z.object(paidCallAvailabilityInput),
  search: z.object(searchInput),
  fetch: z.object(fetchInput).refine((args) => Boolean(args.id || args.uri), { message: "Provide id or uri.", path: ["uri"] }),
};
export const outputSchemas = {
  find_legal_fournier_tool: z.object(findLegalFournierToolOutput),
  run_legal_fournier_tool: z.object(runLegalFournierToolOutput),
  get_visa_options: z.object(getVisaOptionsOutput),
  check_beckham_eligibility: z.object(checkBeckhamOutput),
  get_residency_path: z.object(residencyPathOutput),
  explain_nie_process: z.object(explainNieOutput),
  compare_tax_regimes: z.object(compareTaxOutput),
  route_to_legal_fournier_help: z.object(routeToHelpOutput),
  create_legal_fournier_contact_request: z.object(createContactRequestOutput),
  get_paid_consultation_options: z.object(paidConsultationOptionsOutput),
  get_paid_call_availability: z.object(paidCallAvailabilityOutput),
  search: z.object(searchOutput),
  fetch: z.object(fetchOutput),
};
export type PublicToolName = keyof typeof inputSchemas;
