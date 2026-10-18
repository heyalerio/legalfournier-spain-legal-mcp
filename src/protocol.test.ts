import { spawn } from "node:child_process";
import { once } from "node:events";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { Client as LegacyClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport as LegacyStdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CATALOG_URI, makeTopicResourceUri } from "./data/canonical-packs.js";
import { CONTENT_APP_URI } from "./apps.js";
import { SKILLS_EXTENSION_ID } from "./skills-extension.js";
import { DEFAULT_ALLOWED_ORIGINS, createRemoteApp, startRemoteServer, type SpainLegalRemoteServer } from "./remote.js";
import { resetTelemetryRecorderForTests } from "./telemetry.js";

const VERSION = "2026-07-28";
const envelope = () => ({
  "io.modelcontextprotocol/protocolVersion": VERSION,
  "io.modelcontextprotocol/clientCapabilities": {},
  "io.modelcontextprotocol/clientInfo": { name: "protocol-regression", version: "1.0" },
});
let remote: SpainLegalRemoteServer;
let previousTelemetry: string | undefined;
let nextId = 0;

function wireRequest(method: string, params: Record<string, unknown> = {}) {
  const headers: Record<string, string> = {
    "content-type": "application/json", accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": VERSION, "Mcp-Method": method,
  };
  if (method === "resources/read") headers["Mcp-Name"] = String(params.uri);
  if (method === "tools/call" || method === "prompts/get") headers["Mcp-Name"] = String(params.name);
  return { headers, body: { jsonrpc: "2.0", id: ++nextId, method, params: { ...params, _meta: envelope() } } };
}
async function wire(method: string, params: Record<string, unknown> = {}, change?: (request: ReturnType<typeof wireRequest>) => void) {
  const request = wireRequest(method, params);
  change?.(request);
  const response = await fetch(remote.url, { method: "POST", headers: request.headers, body: JSON.stringify(request.body) });
  const message = await response.json();
  return { response, message };
}

beforeAll(async () => {
  previousTelemetry = process.env.LF_MCP_TELEMETRY_ENABLED;
  process.env.LF_MCP_TELEMETRY_ENABLED = "0";
  resetTelemetryRecorderForTests();
  remote = await startRemoteServer({ host: "127.0.0.1", port: 0, requestsPerMinute: 1000 });
});
afterAll(async () => {
  await remote?.close();
  if (previousTelemetry === undefined) delete process.env.LF_MCP_TELEMETRY_ENABLED;
  else process.env.LF_MCP_TELEMETRY_ENABLED = previousTelemetry;
  resetTelemetryRecorderForTests();
});

