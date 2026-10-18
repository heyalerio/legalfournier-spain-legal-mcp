import {describe, expect, it} from "vitest";
import {getVisaOptions, getResidencyPath, checkBeckhamEligibility, compareTaxRegimes, routeToLegalFournierHelp, type BeckhamEligibilityArgs, type HelpArea} from "./logic.js";
import {getPackByUri, makeRouteResourceUri} from "./data/canonical-packs.js";
import {resolveNationality} from "./data/nationality.js";
import {screenDigitalNomadIncome, screenProperty, validateCalculatorInputs, type DigitalNomadIncomeInput, type PropertyInput} from "./data/legal-calculators.js";
import {findLegalFournierTools, runLegalFournierTool} from "./data/tool-catalog.js";

const income = (overrides: Partial<DigitalNomadIncomeInput> = {}): DigitalNomadIncomeInput => ({
  assessment_date:"2026-10-18", income_sources:[{source_id:"job-1", amount:36000, currency:"EUR", period:"annual", category:"employment"}], accompanying_family:[], ...overrides,
});
const property = (overrides: Partial<PropertyInput> = {}): PropertyInput => ({
  purchase_price_eur:1000000, taxable_value_eur:1000000, region:"Catalonia", property_type:"resale", special_tax_regime:"general", transaction_date:"2026-10-18", full_ownership:true, ...overrides,
});
const beckham = (overrides: Partial<BeckhamEligibilityArgs> = {}): BeckhamEligibilityArgs => ({
  employment_type:"spanish_employee", move_reason:"new_spanish_job", move_year:2026, spanish_tax_resident_years:[], prior_tax_periods_confirmed:true,
  qualifying_activity_confirmed:true, relocation_link_confirmed:true, no_disqualifying_permanent_establishment:true, election_deadline_met:true, ...overrides,
});

describe("Nationality and family regime regressions", () => {
  it.each(["FR", "FRA", "France", "Francia", "DEU", "Deutschland", "Alemania", "Allemagne"])("recognizes %s without silently choosing third-country rules", value => {
    expect(resolveNationality(value).classification).toBe("eu_eea_swiss");
    expect(getVisaOptions({nationality:value, income_source:"employee", intent:"work", employer_location:"outside_spain"}).ranked_routes[0].route_id).toBe("eu-registration");
  });
  it.each(["Spain", "España", "Espagne", "ES", "ESP"])("does not issue a foreigner certificate to %s", nationality => {
    const result = getVisaOptions({nationality, income_source:"employee", intent:"work"});
    expect(result.nationality_classification).toBe("spanish");
    expect(result.ranked_routes).toEqual([]);
  });
  it.each(["", "Atlantis", "FR/US", "Congo", "Korea", "French Guiana"])("keeps %s unresolved", nationality => {
    const result = getVisaOptions({nationality, income_source:"employee", intent:"work", employer_location:"outside_spain"});
    expect(result.nationality_classification).toBe("unknown");
    expect(result.review_level).toBe("high");
    expect(result.ranked_routes).toEqual([]);
  });
  it("does not guess sponsor nationality from a family flag", () => {
    const result = getVisaOptions({nationality:"US", income_source:"employee", intent:"work", has_eu_family_link:true, eu_family_relationship:"spouse_or_registered_partner"});
    expect(result.ranked_routes.some(route => route.route_id === "eu-family-member-card")).toBe(false);
    expect(result.general_notes.join(" ")).toContain("sponsor's nationality");
  });
  it("separates Spanish family residence and the returning-sponsor alternative", () => {
    const args = {nationality:"US", income_source:"employee" as const, intent:"work" as const, has_eu_family_link:true, eu_family_relationship:"spouse_or_registered_partner" as const, sponsor_nationality:"ESP"};
    const local = getVisaOptions({...args, sponsor_exercised_free_movement:false});
    expect(local.ranked_routes[0].route_id).toBe("spanish-national-family");
    expect(local.ranked_routes.some(route => route.route_id === "eu-family-member-card")).toBe(false);
    const returning = getVisaOptions({...args, sponsor_exercised_free_movement:true});
    expect(returning.ranked_routes.map(route => route.route_id)).toEqual(expect.arrayContaining(["spanish-national-family", "eu-family-member-card"]));
    expect(getPackByUri(makeRouteResourceUri("spanish-national-family"))?.official_legal_sources.some(source => source.title.includes("SEM 2/2025"))).toBe(true);
  });
});

