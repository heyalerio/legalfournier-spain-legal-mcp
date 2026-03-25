#!/usr/bin/env node

import { runRemoteServer } from "./remote.js";
import { runStdioServer } from "./stdio.js";

function getMode(): "remote" | "stdio" {
  const rawMode =
    process.argv[2]?.trim().toLowerCase() ??
    process.env.LF_MCP_TRANSPORT?.trim().toLowerCase() ??
    "remote";

  if (rawMode === "stdio") {
    return "stdio";
  }

  if (rawMode === "remote" || rawMode === "streamable-http") {
    return "remote";
  }

  throw new Error(`Unsupported Spain Legal transport mode: ${rawMode}`);
}

async function main(): Promise<void> {
  const mode = getMode();

  if (mode === "stdio") {
    await runStdioServer();
    return;
  }

  await runRemoteServer();
}

main().catch((error: unknown) => {
  console.error("Spain Legal server error:", error);
  process.exit(1);
});