describe("explicit modern HTTP serving", () => {
  it("connects a pinned modern client, exposes public extensions, and keeps existing tools usable", async () => {
    const client = new Client({ name: "pinned-modern-client", version: "1" }, { versionNegotiation: { mode: { pin: VERSION } } });
    try {
      await client.connect(new StreamableHTTPClientTransport(remote.url));
      expect(client.getProtocolEra()).toBe("modern");
      expect(client.getServerCapabilities()?.extensions?.[SKILLS_EXTENSION_ID]).toEqual({});
      expect((await client.listTools()).tools).toHaveLength(13);
      expect((await client.callTool({ name: "explain_nie_process", arguments: {} })).isError).not.toBe(true);
      const resource = await client.readResource({ uri: makeTopicResourceUri("tax-regimes") });
      expect(resource.contents[0]).toHaveProperty("text");
    } finally { await client.close(); }
  });

  it("returns modern discovery, server identity, and honest capability flags", async () => {
    const { response, message } = await wire("server/discover");
    expect(response.status).toBe(200);
    expect(response.headers.get("mcp-session-id")).toBeNull();
    expect(message.result).toMatchObject({ resultType: "complete", supportedVersions: [VERSION], ttlMs: 300000, cacheScope: "public" });
    expect(message.result._meta["io.modelcontextprotocol/serverInfo"].version).toBe("0.4.0");
    expect(message.result.capabilities).toMatchObject({ tools: { listChanged: false }, prompts: { listChanged: false }, resources: { listChanged: false, subscribe: false } });
    expect(message.result.capabilities.extensions[SKILLS_EXTENSION_ID]).not.toHaveProperty("directoryRead");
  });

  it.each(["tools/list", "prompts/list", "resources/list", "resources/templates/list"])("limits %s public caching to five minutes", async method => {
    const { response, message } = await wire(method);
    expect(response.status).toBe(200);
    expect(message.result).toMatchObject({ resultType: "complete", ttlMs: 300000, cacheScope: "public" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("caches only public resource reads and never personal tool/prompt results", async () => {
    const resource = await wire("resources/read", { uri: CATALOG_URI });
    expect(resource.message.result).toMatchObject({ ttlMs: 300000, cacheScope: "public" });
    const tool = await wire("tools/call", { name: "get_residency_path", arguments: { current_status: "temporary_resident", years_in_spain: 2 } });
    const prompt = await wire("prompts/get", { name: "draft_spain_immigration_answer", arguments: { topic: "residency_path", question: "Private scenario for review" } });
    for (const { response, message } of [tool, prompt]) {
      expect(response.status).toBe(200);
      expect(message.result).toHaveProperty("resultType", "complete");
      expect(message.result.isError).not.toBe(true);
      expect(message.result).not.toHaveProperty("cacheScope", "public");
      expect(message.result).not.toHaveProperty("ttlMs");
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("advertises an App only on the intended read-only tools", async () => {
    const { message } = await wire("tools/list");
    for (const tool of message.result.tools) {
      if (["search", "fetch", "run_legal_fournier_tool"].includes(tool.name)) {
        expect(tool._meta.ui).toMatchObject({ resourceUri: CONTENT_APP_URI, visibility: ["model", "app"] });
      } else expect(tool._meta.ui.visibility).toEqual(["model"]);
    }
    expect(message.result.tools.find((tool: { name: string }) => tool.name === "create_legal_fournier_contact_request").annotations.readOnlyHint).toBe(false);
  });

  it.each([
    ["missing protocol", "MCP-Protocol-Version", undefined],
    ["wrong protocol", "MCP-Protocol-Version", "2025-11-25"],
    ["missing method", "Mcp-Method", undefined],
    ["wrong method", "Mcp-Method", "tools/list"],
    ["missing name", "Mcp-Name", undefined],
    ["wrong name", "Mcp-Name", "get_visa_options"],
  ])("rejects %s headers without downgrading to legacy", async (_label, key, value) => {
    const { response, message } = await wire("tools/call", { name: "explain_nie_process", arguments: {} }, request => {
      if (value === undefined) delete request.headers[key!]; else request.headers[key!] = value;
    });
    expect(response.status).toBe(400);
    expect(message.error.code).toBe(-32020);
  });

  it("rejects unknown protocol versions and missing required envelope capabilities", async () => {
    const unsupported = await wire("tools/list", {}, request => {
      request.headers["MCP-Protocol-Version"] = "2099-01-01";
      request.body.params._meta["io.modelcontextprotocol/protocolVersion"] = "2099-01-01";
    });
    expect(unsupported.response.status).toBe(400);
    expect(unsupported.message).toHaveProperty("error");
    const malformed = await wire("tools/list", {}, request => {
      delete (request.body.params._meta as Record<string, unknown>)["io.modelcontextprotocol/clientCapabilities"];
    });
    expect(malformed.response.status).toBe(400);
    expect(malformed.message.error.code).toBe(-32602);
  });

  it("does not route a malformed modern claim to a permissive legacy handler", async () => {
    const malformed = await wire("tools/list", {}, request => {
      delete request.headers["MCP-Protocol-Version"];
      (request.body.params._meta as Record<string, unknown>)["io.modelcontextprotocol/protocolVersion"] = 20260728;
    });
    expect(malformed.response.status).toBe(400);
    expect(malformed.message).toHaveProperty("error");
    const arrayMetadata = await wire("tools/list", {}, request => {
      (request.body.params as Record<string, unknown>)._meta = [];
    });
    expect(arrayMetadata.response.status).toBe(400);
    expect(arrayMetadata.message).toHaveProperty("error");
  });

  it.each(["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05", "2024-10-07"])("retains the supported legacy initialization version %s", async protocolVersion => {
    const response = await fetch(remote.url, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "MCP-Protocol-Version": protocolVersion }, body: JSON.stringify({ jsonrpc: "2.0", id: ++nextId, method: "initialize", params: { protocolVersion, capabilities: {}, clientInfo: { name: "legacy-version-regression", version: "1" } } }) });
    const message = await response.json();
    expect(response.status).toBe(200);
    expect(message.result.protocolVersion).toBe(protocolVersion);
    expect(message.result).not.toHaveProperty("resultType");
    expect(message.result).not.toHaveProperty("cacheScope");
    expect(message.result.capabilities.extensions).toBeUndefined();
    expect(message.result.capabilities.tools.listChanged).toBe(false);
  });

  it("returns protocol errors for unavailable methods and keeps subscriptions closed", async () => {
    const unknown = await wire("unknown/method");
    expect(unknown.response.status).toBe(404);
    expect(unknown.message.error.code).toBe(-32601);
    const subscription = await wire("subscriptions/listen", { notifications: { toolsListChanged: true } });
    expect(subscription.message).toHaveProperty("error");
    expect(subscription.response.headers.get("content-type")).toContain("application/json");
  });

  it("preserves bounded body handling and stable operation error boundaries", async () => {
    const oversized = await wire("tools/call", { name: "search", arguments: { query: "x".repeat(110000) } });
    expect(oversized.response.status).toBe(413);
    const invalid = await wire("tools/call", { name: "get_visa_options", arguments: {} });
    expect(invalid.message.error || invalid.message.result?.isError).toBeTruthy();
    expect(JSON.stringify(invalid.message)).not.toMatch(/TypeError|node_modules|\/Users\//);
  });
});

describe("Origin and CORS boundary", () => {
  it.each([...DEFAULT_ALLOWED_ORIGINS])("allows the exact configured origin %s", async origin => {
    const { response } = await wire("tools/list", {}, request => { request.headers.Origin = origin; });
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
    expect(response.headers.get("vary")).toContain("Origin");
  });
  it.each(["null", "https://evil.invalid", "http://legalfournier.com", "https://legalfournier.com.evil.invalid", "https://legalfournier.com/", "https://legalfournier.com:444", "https://user@legalfournier.com", "https://legalfournier.com, https://evil.invalid"])("rejects %s before granting CORS", async origin => {
    const { response, message } = await wire("tools/list", {}, request => { request.headers.Origin = origin; });
    expect(response.status).toBe(403);
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
    expect(message.error.code).not.toBe(-32000);
  });
  it("allows non-browser calls and permits required modern preflight headers", async () => {
    const noOrigin = await wire("tools/list");
    expect(noOrigin.response.status).toBe(200);
    expect(noOrigin.response.headers.has("access-control-allow-origin")).toBe(false);
    const response = await fetch(remote.url, { method: "OPTIONS", headers: { Origin: "https://claude.ai", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "Mcp-Method,Mcp-Name,MCP-Protocol-Version,Mcp-Param-Tool-Id" } });
    expect(response.status).toBe(204);
    for (const name of ["mcp-method", "mcp-name", "mcp-protocol-version", "mcp-param-tool-id"]) expect(response.headers.get("access-control-allow-headers")?.toLowerCase()).toContain(name);
  });
  it("rejects wildcard or path-bearing Origin configuration at startup", () => {
    expect(() => createRemoteApp({ allowedOrigins: ["*"] })).toThrow(/exact HTTP/);
    expect(() => createRemoteApp({ allowedOrigins: ["https://legalfournier.com/path"] })).toThrow(/exact HTTP/);
  });
  it("uses the exact configured environment allowlist without extending it with defaults", async () => {
    const previous = process.env.LF_MCP_ALLOWED_ORIGINS;
    process.env.LF_MCP_ALLOWED_ORIGINS = "https://app.example.test";
    let configured: SpainLegalRemoteServer | undefined;
    try {
      configured = await startRemoteServer({ host: "127.0.0.1", port: 0 });
      for (const [origin, status] of [["https://app.example.test", 204], ["https://claude.ai", 403]] as const) {
        const response = await fetch(configured.url, { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "POST" } });
        expect(response.status).toBe(status);
      }
    } finally {
      await configured?.close();
      if (previous === undefined) delete process.env.LF_MCP_ALLOWED_ORIGINS;
      else process.env.LF_MCP_ALLOWED_ORIGINS = previous;
    }
  });
});

describe("modern Skills wire integration", () => {
  it("lists complete manifests, supports independent get, and rejects normalized traversal", async () => {
    const listed = await wire("skills/list");
    expect(listed.response.status).toBe(200);
    expect(listed.message.result).toMatchObject({ resultType: "complete", cacheScope: "public", ttlMs: 300000 });
    const uri = listed.message.result.skills[0].uri as string;
    const got = await wire("skills/get", { uri });
    expect(got.message.result.skill).toEqual(listed.message.result.skills[0]);
    const read = await wire("resources/read", { uri });
    expect(read.message.result.contents[0].text).toContain("---\nname:");
    const name = listed.message.result.skills[0].frontmatter.name;
    const badUri = uri.replace(`/${name}/`, `/outside/../${name}/`);
    expect(new URL(badUri).toString()).toBe(uri);
    const denied = await wire("resources/read", { uri: badUri });
    expect(denied.message.error.code).toBe(-32602);
    const cursor = await wire("skills/list", { cursor: "unknown-cursor" });
    expect(cursor.message.error.code).toBe(-32602);
  });
});

describe("modern and genuine legacy stdio clients", () => {
  it("serves a pinned modern client over the released stdio entrypoint", async () => {
    const client = new Client({ name: "modern-stdio-client", version: "1" }, { versionNegotiation: { mode: { pin: VERSION } } });
    const transport = new StdioClientTransport({ command: process.execPath, args: ["dist/index.js", "stdio"], env: { LF_MCP_TELEMETRY_ENABLED: "0" }, stderr: "pipe" });
    try {
      await client.connect(transport);
      expect(client.getProtocolEra()).toBe("modern");
      expect(client.getServerCapabilities()?.extensions?.[SKILLS_EXTENSION_ID]).toEqual({});
      expect((await client.listTools()).tools).toHaveLength(13);
      expect((await client.callTool({ name: "explain_nie_process", arguments: {} })).isError).not.toBe(true);
    } finally { await client.close(); }
  });
  it("serves an SDK1.32.1 client with unchanged legacy discovery", async () => {
    const client = new LegacyClient({ name: "legacy-stdio-client", version: "1" });
    const transport = new LegacyStdioClientTransport({ command: process.execPath, args: ["dist/index.js", "stdio"], env: { LF_MCP_TELEMETRY_ENABLED: "0" }, stderr: "pipe" });
    try {
      await client.connect(transport);
      expect(client.getServerCapabilities()?.extensions?.[SKILLS_EXTENSION_ID]).toBeUndefined();
      const tools = await client.listTools();
      expect(tools.tools).toHaveLength(13);
      expect(tools).not.toHaveProperty("ttlMs");
      expect(tools).not.toHaveProperty("resultType");
      expect((await client.callTool({ name: "explain_nie_process", arguments: {} })).isError).not.toBe(true);
    } finally { await client.close(); }
  });
  it("exits when stdin closes instead of leaving a keepalive process", async () => {
    const child = spawn(process.execPath, ["dist/index.js", "stdio"], { env: { ...process.env, LF_MCP_TELEMETRY_ENABLED: "0" }, stdio: ["pipe", "ignore", "ignore"] });
    const timeout = setTimeout(() => child.kill("SIGKILL"), 3000);
    try {
      child.stdin.end();
      const [code, signal] = await once(child, "exit");
      expect(signal).toBeNull();
      expect(code).toBe(0);
    } finally { clearTimeout(timeout); child.kill(); }
  });
});
