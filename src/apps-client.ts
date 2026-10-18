import { App } from "@modelcontextprotocol/ext-apps/app-with-deps";
import { allowedAppCall, buildIncomeArguments, parseCards, parseDocument, parseToolData, record, safePublicUrl, text, verifiedVideoId, type ContentCard, type ContentDocument } from "./apps-model.js";

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = element<HTMLFormElement>("search-form");
const query = element<HTMLInputElement>("query");
const language = element<HTMLSelectElement>("language");
const contentType = element<HTMLSelectElement>("content-type");
const results = element<HTMLDivElement>("results");
const reader = element<HTMLElement>("reader");
const browse = element<HTMLElement>("browse");
const errorBox = element<HTMLParagraphElement>("error");
const status = element<HTMLParagraphElement>("status");
const videoSlot = element<HTMLDivElement>("video-slot");
const loadMore = element<HTMLButtonElement>("load-more");
const calculator = element<HTMLElement>("calculator");
const incomeForm = element<HTMLFormElement>("income-form");
const incomeDate = element<HTMLInputElement>("income-date");
incomeDate.value = new Date().toISOString().slice(0, 10);
const bootstrap = (() => { try { return record(JSON.parse(element("app-bootstrap").textContent ?? "{}")); } catch { return null; } })();
const verifiedVideos = new Set<string>((Array.isArray(bootstrap?.verifiedVideoIds) ? bootstrap.verifiedVideoIds : []).filter((value): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{11}$/.test(value)));
const app = new App({ name: "Legal Fournier Content Explorer", version: "1.0.0" });
let connected = false;
let disposed = false;
let busy = false;
let sequence = 0;
let active: AbortController | undefined;
let selected: ContentDocument | undefined;

