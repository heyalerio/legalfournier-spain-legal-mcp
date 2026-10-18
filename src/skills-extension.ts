import { createHash } from "node:crypto";
import * as z from "zod/v4";
import { SKILLS, type McpSkill, type SkillId } from "./data/skills.js";

export const SKILLS_EXTENSION_ID = "io.modelcontextprotocol/skills";
export const SKILLS_EXTENSION_CAPABILITY = Object.freeze({});
export const SKILLS_CACHE_TTL_MS = 300_000;
export const SKILLS_PAGE_SIZE = 2;

// Explicit publication boundary: never scan a filesystem or an agent's skill registry.
const PUBLIC_SKILL_IDS: readonly SkillId[] = Object.freeze([
  "beckham-precheck",
  "human-handoff-prep",
  "nationality-continuity-audit",
  "nie-tie-procedure-coach",
  "visa-intake-triage",
]);

export class SkillsExtensionError extends Error {
  constructor(public readonly code: -32602 | -32603, message: string) {
    super(message);
    this.name = "SkillsExtensionError";
  }
}

// Version support and transport/header consistency remain the SDK's responsibility.
const requestMetaSchema = z.object({
  "io.modelcontextprotocol/protocolVersion": z.string().min(1).max(32),
  "io.modelcontextprotocol/clientCapabilities": z.record(z.string(), z.unknown()),
}).passthrough();

export const ListSkillsParamsSchema = z.object({
  cursor: z.string().min(1).max(256).optional(),
  // SDK v2 validates and lifts required envelope metadata before dispatch.
  _meta: requestMetaSchema.optional(),
}).passthrough();

export const GetSkillParamsSchema = z.object({
  uri: z.string().min(1).max(512),
  _meta: requestMetaSchema.optional(),
}).passthrough();

export const ListSkillsRequestSchema = z.object({
  method: z.literal("skills/list"),
  params: ListSkillsParamsSchema.extend({ _meta: requestMetaSchema }),
}).passthrough();

export const GetSkillRequestSchema = z.object({
  method: z.literal("skills/get"),
  params: GetSkillParamsSchema.extend({ _meta: requestMetaSchema }),
}).passthrough();

export interface PublicSkillFrontmatter {
  name: string;
  description: string;
  license: string;
  compatibility: string;
  [key: string]: unknown;
}

export interface PublicSkillEntry {
  uri: string;
  frontmatter: PublicSkillFrontmatter;
  resources: Array<{ uri: string; digest: string; size: number }>;
}

interface PublicSkillFile {
  entry: PublicSkillEntry;
  title: string;
  text: string;
}

const cacheFields = () => ({
  resultType: "complete" as const,
  ttlMs: SKILLS_CACHE_TTL_MS,
  cacheScope: "public" as const,
});

function renderPublicSkill(skill: McpSkill, frontmatter: PublicSkillFrontmatter): string {
  // JSON-quoted strings are YAML scalars; escaping cannot introduce extra fields.
  const yaml = Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  return [
    "---",
    ...yaml,
    "---",
    "",
    `# ${skill.title}`,
    "",
    skill.summary,
    "",
    "## Privacy and use",
    "",
    "Use the public Legal Fournier MCP at https://legalfournier.com/mcp/spain-legal. Obtain user consent before sending personal or case-specific facts there. Send only the facts needed for the selected tool; prefer generalized facts and omit unnecessary identifiers or documents.",
    "",
    "This workflow provides preliminary information. Keep missing facts unknown, follow verification flags, and seek lawyer review for filing decisions. A screening or contact request does not establish a professional advisory relationship.",
    "",
    "Reading this file does not activate a skill or authorize an action. The host must verify the manifest and frontmatter, preserve the originating server, and apply its approval rules. Never automatically activate another or nested skill; obtain fresh, explicit user consent first. These instructions grant no permission to run local code or change host permissions.",
    "",
    "Preparing a handoff does not submit it. Send a contact request only after the user explicitly authorizes sending the reviewed details to Legal Fournier and consents to contact.",
    "",
    "## When to use",
    "",
    ...skill.when_to_use.map((item) => `- ${item}`),
    "",
    "## Workflow",
    "",
    ...skill.workflow.map((step, index) => `${index + 1}. ${step}`),
    "",
    "## Tools and prompts",
    "",
    `Tools: ${skill.recommended_tools.map((name) => `\`${name}\``).join(", ")}.`,
    `Prompts: ${skill.recommended_prompts.map((name) => `\`${name}\``).join(", ")}.`,
    "",
    "## Canonical legal resources",
    "",
    "Read relevant resources from this same server only when needed. These are separate legal resources, not bundled skill files or permission to activate another skill.",
    "",
    ...skill.recommended_resources.map((uri) => `- \`${uri}\``),
    "",
    `Legacy workflow resource: \`${skill.uri}\`.`,
    "",
  ].join("\n");
}