describe("Residence clocks and Beckham gates", () => {
  it.each(["student", "irregular_status"] as const)("does not count %s as nationality residence", current_status => {
    const result = getResidencyPath({current_status, years_in_spain:10, nationality_track:"standard_10_year"});
    expect(result.nationality_status).toBe("review_needed");
    expect(result.milestones.join(" ")).not.toMatch(/nationality timeline may be complete/);
  });
  it("requires qualified residence and confirmed continuity even with a sufficient elapsed count", () => {
    expect(getResidencyPath({current_status:"temporary_resident", years_in_spain:10, nationality_track:"standard_10_year"}).nationality_status).toBe("review_needed");
    expect(getResidencyPath({current_status:"temporary_resident", years_in_spain:10, qualifying_legal_residence_years:2, continuity_confirmed:true, nationality_track:"ibero_2_year"}).nationality_status).toBe("likely_eligible");
    const absent = getResidencyPath({current_status:"temporary_resident", years_in_spain:10, qualifying_legal_residence_years:10, continuity_confirmed:true, has_absence_concerns:true, nationality_track:"standard_10_year"});
    expect(absent.nationality_status).toBe("review_needed");
    expect(absent.permanent_residency_status).toBe("review_needed");
  });
  it("checks five tax periods instead of elapsed years", () => {
    expect(checkBeckhamEligibility({employment_type:"spanish_employee", move_reason:"new_spanish_job", years_since_last_spanish_residency:5}).status).toBe("needs_more_info");
    expect(checkBeckhamEligibility(beckham({spanish_tax_resident_years:[2021]})).status).toBe("not_eligible");
    expect(checkBeckhamEligibility(beckham({spanish_tax_resident_years:[2020]})).status).toBe("eligible");
  });
  it("never makes a professional label sufficient", () => {
    const result = checkBeckhamEligibility({employment_type:"highly_qualified_professional", move_reason:"family_move", years_since_last_spanish_residency:5});
    expect(result.status).toBe("needs_more_info");
    expect(result.review_level).toBe("high");
    expect(checkBeckhamEligibility(beckham({employment_type:"highly_qualified_professional", move_reason:"qualifying_professional_activity", income_mix_requirement_met:true})).status).toBe("eligible");
    expect(checkBeckhamEligibility(beckham({employment_type:"highly_qualified_professional", move_reason:"qualifying_professional_activity", income_mix_requirement_met:false})).status).toBe("not_eligible");
  });
  it("keeps director comparison unresolved until entity and relocation facts are provided", () => {
    const result = compareTaxRegimes({employment_type:"director_lt25", has_foreign_income:true, has_significant_foreign_assets:true, prefers_predictability:true});
    expect(result.recommendation).toBe("depends");
    expect(result.review_level).toBe("high");
    expect(checkBeckhamEligibility(beckham({employment_type:"director_lt25", move_reason:"director_appointment", director_entity_is_patrimonial:true, director_is_related_party:true})).status).toBe("not_eligible");
    expect(checkBeckhamEligibility(beckham({employment_type:"director_gte25", move_reason:"director_appointment", director_entity_is_patrimonial:false})).status).toBe("eligible");
  });
  it("does not reuse another employment type's assessment", () => {
    expect(compareTaxRegimes({employment_type:"director_lt25", has_foreign_income:true, has_significant_foreign_assets:true, beckham_assessment:beckham()}).recommendation).toBe("depends");
  });
});

