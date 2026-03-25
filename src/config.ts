export interface SpainLegalConfig {
  siteBaseUrl: string;
  contactUrl: string;
  homepageUrl: string;
  mcpHost: string;
  mcpPort: number;
  mcpPath: string;
  mcpPublicUrl: string;
  mcpAllowedHosts: string[];
  mcpCorsOrigin: string;
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
const DEFAULT_MCP_CORS_ORIGIN = "*";

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
    mcpCorsOrigin: process.env.LF_MCP_CORS_ORIGIN ?? DEFAULT_MCP_CORS_ORIGIN,
  };
}

export const SERVER_NAME = "com.legalfournier/spain-legal";
export const SERVER_TITLE = "Spain Legal by Legal Fournier";
export const SERVER_VERSION = "0.2.5";
export const SERVER_DESCRIPTION =
  "Spain legal MCP for visa screening, Beckham eligibility, residency and nationality paths, NIE/TIE process guidance, EU family routes, and structured Legal Fournier handoff with official Spanish legal sources.";
export const SERVER_ICON_URL =
  "https://legalfournier.com/wp-content/uploads/2026/01/cropped-legal_fournier_favicon-192x192.png";
