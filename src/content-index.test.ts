import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchContent, getContentIndexStatus, searchContent, type PublishedContentDocument } from "./content-index.js";

let directory: string;
let path: string;
const originalPath = process.env.LF_CONTENT_INDEX_PATH;
const article = (id: number, changes: Partial<PublishedContentDocument> = {}): PublishedContentDocument => ({
    id: `wp:post:${id}`, type: "article", status: "publish", title: "Spanish nationality requirements",
    url: "https://legalfournier.com/en/immigration/spanish-nationality-law/", language: "en",
    text: "Qualifying legal residence is required. Evidence of continuous residence must be assessed.",
    description: "The routes to Spanish citizenship.", topics: ["nationality", "residency"],
    source_modified_at: "2026-10-16T10:00:00Z", reviewed_at: null, ...changes,
});
function publish(documents: PublishedContentDocument[], generatedAt = new Date().toISOString()) {
    const temp = path + ".new";
    writeFileSync(temp, JSON.stringify({ schema_version: 1, generated_at: generatedAt, documents }));
    renameSync(temp, path);
}

beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "lf-content-test-"));
    path = join(directory, "content.json");
    process.env.LF_CONTENT_INDEX_PATH = path;
});
afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
    if (originalPath === undefined) delete process.env.LF_CONTENT_INDEX_PATH;
    else process.env.LF_CONTENT_INDEX_PATH = originalPath;
});

describe("public content search", () => {
    it("finds an intended topic in English, Spanish and French", () => {
        publish([article(1916)]);
        for (const query of ["nationality", "nacionalidad", "nationalité", "résidence"]) {
            expect(searchContent({ query }).resources[0]?.id).toBe("wp:post:1916");
        }
    });
    it("searches current article text, not only resource labels", () => {
        publish([article(1916)]);
        expect(searchContent({ query: "continuous residence" }).resources[0]?.excerpt).toContain("continuous residence");
    });
    it("does not return unrelated resources", () => {
        publish([article(1916)]);
        expect(searchContent({ query: "banana pancake recipe" }).resources).toEqual([]);
    });
    it("does not discard a requested legal topic when other words match", () => {
        publish([article(22, { title: "Compra vivienda: vicios ocultos", text: "Problemas de calidad tras la compra de vivienda.", topics: ["property"] })]);
        expect(searchContent({ query: "impuestos compra vivienda" }).resources).toEqual([]);
    });
    it("applies language, type, topic and result limits", () => {
        publish(Array.from({ length: 25 }, (_, i) => article(i + 1, { language: i % 2 ? "en" : "es" })));
        expect(searchContent({ query: "nationality", language: "es", topic: "nationality", max_results: 3 }).resources).toHaveLength(3);
        expect(searchContent({ query: "nationality", type: "video" }).resources).toEqual([]);
        expect(searchContent({ query: "nationality", max_results: 99 }).resources).toHaveLength(20);
    });
    it("resolves stable IDs and URIs to canonical citations", () => {
        publish([article(1916)]);
        const result = searchContent({ query: "nacionalidad" }).resources[0];
        expect(result.id).toBe("wp:post:1916");
        expect(fetchContent({ uri: result.uri })?.url).toBe(article(1916).url);
        expect(fetchContent({ id: result.id })?.text).toBe(article(1916).text);
    });
    it("never fetches a client-supplied external URL", () => {
        publish([article(1916)]);
        expect(fetchContent({ uri: "http://127.0.0.1/admin" })).toBeNull();
        expect(fetchContent({ uri: "legalfournier://spain-legal/content/%ZZ" })).toBeNull();
    });
    it("paginates long content without silently dropping the remainder", () => {
        publish([article(1916, { text: "a".repeat(50000) })]);
        const first = fetchContent({ id: "wp:post:1916", max_chars: 50000 })!;
        expect(first.text).toHaveLength(40000);
        expect(first.next_offset).toBe(40000);
        const second = fetchContent({ id: first.id, offset: first.next_offset! })!;
        expect(second.text).toHaveLength(10000);
        expect(second.next_offset).toBeNull();
    });
});

describe("snapshot publication boundary", () => {
    it("replaces edited passages and removes withdrawn documents on reload", () => {
        publish([article(1916), article(2936, { title: "Former remote-work guidance" })]);
        expect(fetchContent({ id: "wp:post:1916" })?.text).toContain("Qualifying");
        publish([article(1916, { text: "Current amended passage", source_modified_at: "2026-10-18T09:00:00Z" })]);
        expect(fetchContent({ id: "wp:post:1916" })?.text).toBe("Current amended passage");
        expect(fetchContent({ id: "wp:post:2936" })).toBeNull();
        expect(searchContent({ query: "qualifying" }).resources).toEqual([]);
    });
    it("keeps article modification and legal-review dates distinct", () => {
        publish([article(1916)]);
        const metadata = fetchContent({ id: "wp:post:1916" })?.metadata;
        expect(metadata?.source_modified_at).toBe("2026-10-16T10:00:00Z");
        expect(metadata?.reviewed_at).toBeNull();
        expect(metadata?.law_effective_dates).toEqual([]);
    });
    it("rejects unpublished, excluded, foreign-host and orphaned documents", () => {
        publish([
            article(2191), article(2663, { status: "draft" as "publish" }),
            article(7, { url: "https://example.com/article" }),
            article(8, { id: "youtube:VItK51LZbfE", type: "video", url: "https://www.youtube.com/watch?v=VItK51LZbfE", related_article_ids: ["wp:post:2191"] }),
        ]);
        expect(searchContent().resources).toEqual([]);
    });
    it("marks metadata-only videos without inventing language or transcripts", () => {
        publish([article(1916), article(8, {
            id: "youtube:VItK51LZbfE", type: "video", url: "https://www.youtube.com/watch?v=VItK51LZbfE",
            language: "und", source_modified_at: null, related_article_ids: ["wp:post:1916"],
            transcript_status: "unavailable", video_format: "unverified", video_language: "unverified",
        })]);
        const video = fetchContent({ id: "youtube:VItK51LZbfE" })!;
        expect(video.metadata).toMatchObject({ language: "und", transcript_status: "unavailable", video_format: "unverified", source_modified_at: null });
        expect(getContentIndexStatus().video_count).toBe(1);
    });
    it("exposes index age without making stale content look freshly reviewed", () => {
        publish([article(1916)], "2020-01-01T00:00:00Z");
        expect(getContentIndexStatus()).toMatchObject({ status: "stale", stale: true, document_count: 1 });
        expect(fetchContent({ id: "wp:post:1916" })?.metadata.reviewed_at).toBeNull();
    });
    it("fails closed if the configured index disappears or is corrupt", () => {
        publish([article(1916)]);
        expect(getContentIndexStatus().document_count).toBe(1);
        writeFileSync(path, "broken json");
        expect(getContentIndexStatus().status).toBe("unavailable");
        expect(fetchContent({ id: "wp:post:1916" })).toBeNull();
        rmSync(path);
        expect(searchContent().resources).toEqual([]);
    });
});
