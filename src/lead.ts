import { createHmac } from "node:crypto";
import { SERVER_NAME, SERVER_VERSION, getConfig } from "./config.js";
import { getConsultationBookingUrl, withMcpAttribution } from "./data/site.js";
import { getTelemetryRecorder } from "./telemetry.js";
import { inputSchemas } from "./schemas.js";
import { ApiError, publicError } from "./errors.js";

export type AgentLeadLanguage = "en" | "es" | "fr";
export type AgentLeadUrgency = "normal" | "soon" | "urgent";
export type AgentLeadSourceSurface =
  | "mcp"
  | "openapi"
  | "chatgpt_actions"
  | "claude_connector"
  | "zapier"
  | "make"
  | "n8n"
  | "relevance_ai"
  | "cursor"
  | "vscode"
  | "gemini_cli"
  | "claude_code"
  | "other";

export interface CreateLegalFournierContactRequestArgs extends Record<string, unknown> {
  confirmed_consent: boolean;
  consent_to_contact: boolean;
  name: string;
  email: string;
  phone?: string;
  preferred_language?: AgentLeadLanguage;
  legal_area:
    | "visa_planning"
    | "eu_family_route"
    | "spanish_family_route"
    | "beckham"
    | "residency_path"
    | "nie_tie"
    | "tax_regimes"
    | "nationality"
    | "property"
    | "business"
    | "wealth"
    | "inheritance"
    | "appointments"
    | "other";
  urgency?: AgentLeadUrgency;
  case_summary: string;
  agent_handoff_message?: string;
  risk_flags?: string[];
  missing_facts?: string[];
  related_resource_uris?: string[];
  tool_context?: string;
  source_surface?: AgentLeadSourceSurface;
  agent_app?: string;
  tool_name?: string;
  source_url?: string;
  referrer_url?: string;
  lead_id?: string;
  idempotency_key?: string;
}

export interface CreateLegalFournierContactRequestResult extends Record<string, unknown> {
  ok: boolean;
  entry_id: number;
  lead_id: string;
  lead_status: "created" | "duplicate";
  admin_queue: string;
  source: "agent";
  source_surface: string;
  message: string;
  representation_notice: string;
  booking_url: string;
  next_actions: string[];
  idempotency_key: string;
  notification_status?: "pending" | "processed" | "needs_reconciliation" | "unknown";
}

