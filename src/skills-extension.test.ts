import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { getSkillByUri, renderSkillMarkdown } from "./data/skills.js";
import {
  GetSkillRequestSchema,
  ListSkillsRequestSchema,
  SKILLS_CACHE_TTL_MS,
  SKILLS_EXTENSION_CAPABILITY,
  SKILLS_EXTENSION_ID,
  SKILLS_PAGE_SIZE,
  SkillsExtensionError,
  getPublicSkill,
  listPublicSkillFileResources,
  listPublicSkills,
  readPublicSkillFile,
  type PublicSkillEntry,
} from "./skills-extension.js";

const meta = {
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientCapabilities": {},
};
const names = [
  "beckham-precheck",
  "human-handoff-prep",
  "nationality-continuity-audit",
  "nie-tie-procedure-coach",
  "visa-intake-triage",
];

function allEntries() {
  const entries: PublicSkillEntry[] = [];
  let cursor: string | undefined;
  do {
    const result = listPublicSkills({ _meta: meta, ...(cursor ? { cursor } : {}) });
    entries.push(...result.skills);
    cursor = result.nextCursor;
  } while (cursor);
  return entries;
}

function expectInvalid(action: () => unknown) {
  try {
    action();
    throw new Error("Expected invalid params");
  } catch (error) {
    expect(error).toBeInstanceOf(SkillsExtensionError);
    expect((error as SkillsExtensionError).code).toBe(-32602);
  }
}

// The publisher emits YAML fields with JSON-quoted scalar/flow values. Parse
// every authored field, not a name/description subset, for equality with metadata.
function frontmatterFromFile(text: string) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  expect(match).not.toBeNull();
  return Object.fromEntries(match![1].split("\n").map((line) => {
    const separator = line.indexOf(": ");
    expect(separator).toBeGreaterThan(0);
    return [line.slice(0, separator), JSON.parse(line.slice(separator + 2))];
  }));
}

