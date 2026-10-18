import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./server.js";
import { startRemoteServer } from "./remote.js";
import { resetTelemetryRecorderForTests } from "./telemetry.js";
import { outputSchemas } from "./schemas.js";
import { CATALOG_URI, makeRouteResourceUri } from "./data/canonical-packs.js";

const saved = { path: process.env.LF_CONTENT_INDEX_PATH, telemetry: process.env.LF_MCP_TELEMETRY_ENABLED };
let directory: string;
let server: ReturnType<typeof createServer>;
let client: Client;
let remote: Awaited<ReturnType<typeof startRemoteServer>>;
const article = {
    id: "wp:post:1916", type: "article", status: "publish", title: "Spanish Nationality Law",
    url: "https://legalfournier.com/en/immigration/spanish-nationality-law/", language: "en",
    description: "Nationality and qualifying legal residence.", topics: ["nationality", "residency"],
    text: "Qualifying continuous legal residence is required. ".repeat(100),
    source_modified_at: "2026-10-16T12:00:00Z", reviewed_at: null, related_video_ids: ["youtube:VItK51LZbfE"],
};
async function post(route: string, body: unknown) {
    return fetch(new URL(`/api/spain-legal/${route}`, remote.url), {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
}

beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), "lf-retrieval-integration-"));
    process.env.LF_CONTENT_INDEX_PATH = join(directory, "content.json");
    process.env.LF_MCP_TELEMETRY_ENABLED = "false";
    resetTelemetryRecorderForTests();
    writeFileSync(process.env.LF_CONTENT_INDEX_PATH, JSON.stringify({
        schema_version: 1, generated_at: new Date().toISOString(), documents: [article, {
            ...article, id: "youtube:VItK51LZbfE", type: "video", language: "und", title: "Spanish Citizenship by Descent",
            url: "https://www.youtube.com/watch?v=VItK51LZbfE", text: "Video metadata only. Transcript unavailable.",
            source_modified_at: null, related_article_ids: [article.id], related_article_urls: [article.url],
            transcript_status: "unavailable", video_format: "unverified", video_language: "unverified",
        }],
    }));
    server = createServer();
    client = new Client({ name: "content-integration-test", version: "1.0.0" }, { capabilities: {} });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    remote = await startRemoteServer({ host: "127.0.0.1", port: 0, allowedHosts: ["127.0.0.1", "localhost"] });
});
afterAll(async () => {
    await Promise.allSettled([client?.close(), server?.close(), remote?.close()]);
    if (directory) rmSync(directory, { recursive: true, force: true });
    if (saved.path === undefined) delete process.env.LF_CONTENT_INDEX_PATH;
    else process.env.LF_CONTENT_INDEX_PATH = saved.path;
    if (saved.telemetry === undefined) delete process.env.LF_MCP_TELEMETRY_ENABLED;
    else process.env.LF_MCP_TELEMETRY_ENABLED = saved.telemetry;
    resetTelemetryRecorderForTests();
});

describe("native and REST content retrieval", () => {
    it("exposes native tools with truthful source-boundary descriptions", async () => {
        const list = await client.listTools();
        for (const name of ["search", "fetch"]) {
            const tool = list.tools.find(item => item.name === name)!;
            expect(tool).toBeDefined();
            expect(tool.annotations?.readOnlyHint).toBe(true);
            expect(tool.description).toMatch(/untrusted|reference material/i);
        }
    });
    it("returns valid native search output and identical REST results", async () => {
        const args = { query: "nacionalidad", type: "article", max_results: 2 };
        const native = await client.callTool({ name: "search", arguments: args });
        expect(native.isError).not.toBe(true);
        expect(outputSchemas.search.safeParse(native.structuredContent).success).toBe(true);
        const structured = outputSchemas.search.parse(native.structuredContent);
        expect(structured.resources[0]).toMatchObject({ id: article.id, url: article.url, source_modified_at: article.source_modified_at, reviewed_at: null });
        const response = await post("search", args);
        expect(response.status).toBe(200);
        const rest = await response.json();
        expect(rest.ok).toBe(true);
        expect(rest.result).toEqual(structured);
        expect(typeof rest.legal_notice).toBe("string");
    });
    it("fetches and paginates by stable ID without stripping metadata", async () => {
        const result = await client.callTool({ name: "fetch", arguments: { id: article.id, max_chars: 1000 } });
        expect(result.isError).not.toBe(true);
        const fetched = outputSchemas.fetch.parse(result.structuredContent);
        expect(fetched.text).toHaveLength(1000);
        expect(fetched.next_offset).toBe(1000);
        expect(fetched.metadata).toMatchObject({ source_modified_at: article.source_modified_at, reviewed_at: null, content_trust: "untrusted_reference_data" });
        const response = await post("fetch", { uri: fetched.uri, offset: 1000, max_chars: 1000 });
        const rest = await response.json();
        expect(rest.result.text).toBe(article.text.slice(1000, 2000));
    });
    it("returns video links while preserving unknown transcript and language", async () => {
        const found = await client.callTool({ name: "search", arguments: { query: "citizenship", type: "video" } });
        const results = outputSchemas.search.parse(found.structuredContent).resources;
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({ id: "youtube:VItK51LZbfE", language: "und" });
        const fetched = await client.callTool({ name: "fetch", arguments: { uri: results[0].uri } });
        const document = outputSchemas.fetch.parse(fetched.structuredContent);
        expect(document.metadata).toMatchObject({ transcript_status: "unavailable", video_format: "unverified", source_modified_at: null });
    });
    it("keeps existing canonical fetch and native resource reads working", async () => {
        const response = await post("fetch", { uri: CATALOG_URI });
        const rest = await response.json();
        expect(response.status).toBe(200);
        expect(rest.result).toMatchObject({ uri: CATALOG_URI, content_type: "text/markdown" });
        expect(rest.result.text).toContain("Spain Legal");
        const native = await client.readResource({ uri: makeRouteResourceUri("digital-nomad-visa") });
        expect(native.contents).toHaveLength(1);
    });
    it("enforces filters and rejects unrelated queries", async () => {
        for (const args of [{ query: "banana pancake recipe" }, { query: "beckham", topic: "nationality" }, { query: "nationality", language: "fr", type: "article" }]) {
            const response = await post("search", args);
            expect((await response.json()).result.resources).toEqual([]);
        }
    });
    it("rejects malformed input on both surfaces without invoking retrieval", async () => {
        const native = await client.callTool({ name: "search", arguments: { max_results: "twenty" } });
        expect(native.isError).toBe(true);
        const response = await post("search", { max_results: "twenty" });
        expect(response.status).toBe(400);
        expect((await response.json()).error.code).toBe("INVALID_INPUT");
    });
    it("cannot turn an arbitrary fetch URL into a network request", async () => {
        const network = vi.spyOn(globalThis, "fetch").mockImplementation(async () => { throw new Error("No network allowed"); });
        try {
            const native = await client.callTool({ name: "fetch", arguments: { uri: "http://169.254.169.254/latest/meta-data/" } });
            expect(native.isError).toBe(true);
            expect(network).not.toHaveBeenCalled();
        } finally { network.mockRestore(); }
        const response = await post("fetch", { uri: "https://example.com/article" });
        expect(response.status).toBe(404);
        expect((await response.json()).error.code).toBe("RESOURCE_NOT_FOUND");
    });
});
