import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

// This module only reads a publisher-owned artifact. It has no WordPress,
// YouTube, Metricool or network credentials, and never fetches a supplied URL.
const DEFAULT_INDEX_PATH = fileURLToPath(new URL("../data/content-index.json", import.meta.url));
const CONTENT_URI_PREFIX = "legalfournier://spain-legal/content/";
const MAX_INDEX_BYTES = 32 * 1024 * 1024;
const MAX_DOCUMENTS = 3000;
const STALE_AFTER_MS = 48 * 60 * 60 * 1000;
const EXCLUDED_POST_IDS = new Set([2191]);
const STOP_WORDS = new Set("a an and are as at be by can do for from how i in is it its me my of on or our the their this to we what when which who with you your de del la las el los un una unos unas y o en por para con que como cual mi mis su sus le les des du et au aux une pour dans sur est je mon mes votre vos comment quels quelle quel a propos".split(" "));
const TOPIC_TERMS: Record<string, string[]> = {
    nationality: ["nationality", "citizenship", "nacionalidad", "ciudadania", "nationalite", "citoyennete", "naturalisation", "naturalization"],
    residency: ["residence", "residency", "residencia", "residences", "residence permit", "titre de sejour", "residencial"],
    "digital-nomad": ["digital nomad", "nomad", "nomade", "nomada", "telework", "teletrabajo", "teletravail", "remote work"],
    beckham: ["beckham", "impatriate", "impatriado", "impatrie"],
    tax: ["tax", "taxes", "taxation", "impuesto", "impuestos", "fiscal", "fiscalite", "impot", "impots"],
    property: ["property", "real estate", "inmueble", "inmobiliario", "immobilier", "vivienda", "propriete", "propiedad"],
    business: ["business", "company", "companies", "empresa", "sociedad", "societe", "entreprise", "entrepreneur", "emprendedor"],
    family: ["family", "familia", "familiar", "families", "familial", "famille", "spouse", "conyuge", "conjoint"],
    immigration: ["immigration", "inmigracion", "extranjeria", "visa", "visas", "visado", "visados"],
    inheritance: ["inheritance", "succession", "herencia", "sucesion", "heritage"],
    healthcare: ["healthcare", "health", "sanidad", "salud", "sante", "nursing", "enfermeria", "infirmier"],
    employment: ["employment", "employee", "work permit", "trabajo", "empleo", "travail", "salarie"],
};
const TERM_TO_TOPIC = new Map(Object.entries(TOPIC_TERMS).flatMap(([topic, terms]) => terms.map(term => [term, topic])));
export interface PublishedContentDocument {
    id: string;
    type: "article" | "video";
    status: "publish";
    title: string;
    url: string;
    language: "en" | "es" | "fr" | "und";
    description?: string;
    text: string;
    topics: string[];
    source_modified_at: string | null;
    reviewed_at: string | null;
    law_effective_dates?: string[];
    indexed_at?: string | null;
    related_article_ids?: string[];
    related_article_urls?: string[];
    related_video_ids?: string[];
    transcript_status?: string;
    video_format?: string;
    video_language?: string;
    availability_verified_at?: string;
}
interface SearchableDocument extends PublishedContentDocument {
    uri: string;
    _search: { title: string; description: string; body: string; titleTerms: Set<string>; bodyTerms: Set<string> };
}
interface ContentIndex {
    signature: string;
    generated_at: string;
    documents: SearchableDocument[];
    byId: Map<string, SearchableDocument>;
}
interface QueryGroup { term: string; variants: string[]; topic?: string; }
export interface ContentSearchArgs { query?: string; max_results?: number; language?: string; type?: string; topic?: string; }
export interface ContentFetchArgs { id?: string; uri?: string; offset?: number; max_chars?: number; }
let cachedIndex: ContentIndex | undefined;

