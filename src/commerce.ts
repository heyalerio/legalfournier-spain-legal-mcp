import * as z from "zod/v4";

const X402_CATALOG_PATH = "/.well-known/x402";
const COMMERCE_OPENAPI_PATH = "/openapi-commerce.json";
const CALL_AVAILABILITY_PATH = "/api/commerce/consultations/45min/availability";
const CALL_QUOTE_PATH = "/api/commerce/consultations/45min/quote";
const CALL_PAYMENT_PATH = "/api/commerce/consultations/45min/request";
const EMAIL_QUOTE_PATH = "/api/commerce/email-consultations/quote";
const EMAIL_PAYMENT_PATH = "/api/commerce/email-consultations/submit";
const REQUEST_TIMEOUT_MS = 8_000;

const paymentRequirementSchema = z.object({
  scheme: z.literal("exact"),
  network: z.string().min(1),
  amount: z.string().regex(/^\d+$/),
  asset: z.string().min(1),
  payTo: z.string().min(1),
});

const x402CatalogSchema = z.object({
  x402Version: z.literal(2),
  items: z.array(
    z.object({
      resource: z.string().url(),
      method: z.enum(["GET", "POST"]),
      accepts: z.array(paymentRequirementSchema).min(1),
    }),
  ),
});

const availabilitySchema = z.object({
  success: z.literal(true),
  timezone: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  bookingEnabled: z.boolean(),
  fulfillmentMode: z.string().min(1),
  fulfillmentNotice: z.string().min(1),
  slots: z.array(
    z.object({
      start: z.string().min(1),
      end: z.string().min(1),
    }),
  ),
});

export interface CommerceClientConfig {
  commerceBaseUrl: string;
  publicBaseUrl: string;
}

export interface PaidConsultationOffer extends Record<string, unknown> {
  id: "email_consultation" | "call_consultation";
  name: string;
  price_usd: string;
  amount_atomic: string;
  currency: "USDC";
  network: string;
  payment_protocol: "x402-v2";
  availability: "asynchronous" | "scheduled";
  quote_endpoint: string;
  payment_endpoint: string;
  response_sla?: string;
  duration_minutes?: number;
  availability_endpoint?: string;
  confirmation?: string;
}

export interface PaidConsultationOptions extends Record<string, unknown> {
  success: true;
  openapi_url: string;
  offers: PaidConsultationOffer[];
  settlement_notice: string;
  agent_instructions: string[];
}

export interface PaidCallAvailabilityInput {
  from: string;
  to: string;
  timezone: string;
}

export interface PaidCallAvailability extends Record<string, unknown> {
  success: true;
  openapi_url: string;
  timezone: string;
  duration_minutes: number;
  booking_enabled: boolean;
  fulfillment_mode: string;
  fulfillment_notice: string;
  slots: Array<{ start: string; end: string }>;
  quote_endpoint: string;
  payment_endpoint: string;
}

type FetchImplementation = typeof fetch;

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function fetchJson<T>(
  url: string,
  schema: z.ZodType<T>,
  fetchImpl: FetchImplementation,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error("Live Legal Fournier commerce data is temporarily unavailable.");
  }

  if (!response.ok) {
    throw new Error(`Live Legal Fournier commerce data returned HTTP ${response.status}.`);
  }

  try {
    return schema.parse(await response.json());
  } catch {
    throw new Error("Live Legal Fournier commerce data returned an invalid response.");
  }
}

function requirementForPath(
  catalog: z.infer<typeof x402CatalogSchema>,
  path: string,
): z.infer<typeof paymentRequirementSchema> {
  const item = catalog.items.find(
    (candidate) => new URL(candidate.resource).pathname === path && candidate.method === "POST",
  );
  const requirement = item?.accepts[0];
  if (!requirement) {
    throw new Error(`The live commerce catalog does not currently advertise ${path}.`);
  }
  return requirement;
}

function formatUsdc(amountAtomic: string): string {
  const value = BigInt(amountAtomic);
  const whole = value / 1_000_000n;
  const decimals = (value % 1_000_000n).toString().padStart(6, "0").slice(0, 2);
  return `${whole}.${decimals}`;
}

