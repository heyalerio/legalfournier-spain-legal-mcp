import { inputSchemas, outputSchemas, type PublicToolName } from "./schemas.js";
import { ApiError, publicError, validationError } from "./errors.js";
import { findLegalFournierTools, runLegalFournierTool } from "./data/tool-catalog.js";
import { validateCalculatorInputs } from "./data/legal-calculators.js";
import { getVisaOptions, checkBeckhamEligibility, getResidencyPath, explainNieProcess, compareTaxRegimes, routeToLegalFournierHelp } from "./logic.js";
import { createLegalFournierContactRequest } from "./lead.js";
import { getPaidConsultationOptions, getPaidCallAvailability } from "./commerce.js";
import { getConfig } from "./config.js";
import { searchResources, fetchResource } from "./retrieval.js";

export const REST_TOOL_ROUTES: Record<string, PublicToolName> = {
  "search": "search", "fetch": "fetch", "tools/match": "find_legal_fournier_tool", "tools/run": "run_legal_fournier_tool",
  "visa-options": "get_visa_options", "beckham-eligibility": "check_beckham_eligibility", "residency-path": "get_residency_path",
  "nie-process": "explain_nie_process", "tax-regimes/compare": "compare_tax_regimes", "handoff": "route_to_legal_fournier_help", "contact-request": "create_legal_fournier_contact_request",
};

/** The single input/output boundary used by both REST and native MCP. */
export async function executeTool(name: PublicToolName, input: unknown): Promise<Record<string, unknown>> {
  let result: unknown;
  try {
    switch (name) {
      case "find_legal_fournier_tool": result = findLegalFournierTools(inputSchemas[name].parse(input)); break;
      case "run_legal_fournier_tool": {
        const args = inputSchemas[name].parse(input);
        const issues = validateCalculatorInputs(args);
        if (issues.length) throw validationError(issues);
        result = runLegalFournierTool(args);
        break;
      }
      case "get_visa_options": result = getVisaOptions(inputSchemas[name].parse(input)); break;
      case "check_beckham_eligibility": result = checkBeckhamEligibility(inputSchemas[name].parse(input)); break;
      case "get_residency_path": result = getResidencyPath(inputSchemas[name].parse(input)); break;
      case "explain_nie_process": inputSchemas[name].parse(input); result = explainNieProcess(); break;
      case "compare_tax_regimes": result = compareTaxRegimes(inputSchemas[name].parse(input)); break;
      case "route_to_legal_fournier_help": result = routeToLegalFournierHelp(inputSchemas[name].parse(input)); break;
      case "create_legal_fournier_contact_request": result = await createLegalFournierContactRequest(inputSchemas[name].parse(input)); break;
      case "get_paid_consultation_options": {
        inputSchemas[name].parse(input);
        const config = getConfig();
        result = await getPaidConsultationOptions({ commerceBaseUrl: config.agentCommerceBaseUrl, publicBaseUrl: config.siteBaseUrl });
        break;
      }
      case "get_paid_call_availability": {
        const args = inputSchemas[name].parse(input);
        if (Date.parse(args.to) <= Date.parse(args.from) || Date.parse(args.to) - Date.parse(args.from) > 31 * 86400000) {
          throw validationError([{ path: ["to"], message: "Choose an end after the start, within a 31-day window." }]);
        }
        try { new Intl.DateTimeFormat("en", { timeZone: args.timezone }); }
        catch { throw validationError([{ path: ["timezone"], message: "Use a valid IANA timezone." }]); }
        const config = getConfig();
        result = await getPaidCallAvailability(args, { commerceBaseUrl: config.agentCommerceBaseUrl, publicBaseUrl: config.siteBaseUrl });
        break;
      }
      case "search": result = searchResources(inputSchemas[name].parse(input)); break;
      case "fetch": result = fetchResource(inputSchemas[name].parse(input)); break;
    }
  } catch (error) {
    throw publicError(error);
  }
  const checked = outputSchemas[name].safeParse(result);
  if (!checked.success) {
    console.error(`Spain Legal output contract failed for ${name}:`, checked.error.issues.map((issue) => issue.path.join(".")));
    throw new ApiError("INVALID_SERVICE_RESPONSE", "The service could not return a verified response.", 502);
  }
  return checked.data;
}
