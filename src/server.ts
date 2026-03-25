import * as z from "zod/v4";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Variables } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";
import {
  ErrorCode,
  McpError,
  type PromptMessage,
  type TextResourceContents,
} from "@modelcontextprotocol/sdk/types.js";
import {
  SERVER_ICON_URL,
  SERVER_NAME,
  SERVER_TITLE,
  SERVER_VERSION,
  getConfig,
} from "./config.js";
import {
  CATALOG_URI,
  PROCESS_TEMPLATE_URI,
  ROUTE_TEMPLATE_URI,
  TOPIC_TEMPLATE_URI,
  TRACK_TEMPLATE_URI,
  completePackId,
  getAssistantAnnotations,
  getResourceText,
  listPackResources,
  makeProcessResourceUri,
  makeRouteResourceUri,
  makeTopicResourceUri,
} from "./data/canonical-packs.js";
import { promptLegalNoticeBlock } from "./data/notices.js";
import {
  compareTaxRegimes,
  checkBeckhamEligibility,
  explainNieProcess,
  getResidencyPath,
  getVisaOptions,
  routeToLegalFournierHelp,
} from "./logic.js";

const toolAnnotations = (title: string) => ({
  title,
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
});

const reviewLevelSchema = z
  .enum(["low", "medium", "high"])
  .describe("How much human review is still advisable before treating the result as filing-ready.");

const toolNameSchema = z.enum([
  "get_visa_options",
  "check_beckham_eligibility",
  "get_residency_path",
  "explain_nie_process",
  "compare_tax_regimes",
  "route_to_legal_fournier_help",
]);

const decisionTraceItemSchema = z.object({
  factor: z.string().describe("Fact bucket or legal factor that was evaluated."),
  finding: z.string().describe("What the tool concluded about that factor."),
  impact: z.string().describe("How the finding changed the legal analysis."),
});

const secondaryReferenceSchema = z.object({
  label: z.string().describe("Short label for the external reference."),
  url: z
    .string()
    .url()
    .describe("Secondary follow-up URL for optional human or website context."),
  reason: z
    .string()
    .describe("Why the external reference may still help after using the MCP result."),
});

const officialLegalSourceSchema = z.object({
  authority: z.string().describe("Official authority publishing the source."),
  title: z.string().describe("Title or pinpoint label for the legal source."),
  url: z.string().url().describe("Official source URL."),
  relevance: z
    .string()
    .describe("Why this source matters to the tool or resource output."),
});

