import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./server.js";
import { startRemoteServer, getClientIpInfo } from "./remote.js";
import { executeTool } from "./operations.js";
import { createLegalFournierContactRequest, type CreateLegalFournierContactRequestArgs } from "./lead.js";
import { TelemetryRecorder, getTelemetryRecorder, resetTelemetryRecorderForTests } from "./telemetry.js";

const originalFetch = globalThis.fetch;
const lead: CreateLegalFournierContactRequestArgs = {
  confirmed_consent: true, consent_to_contact: true, name: "Synthetic Test",
  email: "synthetic@example.invalid", legal_area: "other",
  case_summary: "This is a synthetic mocked test; do not submit any contact.",
};
async function memoryClient() {
  const server = createServer();
  const client = new Client({ name: "api-reliability-test", version: "1" });
  const [left, right] = InMemoryTransport.createLinkedPair();
  await server.connect(right); await client.connect(left);
  return { server, client };
}
async function temporaryTelemetry() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "lf-api-regression-"));
  vi.stubEnv("LF_MCP_TELEMETRY_DIR", directory);
  vi.stubEnv("LF_MCP_TELEMETRY_ENABLED", "true");
  resetTelemetryRecorderForTests();
  return directory;
}
afterEach(async () => {
  await getTelemetryRecorder().flush();
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs();
  resetTelemetryRecorderForTests();
});

describe("Shared native and REST validation", () => {
  it.each([
    ["get_visa_options", { nationality: "US", income_source: "employee", intent: "work", has_eu_family_link: "false" }],
    ["get_visa_options", {}],
    ["get_residency_path", { current_status: "temporary_resident", years_in_spain: -2 }],
    ["check_beckham_eligibility", { employment_type: "spanish_employee", move_reason: "new_spanish_job", years_since_last_spanish_residency: "five" }],
    ["run_legal_fournier_tool", { tool_id: "property-buyer-cost-risk", numbers: [{ key: "property_price", value: 0 }] }],
    ["run_legal_fournier_tool", { tool_id: "digital-nomad-visa-eligibility", numbers: [{ key: "children", value: 1.5 }] }],
  ] as const)("rejects invalid %s input before screening", async (name, args) => {
    vi.stubEnv("LF_MCP_TELEMETRY_ENABLED", "false"); resetTelemetryRecorderForTests();
    await expect(executeTool(name, args)).rejects.toMatchObject({ code: "INVALID_INPUT", status: 400 });
    const { server, client } = await memoryClient();
    try { const response = await client.callTool({ name, arguments: args }); expect(response.isError).toBe(true); }
    finally { await Promise.all([client.close(), server.close()]); }
  });
  it("rejects invalid REST fields with stable errors and no internal stack text", async () => {
    await temporaryTelemetry();
    const remote = await startRemoteServer({ host: "127.0.0.1", port: 0 });
    try {
      const catalog = await originalFetch(new URL("/api/spain-legal/tools", remote.url));
      expect(catalog.status).toBe(200); expect((await catalog.json()).result.matched_tools.length).toBeGreaterThan(0);
      const noArgs = await originalFetch(new URL("/api/spain-legal/nie-process", remote.url), { method: "POST" });
      expect(noArgs.status).toBe(200);
      for (const body of [{}, { nationality: "US", income_source: "employee", intent: "work", has_eu_family_link: "false" }]) {
        const response = await originalFetch(new URL("/api/spain-legal/visa-options", remote.url), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        expect(response.status).toBe(400);
        const data = await response.json(); expect(data.error.code).toBe("INVALID_INPUT");
        expect(JSON.stringify(data)).not.toMatch(/toLowerCase|TypeError|node_modules/);
      }
      const malformed = await originalFetch(new URL("/api/spain-legal/visa-options", remote.url), { method: "POST", headers: { "content-type": "application/json" }, body: '{"private":"SHOULD_NOT_ECHO"' });
      expect(malformed.status).toBe(400); expect(await malformed.text()).not.toContain("SHOULD_NOT_ECHO");
      const huge = await originalFetch(new URL("/api/spain-legal/visa-options", remote.url), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "x".repeat(110000) }) });
      expect(huge.status).toBe(413);
    } finally { await remote.close(); }
  });
  it("accepts string prompt booleans and preserves false as false", async () => {
    vi.stubEnv("LF_MCP_TELEMETRY_ENABLED", "false"); resetTelemetryRecorderForTests();
    const { server, client } = await memoryClient();
    try {
      const base = { nationality: "US", income_source: "employee", intent: "work" };
      const yes = await client.getPrompt({ name: "screen_move_to_spain_case", arguments: { ...base, has_eu_family_link: "true" } });
      const no = await client.getPrompt({ name: "screen_move_to_spain_case", arguments: { ...base, has_eu_family_link: "false" } });
      expect(JSON.stringify(yes)).toContain("EU family link: yes");
      expect(JSON.stringify(no)).toContain("EU family link: no or unknown");
      expect(yes.messages.length).toBe(no.messages.length + 1);
    } finally { await Promise.all([client.close(), server.close()]); }
  });
});