export function normalizeContentSearch(value: unknown) {
    return String(value ?? "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function terms(value: unknown) {
    return normalizedTerms(normalizeContentSearch(value));
}

function normalizedTerms(normalized: string) {
    return normalized.split(/\s+/).filter(word => word && !STOP_WORDS.has(word));
}

function validDate(value: unknown) {
    return value === null || (typeof value === "string" && Number.isFinite(Date.parse(value)));
}

function safeCitation(value: string, type: string) {
    try {
        const url = new URL(value);
        if (url.protocol !== "https:" || url.username || url.password) return false;
        return type === "article"
            ? ["legalfournier.com", "www.legalfournier.com"].includes(url.hostname)
            : url.hostname === "www.youtube.com" && url.pathname === "/watch" && /^[A-Za-z0-9_-]{11}$/.test(url.searchParams.get("v") ?? "");
    } catch { return false; }
}

function validateDocument(candidate: unknown): candidate is PublishedContentDocument {
    const document = candidate as PublishedContentDocument;
    if (!document || typeof document !== "object") return false;
    if (document.type !== "article" && document.type !== "video") return false;
    const match = document.type === "article" ? /^wp:post:([1-9]\d*)$/.exec(document.id) : /^youtube:([A-Za-z0-9_-]{11})$/.exec(document.id);
    if (!match || (document.type === "article" && EXCLUDED_POST_IDS.has(Number(match[1])))) return false;
    if (document.status !== "publish" || !safeCitation(document.url, document.type)) return false;
    if (typeof document.title !== "string" || !document.title.trim() || document.title.length > 1000) return false;
    if (typeof document.text !== "string" || !document.text.trim() || document.text.length > 250000) return false;
    if (!["en", "es", "fr", "und"].includes(document.language)) return false;
    if (!Array.isArray(document.topics) || document.topics.length > 30 || !document.topics.every(topic => typeof topic === "string" && topic.length <= 80)) return false;
    if (!validDate(document.source_modified_at) || !validDate(document.reviewed_at)) return false;
    if (document.type === "video" && (!Array.isArray(document.related_article_ids) || document.related_article_ids.length > 100)) return false;
    return true;
}

function prepareDocument(document: PublishedContentDocument): SearchableDocument {
    const title = normalizeContentSearch(document.title);
    const description = normalizeContentSearch(document.description ?? "");
    const body = normalizeContentSearch(document.text);
    return { ...document, uri: CONTENT_URI_PREFIX + encodeURIComponent(document.id), _search: { title, description, body, titleTerms: new Set(normalizedTerms(title)), bodyTerms: new Set(normalizedTerms(body)) } };
}

function loadIndex(): ContentIndex | null {
    const path = process.env.LF_CONTENT_INDEX_PATH || DEFAULT_INDEX_PATH;
    try {
        const stat = statSync(path);
        if (!stat.isFile() || stat.size > MAX_INDEX_BYTES) throw new Error("Invalid index size");
        const signature = `${path}:${stat.ino}:${stat.mtimeMs}:${stat.size}`;
        if (cachedIndex?.signature === signature) return cachedIndex;
        const source = JSON.parse(readFileSync(path, "utf8"));
        if (source.schema_version !== 1 || !validDate(source.generated_at) || !source.generated_at || !Array.isArray(source.documents) || source.documents.length > MAX_DOCUMENTS) throw new Error("Invalid index schema");
        const ids = new Set<string>();
        const articles = (source.documents as unknown[]).filter(validateDocument).filter(document => validateDocument(document) && document.type === "article");
        const articleIds = new Set(articles.map(document => document.id));
        const documents = (source.documents as unknown[]).filter(validateDocument).filter(document => {
            if (!validateDocument(document) || ids.has(document.id)) return false;
            if (document.type === "video" && !(document.related_article_ids ?? []).some(id => articleIds.has(id))) return false;
            ids.add(document.id);
            return true;
        }).map(prepareDocument);
        cachedIndex = { signature, generated_at: source.generated_at, documents, byId: new Map(documents.map(document => [document.id, document])) };
        return cachedIndex;
    } catch {
        // Fail closed after disappearance/corruption; never serve a prior snapshot
        // that may still contain withdrawn content. Atomic publication avoids gaps.
        cachedIndex = undefined;
        return null;
    }
}

export function getContentIndexStatus() {
    const index = loadIndex();
    const stale = !index || Date.now() - Date.parse(index.generated_at) > STALE_AFTER_MS;
    return {
        status: !index ? "unavailable" : stale ? "stale" : "ready",
        index_updated_at: index?.generated_at ?? null,
        document_count: index?.documents.length ?? 0,
        article_count: index?.documents.filter(document => document.type === "article").length ?? 0,
        video_count: index?.documents.filter(document => document.type === "video").length ?? 0,
        stale,
    };
}

/** Full validated snapshot, bounded by MAX_DOCUMENTS; never a search-result page. */
export function getVerifiedContentVideoIds(): string[] {
    return (loadIndex()?.documents ?? []).filter(document => document.type === "video"
        && document.url === `https://www.youtube.com/watch?v=${document.id.slice(8)}`)
        .map(document => document.id.slice(8));
}

function queryGroups(query: string): QueryGroup[] {
    const normalized = normalizeContentSearch(query);
    const groups: QueryGroup[] = terms(normalized).map(term => ({ term, variants: [term], topic: TERM_TO_TOPIC.get(term) }));
    for (const group of groups) {
        if (group.topic) group.variants = TOPIC_TERMS[group.topic];
    }
    // Preserve a compound topic even when each individual word has no mapping.
    for (const [topic, variants] of Object.entries(TOPIC_TERMS)) {
        if (variants.some(term => term.includes(" ") && ` ${normalized} `.includes(` ${term} `))) {
            for (const group of groups) {
                if (variants.some(term => term.split(" ").includes(group.term))) {
                    group.topic = topic;
                    group.variants = variants;
                }
            }
        }
    }
    return groups.slice(0, 30);
}

function containsTerm(text: string, term: string, termSet: Set<string>) {
    return term.includes(" ") ? ` ${text} `.includes(` ${term} `) : termSet.has(term);
}

function scoreDocument(document: SearchableDocument, groups: QueryGroup[], query: string) {
    if (!groups.length) return 1;
    let score = 0;
    let matched = 0;
    for (const group of groups) {
        const titleMatch = group.variants.some(term => containsTerm(document._search.title, term, document._search.titleTerms));
        const bodyMatch = group.variants.some(term => containsTerm(document._search.body, term, document._search.bodyTerms));
        const topicMatch = group.topic && document.topics.includes(group.topic);
        if (!titleMatch && !bodyMatch && !topicMatch) {
            // Explicit topic terms such as "tax" cannot be discarded merely
            // because generic words such as "buying property" matched.
            if (group.topic) return 0;
            continue;
        }
        matched++;
        score += titleMatch ? 12 : topicMatch ? 5 : 2;
        if (document._search.titleTerms.has(group.term)) score += 4;
    }
    // A stray matching word must not turn an unrelated query into a result.
    if (matched < Math.max(1, Math.ceil(groups.length * 0.6))) return 0;
    if (document._search.title.includes(normalizeContentSearch(query))) score += 10;
    return score;
}

function excerptFor(document: SearchableDocument, groups: QueryGroup[], length = 500) {
    const text = document.text.replace(/\s+/g, " ").trim();
    // Search a normalized copy to locate relevant passage; NFKD can change the
    // exact character offset, so use a generous context window and plain text.
    const normalized = normalizeContentSearch(text);
    const positions = groups.flatMap(group => group.variants.map(term => normalized.indexOf(term))).filter(position => position >= 0);
    const start = positions.length ? Math.max(0, Math.min(...positions) - 100) : 0;
    return `${start ? "…" : ""}${text.slice(start, start + length)}${start + length < text.length ? "…" : ""}`;
}

function publicMetadata(document: PublishedContentDocument) {
    return {
        type: document.type,
        language: document.language,
        topics: document.topics,
        source_modified_at: document.source_modified_at,
        reviewed_at: document.reviewed_at,
        law_effective_dates: document.law_effective_dates ?? [],
        indexed_at: document.indexed_at ?? null,
        content_trust: "untrusted_reference_data",
        source_role: document.type === "video" ? "published_video_metadata" : "published_firm_article",
        ...(document.type === "video" ? {
            transcript_status: document.transcript_status ?? "unavailable",
            video_format: document.video_format ?? "unverified",
            video_language: document.video_language ?? "unverified",
            availability_verified_at: document.availability_verified_at ?? null,
            related_article_ids: document.related_article_ids,
            related_article_urls: document.related_article_urls ?? [],
        } : { related_video_ids: document.related_video_ids ?? [] }),
    };
}

export function searchContent(args: ContentSearchArgs = {}) {
    const query = typeof args.query === "string" ? args.query.trim().slice(0, 500) : "";
    const limit = Number.isInteger(args.max_results) ? Math.max(1, Math.min(args.max_results!, 20)) : 8;
    const index = loadIndex();
    const groups = queryGroups(query);
    const topic = args.topic ? normalizeContentSearch(args.topic).replace(/ /g, "-") : null;
    const resources = (index?.documents ?? [])
        .filter(document => (!args.language || document.language === args.language) && (!args.type || document.type === args.type) && (!topic || document.topics.includes(topic)))
        .map(document => ({ document, score: scoreDocument(document, groups, query) }))
        .filter(item => item.score > 0)
        .sort((left, right) => right.score - left.score || left.document.id.localeCompare(right.document.id))
        .slice(0, limit)
        .map(({ document, score }) => ({
            id: document.id, uri: document.uri, title: document.title, url: document.url,
            description: document.description ?? "", excerpt: excerptFor(document, groups),
            mime_type: "text/plain", language: document.language, type: document.type,
            topics: document.topics, source_modified_at: document.source_modified_at,
            reviewed_at: document.reviewed_at, score,
        }));
    return { query, resources, index_updated_at: index?.generated_at ?? null, index_status: getContentIndexStatus().status };
}

export function fetchContent(args: ContentFetchArgs = {}) {
    let id = typeof args.id === "string" ? args.id : "";
    if (!id && typeof args.uri === "string" && args.uri.startsWith(CONTENT_URI_PREFIX)) {
        try { id = decodeURIComponent(args.uri.slice(CONTENT_URI_PREFIX.length)); } catch { return null; }
    }
    const document = loadIndex()?.byId.get(id);
    if (!document) return null;
    const offset = Number.isInteger(args.offset) && args.offset! >= 0 ? args.offset! : 0;
    const maxChars = Number.isInteger(args.max_chars) ? Math.max(1000, Math.min(args.max_chars!, 40000)) : 20000;
    const end = Math.min(offset + maxChars, document.text.length);
    const indexStatus = getContentIndexStatus();
    return {
        id: document.id, uri: document.uri, url: document.url, title: document.title,
        content_type: "text/plain", text: document.text.slice(offset, end),
        metadata: { ...publicMetadata(document), index_status: indexStatus.status, index_updated_at: indexStatus.index_updated_at }, offset, total_chars: document.text.length,
        next_offset: end < document.text.length ? end : null,
    };
}
