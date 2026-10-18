#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);

  if (index === -1 || index + 1 >= process.argv.length) {
    return undefined;
  }

  return process.argv[index + 1];
}

function getDateValue() {
  const explicit = getArgValue("--date");

  if (explicit) {
    return explicit;
  }

  return new Date().toISOString().slice(0, 10);
}

function percent(part, total) {
  if (!total) {
    return "0.0%";
  }

  return `${((part / total) * 100).toFixed(1)}%`;
}

function topEntries(record, limit = 5) {
  return Object.entries(record ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

const date = getDateValue();
const telemetryDir =
  process.env.LF_MCP_TELEMETRY_DIR ??
  path.resolve(process.cwd(), "data/telemetry");
const summaryPath = path.join(telemetryDir, `daily-${date}.json`);

let summary;

try {
  summary = JSON.parse(await readFile(summaryPath, "utf8"));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Could not read telemetry summary at ${summaryPath}: ${message}`);
  process.exit(1);
}

const toolRows = topEntries(summary.tools, 10);
const promptRows = topEntries(summary.prompts, 10);
const resourceRows = topEntries(summary.resources, 10);
const clientTypeRows = topEntries(summary.clients?.byType, 10);
const userAgentRows = topEntries(summary.clients?.byUserAgent, 10);

console.log(`Spain Legal telemetry report for ${summary.date}`);
console.log(`Updated: ${summary.updatedAt}`);
console.log("");
console.log(
  `HTTP requests: ${summary.totals.httpRequests} (${summary.totals.httpSuccess} ok, ${summary.totals.httpErrors} errors)`,
);
console.log(
  `Tools: ${summary.totals.toolCalls} (${summary.totals.toolSuccess} ok, ${summary.totals.toolErrors} errors)`,
);
console.log(
  `Prompts: ${summary.totals.promptCalls} (${summary.totals.promptSuccess} ok, ${summary.totals.promptErrors} errors)`,
);
console.log(
  `Resources: ${summary.totals.resourceReads} (${summary.totals.resourceSuccess} ok, ${summary.totals.resourceErrors} errors)`,
);
console.log(
  `Unique clients: ${summary.clients.uniqueClientCount}, unique sessions: ${summary.clients.uniqueSessionCount}`,
);
console.log("");
console.log("Client types:");

for (const [name, count] of clientTypeRows) {
  console.log(`- ${name}: ${count}`);
}

console.log("");
console.log("Top user agents:");

for (const [name, count] of userAgentRows) {
  console.log(`- ${name}: ${count}`);
}

console.log("");
console.log("Top tools:");

for (const [name, stats] of toolRows) {
  console.log(
    `- ${name}: ${stats.total} calls, ${stats.success} ok, ${stats.error} errors, success ${percent(stats.success, stats.total)}`,
  );
}

console.log("");
console.log("Top prompts:");

for (const [name, stats] of promptRows) {
  console.log(
    `- ${name}: ${stats.total} calls, ${stats.success} ok, ${stats.error} errors, success ${percent(stats.success, stats.total)}`,
  );
}

console.log("");
console.log("Top resources:");

for (const [name, stats] of resourceRows) {
  console.log(
    `- ${name}: ${stats.total} reads, ${stats.success} ok, ${stats.error} errors, success ${percent(stats.success, stats.total)}`,
  );
}

console.log("");
console.log("Business-value proxies:");
console.log(
  `- route_to_legal_fournier_help calls: ${summary.businessValueProxies.routeToLegalFournierHelpCalls}`,
);
console.log(
  `- escalations recommended: ${summary.businessValueProxies.escalationsRecommended}`,
);
console.log(
  `- booking URLs returned: ${summary.businessValueProxies.bookingUrlReturned}`,
);

const serviceRows = topEntries(summary.businessValueProxies.recommendedServiceTitles, 10);

if (serviceRows.length > 0) {
  console.log("- recommended services:");

  for (const [name, count] of serviceRows) {
    console.log(`  ${name}: ${count}`);
  }
}
