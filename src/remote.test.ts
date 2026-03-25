import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { makeTopicResourceUri } from "./data/canonical-packs.js";
import { startRemoteServer } from "./remote.js";

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
    const { remote, client } = await connectRemoteClient();

    const [healthResponse, tools, prompt, toolResult, handoffResult] = await Promise.all([
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
    const promptText = prompt.messages
      .filter((message) => message.content.type === "text")
      .map((message) => ("text" in message.content ? message.content.text : ""))
      .join("\n");

    expect(health.status).toBe("ok");
    expect(health.endpointPath).toBe("/mcp/spain-legal");
    expect(tools.tools).toHaveLength(6);
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
    expect(handoff.booking_url).toMatch(/^https:\/\/cal\.com\//);
    expect(handoff.intake_fields.some((field) => field.key === "timeline_and_deadlines")).toBe(true);
    expect(handoff.related_resource_uris).toContain(
      makeTopicResourceUri("legal-fournier-handoff"),
    );

    await Promise.all([client.close(), remote.close()]);
  });
});
