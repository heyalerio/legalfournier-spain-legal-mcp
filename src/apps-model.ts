/** Pure, shared presentation boundary. Source strings are never HTML or commands. */
export const CONTENT_APP_TOOLS = ["search", "fetch", "run_legal_fournier_tool"] as const;
export const CONTENT_URI_PREFIX = "legalfournier://spain-legal/content/";
export interface ContentCard {
  id?: string; uri: string; title: string; type: "article" | "video" | "resource";
  url?: string; language: string; excerpt: string; modifiedAt: string | null;
}
export interface ContentDocument extends ContentCard {
  text: string; nextOffset: number | null; reviewedAt: string | null;
  relatedArticleUrls: string[]; indexStatus: string;
}
export function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
export function text(value: unknown, limit = 1000): string {
  return typeof value === "string" ? value.slice(0, limit) : "";
}
export function safeContentId(value: unknown): string | undefined {
  return typeof value === "string" && /^(?:wp:post:[1-9]\d*|youtube:[A-Za-z0-9_-]{11})$/.test(value) ? value : undefined;
}
export function safeResourceUri(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 500) return undefined;
  if (/^legalfournier:\/\/spain-legal\/(?:catalog|tools\/catalog|skills|(?:routes|processes|tracks|topics|skills)\/[a-z0-9-]+)$/.test(value)) return value;
  if (!value.startsWith(CONTENT_URI_PREFIX)) return undefined;
  try { return safeContentId(decodeURIComponent(value.slice(CONTENT_URI_PREFIX.length))) ? value : undefined; } catch { return undefined; }
}
export function safePublicUrl(value: unknown, verifiedVideos: ReadonlySet<string>): string | undefined {
  if (typeof value !== "string" || value.length > 2000) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return undefined;
    if (["legalfournier.com", "www.legalfournier.com"].includes(url.hostname)) return url.href;
    const id = url.searchParams.get("v") ?? "";
    if (url.hostname === "www.youtube.com" && url.pathname === "/watch" && verifiedVideos.has(id) && /^[A-Za-z0-9_-]{11}$/.test(id)) return `https://www.youtube.com/watch?v=${id}`;
  } catch { /* Invalid sources are omitted, never followed. */ }
  return undefined;
}
export function verifiedVideoId(document: Pick<ContentCard, "id" | "type" | "url">, allowlist: ReadonlySet<string>): string | null {
  const id = document.id?.startsWith("youtube:") ? document.id.slice(8) : "";
  if (document.type !== "video" || !allowlist.has(id) || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return safePublicUrl(document.url, allowlist) === `https://www.youtube.com/watch?v=${id}` ? id : null;
}
function parseCard(value: unknown, allowlist: ReadonlySet<string>): ContentCard | null {
  const item = record(value);
  const uri = safeResourceUri(item?.uri);
  if (!item || !uri) return null;
  const type = item.type === "video" ? "video" : item.type === "article" ? "article" : "resource";
  const id = safeContentId(item.id);
  if (type !== "resource" && !id) return null;
  if ((type === "article" && !id?.startsWith("wp:post:")) || (type === "video" && !id?.startsWith("youtube:"))) return null;
  if (uri.startsWith(CONTENT_URI_PREFIX) && decodeURIComponent(uri.slice(CONTENT_URI_PREFIX.length)) !== id) return null;
  const card: ContentCard = { id, uri, type, title: text(item.title, 500) || "Legal Fournier guide", url: safePublicUrl(item.url, allowlist), language: text(item.language, 10), excerpt: text(item.excerpt ?? item.description, 1200), modifiedAt: typeof item.source_modified_at === "string" ? item.source_modified_at : null };
  if (type === "video" && !verifiedVideoId(card, allowlist)) return null;
  return card;
}
export function parseToolData(result: unknown): Record<string, unknown> {
  const envelope = record(result);
  if (!envelope || envelope.isError) throw new Error("The request could not be completed. Try again.");
  const structured = record(envelope.structuredContent);
  if (structured) return structured;
  const blocks = Array.isArray(envelope.content) ? envelope.content : [];
  const body = blocks.map(record).find(block => block?.type === "text" && typeof block.text === "string");
  if (body && (body.text as string).length <= 1000000) {
    try { const parsed = record(JSON.parse(body.text as string)); if (parsed) return parsed; } catch { /* Fall through. */ }
  }
  throw new Error("This result could not be displayed. The text response is still available in your conversation.");
}
export function parseCards(data: Record<string, unknown>, allowlist: ReadonlySet<string>): ContentCard[] {
  if (!Array.isArray(data.resources)) throw new Error("The search did not return a usable result.");
  return data.resources.slice(0, 20).map(item => parseCard(item, allowlist)).filter((item): item is ContentCard => Boolean(item));
}
export function parseDocument(data: Record<string, unknown>, allowlist: ReadonlySet<string>): ContentDocument {
  const metadata = record(data.metadata) ?? {};
  const card = parseCard({ ...data, type: metadata.type ?? "resource", language: metadata.language, source_modified_at: metadata.source_modified_at }, allowlist);
  if (!card || typeof data.text !== "string") throw new Error("This source is unavailable. Choose another result or open its original link.");
  return { ...card, text: text(data.text, 40000), nextOffset: Number.isInteger(data.next_offset) && Number(data.next_offset) > Number(data.offset ?? 0) && Number(data.next_offset) <= 10000000 ? Number(data.next_offset) : null, reviewedAt: typeof metadata.reviewed_at === "string" ? metadata.reviewed_at : null, relatedArticleUrls: (Array.isArray(metadata.related_article_urls) ? metadata.related_article_urls : []).slice(0, 10).map(url => safePublicUrl(url, new Set())).filter((url): url is string => Boolean(url)), indexStatus: text(metadata.index_status, 40) };
}
export function allowedAppCall(name: string, args: Record<string, unknown>): boolean {
  if (name === "search") return !Object.values(args).some(value => typeof value === "string" && value.length > 500);
  if (name === "run_legal_fournier_tool") return args.tool_id === "digital-nomad-visa-eligibility" && Boolean(record(args.digital_nomad_income));
  return name === "fetch" && Boolean(safeContentId(args.id) || safeResourceUri(args.uri));
}
export function buildIncomeArguments(input: { amount: string; period: string; category: string; familyCount: string; assessmentDate: string }): Record<string, unknown> {
  const amount = Number(input.amount), familyCount = Number(input.familyCount);
  if (!input.amount.trim() || !Number.isFinite(amount) || amount < 0 || amount > 1e9) throw new Error("Enter an income amount between €0 and €1 billion.");
  if (!["monthly", "annual"].includes(input.period) || !["employment", "self_employment"].includes(input.category)) throw new Error("Choose the income period and work category.");
  if (!input.familyCount.trim() || !Number.isInteger(familyCount) || familyCount < 0 || familyCount > 30) throw new Error("Enter a whole number of accompanying family members from 0 to 30.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.assessmentDate) || !Number.isFinite(Date.parse(input.assessmentDate)) || new Date(input.assessmentDate).toISOString().slice(0, 10) !== input.assessmentDate) throw new Error("Choose a valid assessment date.");
  return {
    tool_id: "digital-nomad-visa-eligibility", preferred_language: "en",
    user_goal: "Check the supplied income only; this does not establish visa eligibility.",
    digital_nomad_income: {
      income_sources: [{ source_id: "income-1", amount, currency: "EUR", period: input.period, category: input.category }],
      accompanying_family: Array.from({ length: familyCount }, (_, index) => ({ member_id: `family-${index + 1}`, relationship: "other" })),
      assessment_date: input.assessmentDate,
    },
  };
}