describe("official public Skills extension", () => {
  it("supports a known URI directly without any skills/list request", () => {
    const uri = listPublicSkillFileResources().find((resource) => resource.name === "visa-intake-triage")!.uri;
    const result = getPublicSkill({ uri, _meta: meta });
    expect(result.skill.frontmatter.name).toBe("visa-intake-triage");
    expect(readPublicSkillFile(uri).contents[0].uri).toBe(uri);
  });

  it("advertises the official identifier without optional directory reading", () => {
    expect(SKILLS_EXTENSION_ID).toBe("io.modelcontextprotocol/skills");
    expect(SKILLS_EXTENSION_CAPABILITY).toEqual({});
    expect(SKILLS_EXTENSION_CAPABILITY).not.toHaveProperty("directoryRead");
  });

  it("lists all five public skills in deterministic bounded atomic pages", () => {
    const entries: PublicSkillEntry[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | undefined;
    do {
      const params = { _meta: meta, ...(cursor ? { cursor } : {}) };
      const result = listPublicSkills(params);
      expect(result).toEqual(listPublicSkills(params));
      expect(result.skills.length).toBeGreaterThan(0);
      expect(result.skills.length).toBeLessThanOrEqual(SKILLS_PAGE_SIZE);
      expect(result).toMatchObject({ resultType: "complete", cacheScope: "public", ttlMs: SKILLS_CACHE_TTL_MS });
      for (const entry of result.skills) {
        expect(entry).toEqual(getPublicSkill({ uri: entry.uri, _meta: meta }).skill);
        expect(entry.resources).toHaveLength(1);
      }
      entries.push(...result.skills);
      cursor = result.nextCursor;
      if (cursor) {
        expect(seenCursors.has(cursor)).toBe(false);
        seenCursors.add(cursor);
      }
    } while (cursor);
    expect(entries.map((entry) => entry.frontmatter.name)).toEqual(names);
    expect(new Set(entries.map((entry) => entry.uri)).size).toBe(5);
  });

  it("publishes a complete manifest matching the exact served bytes and YAML fields", () => {
    const resources = listPublicSkillFileResources();
    const manifestUris: string[] = [];
    for (const entry of allEntries()) {
      const metadata = resources.find((resource) => resource.uri === entry.uri)!;
      expect(metadata).toMatchObject({ name: entry.frontmatter.name, description: entry.frontmatter.description, mimeType: "text/markdown" });
      expect(new URL(entry.uri).pathname.split("/").at(-2)).toBe(entry.frontmatter.name);
      expect(entry.resources.filter((resource) => resource.uri === entry.uri)).toHaveLength(1);
      expect(entry.resources.length).toBeLessThanOrEqual(512);
      expect(entry.resources.reduce((total, resource) => total + resource.size, 0)).toBeLessThanOrEqual(16_777_216);
      for (const item of entry.resources) {
        const result = readPublicSkillFile(item.uri);
        expect(result).toMatchObject({ resultType: "complete", cacheScope: "public", ttlMs: SKILLS_CACHE_TTL_MS });
        expect(result.contents).toHaveLength(1);
        const content = result.contents[0];
        const raw = Buffer.from(content.text, "utf8");
        const hash = createHash("sha256").update(raw).digest("hex");
        expect(content.uri).toBe(item.uri);
        expect(item.size).toBe(raw.byteLength);
        expect(metadata.size).toBe(raw.byteLength);
        expect(item.digest).toBe(`sha256:${hash}`);
        expect(item.uri).toContain(`/sha256-${hash}/`);
        expect(content.text.endsWith("\n")).toBe(true);
        expect(content.text).not.toContain("\r");
        expect(frontmatterFromFile(content.text)).toEqual(entry.frontmatter);
        manifestUris.push(item.uri);
      }
    }
    expect(manifestUris.sort()).toEqual(resources.map((resource) => resource.uri).sort());
  });

  it("does not let a caller mutate later metadata or resource reads", () => {
    const uri = listPublicSkillFileResources()[0].uri;
    const before = getPublicSkill({ uri, _meta: meta });
    const changed = getPublicSkill({ uri, _meta: meta });
    changed.skill.frontmatter.description = "tampered";
    changed.skill.resources[0].digest = "sha256:wrong";
    changed.skill.resources.push({ uri: "file:///private/skill", digest: "bad", size: 0 });
    listPublicSkills({ _meta: meta }).skills[0].resources.length = 0;
    const originalText = readPublicSkillFile(uri).contents[0].text;
    readPublicSkillFile(uri).contents[0].text = "changed";
    expect(getPublicSkill({ uri, _meta: meta })).toEqual(before);
    expect(readPublicSkillFile(uri).contents[0].text).toBe(originalText);
  });

  it("counts UTF-8 bytes and changes the immutable URI when authored content changes", async () => {
    const originalUri = listPublicSkillFileResources()[0].uri;
    vi.resetModules();
    vi.doMock("./data/skills.js", async () => {
      const original = await vi.importActual<typeof import("./data/skills.js")>("./data/skills.js");
      const skills = structuredClone(original.SKILLS);
      skills["beckham-precheck"].summary = "Cribado fiscal en España — revisión de residencia.";
      return { ...original, SKILLS: skills };
    });
    try {
      const changed = await import("./skills-extension.js");
      const uri = changed.listPublicSkillFileResources()[0].uri;
      const entry = changed.getPublicSkill({ uri }).skill;
      const content = changed.readPublicSkillFile(uri).contents[0].text;
      const bytes = Buffer.from(content, "utf8");
      expect(uri).not.toBe(originalUri);
      expect(bytes.byteLength).toBeGreaterThan(content.length);
      expect(entry.resources[0].size).toBe(bytes.byteLength);
      expect(entry.resources[0].digest).toBe(`sha256:${createHash("sha256").update(bytes).digest("hex")}`);
      expect(frontmatterFromFile(content)).toEqual(entry.frontmatter);
      expect(() => changed.readPublicSkillFile(originalUri)).toThrow(changed.SkillsExtensionError);
    } finally {
      vi.doUnmock("./data/skills.js");
      vi.resetModules();
    }
  });

  it.each([
    "skill://legalfournier/private/sara/SKILL.md",
    "skill://legalfournier/private/hermes/SKILL.md",
    "file:///Users/latitud/.codex/skills/SKILL.md",
    "https://legalfournier.com/mcp/spain-legal",
    "legalfournier://spain-legal/skills/beckham-precheck",
    "skill://legalfournier/spain-legal/unknown/SKILL.md",
    "",
    "x".repeat(513),
  ])("rejects unknown or noncanonical skill URI %s", (uri) => {
    expectInvalid(() => getPublicSkill({ uri, _meta: meta }));
    expectInvalid(() => readPublicSkillFile(uri));
  });

  it("rejects path traversal and URL aliases instead of normalizing them", () => {
    const uri = listPublicSkillFileResources()[0].uri;
    const marker = "/beckham-precheck/SKILL.md";
    const traversal = uri.replace(marker, "/unused/../beckham-precheck/SKILL.md");
    expect(new URL(traversal).toString()).toBe(uri);
    const invalidUris = [
      traversal,
      uri.replace(marker, "/unused/%2e%2e/beckham-precheck/SKILL.md"),
      uri.replace("beckham-precheck", "%62eckham-precheck"),
      uri.replace("/SKILL.md", "/references/private.md"),
      uri.replace("/SKILL.md", ""),
      `${uri}?raw=true`,
      `${uri}#section`,
      `${uri}/`,
      uri.replace("skill://legalfournier/", "skill://LEGALFOURNIER/"),
    ];
    for (const candidate of invalidUris) {
      expectInvalid(() => getPublicSkill({ uri: candidate, _meta: meta }));
      expectInvalid(() => readPublicSkillFile(candidate));
    }
  });

  it("rejects malformed params and unissued cursors", () => {
    for (const params of [undefined, null, { _meta: {} }, { _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" } }]) {
      expectInvalid(() => listPublicSkills(params));
      expectInvalid(() => getPublicSkill(params));
    }
    for (const cursor of ["", "0", "invalid", "x".repeat(257), 1, null]) {
      expectInvalid(() => listPublicSkills({ _meta: meta, cursor }));
    }
    const cursor = listPublicSkills({ _meta: meta }).nextCursor!;
    expectInvalid(() => listPublicSkills({ _meta: meta, cursor: `old-${cursor}` }));
    expectInvalid(() => getPublicSkill({ _meta: meta, uri: { href: "skill://anything" } }));
    expectInvalid(() => readPublicSkillFile(new URL(listPublicSkillFileResources()[0].uri)));
  });

  it("exports registration schemas with mandatory modern request metadata", () => {
    expect(ListSkillsRequestSchema.safeParse({ method: "skills/list", params: { _meta: meta } }).success).toBe(true);
    expect(ListSkillsRequestSchema.safeParse({ method: "skills/list", params: {} }).success).toBe(false);
    expect(GetSkillRequestSchema.safeParse({ method: "skills/get", params: { _meta: meta, uri: listPublicSkillFileResources()[0].uri } }).success).toBe(true);
    expect(GetSkillRequestSchema.safeParse({ method: "skills/get", params: { uri: listPublicSkillFileResources()[0].uri } }).success).toBe(false);
    // SDK v2 custom handlers receive operation params after validated _meta is lifted.
    expect(listPublicSkills({}).skills).toHaveLength(SKILLS_PAGE_SIZE);
    expect(getPublicSkill({ uri: listPublicSkillFileResources()[0].uri }).skill.uri).toBe(listPublicSkillFileResources()[0].uri);
  });

  it("keeps legacy workflow resources and limits publication to the public allowlist", () => {
    expect(listPublicSkillFileResources().map((resource) => resource.name)).toEqual(names);
    for (const name of names) {
      const legacy = getSkillByUri(`legalfournier://spain-legal/skills/${name}`);
      expect(legacy).toBeDefined();
      expect(renderSkillMarkdown(legacy!)).toContain(`# ${legacy!.title}`);
    }
  });

  it("retains minimization, contact consent and host-controlled skill activation", () => {
    for (const { uri } of listPublicSkillFileResources()) {
      const text = readPublicSkillFile(uri).contents[0].text;
      expect(text).toContain("Obtain user consent before sending personal or case-specific facts");
      expect(text).toContain("omit unnecessary identifiers or documents");
      expect(text).toContain("Never automatically activate another or nested skill");
      expect(text).toContain("fresh, explicit user consent");
      expect(text).toContain("Preparing a handoff does not submit it");
      expect(getPublicSkill({ uri, _meta: meta }).skill.frontmatter).not.toHaveProperty("allowed-tools");
    }
  });
});
