import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { isIP } from "node:net";
import express, { type Request, type Response, type NextFunction } from "express";
import { hostHeaderValidation } from "@modelcontextprotocol/express";
import { createMcpHandler, isLegacyRequest } from "@modelcontextprotocol/server";
import { NodeStreamableHTTPServerTransport, toNodeHandler, toWebRequest } from "@modelcontextprotocol/node";
import { getConfig, SERVER_NAME, SERVER_VERSION } from "./config.js";
import { createServer } from "./server.js";
import { getTelemetryRecorder, type TelemetryContext } from "./telemetry.js";
import { ApiError, publicError } from "./errors.js";
import { executeTool, REST_TOOL_ROUTES } from "./operations.js";
import { type PublicToolName } from "./schemas.js";
import { getContentIndexStatus } from "./content-index.js";

const MAX_BODY_BYTES = 100 * 1024;
export const DEFAULT_ALLOWED_ORIGINS = [
  "https://legalfournier.com", "https://www.legalfournier.com",
  "https://chatgpt.com", "https://chat.openai.com", "https://claude.ai",
] as const;
function validOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.origin === value;
  } catch { return false; }
}
function allowedOriginSet(override?: string[]): Set<string> {
  const configured = override ?? (process.env.LF_MCP_ALLOWED_ORIGINS === undefined
    ? [...DEFAULT_ALLOWED_ORIGINS] : process.env.LF_MCP_ALLOWED_ORIGINS.split(/[\s,]+/).filter(Boolean));
  if (configured.some(value => !validOrigin(value))) throw new Error("LF_MCP_ALLOWED_ORIGINS must contain exact HTTP(S) origins without paths or wildcards.");
  return new Set(configured);
}
const REST_API_PATH = "/api/spain-legal";
const REST_LEGAL_NOTICE = "Legal Fournier Spain Legal API screening responses are preliminary information for agents, not legal, tax, or filing advice. The contact-request endpoint is consequential and only submits when the user has explicitly consented to contact; do not include passport numbers, ID numbers, documents, full addresses, or sensitive personal facts.";
export interface SpainLegalRemoteOverrides {
  host?: string; port?: number; path?: string; allowedHosts?: string[]; allowedOrigins?: string[];
  maxConcurrent?: number; requestsPerMinute?: number;
}
export interface SpainLegalRemoteRuntime {
  app: express.Express; closeSessions: () => Promise<void>; endpointPath: string; healthPath: string;
}
export interface SpainLegalRemoteServer { server: HttpServer; url: URL; healthUrl: URL; close: () => Promise<void>; }
type ClientIpInfo = { ip?: string; source?: string; country?: string; proxyChain?: string };
function header(value: string | string[] | undefined): string | undefined { return Array.isArray(value) ? value[0] : value; }
function normalizeIp(value: unknown): string {
  let ip = typeof value === "string" ? value.trim() : "";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return isIP(ip) ? ip : "";
}
/** Only Nginx on loopback may supply the header it overwrites on every proxy request. */
export function getClientIpInfo(req: Pick<Request, "headers" | "socket">): ClientIpInfo {
  const peer = normalizeIp(req.socket?.remoteAddress);
  const trustedPeer = peer === "127.0.0.1" || peer === "::1";
  const verifiedIp = trustedPeer ? normalizeIp(header(req.headers["x-lf-verified-client-ip"])) : "";
  return verifiedIp ? { ip: verifiedIp, source: "verified-proxy" } : { ip: peer || undefined, source: "socket-remote-address" };
}
function boundedSetting(value: number | string | undefined, fallback: number, maximum: number): number {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? Math.min(number, maximum) : fallback;
}
function sendRestError(res: Response, error: ApiError): void {
  if (error.retryAfter) res.setHeader("Retry-After", error.retryAfter);
  res.status(error.status).json({ ok: false, error: { code: error.code, message: error.message, ...error.details }, legal_notice: REST_LEGAL_NOTICE });
}
function sendRpcError(res: Response, error: ApiError, id: unknown = null): void {
  if (error.retryAfter) res.setHeader("Retry-After", error.retryAfter);
  // -32000 is legacy-only in the 2026 revision. Transport/policy failures use
  // stable vendor codes outside the protocol-reserved server-error interval.
  const code = error.code === "INVALID_JSON" ? -32700
    : error.status === 400 ? -32602
    : error.status === 405 ? -32601
    : error.status === 500 ? -32603
    : -33000 - error.status;
  res.status(error.status).json({ jsonrpc: "2.0", error: { code, message: error.message, data: { code: error.code, ...error.details } }, id: typeof id === "string" || typeof id === "number" ? id : null });
}
function sendError(req: Request, res: Response, error: ApiError): void {
  if (res.headersSent) return;
  if (req.path.startsWith(REST_API_PATH)) sendRestError(res, error);
  else sendRpcError(res, error, req.body?.id);
}
function restBody(req: Request): unknown {
  return req.body;
}
function normalizeLegacyHandoff(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const body = input as Record<string, unknown>;
  return { ...body, blockers: body.blockers ?? body.risk_flags };
}
function summarize(name: PublicToolName, output: Record<string, unknown>): Record<string, unknown> | undefined {
  if (name === "route_to_legal_fournier_help") return { shouldEscalate: output.should_escalate, bookingUrlReturned: Boolean(output.booking_url), recommendedServiceTitle: (output.recommended_service as { title?: string })?.title };
  if (name === "create_legal_fournier_contact_request") return { leadStatus: output.lead_status, sourceSurface: output.source_surface };
  return undefined;
}