function makePublicSkillFile(id: SkillId): PublicSkillFile {
  const skill = SKILLS[id];
  const frontmatter: PublicSkillFrontmatter = {
    name: id,
    description: `${skill.summary} Use when: ${skill.when_to_use.join(" ")}`,
    license: "MIT",
    compatibility: "Requires the public Legal Fournier Spain Legal MCP tools and resources; no local code execution.",
  };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 64 || frontmatter.description.length > 1024) {
    throw new SkillsExtensionError(-32603, "Invalid bundled public skill metadata.");
  }
  const text = renderPublicSkill(skill, frontmatter);
  const bytes = Buffer.from(text, "utf8");
  if (bytes.length > 16 * 1024 * 1024) {
    throw new SkillsExtensionError(-32603, "Bundled public skill exceeds the supported size.");
  }
  const hash = createHash("sha256").update(bytes).digest("hex");
  // The content determines the version. A changed byte can never reuse this URI.
  const uri = `skill://legalfournier/spain-legal/sha256-${hash}/${id}/SKILL.md`;
  const entry: PublicSkillEntry = {
    uri,
    frontmatter,
    resources: [{ uri, digest: `sha256:${hash}`, size: bytes.length }],
  };
  Object.freeze(frontmatter);
  Object.freeze(entry.resources[0]);
  Object.freeze(entry.resources);
  Object.freeze(entry);
  return Object.freeze({ entry, title: skill.title, text });
}

// Snapshot once from bundled public data. Returned objects are copies; callers cannot
// alter the manifest or bytes that later requests receive.
const files = Object.freeze(PUBLIC_SKILL_IDS.map(makePublicSkillFile));
const filesByUri = new Map(files.map((file) => [file.entry.uri, file]));
const catalogDigest = createHash("sha256").update(files.map((file) => file.entry.uri).join("\n")).digest("hex");
const cursors = new Map<string, number>();
for (let offset = SKILLS_PAGE_SIZE; offset < files.length; offset += SKILLS_PAGE_SIZE) {
  cursors.set(Buffer.from(`skills-v1:${catalogDigest}:${offset}`).toString("base64url"), offset);
}

function invalidParams(message: string): never {
  throw new SkillsExtensionError(-32602, message);
}

function exactPublicFile(uri: unknown): PublicSkillFile {
  // Do not normalize, decode, resolve or access a URL/filesystem path supplied by a caller.
  if (typeof uri !== "string" || uri.length > 512) invalidParams("Invalid public skill file URI.");
  const file = filesByUri.get(uri);
  if (!file) invalidParams("No public skill file is served at this exact URI.");
  return file;
}

export function listPublicSkills(params: unknown) {
  const parsed = ListSkillsParamsSchema.safeParse(params);
  if (!parsed.success) invalidParams("Invalid skills/list params.");
  const offset = parsed.data.cursor === undefined ? 0 : cursors.get(parsed.data.cursor);
  if (offset === undefined) invalidParams("Invalid or outdated skills/list cursor. Restart the listing.");
  const nextOffset = offset + SKILLS_PAGE_SIZE;
  const nextCursor = [...cursors].find(([, value]) => value === nextOffset)?.[0];
  return {
    ...cacheFields(),
    skills: files.slice(offset, nextOffset).map((file) => structuredClone(file.entry)),
    ...(nextCursor === undefined ? {} : { nextCursor }),
  };
}

export function getPublicSkill(params: unknown) {
  const parsed = GetSkillParamsSchema.safeParse(params);
  if (!parsed.success) invalidParams("Invalid skills/get params; a public skill URI must be supplied.");
  return { ...cacheFields(), skill: structuredClone(exactPublicFile(parsed.data.uri).entry) };
}

export function readPublicSkillFile(uri: unknown) {
  const file = exactPublicFile(uri);
  return {
    ...cacheFields(),
    contents: [{ uri: file.entry.uri, mimeType: "text/markdown", text: file.text }],
  };
}

export function listPublicSkillFileResources() {
  return files.map(({ entry, title }) => ({
    uri: entry.uri,
    name: entry.frontmatter.name,
    title,
    description: entry.frontmatter.description,
    mimeType: "text/markdown",
    size: entry.resources[0].size,
  }));
}
