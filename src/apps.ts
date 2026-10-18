import { readFileSync } from "node:fs";
import type { McpServer } from "@modelcontextprotocol/server";
import { registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { getVerifiedContentVideoIds } from "./content-index.js";

export const CONTENT_APP_URI = "ui://legalfournier/content-explorer.html";
export const CONTENT_APP_CSP = { connectDomains: [], resourceDomains: [], frameDomains: ["https://www.youtube-nocookie.com"], baseUriDomains: [] };
export function contentAppToolMeta() {
  return { ui: { resourceUri: CONTENT_APP_URI, visibility: ["model", "app"] as ("model" | "app")[] }, "ui/resourceUri": CONTENT_APP_URI };
}
export function getContentAppHtml(): string {
  const template = readFileSync(new URL("../dist/apps/content-explorer.html", import.meta.url), "utf8");
  const verifiedVideoIds = getVerifiedContentVideoIds();
  const bootstrap = JSON.stringify({ verifiedVideoIds }).replace(/[<>&\u2028\u2029]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
  return template.replace("__LF_APP_BOOTSTRAP__", () => bootstrap);
}
export function registerContentApps(server: McpServer): void {
  const ui = { prefersBorder: true, csp: CONTENT_APP_CSP };
  registerAppResource(server, "legal-fournier-content-explorer", CONTENT_APP_URI, {
    title: "Legal Fournier · Guides, videos & income", description: "Search published guides, watch verified Legal Fournier videos and check digital nomad income. No contact, booking or payment actions.",
    mimeType: RESOURCE_MIME_TYPE, _meta: { ui },
  }, async () => readContentAppResource(CONTENT_APP_URI)!);
}
export function readContentAppResource(uri: string) {
  if (uri !== CONTENT_APP_URI) return null;
  return { contents: [{ uri: CONTENT_APP_URI, mimeType: RESOURCE_MIME_TYPE, text: getContentAppHtml(), _meta: { ui: { prefersBorder: true, csp: CONTENT_APP_CSP } } }] };
}
