import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { SERVER_NAME, SERVER_VERSION } from "./config.js";

export async function runStdioServer(): Promise<void> {
  process.stdin.resume();

  const server = createServer();
  const transport = new StdioServerTransport();
  const keepAlive = setInterval(() => undefined, 60_000);

  const shutdown = async (exitCode = 0) => {
    clearInterval(keepAlive);

    try {
      await server.close();
    } catch {
      // Ignore close-path failures during shutdown.
    }

    process.exit(exitCode);
  };

  process.on("SIGTERM", () => {
    void shutdown(0);
  });
  process.on("SIGINT", () => {
    void shutdown(0);
  });

  await server.connect(transport);
  console.error(`${SERVER_NAME} ${SERVER_VERSION} running on stdio`);
}
