import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, appendFile, writeFile, rename, readdir, unlink, stat } from "node:fs/promises";
import path from "node:path";
import { getConfig } from "./config.js";

export type ClientType =
  | "mcp_client"
  | "registry_monitor"
  | "crawler_probe"
  | "browser_like"
  | "unknown"
  | "stdio";

export interface TelemetryContext {
  requestId: string;
  sessionId?: string;
  clientType: ClientType;
  clientKey: string;
  userAgent: string;
  ipHash: string;
  clientIp?: string;
  clientIpSource?: string;
  clientCountry?: string;
  proxyChain?: string;
  method: string;
  path: string;
  rpcMethod?: string;
  rpcTarget?: string;
  operationFailed?: boolean;
  operationRecorded?: boolean;
}

interface TelemetryEventBase {
  id: string;
  timestamp: string;
  date: string;
  sessionId?: string;
  clientType: ClientType;
  clientKey: string;
  userAgent: string;
  ipHash: string;
}

interface HttpRequestEvent extends TelemetryEventBase {
  type: "http_request";
  requestId: string;
  method: string;
  path: string;
  rpcMethod?: string;
  rpcTarget?: string;
  statusCode: number;
  durationMs: number;
  success: boolean;
}

interface OperationEvent extends TelemetryEventBase {
  type: "tool_call" | "prompt_call" | "resource_read";
  requestId?: string;
  name: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  outputMeta?: Record<string, unknown>;
}

type TelemetryEvent = HttpRequestEvent | OperationEvent;

interface CounterMap {
  [key: string]: number;
}

interface OperationSummary {
  total: number;
  success: number;
  error: number;
}

interface DailySummary {
  date: string;
  updatedAt: string;
  totals: {
    httpRequests: number;
    httpSuccess: number;
    httpErrors: number;
    toolCalls: number;
    toolSuccess: number;
    toolErrors: number;
    promptCalls: number;
    promptSuccess: number;
    promptErrors: number;
    resourceReads: number;
    resourceSuccess: number;
    resourceErrors: number;
  };
  clients: {
    uniqueClientCount: number;
    uniqueSessionCount: number;
    byType: CounterMap;
    byUserAgent: CounterMap;
  };
  rpcMethods: CounterMap;
  httpStatuses: CounterMap;
  tools: Record<string, OperationSummary>;
  prompts: Record<string, OperationSummary>;
  resources: Record<string, OperationSummary>;
  usefulnessProxies: {
    successfulOperationResponses: number;
    sessionsWithSuccessfulOperations: number;
    sessionsWithErrors: number;
    sessionsWithConversionSignals: number;
  };
  businessValueProxies: {
    routeToLegalFournierHelpCalls: number;
    escalationsRecommended: number;
    bookingUrlReturned: number;
    recommendedServiceTitles: CounterMap;
  };
  internal: {
    uniqueClientKeys: string[];
    uniqueSessionIds: string[];
    successfulSessionIds: string[];
    errorSessionIds: string[];
    conversionSessionIds: string[];
  };
}

function makeEmptySummary(date: string): DailySummary {
  return {
    date,
    updatedAt: new Date().toISOString(),
    totals: {
      httpRequests: 0,
      httpSuccess: 0,
      httpErrors: 0,
      toolCalls: 0,
      toolSuccess: 0,
      toolErrors: 0,
      promptCalls: 0,
      promptSuccess: 0,
      promptErrors: 0,
      resourceReads: 0,
      resourceSuccess: 0,
      resourceErrors: 0,
    },
    clients: {
      uniqueClientCount: 0,
      uniqueSessionCount: 0,
      byType: {},
      byUserAgent: {},
    },
    rpcMethods: {},
    httpStatuses: {},
    tools: {},
    prompts: {},
    resources: {},
    usefulnessProxies: {
      successfulOperationResponses: 0,
      sessionsWithSuccessfulOperations: 0,
      sessionsWithErrors: 0,
      sessionsWithConversionSignals: 0,
    },
    businessValueProxies: {
      routeToLegalFournierHelpCalls: 0,
      escalationsRecommended: 0,
      bookingUrlReturned: 0,
      recommendedServiceTitles: {},
    },
    internal: {
      uniqueClientKeys: [],
      uniqueSessionIds: [],
      successfulSessionIds: [],
      errorSessionIds: [],
      conversionSessionIds: [],
    },
  };
}