export function createRemoteApp(overrides: SpainLegalRemoteOverrides = {}): SpainLegalRemoteRuntime {
  const base = getConfig();
  const endpointPath = overrides.path ?? base.mcpPath;
  const healthPath = `${endpointPath}/healthz`;
  const telemetry = getTelemetryRecorder();
  const allowedOrigins = allowedOriginSet(overrides.allowedOrigins);
  const markProtocolFailure = () => {
    const context = telemetry.getContext();
    if (context) context.operationFailed = true;
  };
  const modernHandler = createMcpHandler(createServer, {
    legacy: "reject", maxSubscriptions: 0, maxRequestBodySize: MAX_BODY_BYTES,
    onerror: markProtocolFailure,
  });
  const serveModern = toNodeHandler({ fetch: async (request, options) => {
    const response = await modernHandler.fetch(request, options);
    if (response.status >= 400) markProtocolFailure();
    if (response.headers.get("content-type")?.includes("application/json")) {
      const message = await response.clone().json().catch(() => null) as { error?: unknown; result?: { isError?: boolean } } | null;
      if (message?.error || message?.result?.isError) markProtocolFailure();
    }
    return response;
  } }, { maxRequestBodySize: MAX_BODY_BYTES, onerror: markProtocolFailure });
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", false);
  const maxConcurrent = boundedSetting(overrides.maxConcurrent ?? process.env.LF_MCP_MAX_CONCURRENT, 32, 256);
  const requestsPerMinute = boundedSetting(overrides.requestsPerMinute ?? process.env.LF_MCP_REQUESTS_PER_MINUTE, 120, 10000);
  const buckets = new Map<string, { count: number; until: number }>();
  const activeRuntimes = new Set<() => Promise<void>>();
  let activeRequests = 0;
  let shuttingDown = false;
  let lastBucketSweep = 0;
  const healthRoutes = new Set(["/healthz", healthPath, `${REST_API_PATH}/healthz`, "/readyz", `${endpointPath}/readyz`, `${REST_API_PATH}/readyz`]);

  // Install tracing and capacity control before parsing or host validation, so rejected requests count too.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    const ip = getClientIpInfo(req);
    const context = telemetry.createContext({ sessionId: header(req.headers["mcp-session-id"]) ?? header(req.headers["x-session-id"]), userAgent: header(req.headers["user-agent"]), ip: ip.ip, ipSource: ip.source, method: req.method, path: req.path });
    res.locals.telemetryContext = context;
    let active = false;
    let recorded = false;
    const finish = () => {
      if (recorded) return;
      recorded = true;
      if (active) activeRequests--;
      const statusCode = res.writableFinished ? res.statusCode : 499;
      void telemetry.recordHttpRequest({ requestId: context.requestId, sessionId: context.sessionId, clientType: context.clientType, clientKey: context.clientKey, userAgent: context.userAgent, ipHash: context.ipHash, method: context.method, path: context.path, rpcMethod: context.rpcMethod, rpcTarget: context.rpcTarget, statusCode, durationMs: Date.now() - startedAt, success: statusCode < 400 && !context.operationFailed });
    };
    res.once("finish", finish);
    res.once("close", finish);
    if (healthRoutes.has(req.path) || req.method === "OPTIONS") { next(); return; }
    if (shuttingDown || activeRequests >= maxConcurrent) {
      sendError(req, res, new ApiError("SERVICE_BUSY", "The service is busy. Retry shortly.", 503, undefined, 2)); return;
    }
    const now = Date.now();
    if (now - lastBucketSweep > 60000) {
      for (const [key, bucket] of buckets) if (bucket.until <= now) buckets.delete(key);
      lastBucketSweep = now;
    }
    const key = ip.ip ?? "unknown";
    let bucket = buckets.get(key);
    if (!bucket || bucket.until <= now) {
      if (buckets.size >= 10000) {
        sendError(req, res, new ApiError("SERVICE_BUSY", "The service is busy. Retry shortly.", 503, undefined, 2)); return;
      }
      bucket = { count: 0, until: now + 60000 }; buckets.set(key, bucket);
    }
    if (++bucket.count > requestsPerMinute) {
      sendError(req, res, new ApiError("RATE_LIMITED", "Too many requests. Retry after the indicated delay.", 429, undefined, Math.ceil((bucket.until - now) / 1000))); return;
    }
    activeRequests++; active = true;
    next();
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Origin is an exact security boundary. Validate it before emitting any CORS grant.
    res.vary("Origin");
    res.setHeader("Cache-Control", "no-store");
    const origin = req.headers.origin;
    if (origin !== undefined && (typeof origin !== "string" || !validOrigin(origin) || !allowedOrigins.has(origin))) {
      sendError(req, res, new ApiError("ORIGIN_NOT_ALLOWED", "This Origin is not allowed.", 403)); return;
    }
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      const requestedHeaders = header(req.headers["access-control-request-headers"]) ?? "";
      const parameterHeaders = requestedHeaders.length <= 2048 ? requestedHeaders.split(",").map(value => value.trim()).filter(value => /^mcp-param-[a-z0-9-]{1,128}$/i.test(value)).slice(0, 32) : [];
      res.setHeader("Access-Control-Allow-Headers", ["Content-Type", "Accept", "Authorization", "Mcp-Session-Id", "Last-Event-ID", "MCP-Protocol-Version", "Mcp-Method", "Mcp-Name", "X-Session-Id", ...parameterHeaders].join(", "));
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      res.setHeader("Access-Control-Expose-Headers", "Retry-After, MCP-Protocol-Version");
    }
    next();
  });
  app.use(hostHeaderValidation(overrides.allowedHosts ?? base.mcpAllowedHosts));
  app.use((req, res, next) => { if (req.method === "OPTIONS") { res.status(204).end(); return; } next(); });
  app.use(express.json({ limit: MAX_BODY_BYTES, strict: true }));
  for (const path of ["/healthz", healthPath, `${REST_API_PATH}/healthz`]) {
    app.get(path, (_req, res) => res.json({ status: "ok", name: SERVER_NAME, version: SERVER_VERSION, endpointPath, telemetry: telemetry.getStatus() }));
  }
  for (const path of ["/readyz", `${endpointPath}/readyz`, `${REST_API_PATH}/readyz`]) {
    app.get(path, (_req, res) => {
      const content = getContentIndexStatus();
      const ready = !shuttingDown && content.status !== "unavailable";
      res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready", name: SERVER_NAME, version: SERVER_VERSION, active_requests: activeRequests, capacity: maxConcurrent, content, telemetry: telemetry.getStatus() });
    });
  }
  const handleRest = (name: PublicToolName, input: (req: Request) => unknown) => async (req: Request, res: Response) => {
    const context = res.locals.telemetryContext as TelemetryContext;
    context.rpcMethod = "REST"; context.rpcTarget = name;
    const type = name === "search" || name === "fetch" ? "resource_read" : "tool_call";
    const startedAt = Date.now();
    await telemetry.withContext(context, async () => {
      try {
        const result = await executeTool(name, input(req));
        await telemetry.recordOperation(type, name, { durationMs: Date.now() - startedAt, success: true, outputMeta: summarize(name, result) });
        res.json({ ok: true, result, legal_notice: REST_LEGAL_NOTICE });
      } catch (error) {
        const safe = publicError(error);
        await telemetry.recordOperation(type, name, { durationMs: Date.now() - startedAt, success: false, errorMessage: safe.code });
        sendError(req, res, safe);
      }
    });
  };
  app.get(`${REST_API_PATH}/tools`, handleRest("find_legal_fournier_tool", () => ({ include_all_tools: true, preferred_language: "en" })));
  for (const [route, name] of Object.entries(REST_TOOL_ROUTES)) {
    app.post(`${REST_API_PATH}/${route}`, handleRest(name, (req) => {
      const input = name === "explain_nie_process" && req.body === undefined ? {} : restBody(req);
      if (name === "route_to_legal_fournier_help") return normalizeLegacyHandoff(input);
      if (name === "create_legal_fournier_contact_request" && input && typeof input === "object" && !Array.isArray(input)) {
        const body = input as Record<string, unknown>;
        return { ...body, source_surface: body.source_surface ?? "openapi", tool_name: body.tool_name ?? name };
      }
      return input;
    }));
  }
  app.post(endpointPath, async (req, res) => {
    const context = res.locals.telemetryContext as TelemetryContext;
    context.rpcMethod = typeof req.body?.method === "string" ? req.body.method.slice(0, 100) : undefined;
    context.rpcTarget = typeof req.body?.params?.name === "string" ? req.body.params.name.slice(0, 260) : typeof req.body?.params?.uri === "string" ? req.body.params.uri.slice(0, 260) : undefined;
    const probe = await toWebRequest(req, req.body, { maxRequestBodySize: MAX_BODY_BYTES });
    // Use the SDK classifier so malformed modern claims cannot silently downgrade.
    if (!await isLegacyRequest(probe, req.body, { maxRequestBodySize: MAX_BODY_BYTES })) {
      try {
        await telemetry.withContext(context, async () => {
          await serveModern(req, res, req.body);
          if (context.operationFailed && !context.operationRecorded && context.rpcTarget) {
            const type = context.rpcMethod === "prompts/get" ? "prompt_call" : context.rpcMethod === "resources/read" ? "resource_read" : "tool_call";
            await telemetry.recordOperation(type, context.rpcTarget, { durationMs: 0, success: false, errorMessage: "PROTOCOL_OR_INPUT_ERROR" });
          }
        });
      } catch (error) {
        context.operationFailed = true;
        sendError(req, res, publicError(error));
      }
      return;
    }
    // Preserve the existing JSON-only, sessionless 2025 transport for old clients.
    const server = createServer({ era: "legacy" });
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    let closing = false;
    const close = async () => {
      if (closing) return; closing = true;
      activeRuntimes.delete(close);
      await Promise.allSettled([transport.close(), server.close()]);
    };
    activeRuntimes.add(close);
    const send = transport.send.bind(transport);
    transport.send = async (message, options) => {
      if ("error" in message || ("result" in message && message.result && typeof message.result === "object" && "isError" in message.result && message.result.isError)) {
        context.operationFailed = true;
      }
      await send(message, options);
    };
    transport.onerror = () => { context.operationFailed = true; };
    res.once("close", () => { void close(); });
    try {
      await telemetry.withContext(context, async () => {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        if (context.operationFailed && !context.operationRecorded && context.rpcTarget) {
          const type = context.rpcMethod === "prompts/get" ? "prompt_call" : context.rpcMethod === "resources/read" ? "resource_read" : "tool_call";
          await telemetry.recordOperation(type, context.rpcTarget, { durationMs: 0, success: false, errorMessage: "PROTOCOL_OR_INPUT_ERROR" });
        }
      });
    } catch (error) {
      context.operationFailed = true;
      sendError(req, res, publicError(error));
    } finally {
      // Cleanup remains independent from telemetry and its storage availability.
      await close();
    }
  });
  for (const method of ["get", "delete"] as const) {
    app[method](endpointPath, (req, res) => {
      res.setHeader("Allow", "POST, OPTIONS");
      sendRpcError(res, new ApiError("METHOD_NOT_ALLOWED", "This stateless MCP endpoint accepts JSON-RPC POST requests.", 405));
    });
  }
  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    const parsed = error as { type?: string };
    const safe = parsed.type === "entity.too.large" ? new ApiError("PAYLOAD_TOO_LARGE", "Request body exceeds the 100 KB limit.", 413) : parsed.type === "entity.parse.failed" ? new ApiError("INVALID_JSON", "Request body must be valid JSON.", 400) : publicError(error);
    sendError(req, res, safe);
  });
  return { app, endpointPath, healthPath, closeSessions: async () => { shuttingDown = true; await Promise.allSettled([modernHandler.close(), ...[...activeRuntimes].map((close) => close())]); await telemetry.flush(); } };
}

