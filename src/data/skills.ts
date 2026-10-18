import { getAssistantAnnotations, makeProcessResourceUri, makeTopicResourceUri } from "./canonical-packs.js";

export type SkillId =
  | "visa-intake-triage"
  | "beckham-precheck"
  | "nie-tie-procedure-coach"
  | "nationality-continuity-audit"
  | "human-handoff-prep";

export interface McpSkill {
  id: SkillId;
  uri: string;
  title: string;
  summary: string;
  when_to_use: string[];
  workflow: string[];
  recommended_tools: string[];
  recommended_prompts: string[];
  recommended_resources: string[];
}

export const SKILLS_TEMPLATE_URI = "legalfournier://spain-legal/skills/{skill_id}";
export const SKILLS_INDEX_URI = "legalfournier://spain-legal/skills";

export function makeSkillResourceUri(skillId: SkillId): string {
  return `legalfournier://spain-legal/skills/${skillId}`;
}

export const SKILLS: Record<SkillId, McpSkill> = {
  "visa-intake-triage": {
    id: "visa-intake-triage",
    uri: makeSkillResourceUri("visa-intake-triage"),
    title: "Visa Intake Triage",
    summary:
      "Fast first-pass skill to classify route family, surface blockers, and produce next-step actions before deep drafting.",
    when_to_use: [
      "First user message includes relocation intent but route is unknown.",
      "Case mixes work, family, and tax details and needs routing clarity.",
    ],
    workflow: [
      "Call get_visa_options; for family routes, collect sponsor nationality and any exercise of EU free movement.",
      "Read top related_resource_uris before writing prose.",
      "For a work-authorizing route, collect the required Beckham facts before comparing tax regimes. Activating the separate beckham-precheck skill requires fresh user consent.",
    ],
    recommended_tools: ["get_visa_options", "check_beckham_eligibility", "compare_tax_regimes"],
    recommended_prompts: ["screen_move_to_spain_case", "draft_spain_immigration_answer"],
    recommended_resources: [
      makeTopicResourceUri("route-selection"),
      makeTopicResourceUri("eu-family-route-check"),
    ],
  },
  "beckham-precheck": {
    id: "beckham-precheck",
    uri: makeSkillResourceUri("beckham-precheck"),
    title: "Beckham Precheck",
    summary:
      "Screen the five prior tax periods and qualifying activity before comparing tax regimes.",
    when_to_use: [
      "User asks if Beckham applies.",
      "Employment type or director status is unclear and answer quality would be fragile.",
    ],
    workflow: [
      "Collect move_year, spanish_tax_resident_years and prior_tax_periods_confirmed for all five prior tax periods; an elapsed-year gap is insufficient.",
      "Confirm qualifying activity, relocation timing, election deadline and permanent-establishment exclusions; include director entity/shareholding or professional income-mix facts where relevant. Keep unknown facts unknown.",
      "Call check_beckham_eligibility, then pass the same inputs as beckham_assessment to compare_tax_regimes with the same employment_type.",
      "Escalate to route_to_legal_fournier_help if review_level remains high.",
    ],
    recommended_tools: [
      "check_beckham_eligibility",
      "compare_tax_regimes",
      "route_to_legal_fournier_help",
    ],
    recommended_prompts: ["draft_spain_immigration_answer", "audit_spain_case_risks"],
    recommended_resources: [
      makeTopicResourceUri("beckham-regime"),
      makeProcessResourceUri("tax-regime-review"),
      makeTopicResourceUri("tax-regimes"),
    ],
  },
  "nie-tie-procedure-coach": {
    id: "nie-tie-procedure-coach",
    uri: makeSkillResourceUri("nie-tie-procedure-coach"),
    title: "NIE/TIE Procedure Coach",
    summary:
      "Procedure-first skill to separate NIE number logic from TIE card logic and avoid office-level guesswork.",
    when_to_use: [
      "User asks about appointments, forms, or fees for NIE/TIE.",
      "Case confuses identification number requests with residence-card issuance.",
    ],
    workflow: [
      "Call explain_nie_process.",
      "Read the NIE/TIE process pack for procedural distinctions.",
      "Escalate when there is filing risk, rejection risk, or missing critical facts.",
    ],
    recommended_tools: ["explain_nie_process", "route_to_legal_fournier_help"],
    recommended_prompts: ["draft_spain_immigration_answer", "prepare_legal_fournier_handoff"],
    recommended_resources: [makeProcessResourceUri("nie-tie")],
  },
  "nationality-continuity-audit": {
    id: "nationality-continuity-audit",
    uri: makeSkillResourceUri("nationality-continuity-audit"),
    title: "Nationality Continuity Audit",
    summary:
      "Continuity-sensitive skill that checks residence quality before treating a nationality timeline as filing-ready.",
    when_to_use: [
      "User claims they hit a nationality year threshold.",
      "Case includes absences, status changes, or one-year exception claims.",
    ],
    workflow: [
      "Call get_residency_path with qualifying_legal_residence_years, continuity_confirmed, current status, nationality track, any special basis and absence concerns; elapsed years alone do not establish qualifying residence.",
      "Read nationality continuity resources and article pinpoints.",
      "Escalate if continuity basis or one-year exception basis is unclear.",
    ],
    recommended_tools: ["get_residency_path", "route_to_legal_fournier_help"],
    recommended_prompts: ["audit_spain_case_risks", "prepare_legal_fournier_handoff"],
    recommended_resources: [
      makeTopicResourceUri("nationality-continuity"),
      makeProcessResourceUri("residency-clock"),
    ],
  },
  "human-handoff-prep": {
    id: "human-handoff-prep",
    uri: makeSkillResourceUri("human-handoff-prep"),
    title: "Human Handoff Prep",
    summary:
      "Escalation skill that packages blockers, urgency, and intake fields into a structured Legal Fournier handoff.",
    when_to_use: [
      "Case has high-review warnings, live deadlines, or conflicting route evidence.",
      "User asks for direct lawyer review after MCP screening.",
    ],
    workflow: [
      "Call route_to_legal_fournier_help.",
      "Generate concise handoff summary with urgency and blockers.",
      "Provide booking path and required intake fields.",
    ],
    recommended_tools: ["route_to_legal_fournier_help"],
    recommended_prompts: ["prepare_legal_fournier_handoff"],
    recommended_resources: [makeTopicResourceUri("legal-fournier-handoff")],
  },
};

