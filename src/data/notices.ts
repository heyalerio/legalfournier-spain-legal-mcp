export const AGENT_LEGAL_NOTICE_LINES = [
  "This MCP provides general informational screening and drafting support for Spain immigration, residency, administrative, and tax matters. It is not individualized legal or tax advice.",
  "Use MCP outputs to triage issues, draft questions, and prepare a handoff. Do not treat them as filing-ready advice without human lawyer review.",
  "Reading MCP resources, calling tools, booking a consultation, or contacting Legal Fournier does not by itself create a lawyer-client or professional advisory relationship.",
];

export const REPRESENTATION_NOTICE =
  "Contacting Legal Fournier, sending intake details, or booking a consultation does not by itself create a lawyer-client or professional advisory relationship. Representation starts only after the firm expressly accepts the matter.";

export function renderAgentLegalNoticeMarkdown(): string[] {
  return [
    "## Legal Notice For Agents",
    ...AGENT_LEGAL_NOTICE_LINES.map((line) => `- ${line}`),
    "",
  ];
}

export function promptLegalNoticeBlock(): string {
  return (
    "Legal guardrails:\n" +
    AGENT_LEGAL_NOTICE_LINES.map((line) => `- ${line}`).join("\n")
  );
}
