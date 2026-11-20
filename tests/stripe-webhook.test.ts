import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isPlaceholderOrMissingSecret,
  STRIPE_WEBHOOK_TOLERANCE_SECONDS,
  verifyStripeSignature,
} from "@/lib/stripe-webhook";
import { POST } from "@/app/api/webhooks/stripe/route";

function signPayload(
  rawBody: string,
  secret: string,
  timestamp: number
): string {
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

describe("P0-2 Unit: verifyStripeSignature & isPlaceholderOrMissingSecret", () => {
  const secret = "whsec_test_secret_123456";
  const now = 1_700_000_000;
  const payload = JSON.stringify({
    type: "checkout.session.completed",
    data: { object: { customer_email: "athlete@example.com" } },
  });

  it("detects missing, empty, or placeholder secrets", () => {
    expect(isPlaceholderOrMissingSecret(undefined)).toBe(true);
    expect(isPlaceholderOrMissingSecret(null)).toBe(true);
    expect(isPlaceholderOrMissingSecret("")).toBe(true);
    expect(isPlaceholderOrMissingSecret("   ")).toBe(true);
    expect(isPlaceholderOrMissingSecret("whsec_...")).toBe(true);
    expect(isPlaceholderOrMissingSecret(secret)).toBe(false);
  });

  it("accepts a valid stripe-signature within tolerance", () => {
    const header = signPayload(payload, secret, now);
    expect(verifyStripeSignature(payload, header, secret, now)).toEqual({
      valid: true,
    });
  });

  it("accepts exact +/- 300s boundary and rejects +/- 301s", () => {
    const atMinus300 = signPayload(
      payload,
      secret,
      now - STRIPE_WEBHOOK_TOLERANCE_SECONDS
    );
    const atPlus300 = signPayload(
      payload,
      secret,
      now + STRIPE_WEBHOOK_TOLERANCE_SECONDS
    );
    const atMinus301 = signPayload(
      payload,
      secret,
      now - STRIPE_WEBHOOK_TOLERANCE_SECONDS - 1
    );
    const atPlus301 = signPayload(
      payload,
      secret,
      now + STRIPE_WEBHOOK_TOLERANCE_SECONDS + 1
    );

    expect(verifyStripeSignature(payload, atMinus300, secret, now).valid).toBe(
      true
    );
    expect(verifyStripeSignature(payload, atPlus300, secret, now).valid).toBe(
      true
    );
    expect(verifyStripeSignature(payload, atMinus301, secret, now).valid).toBe(
      false
    );
    expect(verifyStripeSignature(payload, atPlus301, secret, now).valid).toBe(
      false
    );
  });

  it("supports multiple v1 signatures (secret rotation) and ignores v0", () => {
    const validSig = crypto
      .createHmac("sha256", secret)
      .update(`${now}.${payload}`, "utf8")
      .digest("hex");
    const header = `t=${now},v0=deadbeef,v1=00000000,v1=${validSig}`;

    expect(verifyStripeSignature(payload, header, secret, now).valid).toBe(
      true
    );
  });

  it("rejects tampered body, wrong secret, missing/malformed headers, and length mismatches without throwing", () => {
    const header = signPayload(payload, secret, now);

    expect(
      verifyStripeSignature(`${payload} `, header, secret, now).valid
    ).toBe(false);
    expect(
      verifyStripeSignature(payload, header, "whsec_wrong", now).valid
    ).toBe(false);
    expect(verifyStripeSignature(payload, null, secret, now).valid).toBe(false);
    expect(verifyStripeSignature(payload, "", secret, now).valid).toBe(false);
    expect(verifyStripeSignature(payload, "t=abc,v1=123", secret, now).valid).toBe(
      false
    );
    expect(verifyStripeSignature(payload, `t=${now}`, secret, now).valid).toBe(
      false
    );
    expect(
      verifyStripeSignature(payload, `t=${now},v1=short`, secret, now).valid
    ).toBe(false);
    expect(
      verifyStripeSignature(
        payload,
        `t=${now},t=${now + 1},v1=abcd`,
        secret,
        now
      ).valid
    ).toBe(false);
    expect(
      verifyStripeSignature(payload, header, "whsec_...", now).valid
    ).toBe(false);
  });
});

describe("P0-2 Route: POST /api/webhooks/stripe", () => {
  const originalEnv = { ...process.env };
  const secret = "whsec_route_test_secret";

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.STRIPE_WEBHOOK_SECRET = secret;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  function makeRequest(rawBody: string, signature?: string): NextRequest {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (signature !== undefined) {
      headers["stripe-signature"] = signature;
    }
    return new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      headers,
      body: rawBody,
    });
  }

  it("returns 500 when STRIPE_WEBHOOK_SECRET is missing or placeholder", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const resMissing = await POST(makeRequest("{}", "t=1,v1=abc"));
    expect(resMissing.status).toBe(500);

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_...";
    const resPlaceholder = await POST(makeRequest("{}", "t=1,v1=abc"));
    expect(resPlaceholder.status).toBe(500);
  });

  it("returns 400 when stripe-signature is missing, forged, or expired", async () => {
    const body = JSON.stringify({ type: "checkout.session.completed" });

    const resMissing = await POST(makeRequest(body));
    expect(resMissing.status).toBe(400);

    const resForged = await POST(
      makeRequest(body, `t=${Math.floor(Date.now() / 1000)},v1=forgedsig`)
    );
    expect(resForged.status).toBe(400);

    const expiredTs = Math.floor(Date.now() / 1000) - 600;
    const resExpired = await POST(
      makeRequest(body, signPayload(body, secret, expiredTs))
    );
    expect(resExpired.status).toBe(400);
  });

  it("returns 400 when signature is valid but body is invalid JSON", async () => {
    const badJson = "{not-valid-json";
    const ts = Math.floor(Date.now() / 1000);
    const res = await POST(
      makeRequest(badJson, signPayload(badJson, secret, ts))
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 and updates subscription_tier to 'pro' on valid checkout.session.completed", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    const body = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          customer_email: "pro-buyer@example.com",
          customer: "cus_123",
          subscription: "sub_123",
        },
      },
    });
    const ts = Math.floor(Date.now() / 1000);
    const res = await POST(makeRequest(body, signPayload(body, secret, ts)));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.method).toBe("PATCH");
    expect(String(init?.body)).toContain('"subscription_tier":"pro"');
  });

  it("falls back to customer_details.email when customer_email is absent", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    const body = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          customer_email: null,
          customer_details: { email: "fallback@example.com" },
          customer: "cus_456",
          subscription: "sub_456",
        },
      },
    });
    const ts = Math.floor(Date.now() / 1000);
    const res = await POST(makeRequest(body, signPayload(body, secret, ts)));

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("email=eq.fallback%40example.com");
  });

  it("returns 200 and downgrades to 'free' on customer.subscription.deleted", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    const body = JSON.stringify({
      type: "customer.subscription.deleted",
      data: {
        object: {
          customer: "cus_123",
        },
      },
    });
    const ts = Math.floor(Date.now() / 1000);
    const res = await POST(makeRequest(body, signPayload(body, secret, ts)));

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    expect(String(init?.body)).toContain('"subscription_tier":"free"');
  });

  it("returns 500 when Supabase profile update returns an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "db failure" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      })
    );

    const body = JSON.stringify({
      type: "checkout.session.completed",
      data: {
        object: {
          customer_email: "fail@example.com",
          customer: "cus_fail",
        },
      },
    });
    const ts = Math.floor(Date.now() / 1000);
    const res = await POST(makeRequest(body, signPayload(body, secret, ts)));

    expect(res.status).toBe(500);
  });
});