function node<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", value = ""): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (value) result.textContent = value;
  return result;
}
function showError(message: string) { errorBox.textContent = message; errorBox.hidden = false; }
function clearError() { errorBox.hidden = true; errorBox.textContent = ""; }
function setBusy(value: boolean) {
  busy = value;
  form.setAttribute("aria-busy", String(value));
  for (const control of [query, language, contentType, element<HTMLButtonElement>("search-button"), loadMore]) control.disabled = !connected || value || disposed;
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-server-action]")) button.disabled = !connected || value || disposed;
  for (const control of incomeForm.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input,select,button")) control.disabled = !connected || value || disposed;
}
function readableDate(value: unknown): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return "";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}
function externalLink(url: string, label: string): HTMLAnchorElement | null {
  const safe = safePublicUrl(url, verifiedVideos);
  if (!safe) return null;
  const link = node("a", "", label);
  link.href = safe; link.target = "_blank"; link.rel = "noopener noreferrer";
  link.addEventListener("click", event => {
    if (!connected || !app.getHostCapabilities()?.openLinks) return;
    event.preventDefault();
    void app.openLink({ url: safe }).then(result => {
      if (result.isError) showError("Your chat could not open this link. Use the original source link in the conversation.");
    }).catch(() => showError("Your chat could not open this link. Use the original source link in the conversation."));
  });
  return link;
}
function cancelPending() { sequence++; active?.abort(); active = undefined; }
async function callTool(name: "search" | "fetch" | "run_legal_fournier_tool", args: Record<string, unknown>, append = false): Promise<void> {
  if (!connected || disposed) { showError("Interactive controls need a compatible chat host. You can still use the source links."); return; }
  if (!allowedAppCall(name, args)) { showError("Choose a published source from the results."); return; }
  cancelPending();
  const request = sequence;
  active = new AbortController();
  clearError(); setBusy(true);
  if (name === "search") status.textContent = "Finding useful guides…";
  if (name === "run_legal_fournier_tool") element("income-result").hidden = true;
  try {
    const result = await app.callServerTool({ name, arguments: args }, { signal: active.signal, timeout: 20000 });
    if (disposed || request !== sequence) return;
    displayResult(result, append);
  } catch {
    if (disposed || request !== sequence) return;
    showError("We couldn’t load that result. Try again, or use the source link in your conversation.");
    status.textContent = "The request did not complete.";
  } finally {
    if (request === sequence && !disposed) { active = undefined; setBusy(false); }
  }
}
function openCard(card: ContentCard) {
  void callTool("fetch", card.id ? { id: card.id, max_chars: 12000 } : { uri: card.uri, max_chars: 12000 });
}
function renderCards(data: Record<string, unknown>) {
  const cards = parseCards(data, verifiedVideos);
  videoSlot.replaceChildren(); selected = undefined;
  showPanel("guides"); browse.hidden = false; reader.hidden = true;
  results.replaceChildren();
  query.value = text(data.query, 500);
  for (const card of cards) {
    const section = node("article", "card");
    const top = node("div", "card-header");
    top.append(node("span", "badge", card.type === "video" ? "VIDEO" : card.type === "article" ? "ARTICLE" : "LEGAL GUIDE"));
    const label = ({ en: "English", es: "Español", fr: "Français" } as Record<string, string>)[card.language] ?? (card.type === "video" ? "Legal Fournier" : "Guide");
    top.append(node("span", "card-language", label));
    section.append(top, node("h2", "", card.title), node("p", "", card.type === "video" ? "Watch our video, then explore the related article for its published legal guidance." : card.excerpt));
    const actions = node("div", "card-actions");
    const button = node("button", "text-button", card.type === "video" ? "Watch & explore →" : "Read guide →");
    button.type = "button"; button.dataset.serverAction = "true"; button.disabled = !connected || busy;
    button.setAttribute("aria-label", `${card.type === "video" ? "View video" : "Read"}: ${card.title}`);
    button.addEventListener("click", () => openCard(card));
    actions.append(button);
    if (card.modifiedAt && readableDate(card.modifiedAt)) actions.append(node("span", "card-date", "Updated " + readableDate(card.modifiedAt)));
    else if (card.type === "video") actions.append(node("span", "card-date", "Video + article"));
    section.append(actions); results.append(section);
  }
  element("empty").hidden = cards.length > 0;
  status.textContent = cards.length ? `${cards.length} ${cards.length === 1 ? "result" : "results"}${data.query ? " for your search" : " to explore"}` : "No matches for this search.";
  const updated = readableDate(data.index_updated_at);
  element("freshness").textContent = data.index_status === "stale" ? "Index refresh delayed" : updated ? `Index synced ${updated}` : "";
}
function renderVideo(source: ContentDocument) {
  videoSlot.replaceChildren();
  const id = verifiedVideoId(source, verifiedVideos);
  if (!id) return;
  const placeholder = node("div", "video-placeholder");
  const play = node("button", "primary", "▶ Load video");
  play.type = "button";
  placeholder.append(play, node("p", "", "YouTube loads only after you choose. The video will not autoplay."));
  play.addEventListener("click", () => {
    if (disposed || selected?.id !== source.id || !verifiedVideoId(source, verifiedVideos)) return;
    const iframe = node("iframe", "video-frame");
    iframe.title = source.title;
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=0&rel=0`;
    iframe.allow = "encrypted-media; picture-in-picture; fullscreen";
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    videoSlot.replaceChildren(iframe, node("p", "video-note", "If your chat blocks playback, open the video on YouTube using the source link above."));
  }, { once: true });
  videoSlot.append(placeholder, node("p", "video-note", "Transcript unavailable. Use the related article for its published legal guidance."));
}
function renderDocument(data: Record<string, unknown>, append: boolean) {
  const source = parseDocument(data, verifiedVideos);
  if (append && selected && selected.uri !== source.uri) throw new Error("Unexpected source for next page");
  selected = source;
  if (append) {
    element("reader-text").append(document.createTextNode(source.text));
  } else {
    showPanel("guides"); browse.hidden = true; reader.hidden = false;
    element("reader-title").textContent = source.title;
    element("reader-type").textContent = source.type === "video" ? "LEGAL FOURNIER VIDEO" : source.type === "article" ? "PUBLISHED ARTICLE" : "LEGAL GUIDE";
    const date = readableDate(source.modifiedAt);
    element("reader-meta").textContent = source.type === "video" ? "Published by Legal Fournier · Spoken language not verified" : `${date ? "Article updated " + date : "Curated legal resource"}${source.indexStatus === "stale" ? " · Index refresh delayed" : ""}`;
    const sourceSlot = element("source-link"); sourceSlot.replaceChildren();
    if (source.url) { const link = externalLink(source.url, source.type === "video" ? "Open on YouTube ↗" : "Open original article ↗"); if (link) sourceSlot.append(link); }
    element("reader-text").textContent = source.type === "video" ? "" : source.text;
    const related = element("related-articles"); related.replaceChildren();
    if (source.type === "video") {
      renderVideo(source);
      for (const [index, url] of source.relatedArticleUrls.entries()) { const link = externalLink(url, `Read the related article${index ? ` ${index + 1}` : ""} ↗`); if (link) related.append(link); }
    } else videoSlot.replaceChildren();
    element("reader-title").focus({ preventScroll: true });
  }
  loadMore.hidden = source.nextOffset === null || source.type === "video";
}
function displayResult(result: unknown, append = false) {
  clearError();
  const data = parseToolData(result);
  if (typeof data.tool_id === "string") renderIncome(data);
  else if (Array.isArray(data.resources)) renderCards(data);
  else renderDocument(data, append);
}
function showPanel(panel: "guides" | "income") {
  calculator.hidden = panel !== "income";
  element("tab-guides").setAttribute("aria-pressed", String(panel === "guides"));
  element("tab-income").setAttribute("aria-pressed", String(panel === "income"));
  if (panel === "income") { videoSlot.replaceChildren(); reader.hidden = true; browse.hidden = true; }
  else { reader.hidden = true; browse.hidden = false; }
}
function renderIncome(data: Record<string, unknown>) {
  showPanel("income");
  const target = element("income-result"); target.replaceChildren(); target.hidden = false;
  if (data.tool_id !== "digital-nomad-visa-eligibility") {
    target.append(node("h2", "", "This calculator is available in the conversation."), node("p", "", "The interactive panel currently covers digital nomad income. Read the complete tool result in your conversation."));
    return;
  }
  const labels: Record<string, string> = { meets_threshold: "Income threshold met", below_threshold: "Below the income threshold", needs_more_info: "More information needed", not_assessed: "Income not assessed" };
  target.append(node("p", "eyebrow", "INCOME SCREEN"), node("h2", "", labels[text(data.numerical_status)] ?? "Review the supplied income"), node("p", "", "This result checks income only. It does not establish visa eligibility or confirm that the income evidence qualifies."));
  const numeric = record(data.numeric_result);
  if (numeric?.kind === "digital_nomad_income" && numeric.currency === "EUR") {
    const metrics = node("dl", "income-metrics");
    for (const [key, label] of [["monthly_income", "Income / month"], ["required_monthly_income", "Required / month"], ["monthly_gap", "Difference / month"]]) {
      const value = numeric[key];
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      const group = node("div"); group.append(node("dt", "", label), node("dd", "", new Intl.NumberFormat("en", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value))); metrics.append(group);
    }
    target.append(metrics);
    const from = readableDate(numeric.effective_from), to = readableDate(numeric.effective_to), reviewed = readableDate(numeric.reviewed_at);
    if (from && to) target.append(node("p", "", `Schedule: ${from}–${to}${reviewed ? `. Sources reviewed ${reviewed}.` : "."}`));
  }
  const notes = Array.isArray(data.numeric_notes) ? data.numeric_notes : [];
  if (notes.length) {
    const details = node("details"); details.append(node("summary", "", "How to read this screen"));
    const list = node("ul"); for (const note of notes.slice(0, 8)) list.append(node("li", "", text(note, 3000))); details.append(list); target.append(details);
  }
  const link = externalLink(text(data.selected_url, 2000), "Open the full digital nomad tool ↗");
  if (link) target.append(link);
}
function teardown() {
  disposed = true; connected = false; cancelPending();
  videoSlot.replaceChildren(); setBusy(false);
  status.textContent = "This view is closed. Source links remain available in your conversation.";
}
function submitSearch() {
  void callTool("search", { query: query.value.trim(), max_results: 8, ...(language.value ? { language: language.value } : {}), ...(contentType.value ? { type: contentType.value } : {}) });
}
function submitIncome() {
  clearError();
  if (!incomeForm.reportValidity()) return;
  try {
    const args = buildIncomeArguments({ amount: element<HTMLInputElement>("income-amount").value, period: element<HTMLSelectElement>("income-period").value, category: element<HTMLSelectElement>("income-category").value, familyCount: element<HTMLInputElement>("income-family").value, assessmentDate: incomeDate.value });
    void callTool("run_legal_fournier_tool", args);
  } catch (error) { showError(error instanceof Error ? error.message : "Check the supplied fields."); }
}
// Hosts commonly omit allow-forms. Explicit controls avoid a browser form
// navigation while preserving keyboard operation and native input validation.
form.addEventListener("submit", event => { event.preventDefault(); });
incomeForm.addEventListener("submit", event => { event.preventDefault(); });
element("search-button").addEventListener("click", submitSearch);
element("income-submit").addEventListener("click", submitIncome);
query.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); submitSearch(); } });
incomeForm.addEventListener("keydown", event => { if (event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); submitIncome(); } });
element("tab-guides").addEventListener("click", () => { cancelPending(); clearError(); showPanel("guides"); setBusy(false); });
element("tab-income").addEventListener("click", () => { cancelPending(); clearError(); showPanel("income"); setBusy(false); });
element("back").addEventListener("click", () => {
  cancelPending(); videoSlot.replaceChildren(); selected = undefined; clearError();
  reader.hidden = true; browse.hidden = false; setBusy(false); query.focus({ preventScroll: true });
});
loadMore.addEventListener("click", () => {
  if (selected && selected.nextOffset !== null) void callTool("fetch", { uri: selected.uri, offset: selected.nextOffset, max_chars: 12000 }, true);
});
// Install every lifecycle callback before the handshake: hosts can deliver the
// initial result immediately after ui/notifications/initialized.
app.ontoolinput = params => {
  const args = record(params.arguments) ?? {};
  if (typeof args.query === "string") query.value = args.query.slice(0, 500);
  if (["en", "es", "fr", "und", ""].includes(String(args.language ?? ""))) language.value = String(args.language ?? "");
  if (["article", "video", "resource", ""].includes(String(args.type ?? ""))) contentType.value = String(args.type ?? "");
  if (args.tool_id === "digital-nomad-visa-eligibility") {
    showPanel("income");
    const income = record(args.digital_nomad_income);
    const source = Array.isArray(income?.income_sources) && income.income_sources.length === 1 ? record(income.income_sources[0]) : null;
    if (source?.currency === "EUR" && typeof source.amount === "number") element<HTMLInputElement>("income-amount").value = String(source.amount);
    if (source && ["monthly", "annual"].includes(String(source.period))) element<HTMLSelectElement>("income-period").value = String(source.period);
    if (source && ["employment", "self_employment"].includes(String(source.category))) element<HTMLSelectElement>("income-category").value = String(source.category);
    if (Array.isArray(income?.accompanying_family)) element<HTMLInputElement>("income-family").value = String(income.accompanying_family.length);
    if (typeof income?.assessment_date === "string") incomeDate.value = income.assessment_date.slice(0, 10);
  }
};
app.ontoolresult = result => {
  if (disposed) return;
  cancelPending();
  try { displayResult(result); } catch (error) { showError(error instanceof Error ? error.message : "This result is unavailable."); }
  setBusy(false);
};
app.ontoolcancelled = () => { cancelPending(); setBusy(false); status.textContent = "Search cancelled. You can try again."; };
app.onhostcontextchanged = context => { if (context.theme === "light" || context.theme === "dark") document.documentElement.dataset.theme = context.theme; };
app.onteardown = async () => { teardown(); return {}; };
app.onclose = () => { if (!disposed) { connected = false; setBusy(false); showError("The connection closed. Reopen this view from your conversation to search again."); } };
app.onerror = () => { if (!disposed) showError("The connection was interrupted. Try your request again."); };
window.addEventListener("pagehide", () => { teardown(); void app.close(); }, { once: true });
setBusy(false);
void app.connect(undefined, { timeout: 10000 }).then(() => {
  if (disposed) return;
  connected = Boolean(app.getHostCapabilities()?.serverTools);
  const theme = app.getHostContext()?.theme;
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
  setBusy(false);
  if (!connected) showError("Your chat can display these results, but does not support interactive searching. Use the original source links.");
  else if (status.textContent === "Connecting to your conversation…") status.textContent = "Ready to explore. Search a topic to begin.";
}).catch(() => { connected = false; setBusy(false); status.textContent = "Interactive view unavailable."; showError("Open this tool in a compatible chat host. Its text response and source links remain available in the conversation."); });