function validateAvailabilityInput(input: PaidCallAvailabilityInput): void {
  const from = Date.parse(input.from);
  const to = Date.parse(input.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    throw new Error("from and to must be valid date-times, with to later than from.");
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone: input.timezone }).format();
  } catch {
    throw new Error("timezone must be a valid IANA timezone such as Europe/Madrid.");
  }
}

export async function getPaidConsultationOptions(
  config: CommerceClientConfig,
  fetchImpl: FetchImplementation = fetch,
): Promise<PaidConsultationOptions> {
  const catalog = await fetchJson(
    joinUrl(config.commerceBaseUrl, X402_CATALOG_PATH),
    x402CatalogSchema,
    fetchImpl,
  );
  const email = requirementForPath(catalog, EMAIL_PAYMENT_PATH);
  const call = requirementForPath(catalog, CALL_PAYMENT_PATH);

  return {
    success: true,
    openapi_url: joinUrl(config.publicBaseUrl, COMMERCE_OPENAPI_PATH),
    offers: [
      {
        id: "email_consultation",
        name: "Written Legal Consultation by Email",
        price_usd: formatUsdc(email.amount),
        amount_atomic: email.amount,
        currency: "USDC",
        network: email.network,
        payment_protocol: "x402-v2",
        availability: "asynchronous",
        response_sla: "Two business days, Monday-Friday in Europe/Madrid; public holidays are not excluded",
        quote_endpoint: joinUrl(config.publicBaseUrl, EMAIL_QUOTE_PATH),
        payment_endpoint: joinUrl(config.publicBaseUrl, EMAIL_PAYMENT_PATH),
      },
      {
        id: "call_consultation",
        name: "45 min Legal Consultation - Agent Paid",
        price_usd: formatUsdc(call.amount),
        amount_atomic: call.amount,
        currency: "USDC",
        network: call.network,
        payment_protocol: "x402-v2",
        availability: "scheduled",
        duration_minutes: 45,
        availability_endpoint: joinUrl(config.publicBaseUrl, CALL_AVAILABILITY_PATH),
        quote_endpoint: joinUrl(config.publicBaseUrl, CALL_QUOTE_PATH),
        payment_endpoint: joinUrl(config.publicBaseUrl, CALL_PAYMENT_PATH),
        confirmation: "Booked; Legal Fournier will email the Cal.com confirmation and next steps",
      },
    ],
    settlement_notice: "USD-denominated prices settle as USDC on Base mainnet.",
    agent_instructions: [
      "Use get_paid_call_availability before quoting a call.",
      "Create quotes and complete payment through the returned HTTPS commerce endpoints, not through MCP.",
      "Obtain explicit user authorization before submitting an x402 payment.",
    ],
  };
}

export async function getPaidCallAvailability(
  input: PaidCallAvailabilityInput,
  config: CommerceClientConfig,
  fetchImpl: FetchImplementation = fetch,
): Promise<PaidCallAvailability> {
  validateAvailabilityInput(input);
  const url = new URL(joinUrl(config.commerceBaseUrl, CALL_AVAILABILITY_PATH));
  url.searchParams.set("from", input.from);
  url.searchParams.set("to", input.to);
  url.searchParams.set("timezone", input.timezone);
  const availability = await fetchJson(url.toString(), availabilitySchema, fetchImpl);

  return {
    success: true,
    openapi_url: joinUrl(config.publicBaseUrl, COMMERCE_OPENAPI_PATH),
    timezone: availability.timezone,
    duration_minutes: availability.durationMinutes,
    booking_enabled: availability.bookingEnabled,
    fulfillment_mode: availability.fulfillmentMode,
    fulfillment_notice: availability.fulfillmentNotice,
    slots: availability.slots,
    quote_endpoint: joinUrl(config.publicBaseUrl, CALL_QUOTE_PATH),
    payment_endpoint: joinUrl(config.publicBaseUrl, CALL_PAYMENT_PATH),
  };
}
