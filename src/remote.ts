import { randomUUID } from "node:crypto";
import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { getConfig, SERVER_NAME, SERVER_VERSION, type SpainLegalConfig } from "./config.js";
import { createServer } from "./server.js";

type SessionRuntime = {
  server: ReturnType<typeof createServer>;
  transport: StreamableHTTPServerTransport;
  close: () => Promise<void>;
};

export interface SpainLegalRemoteOverrides {
  host?: string;
  port?: number;
  path?: string;
  allowedHosts?: string[];
  corsOrigin?: string;
}

export interface SpainLegalRemoteRuntime {
  app: ReturnType<typeof createMcpExpressApp>;
  closeSessions: () => Promise<void>;
  endpointPath: string;
  healthPath: string;
}

export interface SpainLegalRemoteServer {
  server: HttpServer;
  url: URL;
  healthUrl: URL;
  close: () => Promise<void>;
}

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function applyRemoteOverrides(
  config: SpainLegalConfig,
  overrides: SpainLegalRemoteOverrides,
): SpainLegalConfig {
  return {
    ...config,
    ...(overrides.host ? { mcpHost: overrides.host } : {}),
    ...(overrides.port !== undefined ? { mcpPort: overrides.port } : {}),
    ...(overrides.path ? { mcpPath: overrides.path } : {}),
    ...(overrides.allowedHosts ? { mcpAllowedHosts: overrides.allowedHosts } : {}),
    ...(overrides.corsOrigin ? { mcpCorsOrigin: overrides.corsOrigin } : {}),
  };
}

async function createSessionRuntime(
  sessions: Map<string, SessionRuntime>,
): Promise<SessionRuntime> {
  const server = createServer();
  let closing = false;
  let runtime: SessionRuntime;

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      sessions.set(sessionId, runtime);
    },
  });

  const close = async () => {
    if (closing) {
      return;
    }

    closing = true;
    const sessionId = transport.sessionId;

    if (sessionId) {
      sessions.delete(sessionId);
    }

    await Promise.allSettled([transport.close(), server.close()]);
  };

  runtime = { server, transport, close };

  transport.onclose = () => {
    void close();
  };
  transport.onerror = (error) => {
    console.error("Spain Legal remote transport error:", error);
  };

  await server.connect(transport);
  return runtime;
}

function sendJsonRpcError(
  res: {
    status: (code: number) => { json: (body: unknown) => void };
  },
  statusCode: number,
  message: string,
): void {
  res.status(statusCode).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message,
    },
    id: null,
  });
}

export function createRemoteApp(
  overrides: SpainLegalRemoteOverrides = {},
): SpainLegalRemoteRuntime {
  const config = applyRemoteOverrides(getConfig(), overrides);
  const app = createMcpExpressApp({
    host: config.mcpHost,
    allowedHosts: config.mcpAllowedHosts,
  });
  const sessions = new Map<string, SessionRuntime>();
  const healthPath = `${config.mcpPath}/healthz`;

  app.disable("x-powered-by");
  app.set("trust proxy", true);

  app.use((req: any, res: any, next: () => void) => {
    res.setHeader("Access-Control-Allow-Origin", config.mcpCorsOrigin);
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Accept, Mcp-Session-Id, MCP-Session-Id, Last-Event-ID, MCP-Protocol-Version",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  });

  app.get("/healthz", (_req: any, res: any) => {
    res.json({
      status: "ok",
      name: SERVER_NAME,
      version: SERVER_VERSION,
      endpointPath: config.mcpPath,
    });
  });

  app.get(healthPath, (_req: any, res: any) => {
    res.json({
      status: "ok",
      name: SERVER_NAME,
      version: SERVER_VERSION,
      endpointPath: config.mcpPath,
    });
  });

  app.post(config.mcpPath, async (req: any, res: any) => {
    const sessionId = getHeaderValue(req.headers["mcp-session-id"]);
    let runtime = sessionId ? sessions.get(sessionId) : undefined;

    try {
      if (!runtime && !sessionId && isInitializeRequest(req.body)) {
        runtime = await createSessionRuntime(sessions);

        try {
          await runtime.transport.handleRequest(req, res, req.body);
        } catch (error) {
          await runtime.close();
          throw error;
        }

        return;
      }

      if (!sessionId) {
        sendJsonRpcError(
          res,
          400,
          "Bad Request: no MCP session ID was provided for a non-initialize request.",
        );
        return;
      }

      if (!runtime) {
        sendJsonRpcError(res, 404, `Session ${sessionId} not found.`);
        return;
      }

      await runtime.transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Spain Legal remote request error:", error);

      if (!res.headersSent) {
        sendJsonRpcError(res, 500, `Internal server error: ${toErrorMessage(error)}`);
      }
    }
  });

  app.get(config.mcpPath, async (req: any, res: any) => {
    const sessionId = getHeaderValue(req.headers["mcp-session-id"]);

    if (!sessionId) {
      res.status(400).send("Missing MCP session ID");
      return;
    }

    const runtime = sessions.get(sessionId);

    if (!runtime) {
      res.status(404).send("Unknown MCP session");
      return;
    }

    try {
      await runtime.transport.handleRequest(req, res);
    } catch (error) {
      console.error("Spain Legal remote SSE error:", error);

      if (!res.headersSent) {
        res.status(500).send(`Internal server error: ${toErrorMessage(error)}`);
      }
    }
  });

  app.delete(config.mcpPath, async (req: any, res: any) => {
    const sessionId = getHeaderValue(req.headers["mcp-session-id"]);

    if (!sessionId) {
      res.status(400).send("Missing MCP session ID");
      return;
    }

    const runtime = sessions.get(sessionId);

    if (!runtime) {
      res.status(404).send("Unknown MCP session");
      return;
    }

    try {
      await runtime.transport.handleRequest(req, res);
    } catch (error) {
      console.error("Spain Legal remote session shutdown error:", error);

      if (!res.headersSent) {
        res.status(500).send(`Internal server error: ${toErrorMessage(error)}`);
      }
    }
  });

  return {
    app,
    endpointPath: config.mcpPath,
    healthPath,
    closeSessions: async () => {
      await Promise.all([...sessions.values()].map((runtime) => runtime.close()));
    },
  };
}

export async function startRemoteServer(
  overrides: SpainLegalRemoteOverrides = {},
): Promise<SpainLegalRemoteServer> {
  const config = applyRemoteOverrides(getConfig(), overrides);
  const runtime = createRemoteApp(overrides);
  const server = createHttpServer(runtime.app);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.mcpPort, config.mcpHost, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Could not determine bound address for Spain Legal remote server");
  }

  const host = address.address === "::" ? "127.0.0.1" : address.address;
  const url = new URL(`http://${host}:${address.port}${runtime.endpointPath}`);
  const healthUrl = new URL(`http://${host}:${address.port}${runtime.healthPath}`);

  let closed = false;
  const close = async () => {
    if (closed) {
      return;
    }

    closed = true;
    process.off("SIGTERM", shutdown);
    process.off("SIGINT", shutdown);
    await runtime.closeSessions();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  };

  const shutdown = () => {
    void close().then(
      () => process.exit(0),
      (error) => {
        console.error("Spain Legal remote shutdown error:", error);
        process.exit(1);
      },
    );
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  console.error(`${SERVER_NAME} ${SERVER_VERSION} running on ${url.toString()}`);

  return {
    server,
    url,
    healthUrl,
    close,
  };
}

export async function runRemoteServer(): Promise<void> {
  await startRemoteServer();
}