export async function startRemoteServer(overrides: SpainLegalRemoteOverrides = {}): Promise<SpainLegalRemoteServer> {
  const config = getConfig();
  const runtime = createRemoteApp(overrides);
  const server = createHttpServer(runtime.app);
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.setTimeout(30000, (socket) => socket.destroy());
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(overrides.port ?? config.mcpPort, overrides.host ?? config.mcpHost, () => { server.off("error", reject); resolve(); });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not determine bound address for Spain Legal remote server");
  const host = address.address === "::" ? "127.0.0.1" : address.address;
  const urlHost = host.includes(":") ? `[${host}]` : host;
  const url = new URL(`http://${urlHost}:${address.port}${runtime.endpointPath}`);
  const healthUrl = new URL(`http://${urlHost}:${address.port}${runtime.healthPath}`);
  let closed = false;
  const close = async () => {
    if (closed) return; closed = true;
    process.off("SIGTERM", shutdown); process.off("SIGINT", shutdown);
    await runtime.closeSessions();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await getTelemetryRecorder().flush();
  };
  const shutdown = () => { void close().then(() => process.exit(0), () => process.exit(1)); };
  process.on("SIGTERM", shutdown); process.on("SIGINT", shutdown);
  console.error(`${SERVER_NAME} ${SERVER_VERSION} running on ${url.toString()}`);
  return { server, url, healthUrl, close };
}
export async function runRemoteServer(): Promise<void> { await startRemoteServer(); }