function makeSignature(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function makeIdempotencyKey(args: CreateLegalFournierContactRequestArgs, secret: string): string {
  if (args.idempotency_key) return args.idempotency_key;
  // Attribution and caller telemetry change between retries; the case itself does not.
  const semanticFields = ["confirmed_consent", "consent_to_contact", "name", "email", "phone", "preferred_language", "legal_area", "urgency", "case_summary", "agent_handoff_message", "risk_flags", "missing_facts", "related_resource_uris", "tool_context"] as const;
  const normalized = { ...args, preferred_language: args.preferred_language ?? "en", urgency: args.urgency ?? "normal" };
  const semantic = Object.fromEntries(semanticFields.map((field) => [field, normalized[field] ?? null]));
  return `agent-lead:${createHmac("sha256", secret).update(JSON.stringify(semantic)).digest("hex")}`;
}

export async function createLegalFournierContactRequest(
  input: CreateLegalFournierContactRequestArgs,
): Promise<CreateLegalFournierContactRequestResult> {
  let args;
  try { args = inputSchemas.create_legal_fournier_contact_request.parse(input); }
  catch (error) { throw publicError(error); }
  const config = getConfig();
  if (!config.agentLeadSecret) {
    throw new ApiError("CONTACT_UNAVAILABLE", "Contact submission is temporarily unavailable.", 503);
  }
  // Resolve all local return-path values before any consequential downstream action.
  const bookingUrl = withMcpAttribution(getConsultationBookingUrl(args.preferred_language ?? "en"), "agent_lead_booking");
  const context = getTelemetryRecorder().getContext();
  const payload = {
    ...args,
    preferred_language: args.preferred_language ?? "en",
    urgency: args.urgency ?? "normal",
    source_surface: args.source_surface ?? "mcp",
    agent_app: args.agent_app ?? context?.clientType ?? "unknown_agent",
    tool_name: args.tool_name ?? "create_legal_fournier_contact_request",
    request_ip_hash: context?.ipHash ?? "",
    agent_caller_ip: context?.clientIp ?? "",
    agent_caller_ip_source: context?.clientIpSource ?? "",
    agent_caller_country: context?.clientCountry ?? "",
    agent_caller_proxy_chain: context?.proxyChain ?? "",
    agent_caller_user_agent: context?.userAgent ?? "",
    agent_caller_client_key: context?.clientKey ?? "",
    idempotency_key: makeIdempotencyKey(args, config.agentLeadSecret),
  };
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  let response: Response;
  let responseBody: Record<string, unknown>;
  const timeoutMs = 15000;
  try {
    response = await fetch(config.agentLeadEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "user-agent": `${SERVER_NAME}/${SERVER_VERSION}`,
      "x-lf-agent-timestamp": timestamp,
      "x-lf-agent-signature": makeSignature(config.agentLeadSecret, timestamp, body),
      "x-lf-agent-idempotency-key": payload.idempotency_key,
    },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  responseBody = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new ApiError("CONTACT_OUTCOME_UNKNOWN", "Contact submission could not be confirmed. Retry the same request with the same idempotency key.", 503, { idempotency_key: payload.idempotency_key, outcome_unknown: true }, 5);
  }

  if (!response.ok || responseBody.ok !== true) {
    const retryAfter = Number(response.headers?.get("retry-after"));
    const retrySeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(Math.ceil(retryAfter), 3600) : 5;
    if (response.status === 409) {
      throw new ApiError("IDEMPOTENCY_CONFLICT", "This idempotency key is already bound to a different request or one still being processed.", 409, { idempotency_key: payload.idempotency_key }, retrySeconds);
    }
    if (response.status === 429) {
      throw new ApiError("CONTACT_RATE_LIMITED", "Contact submission is temporarily rate limited. Retry the same request later.", 429, { idempotency_key: payload.idempotency_key }, retrySeconds);
    }
    if (response.status >= 500 || response.status === 202) {
      throw new ApiError("CONTACT_OUTCOME_UNKNOWN", "Contact submission could not be confirmed. Retry the same request with the same idempotency key.", 503, { idempotency_key: payload.idempotency_key, outcome_unknown: true }, retrySeconds);
    }
    throw new ApiError("CONTACT_REJECTED", "The contact service did not accept this request.", 502, { idempotency_key: payload.idempotency_key });
  }
  if (!Number.isSafeInteger(responseBody.entry_id) || Number(responseBody.entry_id) <= 0) {
    throw new ApiError("CONTACT_OUTCOME_UNKNOWN", "The contact service accepted the request but confirmation is incomplete. Retry with the same idempotency key.", 503, { idempotency_key: payload.idempotency_key, outcome_unknown: true }, 5);
  }

  const notificationStatus = ["pending", "processed", "needs_reconciliation"].includes(String(responseBody.notification_status))
    ? responseBody.notification_status as "pending" | "processed" | "needs_reconciliation"
    : "unknown";
  return {
    ok: true,
    entry_id: Number(responseBody.entry_id ?? 0),
    lead_id: getString(responseBody.lead_id),
    lead_status: responseBody.duplicate === true ? "duplicate" : "created",
    admin_queue:
      getString(responseBody.admin_queue) || "Lead Entries > Accepted Leads: Forms and Bookings",
    source: "agent",
    source_surface: getString(responseBody.source_surface) || payload.source_surface,
    message:
      getString(responseBody.message) ||
      "Agent lead created in the Legal Fournier leads view.",
    representation_notice:
      getString(responseBody.representation_notice) ||
      "Submitting a contact request does not by itself create a lawyer-client or professional advisory relationship. Representation starts only after Legal Fournier expressly accepts the matter.",
    booking_url: bookingUrl,
    idempotency_key: payload.idempotency_key,
    notification_status: notificationStatus,
    next_actions: [
      notificationStatus === "pending" || notificationStatus === "needs_reconciliation"
        ? "Tell the user the contact request was saved by Legal Fournier; notification attempts need checking. Do not create another request to retry notifications."
        : "Tell the user the contact request was saved by Legal Fournier. Do not promise email delivery.",
      "Do not promise representation or a filing result.",
      "If the user wants to speak with a lawyer now, offer booking_url for a paid consultation.",
    ],
  };
}