describe("Contact request failure and retry boundary (fully mocked)", () => {
  it("validates language and consent before any downstream call", async () => {
    vi.stubEnv("LF_AGENT_LEAD_SECRET", "synthetic-test-secret");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(createLegalFournierContactRequest({ ...lead, preferred_language: "de" } as never)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(createLegalFournierContactRequest({ ...lead, confirmed_consent: false })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses the same payload-bound key across retries and always sets a timeout", async () => {
    vi.stubEnv("LF_AGENT_LEAD_SECRET", "synthetic-test-secret");
    const captured: Array<{ key: string; signal: AbortSignal | null | undefined }> = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: unknown, options: RequestInit) => {
      const payload = JSON.parse(String(options.body)); captured.push({ key: payload.idempotency_key, signal: options.signal });
      return new Response(JSON.stringify({ ok: true, entry_id: 42, lead_id: "synthetic-42" }), { status: 201 });
    }));
    const first = await createLegalFournierContactRequest(lead);
    const retry = await createLegalFournierContactRequest({ ...lead, source_surface: "openapi" });
    const changed = await createLegalFournierContactRequest({ ...lead, case_summary: lead.case_summary + " Different case." });
    expect(first.idempotency_key).toBe(retry.idempotency_key);
    expect(first.idempotency_key).not.toBe(changed.idempotency_key);
    expect(captured.every((call) => call.signal instanceof AbortSignal)).toBe(true);
    expect(first.notification_status).toBe("unknown");
    expect(first.booking_url).toMatch(/^https:\/\/legalfournier\.com\//);
  });
  it("preserves pending notification state without claiming email delivery", async () => {
    vi.stubEnv("LF_AGENT_LEAD_SECRET", "synthetic-test-secret");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, entry_id: 43, lead_id: "synthetic-43", notification_status: "needs_reconciliation" }), { status: 200 })));
    const result = await createLegalFournierContactRequest(lead);
    expect(result.notification_status).toBe("needs_reconciliation");
    expect(result.next_actions[0]).toMatch(/saved.*notification attempts need checking/i);
  });
  it("reports unknown outcomes with a stable retry key and maps upstream throttling", async () => {
    vi.stubEnv("LF_AGENT_LEAD_SECRET", "synthetic-test-secret");
    const fetch = vi.fn().mockRejectedValueOnce(new Error("synthetic connection reset containing private detail"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false }), { status: 429, headers: { "Retry-After": "60" } }));
    vi.stubGlobal("fetch", fetch);
    await expect(createLegalFournierContactRequest(lead)).rejects.toMatchObject({ code: "CONTACT_OUTCOME_UNKNOWN", status: 503, details: { outcome_unknown: true, idempotency_key: expect.stringMatching(/^agent-lead:/) } });
    await expect(createLegalFournierContactRequest(lead)).rejects.toMatchObject({ code: "CONTACT_RATE_LIMITED", status: 429, retryAfter: 60 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("Telemetry recovery, bounded storage and protocol accounting", () => {
  it("keeps native tool responses working after a logger write fails and retries later writes", async () => {
    await temporaryTelemetry();
    const telemetry = getTelemetryRecorder();
    const write = vi.spyOn(telemetry as any, "writeEvent").mockRejectedValueOnce(new Error("disk full")).mockResolvedValue(undefined);
    const { client, server } = await memoryClient();
    try {
      expect((await client.callTool({ name: "explain_nie_process", arguments: {} })).isError).not.toBe(true);
      await telemetry.flush();
      expect((await client.callTool({ name: "explain_nie_process", arguments: {} })).isError).not.toBe(true);
      await telemetry.flush();
      expect(write).toHaveBeenCalledTimes(2); expect(telemetry.getStatus().write_failures).toBe(1);
      expect(telemetry.getStatus().status).toBe("ok");
    } finally { await Promise.all([client.close(), server.close()]); }
  });
  it("does not await a stalled write and drops excess queued events", async () => {
    const telemetry = new TelemetryRecorder({ enabled: true, telemetryDir: await mkdtemp(path.join(os.tmpdir(), "lf-queue-")), maxQueue: 2 });
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    vi.spyOn(telemetry as any, "writeEvent").mockImplementation(() => blocked);
    for (let index = 0; index < 10; index++) await telemetry.recordOperation("tool_call", "explain_nie_process", { durationMs: 1, success: true });
    expect(telemetry.getStatus().pending).toBe(2); expect(telemetry.getStatus().dropped).toBe(8);
    release(); await telemetry.flush(); expect(telemetry.getStatus().pending).toBe(0);
  });
  it("writes parseable summaries atomically and expires only its own old files", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "lf-retention-"));
    await writeFile(path.join(dir, "events-2000-01-01.jsonl"), "expired");
    await writeFile(path.join(dir, "unrelated.txt"), "keep");
    const telemetry = new TelemetryRecorder({ enabled: true, telemetryDir: dir, retentionDays: 30 });
    await telemetry.recordOperation("tool_call", "__proto__", { durationMs: 1, success: true });
    await telemetry.flush();
    const files = await readdir(dir); expect(files).toContain("unrelated.txt"); expect(files).not.toContain("events-2000-01-01.jsonl");
    expect(files.some((file) => file.endsWith(".tmp"))).toBe(false);
    const summary = JSON.parse(await readFile(path.join(dir, `daily-${new Date().toISOString().slice(0, 10)}.json`), "utf8"));
    expect(summary.tools.__proto__.success).toBe(1);
  });
  it("counts JSON-RPC validation failures as failures even with HTTP 200", async () => {
    const directory = await temporaryTelemetry();
    const remote = await startRemoteServer({ host: "127.0.0.1", port: 0 });
    try {
      const response = await originalFetch(remote.url, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_visa_options", arguments: {} } }) });
      const payload = await response.json(); expect(payload.result?.isError || payload.error).toBeTruthy();
    } finally { await remote.close(); }
    const summary = JSON.parse(await readFile(path.join(directory, `daily-${new Date().toISOString().slice(0, 10)}.json`), "utf8"));
    expect(summary.totals.httpErrors).toBeGreaterThan(0); expect(summary.tools.get_visa_options.error).toBeGreaterThan(0);
  });
});