function increment(map: CounterMap, key: string, amount = 1): void {
  key = boundedKey(map, key);
  const current = Object.hasOwn(map, key) ? map[key] : 0;
  Object.defineProperty(map, key, { value: current + amount, enumerable: true, configurable: true, writable: true });
}

function normalizeUserAgent(userAgent: string): string {
  const trimmed = userAgent.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 160) : "unknown";
}

function makeHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function inferClientType(userAgent: string): ClientType {
  const normalized = userAgent.toLowerCase();

  if (!normalized) {
    return "unknown";
  }

  if (
    normalized.includes("yellowmcp") ||
    normalized.includes("chiark") ||
    normalized.includes("modelcontextprotocol.io") ||
    normalized.includes("mcp.so") ||
    normalized.includes("mcpmarket")
  ) {
    return "registry_monitor";
  }

  if (
    normalized.includes("gptbot") ||
    normalized.includes("googlebot") ||
    normalized.includes("duckassistbot") ||
    normalized.includes("tacarabot") ||
    normalized.includes("crawler") ||
    normalized.includes("bot/")
  ) {
    return "crawler_probe";
  }

  if (
    normalized === "node" ||
    normalized.includes("node/") ||
    normalized.includes("deno") ||
    normalized.includes("mcp")
  ) {
    return "mcp_client";
  }

  if (normalized.includes("mozilla/5.0")) {
    return "browser_like";
  }

  return "unknown";
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getOperationBucket(
  event: OperationEvent,
  summary: DailySummary,
): Record<string, OperationSummary> {
  if (event.type === "tool_call") {
    return summary.tools;
  }

  if (event.type === "prompt_call") {
    return summary.prompts;
  }

  return summary.resources;
}

const MAX_DIMENSIONS = 1000;
const MAX_UNIQUE = 10000;
function boundedKey(map: object, value: string): string {
  const key = String(value ?? "unknown").slice(0, 260);
  return Object.hasOwn(map, key) || Object.keys(map).length < MAX_DIMENSIONS ? key : "__other__";
}
function addUnique(values: string[], value: string): void {
  if (values.length < MAX_UNIQUE && !values.includes(value)) values.push(value);
}
function getOrCreateOperationSummary(map: Record<string, OperationSummary>, name: string): OperationSummary {
  name = boundedKey(map, name);
  if (!Object.hasOwn(map, name)) {
    Object.defineProperty(map, name, { value: { total: 0, success: 0, error: 0 }, enumerable: true, configurable: true, writable: true });
  }
  return map[name];
}

export class TelemetryRecorder {
  private readonly storage = new AsyncLocalStorage<TelemetryContext>();
  private readonly telemetryRoot: string;
  private readonly enabled: boolean;
  private readonly summaries = new Map<string, DailySummary>();
  private writeQueue: Promise<void> = Promise.resolve();
  private pending = 0;
  private dropped = 0;
  private failures = 0;
  private degraded = false;
  private lastWarning = 0;
  private lastSummaryWrite = 0;
  private lastRetentionDate = "";
  private readonly dirtyDates = new Set<string>();
  private readonly maxQueue: number;
  private readonly retentionDays: number;

  constructor(options?: { enabled?: boolean; telemetryDir?: string; maxQueue?: number; retentionDays?: number }) {
    const config = getConfig();
    this.enabled = options?.enabled ?? config.telemetryEnabled;
    this.maxQueue = Math.max(1, Math.min(options?.maxQueue ?? 1000, 10000));
    this.retentionDays = Math.max(1, Math.min(options?.retentionDays ?? 30, 365));
    this.telemetryRoot = path.resolve(
      process.cwd(),
      options?.telemetryDir ?? config.telemetryDir,
    );
  }

  getContext(): TelemetryContext | undefined {
    return this.storage.getStore();
  }

  withContext<T>(context: TelemetryContext, fn: () => Promise<T>): Promise<T> {
    return this.storage.run(context, fn);
  }

  createContext(input: {
    sessionId?: string;
    userAgent?: string;
    ip?: string;
    ipSource?: string;
    clientCountry?: string;
    proxyChain?: string;
    method: string;
    path: string;
    rpcMethod?: string;
    rpcTarget?: string;
  }): TelemetryContext {
    const userAgent = normalizeUserAgent(input.userAgent ?? "");
    const ipHash = makeHash(input.ip ?? "unknown");
    const clientKey = makeHash(`${ipHash}:${userAgent}`);

    return {
      requestId: randomUUID(),
      sessionId: input.sessionId?.slice(0, 160),
      clientType: inferClientType(userAgent),
      clientKey,
      userAgent,
      ipHash,
      clientIp: input.ip,
      clientIpSource: input.ipSource,
      clientCountry: input.clientCountry,
      proxyChain: input.proxyChain?.slice(0, 500),
      method: input.method,
      path: input.path.slice(0, 300),
      rpcMethod: input.rpcMethod?.slice(0, 100),
      rpcTarget: input.rpcTarget?.slice(0, 260),
    };
  }

  async recordHttpRequest(
    event: Omit<HttpRequestEvent, "id" | "timestamp" | "date" | "type">,
  ): Promise<void> {
    await this.enqueue({
      ...event,
      type: "http_request",
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      date: getTodayIsoDate(),
    });
  }

  async recordOperation(
    type: OperationEvent["type"],
    name: string,
    input: {
      durationMs: number;
      success: boolean;
      errorMessage?: string;
      outputMeta?: Record<string, unknown>;
    },
  ): Promise<void> {
    const context = this.getContext();
    if (context) {
      context.operationRecorded = true;
      if (!input.success) context.operationFailed = true;
    }
    const baseContext = context ?? {
      requestId: undefined,
      sessionId: undefined,
      clientType: "stdio" as const,
      clientKey: "stdio",
      userAgent: "stdio",
      ipHash: "stdio",
    };

    await this.enqueue({
      type,
      name,
      requestId: baseContext.requestId,
      sessionId: baseContext.sessionId,
      clientType: baseContext.clientType,
      clientKey: baseContext.clientKey,
      userAgent: baseContext.userAgent,
      ipHash: baseContext.ipHash,
      durationMs: input.durationMs,
      success: input.success,
      errorMessage: input.errorMessage,
      outputMeta: input.outputMeta,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      date: getTodayIsoDate(),
    });
  }

  getStatus(): { enabled: boolean; status: string; pending: number; dropped: number; write_failures: number; retention_days: number; unique_counts_capped_at: number } {
    return { enabled: this.enabled, status: !this.enabled ? "disabled" : this.degraded ? "degraded" : "ok", pending: this.pending, dropped: this.dropped, write_failures: this.failures, retention_days: this.retentionDays, unique_counts_capped_at: MAX_UNIQUE };
  }

  flush(): Promise<void> {
    if (!this.enabled) return Promise.resolve();
    // Keep explicit flushes in the same queue as event writes; two flush callers
    // must never race the atomic rename or clear another writer's dirty marker.
    this.writeQueue = this.writeQueue.catch(() => {}).then(async () => {
      try { await this.flushSummaries(); } catch { this.noteFailure(); }
    });
    return this.writeQueue;
  }

  private noteFailure(): void {
    this.failures++;
    this.degraded = true;
    if (Date.now() - this.lastWarning > 60000) {
      console.error("Spain Legal telemetry temporarily unavailable; serving requests continues.");
      this.lastWarning = Date.now();
    }
  }

  private enqueue(event: TelemetryEvent): Promise<void> {
    if (!this.enabled) return Promise.resolve();
    if (this.pending >= this.maxQueue) {
      this.dropped++;
      this.degraded = true;
      return Promise.resolve();
    }
    this.pending++;
    this.writeQueue = this.writeQueue.catch(() => {}).then(async () => {
      try { await this.writeEvent(event); this.degraded = false; }
      catch { this.noteFailure(); }
      finally { this.pending--; }
    });
    // Telemetry is best effort: request success never depends on storage latency.
    return Promise.resolve();
  }

  private async writeEvent(event: TelemetryEvent): Promise<void> {
    await mkdir(this.telemetryRoot, { recursive: true });
    const eventPath = path.join(this.telemetryRoot, `events-${event.date}.jsonl`);
    await appendFile(eventPath, `${JSON.stringify(event)}\n`, "utf8");
    const summary = await this.getSummary(event.date);
    this.applyEvent(summary, event);
    summary.updatedAt = new Date().toISOString();
    this.dirtyDates.add(event.date);
    if (Date.now() - this.lastSummaryWrite >= 1000) await this.flushSummaries();
    if (this.lastRetentionDate !== event.date) {
      await this.pruneExpiredFiles();
      this.lastRetentionDate = event.date;
    }
  }

  private async flushSummaries(): Promise<void> {
    for (const date of this.dirtyDates) {
      const summary = this.summaries.get(date);
      if (!summary) continue;
      const destination = path.join(this.telemetryRoot, `daily-${date}.json`);
      const temporary = `${destination}.${process.pid}.tmp`;
      await writeFile(temporary, JSON.stringify(summary, null, 2), "utf8");
      await rename(temporary, destination);
      this.dirtyDates.delete(date);
    }
    this.lastSummaryWrite = Date.now();
  }

  private async pruneExpiredFiles(): Promise<void> {
    const cutoff = new Date(Date.now() - this.retentionDays * 86400000).toISOString().slice(0, 10);
    for (const file of await readdir(this.telemetryRoot)) {
      const match = /^(?:events|daily)-(\d{4}-\d{2}-\d{2})\.(?:jsonl|json)(?:\.\d+)?(?:\.gz)?$/.exec(file);
      if (match && match[1] < cutoff) await unlink(path.join(this.telemetryRoot, file)).catch(() => {});
    }
  }

  private async getSummary(date: string): Promise<DailySummary> {
    const existing = this.summaries.get(date);

    if (existing) {
      return existing;
    }

    if (this.summaries.size >= 2) {
      await this.flushSummaries();
      const oldest = this.summaries.keys().next().value;
      if (oldest) this.summaries.delete(oldest);
    }
    const summaryPath = path.join(this.telemetryRoot, `daily-${date}.json`);

    try {
      if ((await stat(summaryPath)).size > 8 * 1024 * 1024) throw new Error("Summary exceeds memory budget");
      const raw = await readFile(summaryPath, "utf8");
      const parsed = JSON.parse(raw) as DailySummary;
      if (!parsed.totals || !parsed.clients?.byType || !parsed.internal || !parsed.tools || !parsed.usefulnessProxies || !parsed.businessValueProxies) throw new Error("Invalid summary");
      for (const key of Object.keys(parsed.internal) as Array<keyof DailySummary["internal"]>) {
        if (!Array.isArray(parsed.internal[key])) throw new Error("Invalid summary");
        parsed.internal[key] = parsed.internal[key].slice(0, MAX_UNIQUE);
      }
      for (const map of [parsed.clients.byType, parsed.clients.byUserAgent, parsed.rpcMethods, parsed.httpStatuses, parsed.tools, parsed.prompts, parsed.resources, parsed.businessValueProxies.recommendedServiceTitles]) {
        if (!map || typeof map !== "object") throw new Error("Invalid summary");
        for (const key of Object.keys(map).slice(MAX_DIMENSIONS)) delete (map as Record<string, unknown>)[key];
      }
      this.summaries.set(date, parsed);
      return parsed;
    } catch {
      const fresh = makeEmptySummary(date);
      this.summaries.set(date, fresh);
      return fresh;
    }
  }

  private applyEvent(summary: DailySummary, event: TelemetryEvent): void {
    if (!summary.internal.uniqueClientKeys.includes(event.clientKey)) {
      addUnique(summary.internal.uniqueClientKeys, event.clientKey);
      summary.clients.uniqueClientCount = summary.internal.uniqueClientKeys.length;
    }

    if (event.sessionId && !summary.internal.uniqueSessionIds.includes(event.sessionId)) {
      addUnique(summary.internal.uniqueSessionIds, event.sessionId);
      summary.clients.uniqueSessionCount = summary.internal.uniqueSessionIds.length;
    }

    increment(summary.clients.byType, event.clientType);
    increment(summary.clients.byUserAgent, event.userAgent);

    if (event.type === "http_request") {
      summary.totals.httpRequests += 1;
      increment(summary.httpStatuses, String(event.statusCode));

      if (event.rpcMethod) {
        increment(summary.rpcMethods, event.rpcMethod);
      }

      if (event.success) {
        summary.totals.httpSuccess += 1;
      } else {
        summary.totals.httpErrors += 1;
      }

      return;
    }

    const bucket = getOperationBucket(event, summary);
    const operationSummary = getOrCreateOperationSummary(bucket, event.name);
    operationSummary.total += 1;

    if (event.type === "tool_call") {
      summary.totals.toolCalls += 1;
    } else if (event.type === "prompt_call") {
      summary.totals.promptCalls += 1;
    } else {
      summary.totals.resourceReads += 1;
    }

    if (event.success) {
      operationSummary.success += 1;
      summary.usefulnessProxies.successfulOperationResponses += 1;

      if (event.type === "tool_call") {
        summary.totals.toolSuccess += 1;
      } else if (event.type === "prompt_call") {
        summary.totals.promptSuccess += 1;
      } else {
        summary.totals.resourceSuccess += 1;
      }

      if (
        event.sessionId &&
        !summary.internal.successfulSessionIds.includes(event.sessionId)
      ) {
        addUnique(summary.internal.successfulSessionIds, event.sessionId);
        summary.usefulnessProxies.sessionsWithSuccessfulOperations =
          summary.internal.successfulSessionIds.length;
      }
    } else {
      operationSummary.error += 1;

      if (event.type === "tool_call") {
        summary.totals.toolErrors += 1;
      } else if (event.type === "prompt_call") {
        summary.totals.promptErrors += 1;
      } else {
        summary.totals.resourceErrors += 1;
      }

      if (event.sessionId && !summary.internal.errorSessionIds.includes(event.sessionId)) {
        addUnique(summary.internal.errorSessionIds, event.sessionId);
        summary.usefulnessProxies.sessionsWithErrors =
          summary.internal.errorSessionIds.length;
      }
    }

    if (event.type === "tool_call" && event.name === "route_to_legal_fournier_help") {
      summary.businessValueProxies.routeToLegalFournierHelpCalls += 1;

      if (event.outputMeta?.shouldEscalate === true) {
        summary.businessValueProxies.escalationsRecommended += 1;
      }

      if (event.outputMeta?.bookingUrlReturned === true) {
        summary.businessValueProxies.bookingUrlReturned += 1;
      }

      if (typeof event.outputMeta?.recommendedServiceTitle === "string") {
        increment(
          summary.businessValueProxies.recommendedServiceTitles,
          event.outputMeta.recommendedServiceTitle,
        );
      }

      if (
        event.sessionId &&
        !summary.internal.conversionSessionIds.includes(event.sessionId)
      ) {
        addUnique(summary.internal.conversionSessionIds, event.sessionId);
        summary.usefulnessProxies.sessionsWithConversionSignals =
          summary.internal.conversionSessionIds.length;
      }
    }
  }
}

let singletonRecorder: TelemetryRecorder | undefined;

export function getTelemetryRecorder(): TelemetryRecorder {
  if (!singletonRecorder) {
    singletonRecorder = new TelemetryRecorder();
  }

  return singletonRecorder;
}

export function resetTelemetryRecorderForTests(): void {
  singletonRecorder = undefined;
}
