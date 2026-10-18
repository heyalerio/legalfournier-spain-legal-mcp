import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  CATALOG_URI,
  ROUTE_TEMPLATE_URI,
  makeRouteResourceUri,
  makeTopicResourceUri,
} from "./data/canonical-packs.js";
import { SKILLS_INDEX_URI, SKILLS_TEMPLATE_URI, makeSkillResourceUri } from "./data/skills.js";
import { LEGAL_FOURNIER_TOOL_CATALOG_URI } from "./data/tool-catalog.js";
import { createServer } from "./server.js";
import { resetTelemetryRecorderForTests } from "./telemetry.js";

async function connectPair() {
  const telemetryDir = await mkdtemp(path.join(os.tmpdir(), "spain-legal-telemetry-"));
  process.env.LF_MCP_TELEMETRY_DIR = telemetryDir;
  resetTelemetryRecorderForTests();

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

    expect(tools.tools).toHaveLength(13);
    expect(tools.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        "find_legal_fournier_tool",
        "run_legal_fournier_tool",
        "get_paid_consultation_options",
        "get_paid_call_availability",
        "get_visa_options",
        "check_beckham_eligibility",
        "get_residency_path",
        "explain_nie_process",
        "compare_tax_regimes",
        "route_to_legal_fournier_help",
        "create_legal_fournier_contact_request",
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
        LEGAL_FOURNIER_TOOL_CATALOG_URI,
        SKILLS_INDEX_URI,
        makeRouteResourceUri("digital-nomad-visa"),
        makeTopicResourceUri("beckham-regime"),
        makeTopicResourceUri("tool-screeners"),
      ]),
    );
    expect(templates.resourceTemplates.map((template) => template.uriTemplate)).toEqual(
      expect.arrayContaining([
        "legalfournier://spain-legal/routes/{route_id}",
        "legalfournier://spain-legal/processes/{process_id}",
        "legalfournier://spain-legal/tracks/{track_id}",
        "legalfournier://spain-legal/topics/{topic_id}",
        "legalfournier://spain-legal/skills/{skill_id}",
      ]),
    );

    await Promise.all([client.close(), server.close()]);
  });

  it("runs a public Legal Fournier tool directly inside MCP", async () => {
    const { server, client } = await connectPair();

    const result = await client.callTool({
      name: "run_legal_fournier_tool",
      arguments: {
        tool_id: "property-buyer-cost-risk",
        user_goal: "Non-resident buyer wants to buy a resale apartment in Barcelona.",
        facts: [
          "Purchase price is 900000 EUR.",
          "Autonomous community is Catalonia and city is Barcelona.",
          "The property is resale.",
          "There is a mortgage and a deposit deadline.",
          "Buyer is non resident.",
        ],
        property: {purchase_price_eur:900000,taxable_value_eur:900000,region:"Catalonia",property_type:"resale",special_tax_regime:"general",full_ownership:true,transaction_date:"2026-10-18"},
        complexity_signals: ["deposit", "non resident buyer"],
      },
    });

    const structured = result.structuredContent as {
      tool_id: string;
      outcome: string;
      selected_url: string;
      missing_facts: string[];
      complexity_flags: string[];
      direct_screening_notes: string[];
      numeric_notes: string[];
      handoff_recommended: boolean;
      related_mcp_tools: string[];
      update_policy: string[];
    };

    expect(structured.tool_id).toBe("property-buyer-cost-risk");
    expect(structured.outcome).toBe("needs_human_review");
    expect(structured.selected_url).toBe(
      "https://legalfournier.com/en/tools/spain-property-buyer-cost-risk-calculator/?utm_source=mcp&utm_medium=agent&utm_campaign=tool_property-buyer-cost-risk",
    );
    expect(structured.missing_facts).toHaveLength(0);
    expect(structured.complexity_flags).toEqual(
      expect.arrayContaining(["deposit", "non resident buyer"]),
    );
    expect(structured.numeric_notes.some((note) => /EUR 93,000/.test(note))).toBe(true);
    expect(structured.numeric_notes.some((note) => /fees|costs/i.test(note))).toBe(true);
    expect(structured.direct_screening_notes.some((note) => /first delivery from a developer/i.test(note))).toBe(true);
    expect(structured.direct_screening_notes.some((note) => /reduced rates or relief/i.test(note))).toBe(true);
    expect(structured.handoff_recommended).toBe(true);
    expect(structured.related_mcp_tools).toContain("route_to_legal_fournier_help");
    expect(structured.update_policy.some((note) => /Volatile values/i.test(note))).toBe(true);
    expect(structured.update_policy.some((note) => /dated official.source schedules/i.test(note))).toBe(true);

    await Promise.all([client.close(), server.close()]);
  });

  it("uses current Digital Nomad Visa income constants in the MCP direct runner", async () => {
    const { server, client } = await connectPair();

    const result = await client.callTool({
      name: "run_legal_fournier_tool",
      arguments: {
        tool_id: "digital-nomad-visa-eligibility",
        user_goal: "Remote worker wants to move to Spain with spouse and two children.",
        facts: [
          "Applicant is a foreign remote employee working for a US employer.",
          "Monthly income is 5000 EUR.",
          "Family includes a spouse and two children.",
        ],
        digital_nomad_income: {
          income_sources: [{source_id:"salary",amount:5000,currency:"EUR",period:"monthly",category:"employment"}],
          accompanying_family: [{member_id:"spouse",relationship:"spouse"},{member_id:"child1",relationship:"child"},{member_id:"child2",relationship:"child"}],
          assessment_date:"2026-10-18",
        },
      },
    });

    const structured = result.structuredContent as {
      direct_screening_notes: string[];
      missing_facts: string[];
      numeric_notes: string[];
      selected_url: string;
    };

    expect(structured.selected_url).toBe(
      "https://legalfournier.com/en/tools/digital-nomad-visa-eligibility/?utm_source=mcp&utm_medium=agent&utm_campaign=tool_digital-nomad-visa-eligibility",
    );
    expect(structured.missing_facts).not.toContain("employer or client country");
    expect(structured.numeric_notes.some((note) => /EUR 3,968\.25\/month/.test(note))).toBe(true);
    expect(structured.numeric_notes.some((note) => /surplus EUR 1,031\.75\/month/.test(note))).toBe(true);
    expect(structured.direct_screening_notes.some((note) => /companies outside Spain/i.test(note))).toBe(true);
    expect(structured.direct_screening_notes.some((note) => /certificate of applicable legislation/i.test(note))).toBe(true);

    await Promise.all([client.close(), server.close()]);
  });

  it("matches public Legal Fournier tools to agent case facts", async () => {
    const { server, client } = await connectPair();

    const result = await client.callTool({
      name: "find_legal_fournier_tool",
      arguments: {
        query:
          "High net worth client buying property in Spain with inheritance and wealth tax exposure",
        area: "property",
        preferred_language: "en",
        complexity_signals: ["non resident buyer", "regional relief", "high value assets"],
        max_results: 3,
      },
    });

    const structured = result.structuredContent as {
      catalog_size: number;
      catalog_resource_uri: string;
      matched_tools: Array<{
        id: string;
        selected_url: string;
        selected_language: string;
        related_mcp_tools: string[];
        related_resource_uris: string[];
      }>;
      recommended_mcp_sequence: string[];
      handoff_url: string;
      legal_notice: string;
    };

    expect(structured.catalog_size).toBe(12);
    expect(structured.catalog_resource_uri).toBe(LEGAL_FOURNIER_TOOL_CATALOG_URI);
    expect(structured.matched_tools[0].id).toBe("property-buyer-cost-risk");
    expect(structured.matched_tools[0].selected_url).toBe(
      "https://legalfournier.com/en/tools/spain-property-buyer-cost-risk-calculator/?utm_source=mcp&utm_medium=agent&utm_campaign=tool_property-buyer-cost-risk",
    );
    expect(structured.matched_tools[0].selected_language).toBe("en");
    expect(structured.matched_tools[0].related_mcp_tools).toContain(
      "route_to_legal_fournier_help",
    );
    expect(structured.matched_tools[0].related_resource_uris).toContain(
      makeTopicResourceUri("tool-screeners"),
    );
    expect(structured.recommended_mcp_sequence[0]).toBe("find_legal_fournier_tool");
    expect(structured.recommended_mcp_sequence).toContain("route_to_legal_fournier_help");
    expect(structured.handoff_url).toBe(
      "https://legalfournier.com/en/agent-book-consultation/?utm_source=mcp&utm_medium=agent&utm_campaign=handoff",
    );
    expect(structured.legal_notice).toMatch(/not individualized legal or tax advice/i);

    await Promise.all([client.close(), server.close()]);
  });

  it("returns the full public tool catalog when requested", async () => {
    const { server, client } = await connectPair();

    const result = await client.callTool({
      name: "find_legal_fournier_tool",
      arguments: {
        include_all_tools: true,
        preferred_language: "fr",
      },
    });

    const structured = result.structuredContent as {
      catalog_size: number;
      matched_tools: Array<{ id: string; selected_language: string }>;
    };

    expect(structured.catalog_size).toBe(12);
    expect(structured.matched_tools).toHaveLength(12);
    expect(
      structured.matched_tools.some(
        (tool) => tool.id === "digital-nomad-visa-eligibility" && tool.selected_language === "fr",
      ),
    ).toBe(true);

    await Promise.all([client.close(), server.close()]);
  });

  it("prioritizes broad move-to-Spain route matching over appointment matching", async () => {
    const { server, client } = await connectPair();

    const result = await client.callTool({
      name: "find_legal_fournier_tool",
      arguments: {
        query: "Legal Fournier public tools for English speaking expats moving to Spain",
        preferred_language: "en",
        max_results: 3,
      },
    });

    const structured = result.structuredContent as {
      matched_tools: Array<{ id: string; why: string[] }>;
    };

    expect(structured.matched_tools[0].id).toBe("best-visa-spain");
    expect(structured.matched_tools[0].why).toContain(
      "Matches broad move-to-Spain route-selection intent.",
    );
    expect(structured.matched_tools[0].why.join(" ")).not.toMatch(/NIE/);

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

  it("completes known skill ids for the skill resource template", async () => {
    const { server, client } = await connectPair();

    const result = await client.complete({
      ref: {
        type: "ref/resource",
        uri: SKILLS_TEMPLATE_URI,
      },
      argument: {
        name: "skill_id",
        value: "beck",
      },
    });

    expect(result.completion.values).toContain("beckham-precheck");

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
        move_year:2026,spanish_tax_resident_years:[2022],prior_tax_periods_confirmed:true,
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
    expect(structured.blocking_issues[0]).toMatch(/prior tax period/i);
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
        sponsor_nationality:"FR",
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
      suggested_follow_up_tools: string[];
      related_resource_uris: string[];
      references: Array<{ url: string }>;
    };

    expect(structured.should_escalate).toBe(true);
    expect(structured.representation_notice).toMatch(/does not by itself create/i);
    expect(structured.recommended_service.title).toMatch(/EU Family Member Card|Contact/i);
    expect(structured.recommended_service.url).toMatch(/^https:\/\/legalfournier\.com\//);
    expect(structured.booking_url).toBe(
      "https://legalfournier.com/en/agent-book-consultation/?utm_source=mcp&utm_medium=agent&utm_campaign=handoff",
    );
    expect(structured.intake_fields.some((field) => field.key === "case_summary")).toBe(true);
    expect(
      structured.intake_fields.some(
        (field) => field.key === "case_summary" && field.status === "needs_input" && field.required,
      ),
    ).toBe(true);
    expect(structured.agent_handoff_message).toMatch(/Urgency: soon/i);
    expect(structured.suggested_follow_up_tools).toContain(
      "get_paid_consultation_options",
    );
    expect(structured.related_resource_uris).toContain(
      makeTopicResourceUri("legal-fournier-handoff"),
    );
    expect(structured.related_resource_uris).toContain(makeTopicResourceUri("tool-screeners"));
    expect(structured.references.some((reference) => /legal-notice/.test(reference.url))).toBe(true);

    await Promise.all([client.close(), server.close()]);
  });

  it("uses French handoff language and localized contact URL when requested", async () => {
    const { server, client } = await connectPair();

    const result = await client.callTool({
      name: "route_to_legal_fournier_help",
      arguments: {
        area: "visa_planning",
        urgency: "soon",
        blockers: ["route depends on family facts"],
        preferred_language: "fr",
      },
    });

    const structured = result.structuredContent as {
      recommended_service: { url: string; title: string };
      booking_url: string;
      agent_handoff_message: string;
      intake_fields: Array<{ key: string; value: string }>;
    };

    expect(structured.recommended_service.title).toBe("Contact Legal Fournier");
    expect(structured.recommended_service.url).toBe(
      "https://legalfournier.com/fr/contact/?utm_source=mcp&utm_medium=agent&utm_campaign=handoff",
    );
    expect(structured.booking_url).toBe(
      "https://legalfournier.com/en/agent-book-consultation/?utm_source=mcp&utm_medium=agent&utm_campaign=handoff",
    );
    expect(structured.agent_handoff_message).toMatch(/french-language intake/i);
    expect(
      structured.intake_fields.some(
        (field) => field.key === "preferred_language" && field.value === "fr",
      ),
    ).toBe(true);

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

  it("reads skill resources with workflow and tool mapping", async () => {
    const { server, client } = await connectPair();

    const [indexResult, skillResult] = await Promise.all([
      client.readResource({
        uri: SKILLS_INDEX_URI,
      }),
      client.readResource({
        uri: makeSkillResourceUri("beckham-precheck"),
      }),
    ]);

    const indexText = "text" in indexResult.contents[0] ? indexResult.contents[0].text : "";
    const skillText = "text" in skillResult.contents[0] ? skillResult.contents[0].text : "";

    expect(indexText).toMatch(/# Spain Legal Skills/i);
    expect(indexText).toMatch(/visa-intake-triage/i);
    expect(skillText).toMatch(/# Beckham Precheck/i);
    expect(skillText).toMatch(/## Workflow/i);
    expect(skillText).toMatch(/## Recommended Tools/i);
    expect(skillText).toMatch(/check_beckham_eligibility/i);

    await Promise.all([client.close(), server.close()]);
  });
});
