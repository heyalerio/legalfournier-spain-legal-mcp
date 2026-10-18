export interface SpainLegalConfig {
  siteBaseUrl: string;
  contactUrl: string;
  homepageUrl: string;
  mcpHost: string;
  mcpPort: number;
  mcpPath: string;
  mcpPublicUrl: string;
  mcpAllowedHosts: string[];
  telemetryEnabled: boolean;
  telemetryDir: string;
  agentCommerceBaseUrl: string;
  agentLeadEndpoint: string;
  agentLeadSecret: string;
}

const DEFAULT_SITE_BASE_URL = "https://legalfournier.com";
const DEFAULT_CONTACT_URL = "https://legalfournier.com/en/contact/";
const DEFAULT_HOMEPAGE_URL = "https://legalfournier.com/en/mcp/spain-legal/";
const DEFAULT_MCP_HOST = "127.0.0.1";
const DEFAULT_MCP_PORT = 3137;
const DEFAULT_MCP_PATH = "/mcp/spain-legal";
const DEFAULT_MCP_ALLOWED_HOSTS = [
  "legalfournier.com",
  "www.legalfournier.com",
  "127.0.0.1",
  "localhost",
];
const DEFAULT_TELEMETRY_DIR = "data/telemetry";
const DEFAULT_AGENT_COMMERCE_BASE_URL = "https://legalfournier.com";
const DEFAULT_AGENT_LEAD_ENDPOINT =
  "https://legalfournier.com/wp-json/legal-fournier/v1/agent-lead";

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  return fallback;
}

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePath(value: string | undefined, fallback: string): string {
  const raw = value?.trim() || fallback;
  const prefixed = raw.startsWith("/") ? raw : `/${raw}`;

  if (prefixed.length > 1 && prefixed.endsWith("/")) {
    return prefixed.slice(0, -1);
  }

  return prefixed;
}

function parseAllowedHosts(value: string | undefined): string[] {
  if (!value) {
    return DEFAULT_MCP_ALLOWED_HOSTS;
  }

  const hosts = value
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  return hosts.length > 0 ? hosts : DEFAULT_MCP_ALLOWED_HOSTS;
}

export function getConfig(): SpainLegalConfig {
  const mcpPath = normalizePath(process.env.LF_MCP_PATH, DEFAULT_MCP_PATH);

  return {
    siteBaseUrl: process.env.LF_SITE_BASE_URL ?? DEFAULT_SITE_BASE_URL,
    contactUrl: process.env.LF_CONTACT_URL ?? DEFAULT_CONTACT_URL,
    homepageUrl:
      process.env.LF_HOMEPAGE_URL ??
      process.env.LF_TOOLS_URL ??
      DEFAULT_HOMEPAGE_URL,
    mcpHost: process.env.LF_MCP_HOST ?? DEFAULT_MCP_HOST,
    mcpPort: parseInteger(process.env.LF_MCP_PORT, DEFAULT_MCP_PORT),
    mcpPath,
    mcpPublicUrl:
      process.env.LF_MCP_PUBLIC_URL ?? `${DEFAULT_SITE_BASE_URL}${mcpPath}`,
    mcpAllowedHosts: parseAllowedHosts(process.env.LF_MCP_ALLOWED_HOSTS),
    telemetryEnabled: parseBoolean(process.env.LF_MCP_TELEMETRY_ENABLED, true),
    telemetryDir: process.env.LF_MCP_TELEMETRY_DIR ?? DEFAULT_TELEMETRY_DIR,
    agentCommerceBaseUrl:
      process.env.LF_AGENT_COMMERCE_BASE_URL ?? DEFAULT_AGENT_COMMERCE_BASE_URL,
    agentLeadEndpoint:
      process.env.LF_AGENT_LEAD_ENDPOINT ?? DEFAULT_AGENT_LEAD_ENDPOINT,
    agentLeadSecret: process.env.LF_AGENT_LEAD_SECRET ?? "",
  };
}

export const SERVER_NAME = "com.legalfournier/spain-legal";
export const SERVER_TITLE = "Spain Legal by Legal Fournier";
export const SERVER_VERSION = "0.4.0";
export const SERVER_DESCRIPTION =
  "Spain legal MCP for visa screening, Beckham eligibility, residency and nationality paths, NIE/TIE process guidance, EU family routes, live paid-consultation discovery and call availability, Legal Fournier tool screeners, structured handoff, and explicit-consent contact requests with official Spanish legal sources.";
export const SERVER_ICON_URL =
  "https://legalfournier.com/wp-content/uploads/2026/01/cropped-legal_fournier_favicon-192x192.png";
