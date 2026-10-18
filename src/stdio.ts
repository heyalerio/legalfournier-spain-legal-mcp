import { serveStdio, StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server.js";
import { SERVER_NAME, SERVER_VERSION } from "./config.js";
import { getTelemetryRecorder } from "./telemetry.js";

export async function runStdioServer(): Promise<void> {
  const handle = serveStdio(createServer, {
    legacy: "serve",
    maxSubscriptions: 0,
    transport: new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 100 * 1024 }),
    onerror: () => { console.error("MCP stdio protocol error"); },
  });
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    process.off("SIGTERM", shutdown);
    process.off("SIGINT", shutdown);
    await handle.close().catch(() => undefined);
    await getTelemetryRecorder().flush();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  // The v2 transport closes on EOF; no keepalive should pin a disconnected process.
  process.stdin.once("end", shutdown);
  console.error(`${SERVER_NAME} ${SERVER_VERSION} running on stdio`);
}