describe("Explicit legal calculators", () => {
  it("gives equivalent annual/monthly answers and first-relative additions", () => {
    const annual = screenDigitalNomadIncome(income());
    const monthly = screenDigitalNomadIncome(income({income_sources:[{source_id:"job-1", amount:3000, currency:"EUR", period:"monthly", category:"employment"}]}));
    expect(annual.result?.monthly_income).toBe(monthly.result?.monthly_income);
    const child = screenDigitalNomadIncome(income({accompanying_family:[{member_id:"one", relationship:"child"}]}));
    const spouse = screenDigitalNomadIncome(income({accompanying_family:[{member_id:"one", relationship:"spouse"}]}));
    expect(child.result?.required_monthly_income).toBe(3357.75);
    expect(child.result?.required_monthly_income).toBe(spouse.result?.required_monthly_income);
    expect(screenDigitalNomadIncome(income({accompanying_family:[{member_id:"one", relationship:"child"}, {member_id:"two", relationship:"child"}]})).result?.required_monthly_income).toBe(3663);
  });
  it("aggregates distinct sources but flags a mixed work structure", () => {
    const result = screenDigitalNomadIncome(income({income_sources:[{source_id:"job", amount:3000, currency:"EUR", period:"monthly", category:"employment"}, {source_id:"client", amount:12000, currency:"EUR", period:"annual", category:"self_employment"}]}));
    expect(result.result?.monthly_income).toBe(4000);
    expect(result.status).toBe("needs_more_info");
  });
  it("rejects ambiguous overlap, foreign currency, periods and impossible numbers", () => {
    expect(validateCalculatorInputs({tool_id:"digital-nomad-visa-eligibility", digital_nomad_income:income(), numbers:[{key:"monthly_income", value:3000}]})).not.toEqual([]);
    const duplicate = income({accompanying_family:[{member_id:"one", relationship:"child"}, {member_id:"one", relationship:"spouse"}]});
    expect(validateCalculatorInputs({tool_id:"digital-nomad-visa-eligibility", digital_nomad_income:duplicate})).not.toEqual([]);
    for (const bad of [{currency:"USD"}, {period:"weekly"}, {amount:-1}]) {
      const input = income(); Object.assign(input.income_sources[0], bad);
      expect(validateCalculatorInputs({tool_id:"digital-nomad-visa-eligibility", digital_nomad_income:input})).not.toEqual([]);
    }
    for (const value of [0, -100]) expect(validateCalculatorInputs({tool_id:"property-buyer-cost-risk", property:property({purchase_price_eur:value})})).not.toEqual([]);
    expect(validateCalculatorInputs({tool_id:"digital-nomad-visa-eligibility", numbers:[{key:"children", value:1.5}]})).not.toEqual([]);
  });
  it.each([[599999, 59999.9], [600000, 60000], [600001, 60000.11], [899999, 92999.89], [900000, 93000], [900001, 93000.12], [1000000, 105000], [1499999, 164999.88], [1500000, 165000], [1500001, 165000.13]])("applies Catalonia's progressive schedule at %i", (value, tax) => {
    expect(screenProperty(property({purchase_price_eur:value, taxable_value_eur:value})).result?.purchase_tax).toBe(tax);
  });
  it("uses a confirmed tax base instead of silently choosing purchase price", () => {
    expect(screenProperty(property({purchase_price_eur:900000, taxable_value_eur:1000000})).result?.purchase_tax).toBe(105000);
    expect(screenProperty(property({region:"Madrid", purchase_price_eur:500000, taxable_value_eur:500000})).result?.purchase_tax).toBe(30000);
    expect(screenProperty(property({region:"Andalucia", purchase_price_eur:500000, taxable_value_eur:500000})).result?.purchase_tax).toBe(35000);
  });
  it.each([{region:"Valencia"}, {property_type:"new_build"}, {special_tax_regime:"unknown"}, {full_ownership:false}, {transaction_date:"2025-06-26"}, {transaction_date:"2027-01-01"}] as Partial<PropertyInput>[])("declines unsupported property assumption %j", override => {
    const result = screenProperty(property(override));
    expect(result.status).toBe("needs_more_info");
    expect(result.result).toBeUndefined();
  });
  it("does not select a region or new-build rate from negated/free text", () => {
    const result = runLegalFournierTool({tool_id:"property-buyer-cost-risk", facts:["I live in Barcelona; buying a Madrid resale, not a new build"], numbers:[{key:"price",value:500000,currency:"EUR"}]});
    expect(result.numerical_status).toBe("needs_more_info");
    expect(result.numeric_result).toBeUndefined();
    const explicit = runLegalFournierTool({tool_id:"property-buyer-cost-risk", facts:["I live in Barcelona; not a new build"], property:property({region:"Madrid", purchase_price_eur:500000, taxable_value_eur:500000})});
    expect(explicit.numeric_result?.purchase_tax).toBe(30000);
  });
  it("never turns a failed numeric screen into possible_fit", () => {
    const result = runLegalFournierTool({tool_id:"digital-nomad-visa-eligibility", digital_nomad_income:income({income_sources:[{source_id:"job",amount:100,currency:"EUR",period:"monthly",category:"employment"}]})});
    expect(result.outcome).toBe("does_not_meet_threshold");
    expect(result.numerical_status).toBe("below_threshold");
    expect(screenDigitalNomadIncome(income({assessment_date:"2027-01-01"})).status).toBe("needs_more_info");
  });
});

describe("Fact and handoff integrity", () => {
  it("keeps unknown facts missing and distinguishes denied risk from an asserted risk", () => {
    const unknown = runLegalFournierTool({tool_id:"best-visa-spain", facts:["nationality unknown", "income unknown", "work purpose unknown", "timeline unknown"]});
    expect(unknown.missing_facts.length).toBeGreaterThanOrEqual(4);
    expect(unknown.outcome).toBe("needs_more_facts");
    const denied = runLegalFournierTool({tool_id:"best-visa-spain", facts:["No prior refusal"], complexity_signals:["no prior refusal"]});
    expect(denied.complexity_flags).toEqual([]);
    const asserted = runLegalFournierTool({tool_id:"best-visa-spain", complexity_signals:["prior refusal"]});
    expect(asserted.complexity_flags).toContain("prior refusal");
  });
  it("returns no relevant tool for an unrelated query", () => {
    expect(findLegalFournierTools({query:"banana pancake recipe"}).matched_tools).toEqual([]);
    expect(findLegalFournierTools({}).matched_tools.length).toBeGreaterThan(0);
  });
  it.each(["property", "business", "wealth", "inheritance", "appointments", "other", "spanish_family_route"] as HelpArea[])("supports the %s handoff", area => {
    const result = routeToLegalFournierHelp({area});
    expect(result.recommended_service.url).toMatch(/^https:\/\/legalfournier\.com\//);
    expect(result.what_to_prepare.length).toBeGreaterThan(0);
    if (["property", "business", "wealth", "inheritance", "other"].includes(area)) {
      expect([...result.what_to_prepare, ...result.intake_fields.map(field => field.guidance)].join(" ")).not.toMatch(/passports|residence cards|Spain arrival/i);
    }
  });
});