export function getSkillModifiedAt(skill: McpSkill): string | undefined {
  return ["visa-intake-triage", "beckham-precheck", "nationality-continuity-audit"].includes(skill.id)
    ? "2026-10-18T22:30:00Z"
    : undefined;
}

export function listSkillResources() {
  return Object.values(SKILLS).map((skill) => ({
    uri: skill.uri,
    name: `skill-${skill.id}`,
    title: skill.title,
    description: skill.summary,
    mimeType: "text/markdown",
    annotations: getAssistantAnnotations(1, getSkillModifiedAt(skill)),
  }));
}

export function listSkillIds(): string[] {
  return Object.keys(SKILLS).sort();
}

export function completeSkillId(value: string): string[] {
  const normalized = value.toLowerCase();
  return listSkillIds().filter((id) => id.startsWith(normalized));
}

export function getSkillByUri(uri: string): McpSkill | undefined {
  return Object.values(SKILLS).find((skill) => skill.uri === uri);
}

export function renderSkillMarkdown(skill: McpSkill): string {
  const lines: string[] = [
    `# ${skill.title}`,
    "",
    `**Skill ID:** \`${skill.id}\``,
    `**Resource URI:** \`${skill.uri}\``,
    "",
    skill.summary,
    "",
    "## When To Use",
    ...skill.when_to_use.map((item) => `- ${item}`),
    "",
    "## Workflow",
    ...skill.workflow.map((step, index) => `- ${index + 1}. ${step}`),
    "",
    "## Recommended Tools",
    ...skill.recommended_tools.map((tool) => `- \`${tool}\``),
    "",
    "## Recommended Prompts",
    ...skill.recommended_prompts.map((prompt) => `- \`${prompt}\``),
    "",
    "## Recommended Resources",
    ...skill.recommended_resources.map((resource) => `- \`${resource}\``),
  ];

  return lines.join("\n");
}
