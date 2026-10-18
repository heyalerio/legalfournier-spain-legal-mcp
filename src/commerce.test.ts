import { describe, expect, it, vi } from "vitest";
import { getPaidCallAvailability, getPaidConsultationOptions } from "./commerce.js";

const config = {
  commerceBaseUrl: "http://127.0.0.1:3139",
  publicBaseUrl: "https://legalfournier.com",
};

describe("live commerce MCP reads", () => {
  it("returns current email and call prices from x402 discovery", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          x402Version: 2,
          items: [
            {
              resource: "https://legalfournier.com/api/commerce/x402/test",
              method: "GET",
              accepts: [{ scheme: "exact", network: "eip155:8453", amount: "1000000", asset: "usdc", payTo: "0xpay" }],
            },
            {
              resource: "https://legalfournier.com/api/commerce/email-consultations/submit",
              method: "POST",
              accepts: [{ scheme: "exact", network: "eip155:8453", amount: "60000000", asset: "usdc", payTo: "0xpay" }],
            },
            {
              resource: "https://legalfournier.com/api/commerce/consultations/45min/request",
              method: "POST",
              accepts: [{ scheme: "exact", network: "eip155:8453", amount: "100000000", asset: "usdc", payTo: "0xpay" }],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await getPaidConsultationOptions(config, fetchImpl as typeof fetch);

    expect(result.offers.map((offer) => [offer.id, offer.price_usd])).toEqual([
      ["email_consultation", "60.00"],
      ["call_consultation", "100.00"],
    ]);
    expect(result.openapi_url).toBe("https://legalfournier.com/openapi-commerce.json");
    expect(result.offers[1]?.payment_endpoint).toBe(
      "https://legalfournier.com/api/commerce/consultations/45min/request",
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:3139/.well-known/x402",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("returns live slots without accepting an arbitrary fetch URL", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          success: true,
          timezone: "Europe/Madrid",
          durationMinutes: 45,
          bookingEnabled: true,
          fulfillmentMode: "booked_with_email_confirmation",
          fulfillmentNotice: "Your consultation is booked. Confirmation and next steps follow by email.",
          slots: [{ start: "2026-07-21T09:00:00.000+02:00", end: "2026-07-21T09:45:00.000+02:00" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await getPaidCallAvailability(
      {
        from: "2026-07-21T00:00:00.000Z",
        to: "2026-07-22T00:00:00.000Z",
        timezone: "Europe/Madrid",
      },
      config,
      fetchImpl as typeof fetch,
    );

    expect(result.booking_enabled).toBe(true);
    expect(result.openapi_url).toBe("https://legalfournier.com/openapi-commerce.json");
    expect(result.slots).toHaveLength(1);
    const requestedUrl = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(requestedUrl.origin).toBe("http://127.0.0.1:3139");
    expect(requestedUrl.pathname).toBe("/api/commerce/consultations/45min/availability");
    expect(requestedUrl.searchParams.get("timezone")).toBe("Europe/Madrid");
  });
});