describe("Verified proxy identity and capacity limits", () => {
  it("ignores caller-controlled forwarding headers and requires loopback for verified identity", () => {
    const fake = { headers: { "cf-connecting-ip": "192.0.2.2", "x-forwarded-for": "192.0.2.3", "x-real-ip": "192.0.2.4", "x-lf-verified-client-ip": "192.0.2.5" }, socket: { remoteAddress: "198.51.100.1" } };
    expect(getClientIpInfo(fake as never).ip).toBe("198.51.100.1");
    fake.socket.remoteAddress = "::ffff:127.0.0.1";
    expect(getClientIpInfo(fake as never)).toMatchObject({ ip: "192.0.2.5", source: "verified-proxy" });
    delete (fake.headers as Record<string, string>)["x-lf-verified-client-ip"];
    expect(getClientIpInfo(fake as never).ip).toBe("127.0.0.1");
  });
  it("rate limits repeated requests while leaving liveness accessible", async () => {
    await temporaryTelemetry();
    const remote = await startRemoteServer({ host: "127.0.0.1", port: 0, requestsPerMinute: 2 });
    try {
      const url = new URL("/api/spain-legal/nie-process", remote.url);
      for (let index = 0; index < 2; index++) expect((await originalFetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status).toBe(200);
      const limited = await originalFetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      expect(limited.status).toBe(429); expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
      expect((await originalFetch(remote.healthUrl)).status).toBe(200);
    } finally { await remote.close(); }
  });
});
