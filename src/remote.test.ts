import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { makeTopicResourceUri } from "./data/canonical-packs.js";
import { startRemoteServer } from "./remote.js";
import { getTelemetryRecorder, resetTelemetryRecorderForTests } from "./telemetry.js";

async function connectRemoteClient() {
  const remote = await startRemoteServer({
    host: "127.0.0.1",
    port: 0,
    path: "/mcp/spain-legal",
    allowedHosts: ["127.0.0.1", "localhost"],
  });
  const client = new Client(
    {
      name: "spain-legal-remote-test-client",
      version: "0.2.3",
    },
    {
      capabilities: {},
    },
  );
  const transport = new StreamableHTTPClientTransport(remote.url);

  await client.connect(transport);

  return { remote, client };
}

describe("Spain Legal remote MCP server", () => {
  it("serves MCP over streamable HTTP with health and tool access", async () => {
    const telemetryDir = await mkdtemp(path.join(os.tmpdir(), "spain-legal-telemetry-"));
    process.env.LF_MCP_TELEMETRY_DIR = telemetryDir;
    resetTelemetryRecorderForTests();

    const { remote, client } = await connectRemoteClient();

    const [
      healthResponse,
      tools,
      prompt,
      toolResult,
      handoffResult,
      publicToolResult,
      directToolResult,
    ] = await Promise.all([
        fetch(remote.healthUrl),
        client.listTools(),
        client.getPrompt({
          name: "draft_spain_immigration_answer",
          arguments: {
            topic: "tax_regimes",
            question: "Should a foreign remote employee compare Beckham to resident taxation?",
          },
        }),
        client.callTool({
          name: "compare_tax_regimes",
          arguments: {
            employment_type: "foreign_remote_employee",
            has_foreign_income: true,
            prefers_predictability: true,
          },
        }),
        client.callTool({
          name: "route_to_legal_fournier_help",
          arguments: {
            area: "beckham",
            urgency: "soon",
            blockers: ["director ownership uncertainty"],
          },
        }),
        client.callTool({
          name: "find_legal_fournier_tool",
          arguments: {
            query: "remote worker comparing digital nomad visa and Beckham Law",
            area: "remote_work",
            preferred_language: "en",
          },
        }),
        client.callTool({
          name: "run_legal_fournier_tool",
          arguments: {
            tool_id: "work-remotely-spain",
            user_goal: "Remote employee wants to work from Spain for a foreign employer.",
            facts: [
              "Foreign employer outside Spain.",
              "Expected stay is more than six months.",
              "Tax and social security need review.",
            ],
            complexity_signals: ["social security", "long stays"],
          },
        }),
      ]);

    const health = (await healthResponse.json()) as {
      status: string;
      endpointPath: string;
    };
    const structured = toolResult.structuredContent as {
      related_resource_uris: string[];
      recommendation: string;
      official_legal_sources: Array<{ url: string }>;
    };
    const handoff = handoffResult.structuredContent as {
      should_escalate: boolean;
      representation_notice: string;
      booking_url: string;
      intake_fields: Array<{ key: string }>;
      related_resource_uris: string[];
    };
    const publicTool = publicToolResult.structuredContent as {
      matched_tools: Array<{ id: string; selected_url: string }>;
      recommended_mcp_sequence: string[];
    };
    const directTool = directToolResult.structuredContent as {
      tool_id: string;
      outcome: string;
      handoff_recommended: boolean;
    };
    const promptText = prompt.messages
      .filter((message) => message.content.type === "text")
      .map((message) => ("text" in message.content ? message.content.text : ""))
      .join("\n");

    expect(health.status).toBe("ok");
    expect(health.endpointPath).toBe("/mcp/spain-legal");
    expect(tools.tools).toHaveLength(13);
    expect(prompt.messages.some((message) => message.content.type === "resource")).toBe(
      true,
    );
    expect(promptText).toMatch(/Legal guardrails:/i);
    expect(structured.recommendation).toMatch(/beckham|depends|standard_irpf/i);
    expect(structured.official_legal_sources.some((source) => /boe\.es/.test(source.url))).toBe(
      true,
    );
    expect(structured.related_resource_uris).toContain(
      makeTopicResourceUri("tax-regimes"),
    );
    expect(handoff.should_escalate).toBe(true);
    expect(handoff.representation_notice).toMatch(/does not by itself create/i);
    expect(handoff.booking_url).toBe(
      "https://legalfournier.com/en/agent-book-consultation/?utm_source=mcp&utm_medium=agent&utm_campaign=handoff",
    );
    expect(handoff.intake_fields.some((field) => field.key === "timeline_and_deadlines")).toBe(true);
    expect(handoff.related_resource_uris).toContain(
      makeTopicResourceUri("legal-fournier-handoff"),
    );
    expect(handoff.related_resource_uris).toContain(makeTopicResourceUri("tool-screeners"));
    expect(publicTool.matched_tools[0].selected_url).toMatch(/^https:\/\/legalfournier\.com\//);
    expect(publicTool.recommended_mcp_sequence[0]).toBe("find_legal_fournier_tool");
    expect(publicTool.recommended_mcp_sequence[1]).toBe("run_legal_fournier_tool");
    expect(directTool.tool_id).toBe("work-remotely-spain");
    expect(directTool.outcome).toBe("needs_human_review");
    expect(directTool.handoff_recommended).toBe(true);

    await Promise.all([client.close(), remote.close()]);
    await getTelemetryRecorder().flush();

    const summaryDate = new Date().toISOString().slice(0, 10);
    const summaryPath = path.join(telemetryDir, `daily-${summaryDate}.json`);
    const summary = JSON.parse(await readFile(summaryPath, "utf8")) as {
      totals: { toolCalls: number; promptCalls: number; httpRequests: number };
      businessValueProxies: { routeToLegalFournierHelpCalls: number; escalationsRecommended: number };
      tools: Record<string, { success: number }>;
    };

    expect(summary.totals.httpRequests).toBeGreaterThan(0);
    expect(summary.totals.toolCalls).toBeGreaterThanOrEqual(4);
    expect(summary.totals.promptCalls).toBeGreaterThanOrEqual(1);
    expect(summary.businessValueProxies.routeToLegalFournierHelpCalls).toBeGreaterThanOrEqual(1);
    expect(summary.businessValueProxies.escalationsRecommended).toBeGreaterThanOrEqual(1);
    expect(summary.tools.compare_tax_regimes.success).toBeGreaterThanOrEqual(1);
  });

  it("supports stateless registry probes without MCP session headers", async () => {
    const telemetryDir = await mkdtemp(path.join(os.tmpdir(), "spain-legal-telemetry-"));
    process.env.LF_MCP_TELEMETRY_DIR = telemetryDir;
    resetTelemetryRecorderForTests();

    const remote = await startRemoteServer({
      host: "127.0.0.1",
      port: 0,
      path: "/mcp/spain-legal",
      allowedHosts: ["127.0.0.1", "localhost"],
    });
    const headers = {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-11-25",
    };

    try {
      const initializeResponse = await fetch(remote.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-11-25",
            capabilities: {},
            clientInfo: { name: "registry-probe-test", version: "1.0.0" },
          },
        }),
      });
      const initializedResponse = await fetch(remote.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }),
      });
      const toolsResponse = await fetch(remote.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
          params: {},
        }),
      });
      const tools = (await toolsResponse.json()) as { result: { tools: unknown[] } };

      expect(initializeResponse.status).toBe(200);
      expect(initializeResponse.headers.get("mcp-session-id")).toBeNull();
      expect(initializedResponse.status).toBe(202);
      expect(toolsResponse.status).toBe(200);
      expect(tools.result.tools).toHaveLength(13);
    } finally {
      await remote.close();
      await getTelemetryRecorder().flush();
    }
  });
});
