import { CATALOG_URI, getResourceText, listPackResources } from "./data/canonical-packs.js";
import { SKILLS_INDEX_URI, getSkillByUri, listSkillResources, renderSkillMarkdown } from "./data/skills.js";
import { LEGAL_FOURNIER_TOOL_CATALOG_URI, renderLegalFournierToolCatalogMarkdown } from "./data/tool-catalog.js";
import { searchContent, fetchContent } from "./content-index.js";
import { ApiError } from "./errors.js";
type RestResource = { uri: string; name?: string; title?: string; description?: string; mimeType?: string; };
function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getSearchResources(): RestResource[] {
  return [
    {
      uri: CATALOG_URI,
      name: "spain-legal-catalog",
      title: "Spain Legal MCP Catalog",
      description: "Canonical Spain Legal MCP resources for routes, processes, tracks, and topics.",
      mimeType: "text/markdown",
    },
    {
      uri: LEGAL_FOURNIER_TOOL_CATALOG_URI,
      name: "legal-fournier-tool-catalog",
      title: "Legal Fournier Tool Catalog",
      description: "Agent-facing catalog of Legal Fournier public tools and direct MCP runners.",
      mimeType: "text/markdown",
    },
    {
      uri: SKILLS_INDEX_URI,
      name: "spain-legal-skills",
      title: "Spain Legal Skills Index",
      description: "Agent workflow skills for visa intake, Beckham Law, NIE/TIE, nationality, and handoff.",
      mimeType: "text/markdown",
    },
    ...listPackResources("routes"),
    ...listPackResources("processes"),
    ...listPackResources("tracks"),
    ...listPackResources("topics"),
    ...listSkillResources(),
  ];
}

export function searchResources(args: Record<string, unknown>): Record<string, unknown> {
  const query = typeof args.query === "string" ? args.query : "";
  const maxResults = Math.max(1, Math.min(Number(args.max_results ?? 8) || 8, 20));
  const aliases: Record<string, string> = { nacionalidad: "nationality", citoyennete: "nationality", residencia: "residency", residence: "residency", immobilier: "property", vivienda: "property", impuestos: "tax", fiscalite: "tax", familia: "family", famille: "family", nomada: "nomad", nomade: "nomad" };
  const tokens = normalizeSearchText(query).split(" ").filter(Boolean).map((token) => aliases[token] ?? token);
  const resources = args.topic || (args.type && args.type !== "resource") || (args.language && args.language !== "en") ? [] : getSearchResources();
  const scored = resources
    .map((resource, index) => {
      const title = normalizeSearchText(resource.title ?? resource.name ?? "");
      const description = normalizeSearchText(resource.description ?? "");
      const uri = normalizeSearchText(resource.uri);
      const score = tokens.reduce((total, token) => {
        if (!token) {
          return total;
        }

        return (
          total +
          (title.includes(token) ? 5 : 0) +
          (description.includes(token) ? 3 : 0) +
          (uri.includes(token) ? 2 : 0)
        );
      }, tokens.length === 0 ? Math.max(1, 20 - index) : 0);

      return { resource, score, index };
    })
    .filter((item) => tokens.length === 0 || item.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, maxResults)
    .map(({ resource, score }) => ({
      uri: resource.uri,
      title: resource.title ?? resource.name ?? resource.uri,
      description: resource.description,
      mime_type: resource.mimeType ?? "text/markdown",
      score,
    }));

  const indexed = searchContent({
    query, max_results: maxResults,
    language: args.language as "en" | "es" | "fr" | "und" | undefined,
    type: args.type === "resource" ? undefined : args.type as "article" | "video" | undefined,
    topic: args.topic as string | undefined,
  });
  const combined = [...scored.map((item) => ({ ...item, type: "resource", language: "en" })), ...(args.type === "resource" ? [] : indexed.resources)]
    .sort((left, right) => right.score - left.score).slice(0, maxResults);
  return {
    query,
    resources: combined,
    index_updated_at: indexed.index_updated_at,
    index_status: indexed.index_status,
    next_action: "Call the fetch MCP tool or POST /api/spain-legal/fetch with a resource id or URI, then use the matching screening tool.",
  };
}

function renderSkillIndexMarkdown(): string {
  const lines = [
    "# Spain Legal Skills Index",
    "",
    "Use these skills to choose a repeatable Legal Fournier workflow before calling tools.",
    "",
    ...listSkillResources().map((skill) => `- \`${skill.uri}\` - ${skill.title}: ${skill.description}`),
  ];

  return lines.join("\n").trim();
}

export function fetchResource(args: Record<string, unknown>): Record<string, unknown> {
  const indexed = fetchContent(args as { id?: string; uri?: string; offset?: number; max_chars?: number });
  if (indexed) return indexed as unknown as Record<string, unknown>;
  const uri = typeof args.uri === "string" ? args.uri : typeof args.id === "string" ? args.id : "";

  if (!uri) {
    throw new ApiError("INVALID_INPUT", "Provide a resource id or uri.", 400);
  }

  const skill = getSkillByUri(uri);
  const text =
    uri === LEGAL_FOURNIER_TOOL_CATALOG_URI
      ? renderLegalFournierToolCatalogMarkdown()
      : uri === SKILLS_INDEX_URI
        ? renderSkillIndexMarkdown()
        : skill
          ? renderSkillMarkdown(skill)
          : getResourceText(uri);

  if (!text) {
    throw new ApiError("RESOURCE_NOT_FOUND", "The requested published resource was not found.", 404);
  }

  const offset = Number(args.offset ?? 0);
  const maxChars = Number(args.max_chars ?? 20000);
  return {
    uri,
    content_type: "text/markdown",
    text: text.slice(offset, offset + maxChars),
    total_chars: text.length,
    offset,
    next_offset: offset + maxChars < text.length ? offset + maxChars : null,
  };
}
