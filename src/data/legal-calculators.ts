/** Effective-dated, explicit-input screens. Free text never selects a tax or income rule. */
export interface DigitalNomadIncomeInput {
  income_sources: Array<{source_id: string; amount: number; currency: "EUR"; period: "monthly" | "annual"; category: "employment" | "self_employment"}>;
  accompanying_family: Array<{member_id: string; relationship: "spouse" | "partner" | "child" | "parent" | "other"}>;
  assessment_date: string;
}
export interface PropertyInput {
  purchase_price_eur: number;
  taxable_value_eur: number;
  region: string;
  property_type: "resale" | "new_build";
  special_tax_regime: "general" | "special_or_reduced" | "unknown";
  transaction_date: string;
  full_ownership?: boolean;
}
export interface CalculatorInputs {
  tool_id: string;
  numbers?: Array<{key: string; value: number; currency?: string; unit?: string}>;
  digital_nomad_income?: DigitalNomadIncomeInput;
  property?: PropertyInput;
}
export interface CalculatorIssue {path: Array<string | number>; message: string}
export interface NumericScreen {
  status: "not_assessed" | "needs_more_info" | "meets_threshold" | "below_threshold";
  notes: string[];
  missing: string[];
  result?: Record<string, unknown>;
}
export const LEGAL_CALCULATOR_REVIEWED_AT = "2026-10-18";
export const DNV_SOURCES = [
  "https://www.boe.es/buscar/act.php?id=BOE-A-2026-3815",
  "https://www.inclusion.gob.es/documents/d/unidadgrandesempresas/nomadas-digitales-faqs-espanol",
  "https://www.exteriores.gob.es/Consulados/washington/en/ServiciosConsulares/Paginas/Consular/Telework-Visa.aspx",
];
export const DNV_TOOL_IDS = new Set(["digital-nomad-visa-eligibility", "digital-nomad-visa-beckham-law", "work-remotely-spain"]);
const money = (value: number): string => new Intl.NumberFormat("en-US", {maximumFractionDigits: 2}).format(value);
const cents = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
function dateValid(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function validateCalculatorInputs(args: CalculatorInputs): CalculatorIssue[] {
  const issues: CalculatorIssue[] = [];
  const add = (path: Array<string | number>, message: string) => issues.push({path, message});
  for (const [index, item] of (args.numbers ?? []).entries()) {
    if (!Number.isFinite(item.value) || Math.abs(item.value) > 1e10) add(["numbers", index, "value"], "A finite value within the supported numeric range is required.");
    if (/price|purchase|property.*value/i.test(item.key) && item.value <= 0) add(["numbers", index, "value"], "Property money amounts must be greater than zero.");
    if (/spouse|partner|child|dependant|dependent|family.*count|family.*member/i.test(item.key) && (!Number.isInteger(item.value) || item.value < 0 || item.value > 30)) add(["numbers", index, "value"], "Family counts must be whole numbers from zero to 30; use the accompanying-family list for a calculation.");
    if (/income|salary|compensation|earnings/i.test(item.key) && item.value < 0) add(["numbers", index, "value"], "Income amounts cannot be negative.");
  }
  const income = args.digital_nomad_income;
  if (income) {
    if (!DNV_TOOL_IDS.has(args.tool_id)) add(["digital_nomad_income"], "Use this income input with a digital-nomad income tool.");
    if (!dateValid(income.assessment_date)) add(["digital_nomad_income", "assessment_date"], "Supply a real ISO calendar date.");
    const ids = new Set<string>();
    for (const [index, source] of income.income_sources.entries()) {
      const sourceId = source.source_id.trim().toLowerCase();
      if (!sourceId || ids.has(sourceId)) add(["digital_nomad_income", "income_sources", index, "source_id"], "Each non-overlapping income source needs a unique source ID.");
      ids.add(sourceId);
      if (!Number.isFinite(source.amount) || source.amount < 0 || source.amount > 1e9) add(["digital_nomad_income", "income_sources", index, "amount"], "Income must be between zero and EUR 1 billion.");
      if (source.currency !== "EUR") add(["digital_nomad_income", "income_sources", index, "currency"], "Convert income to EUR using a documented dated exchange rate before screening.");
      if (!["monthly", "annual"].includes(source.period)) add(["digital_nomad_income", "income_sources", index, "period"], "Use monthly or annual income with an explicit period.");
    }
    const members = new Set<string>();
    for (const [index, member] of income.accompanying_family.entries()) {
      const memberId = member.member_id.trim().toLowerCase();
      if (!memberId || members.has(memberId)) add(["digital_nomad_income", "accompanying_family", index, "member_id"], "List each accompanying person exactly once with a unique member ID.");
      members.add(memberId);
    }
    if ((args.numbers ?? []).some(item => /income|salary|compensation|earnings|spouse|partner|child|dependant|dependent|family/i.test(item.key))) add(["numbers"], "Do not mix generic income/family totals with the explicit income-source and family lists.");
  }
  const property = args.property;
  if (property) {
    if (args.tool_id !== "property-buyer-cost-risk") add(["property"], "Use this property input with property-buyer-cost-risk.");
    for (const field of ["purchase_price_eur", "taxable_value_eur"] as const) if (!Number.isFinite(property[field]) || property[field] <= 0 || property[field] > 1e10) add(["property", field], "Property money amounts must be greater than zero and no more than EUR 10 billion.");
    if (property.taxable_value_eur < property.purchase_price_eur) add(["property", "taxable_value_eur"], "The general full-ownership tax base cannot be lower than the agreed purchase price; verify the reference value and declared value.");
    if (!dateValid(property.transaction_date)) add(["property", "transaction_date"], "Supply a real ISO calendar date.");
    if ((args.numbers ?? []).some(item => /price|purchase|property|value/i.test(item.key))) add(["numbers"], "Do not mix generic property amounts with the explicit property input.");
  }
  return issues;
}

export function screenDigitalNomadIncome(input?: DigitalNomadIncomeInput): NumericScreen {
  if (!input) return {status: "needs_more_info", missing: ["explicit EUR income sources, monthly/annual period, accompanying-family list and assessment date"], notes: ["No income threshold result: supply digital_nomad_income. Generic numbers and free text are not interpreted as EUR, a pay period, or a family count."]};
  if (input.assessment_date < "2026-01-01" || input.assessment_date > "2026-12-31") return {status: "needs_more_info", missing: ["official income threshold for the assessment year"], notes: ["This income schedule is verified only for 2026; no current threshold was assumed for another year."]};
  // UGE uses 200% monthly SMI, +75% for the first relative and +25% thereafter.
  // Consular 2026 guidance explicitly uses EUR 1,221, rather than 14/12 annualisation.
  const family = input.accompanying_family.length;
  const required = cents(1221 * (2 + (family > 0 ? 0.75 : 0) + Math.max(0, family - 1) * 0.25));
  const monthly = cents(input.income_sources.reduce((sum, source) => sum + source.amount / (source.period === "annual" ? 12 : 1), 0));
  const gap = cents(monthly - required);
  const mixed = new Set(input.income_sources.map(source => source.category)).size > 1;
  return {
    status: gap < 0 ? "below_threshold" : mixed ? "needs_more_info" : "meets_threshold",
    missing: mixed ? ["legal treatment of the mixed employee/self-employed income structure"] : [],
    notes: [
      `2026 Digital Nomad income screen: EUR ${money(required)}/month for the applicant and ${family} accompanying family member(s); supplied income EUR ${money(monthly)}/month; ${gap < 0 ? "shortfall" : "surplus"} EUR ${money(Math.abs(gap))}/month.`,
      "The first accompanying person adds 75% of monthly SMI regardless of relationship; later people add 25% each. Exact percentages are retained to cents; confirm filing-office rounding and acceptable evidence.",
      "This checks the supplied income only. It does not establish visa eligibility or validate whether each income source qualifies.",
      ...(mixed ? ["Mixed employment/self-employment income needs route and evidence review before the aggregate can support a filing."] : []),
      `Effective 2026-01-01 through 2026-12-31; sources reviewed ${LEGAL_CALCULATOR_REVIEWED_AT}: ${DNV_SOURCES.join(" ; ")}`,
    ],
    result: {kind: "digital_nomad_income", currency: "EUR", monthly_income: monthly, required_monthly_income: required, monthly_gap: gap, accompanying_family_count: family, effective_from: "2026-01-01", effective_to: "2026-12-31", reviewed_at: LEGAL_CALCULATOR_REVIEWED_AT, sources: DNV_SOURCES},
  };
}

const PROPERTY_SCHEDULES = [
  {id: "catalonia", names: ["catalonia", "cataluna", "catalunya", "es-ct"], since: "2025-06-27", source: "https://atc.gencat.cat/es/tributs/itpajd/tpo/tarifes-tipus/", brackets: [[600000, 0.10], [900000, 0.11], [1500000, 0.12], [Infinity, 0.13]]},
  {id: "madrid", names: ["madrid", "comunidad de madrid", "es-md"], since: "2014-01-01", source: "https://www.comunidad.madrid/atencion-contribuyente/transmisiones-patrimoniales-onerosas", brackets: [[Infinity, 0.06]]},
  {id: "andalusia", names: ["andalusia", "andalucia", "es-an"], since: "2021-04-28", source: "https://www.juntadeandalucia.es/organismos/atrian/areas/informacion-tributaria/impuestos/preguntas-frecuentes/impuestos-transmisiones-actos/autoliquidar.html", brackets: [[Infinity, 0.07]]},
];
export function screenProperty(input?: PropertyInput): NumericScreen {
  const missing: string[] = [];
  if (!input) return {status: "needs_more_info", missing: ["explicit property region, type, EUR price, confirmed tax base, transaction date and special-rate status"], notes: ["No property tax was calculated. Supply property inputs; mentions of cities, negations and generic prices cannot choose a tax rule."]};
  const region = input.region.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const schedule = PROPERTY_SCHEDULES.find(item => item.names.includes(region));
  if (!schedule) missing.push("verified regional tax schedule for the explicitly supplied autonomous community");
  if (input.property_type !== "resale") missing.push("the applicable VAT/IGIC and regional AJD treatment for this new-build transaction");
  if (input.special_tax_regime !== "general") missing.push("whether general, reduced, exempt or special tax treatment applies");
  if (input.full_ownership !== true) missing.push("confirmation this is a full-ownership acquisition of the whole property");
  // Do not extrapolate this reviewed schedule into an unreviewed future tax year.
  if (schedule && (input.transaction_date < schedule.since || input.transaction_date > "2026-12-31")) missing.push("verified tax schedule for the transaction date");
  if (missing.length || !schedule) return {status: "needs_more_info", missing, notes: ["No exact purchase tax was calculated: " + missing.join("; ") + ".", "A universal new-build or regional fallback percentage would be unreliable. Obtain transaction-specific tax review."]};
  let previous = 0;
  let tax = 0;
  for (const [ceiling, rate] of schedule.brackets) {
    tax += Math.max(0, Math.min(input.taxable_value_eur, ceiling) - previous) * rate;
    previous = ceiling;
  }
  tax = cents(tax);
  return {
    status: "not_assessed", missing: [],
    notes: [
      `General resale transfer-tax estimate for ${schedule.id}: EUR ${money(tax)} on confirmed taxable value EUR ${money(input.taxable_value_eur)}.`,
      "This is purchase tax only. Notary, registry, legal fees, mortgage costs and any other taxes are excluded; obtain separate quotes. Reduced/exempt rates and special cases, including Catalonia large holders or whole residential buildings, need separate review.",
      `Schedule applicable from ${schedule.since}; reviewed ${LEGAL_CALCULATOR_REVIEWED_AT}; transaction date ${input.transaction_date}. Source: ${schedule.source}`,
    ],
    result: {kind: "property_transfer_tax", currency: "EUR", region: schedule.id, taxable_value: input.taxable_value_eur, purchase_tax: tax, effective_from: schedule.since, reviewed_at: LEGAL_CALCULATOR_REVIEWED_AT, transaction_date: input.transaction_date, sources: [schedule.source]},
  };
}