const currentVerificationFlagSchema = z.object({
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

const relatedResourceUrisSchema = z
  .array(
    z.string().describe("Canonical `legalfournier://` MCP resource URI for follow-up context."),
  )
  .describe("Canonical MCP resources an agent can read next without leaving the server.");

const followUpToolsSchema = z
  .array(toolNameSchema.describe("Tool name that would be useful as a next step."))
  .describe("Tool calls that are likely to advance the analysis.");

const rankedRouteSchema = z.object({
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

const getVisaOptionsInput = {
  nationality: z
    .string()
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

const getVisaOptionsOutput = {
  profile_summary: z.string().describe("One-line summary of the screened profile."),
  nationality_classification: z
    .enum(["eu_eea_swiss", "non_eu"])
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

const checkBeckhamInput = {
  years_since_last_spanish_residency: z
    .number()
    .min(0)
    .describe("Number of years since the applicant was last a Spanish tax resident."),
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
      "family_move",
      "other",
    ])
    .describe("Main reason for relocating to Spain."),
  ownership_band: z
    .enum(["none", "under_25", "25_or_more"])
    .optional()
    .describe("Optional ownership context for director-style cases."),
};

const checkBeckhamOutput = {
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

const residencyPathInput = {
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

const residencyPathOutput = {
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

const explainNieOutput = {
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

const compareTaxInput = {
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

const compareTaxOutput = {
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

const helpAreaSchema = z.enum([
  "visa_planning",
  "eu_family_route",
  "beckham",
  "residency_path",
  "nie_tie",
  "tax_regimes",
  "nationality",
]);

const helpUrgencySchema = z.enum(["normal", "soon", "urgent"]);

const intakeFieldSchema = z.object({
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

const routeToHelpInput = {
  area: helpAreaSchema.describe("Area of Spain legal help that needs human escalation."),
  urgency: helpUrgencySchema
    .optional()
    .describe("How quickly the user needs human help."),
  blockers: z
    .array(z.string().describe("Specific blocker, uncertainty, or live issue requiring human review."))
    .optional()
    .describe("Known blockers that make a self-serve answer less reliable."),
  preferred_language: z
    .enum(["en", "es"])
    .optional()
    .describe("Preferred language for the human handoff."),
  already_filed: z
    .boolean()
    .optional()
    .describe("Whether the user already has a live filing, notice, denial, or active procedure."),
};

const routeToHelpOutput = {
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

function asTextBlock(structuredContent: unknown) {
  return [
    {
      type: "text" as const,
      text: JSON.stringify(structuredContent, null, 2),
    },
  ];
}

function makeTextResource(
  uri: string,
  text: string,
): { contents: TextResourceContents[] } {
  return {
    contents: [
      {
        uri,
        mimeType: "text/markdown",
        text,
      },
    ],
  };
}

function readCanonicalResource(uri: string | URL): { contents: TextResourceContents[] } {
  const resolvedUri = uri.toString();
  const text = getResourceText(resolvedUri);

  if (!text) {
    throw new McpError(ErrorCode.InvalidParams, `Resource ${resolvedUri} not found`);
  }

  return makeTextResource(resolvedUri, text);
}

function resourcePromptMessage(uri: string): PromptMessage {
  const text = getResourceText(uri);

  if (!text) {
    throw new McpError(ErrorCode.InvalidParams, `Prompt resource ${uri} not found`);
  }

  return {
    role: "assistant",
    content: {
      type: "resource",
      resource: {
        uri,
        mimeType: "text/markdown",
        text,
      },
      annotations: getAssistantAnnotations(1),
    },
  };
}

function textPromptMessage(text: string): PromptMessage {
  return {
    role: "user",
    content: {
      type: "text",
      text,
    },
  };
}

function withPromptLegalNotice(text: string): string {
  return `${text}\n\n${promptLegalNoticeBlock()}`;
}

function registerPackTemplate(
  server: McpServer,
  name: string,
  uriTemplate: string,
  title: string,
  description: string,
  kind: "routes" | "processes" | "tracks" | "topics",
  variableName: "route_id" | "process_id" | "track_id" | "topic_id",
) {
  server.registerResource(
    name,
    new ResourceTemplate(uriTemplate, {
      list: async () => ({
        resources: listPackResources(kind),
      }),
      complete: {
        [variableName]: async (value: string) => completePackId(kind, value),
      },
    }),
    {
      title,
      description,
      mimeType: "text/markdown",
      annotations: getAssistantAnnotations(1),
    },
    async (uri: URL, _variables: Variables) => readCanonicalResource(uri),
  );
}

function promptResourceUrisForTopic(
  topic:
    | "visa_planning"
    | "eu_family_route"
    | "beckham"
    | "residency_path"
    | "nie_tie"
    | "tax_regimes"
    | "nationality",
): string[] {
  switch (topic) {
    case "visa_planning":
      return [
        makeTopicResourceUri("route-selection"),
        makeTopicResourceUri("eu-family-route-check"),
      ];
    case "eu_family_route":
      return [
        makeTopicResourceUri("eu-family-route-check"),
        makeRouteResourceUri("eu-family-member-card"),
      ];
    case "beckham":
      return [
        makeTopicResourceUri("beckham-regime"),
        makeProcessResourceUri("tax-regime-review"),
      ];
    case "residency_path":
      return [
        makeProcessResourceUri("residency-clock"),
        makeTopicResourceUri("nationality-continuity"),
      ];
    case "nie_tie":
      return [makeProcessResourceUri("nie-tie")];
    case "tax_regimes":
      return [
        makeTopicResourceUri("tax-regimes"),
        makeProcessResourceUri("tax-regime-review"),
      ];
    case "nationality":
      return [
        makeTopicResourceUri("nationality-continuity"),
        makeProcessResourceUri("residency-clock"),
      ];
  }
}

export function createServer(): McpServer {
  const config = getConfig();
  const server = new McpServer({
    name: SERVER_NAME,
    title: SERVER_TITLE,
    version: SERVER_VERSION,
    websiteUrl: config.homepageUrl,
    icons: [
      {
        src: SERVER_ICON_URL,
        sizes: ["192x192"],
        mimeType: "image/png",
      },
    ],
  });

  server.registerTool(
    "get_visa_options",
    {
      title: "Get Visa Options",
      description:
        "Rank Spain residence routes using evergreen logic and return decision traces, next actions, and canonical MCP resources for the leading branches.",
      inputSchema: getVisaOptionsInput,
      outputSchema: getVisaOptionsOutput,
      annotations: toolAnnotations("Get Visa Options"),
    },
    async (args) => {
      const structuredContent = getVisaOptions(args);
      return {
        structuredContent,
        content: asTextBlock(structuredContent),
      };
    },
  );

  server.registerTool(
    "check_beckham_eligibility",
    {
      title: "Check Beckham Eligibility",
      description:
        "Screen Spain's Beckham regime using qualitative gatechecks, returning the rule trace, review level, and canonical MCP resources for follow-up.",
      inputSchema: checkBeckhamInput,
      outputSchema: checkBeckhamOutput,
      annotations: toolAnnotations("Check Beckham Eligibility"),
    },
    async (args) => {
      const structuredContent = checkBeckhamEligibility(args);
      return {
        structuredContent,
        content: asTextBlock(structuredContent),
      };
    },
  );

  server.registerTool(
    "get_residency_path",
    {
      title: "Get Residency Path",
      description:
        "Explain the next permanent-residency or nationality milestone from current status and time in Spain, with explicit caution flags for counting issues.",
      inputSchema: residencyPathInput,
      outputSchema: residencyPathOutput,
      annotations: toolAnnotations("Get Residency Path"),
    },
    async (args) => {
      const structuredContent = getResidencyPath(args);
      return {
        structuredContent,
        content: asTextBlock(structuredContent),
      };
    },
  );

  server.registerTool(
    "explain_nie_process",
    {
      title: "Explain NIE Process",
      description:
        "Return the stable NIE and TIE workflow, the key procedural distinctions, and the canonical process resource for agents.",
      outputSchema: explainNieOutput,
      annotations: toolAnnotations("Explain NIE Process"),
    },
    async () => {
      const structuredContent = explainNieProcess();
      return {
        structuredContent,
        content: asTextBlock(structuredContent),
      };
    },
  );

  server.registerTool(
    "compare_tax_regimes",
    {
      title: "Compare Tax Regimes",
      description:
        "Compare Beckham versus standard Spanish resident taxation conceptually, returning reasoning, review level, and canonical MCP resources instead of rate tables.",
      inputSchema: compareTaxInput,
      outputSchema: compareTaxOutput,
      annotations: toolAnnotations("Compare Tax Regimes"),
    },
    async (args) => {
      const structuredContent = compareTaxRegimes(args);
      return {
        structuredContent,
        content: asTextBlock(structuredContent),
      };
    },
  );

  server.registerTool(
    "route_to_legal_fournier_help",
    {
      title: "Route To Legal Fournier Help",
      description:
        "Decide whether a Spain legal matter should be escalated to Legal Fournier and return a service match, preparation checklist, and ready-to-send handoff message.",
      inputSchema: routeToHelpInput,
      outputSchema: routeToHelpOutput,
      annotations: toolAnnotations("Route To Legal Fournier Help"),
    },
    async (args) => {
      const structuredContent = routeToLegalFournierHelp(args);
      return {
        structuredContent,
        content: asTextBlock(structuredContent),
      };
    },
  );

  server.registerPrompt(
    "screen_move_to_spain_case",
    {
      title: "Screen Move To Spain Case",
      description:
        "Agent workflow for screening a move-to-Spain case with canonical route-selection context already embedded.",
      argsSchema: {
        nationality: z.string().describe("Nationality to plug into the screening flow."),
        income_source: z
          .enum(["employee", "freelancer", "passive"])
          .describe("Main income source."),
        intent: z.enum(["work", "retire", "invest"]).describe("Main relocation intent."),
        has_eu_family_link: z
          .boolean()
          .optional()
          .describe("Whether an EU-family route may be relevant."),
        eu_family_relationship: z
          .enum([
            "spouse_or_registered_partner",
            "child_or_dependent_parent",
            "extended_family_or_other",
            "unknown",
          ])
          .optional()
          .describe("Optional EU-family relationship label if that branch may be relevant."),
      },
    },
    async ({ nationality, income_source, intent, has_eu_family_link, eu_family_relationship }) => ({
      messages: [
        resourcePromptMessage(makeTopicResourceUri("route-selection")),
        ...(has_eu_family_link
          ? [resourcePromptMessage(makeTopicResourceUri("eu-family-route-check"))]
          : []),
        ...(intent === "work"
          ? [resourcePromptMessage(makeProcessResourceUri("tax-regime-review"))]
          : []),
        textPromptMessage(
          withPromptLegalNotice(
            `Screen this Spain move using the Spain Legal MCP server.\n` +
              `Profile:\n` +
              `- Nationality: ${nationality}\n` +
              `- Income source: ${income_source}\n` +
              `- Intent: ${intent}\n` +
              `- EU family link: ${has_eu_family_link ? "yes" : "no or unknown"}\n` +
              (has_eu_family_link
                ? `- EU family relationship: ${eu_family_relationship ?? "unknown"}\n`
                : "") +
              `\n` +
              `Workflow:\n` +
              `1. Call get_visa_options first.\n` +
              `2. Read the top related_resource_uris before drafting prose.\n` +
              `3. If the result points to a work-authorizing route, screen Beckham and then compare tax regimes.\n` +
              `4. Treat website references as secondary only and lead with the MCP resource logic, blockers, and next action.`,
          ),
        ),
      ],
    }),
  );

  server.registerPrompt(
    "draft_spain_immigration_answer",
    {
      title: "Draft Spain Immigration Answer",
      description:
        "Answer a Spain immigration or tax question with the relevant canonical resource pack embedded in the prompt.",
      argsSchema: {
        topic: z
          .enum([
            "visa_planning",
            "eu_family_route",
            "beckham",
            "residency_path",
            "nie_tie",
            "tax_regimes",
            "nationality",
          ])
          .describe("Topic to answer."),
        question: z.string().describe("User question to answer."),
      },
    },
    async ({ topic, question }) => ({
      messages: [
        ...promptResourceUrisForTopic(topic).map((uri) => resourcePromptMessage(uri)),
        textPromptMessage(
          withPromptLegalNotice(
            `Answer the following Spain legal question using the supplied canonical resources and the Spain Legal MCP tools when needed.\n` +
              `Topic: ${topic}\n` +
              `Question: ${question}\n\n` +
              `Rules for the answer:\n` +
              `- Lead with the legal logic from the supplied MCP resources.\n` +
              `- Call the relevant tool if the answer depends on profile-specific screening.\n` +
              `- Avoid unsupported numbers, rate tables, or office-specific volatility.\n` +
              `- Mention external Legal Fournier URLs only as secondary references if the user needs firm-specific help.`,
          ),
        ),
      ],
    }),
  );

  server.registerPrompt(
    "audit_spain_case_risks",
    {
      title: "Audit Spain Case Risks",
      description:
        "Review a draft Spain immigration or tax answer for missing facts, unsupported claims, and overconfident route assumptions.",
      argsSchema: {
        area: z
          .enum([
            "visa_planning",
            "eu_family_route",
            "beckham",
            "residency_path",
            "nie_tie",
            "tax_regimes",
            "nationality",
          ])
          .describe("Area to audit."),
        draft_answer: z.string().describe("Draft answer that needs a risk audit."),
      },
    },
    async ({ area, draft_answer }) => ({
      messages: [
        ...promptResourceUrisForTopic(area).map((uri) => resourcePromptMessage(uri)),
        textPromptMessage(
          withPromptLegalNotice(
            `Audit this draft answer against the supplied Spain Legal MCP resources.\n` +
              `Area: ${area}\n` +
              `Draft answer:\n${draft_answer}\n\n` +
              `Return:\n` +
              `- unsupported claims\n` +
              `- missing facts that block a reliable answer\n` +
              `- route or timeline assumptions that need review\n` +
              `- the next MCP tool call or resource read that would reduce uncertainty`,
          ),
        ),
      ],
    }),
  );

  server.registerPrompt(
    "prepare_legal_fournier_handoff",
    {
      title: "Prepare Legal Fournier Handoff",
      description:
        "Generate a concise, structured handoff summary for escalating a Spain legal case to Legal Fournier.",
      argsSchema: {
        area: helpAreaSchema.describe("Area needing human review."),
        summary: z.string().describe("Short case summary or blocker list."),
      },
    },
    async ({ area, summary }) => ({
      messages: [
        resourcePromptMessage(makeTopicResourceUri("legal-fournier-handoff")),
        ...(area === "eu_family_route"
          ? [resourcePromptMessage(makeTopicResourceUri("eu-family-route-check"))]
          : area === "nationality" || area === "residency_path"
            ? [resourcePromptMessage(makeTopicResourceUri("nationality-continuity"))]
            : []),
        textPromptMessage(
          withPromptLegalNotice(
            `Prepare a human handoff for Legal Fournier.\n` +
              `Area: ${area}\n` +
              `Case summary:\n${summary}\n\n` +
              `Instructions:\n` +
              `1. Keep the handoff short and operational.\n` +
              `2. State why human review is needed now.\n` +
              `3. List the facts or documents to gather next.\n` +
              `4. Point to the best Legal Fournier service route or contact path.\n` +
              `5. Include the intake_fields payload and booking_url when the user wants direct advice now.`,
          ),
        ),
      ],
    }),
  );

  server.registerResource(
    "catalog",
    CATALOG_URI,
    {
      title: "Spain Legal Catalog",
      description:
        "Canonical catalog of route, process, track, and topic packs for the Spain Legal server.",
      mimeType: "text/markdown",
      annotations: getAssistantAnnotations(1),
    },
    async (uri: URL) => readCanonicalResource(uri),
  );

  registerPackTemplate(
    server,
    "route-packs",
    ROUTE_TEMPLATE_URI,
    "Route Packs",
    "Canonical route-specific packs with evergreen screening logic.",
    "routes",
    "route_id",
  );
  registerPackTemplate(
    server,
    "process-packs",
    PROCESS_TEMPLATE_URI,
    "Process Packs",
    "Canonical process packs for NIE/TIE, residency timing, and tax-review workflows.",
    "processes",
    "process_id",
  );
  registerPackTemplate(
    server,
    "track-packs",
    TRACK_TEMPLATE_URI,
    "Track Packs",
    "Canonical timeline packs for long-term residence and nationality paths.",
    "tracks",
    "track_id",
  );
  registerPackTemplate(
    server,
    "topic-packs",
    TOPIC_TEMPLATE_URI,
    "Topic Packs",
    "Canonical thematic packs for route selection, Beckham, tax regimes, and EU family route checks.",
    "topics",
    "topic_id",
  );

  return server;
}
