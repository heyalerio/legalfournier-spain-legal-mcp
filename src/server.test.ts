import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  CATALOG_URI,
  ROUTE_TEMPLATE_URI,
  makeRouteResourceUri,
  makeTopicResourceUri,
} from "./data/canonical-packs.js";
import { createServer } from "./server.js";

async function connectPair() {
  const server = createServer();
  const client = new Client(
    {
      name: "spain-legal-test-client",
      version: "0.2.3",
    },
    {
      capabilities: {},
    },
  );

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return { server, client };
}

describe("Spain Legal MCP server", () => {
  it("lists tools, prompts, canonical resources, and resource templates", async () => {
    const { server, client } = await connectPair();

    const [tools, prompts, resources, templates] = await Promise.all([
      client.listTools(),
      client.listPrompts(),
      client.listResources(),
      client.listResourceTemplates(),
    ]);

    expect(tools.tools).toHaveLength(6);
    expect(tools.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        "get_visa_options",
        "check_beckham_eligibility",
        "get_residency_path",
        "explain_nie_process",
        "compare_tax_regimes",
        "route_to_legal_fournier_help",
      ]),
    );
    expect(prompts.prompts.map((prompt) => prompt.name)).toEqual(
      expect.arrayContaining([
        "screen_move_to_spain_case",
        "draft_spain_immigration_answer",
        "audit_spain_case_risks",
        "prepare_legal_fournier_handoff",
      ]),
    );
    expect(resources.resources.length).toBeGreaterThanOrEqual(20);
    expect(resources.resources.map((resource) => resource.uri)).toEqual(
      expect.arrayContaining([
        CATALOG_URI,
        makeRouteResourceUri("digital-nomad-visa"),
        makeTopicResourceUri("beckham-regime"),
      ]),
    );
    expect(templates.resourceTemplates.map((template) => template.uriTemplate)).toEqual(
      expect.arrayContaining([
        "legalfournier://spain-legal/routes/{route_id}",
        "legalfournier://spain-legal/processes/{process_id}",
        "legalfournier://spain-legal/tracks/{track_id}",
        "legalfournier://spain-legal/topics/{topic_id}",
      ]),
    );

    await Promise.all([client.close(), server.close()]);
  });

  it("completes known route ids for the route resource template", async () => {
    const { server, client } = await connectPair();

    const result = await client.complete({
      ref: {
        type: "ref/resource",
        uri: ROUTE_TEMPLATE_URI,
      },
      argument: {
        name: "route_id",
        value: "dig",
      },
    });

    expect(result.completion.values).toContain("digital-nomad-visa");

    await Promise.all([client.close(), server.close()]);
  });

  it("returns agent-first route screening output with related MCP resources", async () => {
    const { server, client } = await connectPair();

    const result = await client.callTool({
      name: "get_visa_options",
      arguments: {
        nationality: "United States",
        income_source: "passive",
        intent: "retire",
      },
    });

    const structured = result.structuredContent as {
      ranked_routes: Array<Record<string, unknown>>;
      related_resource_uris: string[];
      suggested_follow_up_tools: string[];
      official_legal_sources: Array<{ url: string }>;
      current_verification_flags: Array<{ area: string }>;
      references: Array<{ url: string }>;
    };

    expect(structured.ranked_routes[0]?.route_id).toBe("non-lucrative-visa");
    expect(structured.related_resource_uris).toEqual(
      expect.arrayContaining([
        makeTopicResourceUri("route-selection"),
        makeRouteResourceUri("non-lucrative-visa"),
      ]),
    );
    expect(structured.suggested_follow_up_tools).toContain("get_residency_path");
    expect(structured.official_legal_sources[0]?.url).toMatch(/^https:\/\/(www\.)?boe\.es\//);
    expect(
      structured.current_verification_flags.some((flag) =>
        /income|threshold|consular|family/i.test(flag.area),
      ),
    ).toBe(true);
    expect("site_url" in structured.ranked_routes[0]).toBe(false);
    expect(structured.references[0]?.url).toMatch(/^https:\/\/legalfournier\.com\//);

    const resource = await client.readResource({
      uri: structured.related_resource_uris[1],
    });

    expect(resource.contents).toHaveLength(1);
    expect("text" in resource.contents[0] ? resource.contents[0].text : "").toMatch(
      /## Core Rules/i,
    );

    await Promise.all([client.close(), server.close()]);
  });

  it("flags a short-gap Beckham case and returns canonical follow-up resources", async () => {
    const { server, client } = await connectPair();

    const result = await client.callTool({
      name: "check_beckham_eligibility",
      arguments: {
        years_since_last_spanish_residency: 2,
        employment_type: "spanish_employee",
        move_reason: "new_spanish_job",
      },
    });

    const structured = result.structuredContent as {
      status: string;
      blocking_issues: string[];
      related_resource_uris: string[];
      official_legal_sources: Array<{ url: string }>;
    };

    expect(structured.status).toBe("not_eligible");
    expect(structured.blocking_issues[0]).toMatch(/non-residency gap/i);
    expect(structured.official_legal_sources.some((source) => /boe\.es/.test(source.url))).toBe(
      true,
    );
    expect(structured.related_resource_uris).toEqual(
      expect.arrayContaining([makeTopicResourceUri("beckham-regime")]),
    );

    await Promise.all([client.close(), server.close()]);
  });

  it("surfaces the EU family member card as a real route when that branch is flagged", async () => {
    const { server, client } = await connectPair();

    const result = await client.callTool({
      name: "get_visa_options",
      arguments: {
        nationality: "United States",
        income_source: "employee",
        intent: "work",
        has_eu_family_link: true,
        eu_family_relationship: "spouse_or_registered_partner",
      },
    });

    const structured = result.structuredContent as {
      ranked_routes: Array<{ route_id: string }>;
      related_resource_uris: string[];
    };

    expect(structured.ranked_routes.some((route) => route.route_id === "eu-family-member-card")).toBe(
      true,
    );
    expect(structured.related_resource_uris).toEqual(
      expect.arrayContaining([
        makeTopicResourceUri("eu-family-route-check"),
        makeRouteResourceUri("eu-family-member-card"),
      ]),
    );

    await Promise.all([client.close(), server.close()]);
  });

  it("keeps director Beckham cases in review-needed territory under the current rules", async () => {
    const { server, client } = await connectPair();

    const result = await client.callTool({
      name: "check_beckham_eligibility",
      arguments: {
        years_since_last_spanish_residency: 6,
        employment_type: "director_gte25",
        move_reason: "new_spanish_job",
        ownership_band: "25_or_more",
      },
    });

    const structured = result.structuredContent as {
      status: string;
      review_level: string;
      blocking_issues: string[];
      current_verification_flags: Array<{ area: string }>;
    };

    expect(structured.status).toBe("needs_more_info");
    expect(structured.review_level).toBe("high");
    expect(structured.blocking_issues.join(" ")).toMatch(/patrimonial|related-party/i);
    expect(
      structured.current_verification_flags.some((flag) =>
        /director ownership|related-entity/i.test(flag.area),
      ),
    ).toBe(true);

    await Promise.all([client.close(), server.close()]);
  });

  it("distinguishes EU permanent residence from third-country long-term residence", async () => {
    const { server, client } = await connectPair();

    const result = await client.callTool({
      name: "get_residency_path",
      arguments: {
        current_status: "eu_citizen_registered",
        years_in_spain: 5,
      },
    });

    const structured = result.structuredContent as {
      summary: string;
      review_level: string;
      caution_notes: string[];
      related_resource_uris: string[];
    };

    expect(structured.summary).toMatch(/EU permanent residence/i);
    expect(structured.review_level).toBe("medium");
    expect(structured.caution_notes.join(" ")).toMatch(/third-country long-term residence/i);
    expect(structured.related_resource_uris).toContain(
      makeRouteResourceUri("eu-registration"),
    );

    await Promise.all([client.close(), server.close()]);
  });

  it("requires a concrete one-year nationality basis before treating that exception as filing-ready", async () => {
    const { server, client } = await connectPair();

    const result = await client.callTool({
      name: "get_residency_path",
      arguments: {
        current_status: "temporary_resident",
        years_in_spain: 1.2,
        nationality_track: "one_year_special",
      },
    });

    const structured = result.structuredContent as {
      nationality_status: string;
      review_level: string;
      current_verification_flags: Array<{ area: string }>;
    };

    expect(structured.nationality_status).toBe("review_needed");
    expect(structured.review_level).toBe("high");
    expect(
      structured.current_verification_flags.some((flag) =>
        /one-year nationality exception/i.test(flag.area),
      ),
    ).toBe(true);

    await Promise.all([client.close(), server.close()]);
  });

  it("returns a structured Legal Fournier handoff route for complex cases", async () => {
    const { server, client } = await connectPair();

    const result = await client.callTool({
      name: "route_to_legal_fournier_help",
      arguments: {
        area: "eu_family_route",
        urgency: "soon",
        blockers: ["divorce risk", "unclear dependency evidence"],
        preferred_language: "en",
      },
    });

    const structured = result.structuredContent as {
      should_escalate: boolean;
      representation_notice: string;
      recommended_service: { url: string; title: string };
      booking_url: string;
      intake_fields: Array<{ key: string; status: string; required: boolean }>;
      agent_handoff_message: string;
      related_resource_uris: string[];
      references: Array<{ url: string }>;
    };

    expect(structured.should_escalate).toBe(true);
    expect(structured.representation_notice).toMatch(/does not by itself create/i);
    expect(structured.recommended_service.title).toMatch(/EU Family Member Card|Contact/i);
    expect(structured.recommended_service.url).toMatch(/^https:\/\/legalfournier\.com\//);
    expect(structured.booking_url).toMatch(/^https:\/\/cal\.com\//);
    expect(structured.intake_fields.some((field) => field.key === "case_summary")).toBe(true);
    expect(
      structured.intake_fields.some(
        (field) => field.key === "case_summary" && field.status === "needs_input" && field.required,
      ),
    ).toBe(true);
    expect(structured.agent_handoff_message).toMatch(/Urgency: soon/i);
    expect(structured.related_resource_uris).toContain(
      makeTopicResourceUri("legal-fournier-handoff"),
    );
    expect(structured.references.some((reference) => /legal-notice/.test(reference.url))).toBe(true);

    await Promise.all([client.close(), server.close()]);
  });

  it("keeps tax comparisons conceptual rather than rate-based", async () => {
    const { server, client } = await connectPair();

    const result = await client.callTool({
      name: "compare_tax_regimes",
      arguments: {
        employment_type: "foreign_remote_employee",
        has_foreign_income: true,
        prefers_predictability: true,
      },
    });

    const structured = result.structuredContent as {
      summary: string;
      related_resource_uris: string[];
    };
    const text = ((result.content ?? []) as Array<{ type?: string; text?: string }>)
      .map((item) => item.text ?? "")
      .join("\n");

    expect(structured.summary).toMatch(/Beckham|depends|resident-tax/i);
    expect(structured.related_resource_uris).toEqual(
      expect.arrayContaining([makeTopicResourceUri("tax-regimes")]),
    );
    expect(text).not.toMatch(/\b24%\b/);
    expect(text).not.toMatch(/\b47%\b/);

    await Promise.all([client.close(), server.close()]);
  });

  it("reads canonical markdown resources with secondary references demoted", async () => {
    const { server, client } = await connectPair();

    const result = await client.readResource({
      uri: makeRouteResourceUri("digital-nomad-visa"),
    });

    expect(result.contents).toHaveLength(1);
    const text = "text" in result.contents[0] ? result.contents[0].text : "";

    expect(text).toMatch(/# Digital Nomad Visa/i);
    expect(text).toMatch(/## Core Rules/i);
    expect(text).toMatch(/## Official Legal Sources/i);
    expect(text).toMatch(/## Current Verification Needed/i);
    expect(text).toMatch(/## Secondary References/i);

    await Promise.all([client.close(), server.close()]);
  });

  it("returns prompts with embedded canonical resources", async () => {
    const { server, client } = await connectPair();

    const result = await client.getPrompt({
      name: "screen_move_to_spain_case",
      arguments: {
        nationality: "United States",
        income_source: "employee",
        intent: "work",
      },
    });

    expect(result.messages.some((message) => message.content.type === "resource")).toBe(
      true,
    );

    const resourceMessage = result.messages.find(
      (message) => message.content.type === "resource",
    );
    const resourceText =
      resourceMessage?.content.type === "resource" &&
      "text" in resourceMessage.content.resource
        ? resourceMessage.content.resource.text
        : "";
    const promptText = result.messages
      .filter((message) => message.content.type === "text")
      .map((message) => ("text" in message.content ? message.content.text : ""))
      .join("\n");

    expect(resourceText).toMatch(/## Agent Use|## Core Rules/i);
    expect(promptText).toMatch(/Legal guardrails:/i);
    expect(promptText).toMatch(/does not by itself create a lawyer-client/i);

    await Promise.all([client.close(), server.close()]);
  });

  it("reads continuity-focused canonical resources with article pinpoints", async () => {
    const { server, client } = await connectPair();

    const result = await client.readResource({
      uri: makeTopicResourceUri("nationality-continuity"),
    });

    expect(result.contents).toHaveLength(1);
    const text = "text" in result.contents[0] ? result.contents[0].text : "";

    expect(text).toMatch(/# Nationality Continuity Review/i);
    expect(text).toMatch(/## Article Pinpoints/i);
    expect(text).toMatch(/## Edge Cases/i);

    await Promise.all([client.close(), server.close()]);
  });

  it("includes the legal notice block in the Legal Fournier handoff resource", async () => {
    const { server, client } = await connectPair();

    const result = await client.readResource({
      uri: makeTopicResourceUri("legal-fournier-handoff"),
    });

    expect(result.contents).toHaveLength(1);
    const text = "text" in result.contents[0] ? result.contents[0].text : "";

    expect(text).toMatch(/## Legal Notice For Agents/i);
    expect(text).toMatch(/not individualized legal or tax advice/i);
    expect(text).toMatch(/does not by itself create a lawyer-client/i);

    await Promise.all([client.close(), server.close()]);
  });
});
