import crypto from "node:crypto";

export const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300;

export interface StripeSignatureVerificationResult {
  valid: boolean;
  reason?: string;
}

export function isPlaceholderOrMissingSecret(
  secret: string | undefined | null
): boolean {
  if (!secret) return true;
  const trimmed = secret.trim();
  return trimmed.length === 0 || trimmed.includes("...");
}

export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): StripeSignatureVerificationResult {
  if (isPlaceholderOrMissingSecret(secret)) {
    return { valid: false, reason: "Missing or invalid webhook secret" };
  }
  if (
    !signatureHeader ||
    typeof signatureHeader !== "string" ||
    !signatureHeader.trim()
  ) {
    return { valid: false, reason: "Missing stripe-signature header" };
  }

  let timestampStr: string | null = null;
  const v1Signatures: string[] = [];

  for (const part of signatureHeader.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();

    if (key === "t") {
      if (timestampStr !== null && timestampStr !== value) {
        return {
          valid: false,
          reason: "Conflicting timestamps in stripe-signature",
        };
      }
      timestampStr = value;
    } else if (key === "v1" && value.length > 0) {
      v1Signatures.push(value);
    }
  }

  if (!timestampStr || !/^\d+$/.test(timestampStr)) {
    return {
      valid: false,
      reason: "Invalid or missing timestamp in stripe-signature",
    };
  }
  const timestamp = Number(timestampStr);
  if (!Number.isSafeInteger(timestamp)) {
    return { valid: false, reason: "Invalid timestamp in stripe-signature" };
  }
  if (v1Signatures.length === 0) {
    return { valid: false, reason: "Missing v1 signature in stripe-signature" };
  }
  if (Math.abs(nowSeconds - timestamp) > STRIPE_WEBHOOK_TOLERANCE_SECONDS) {
    return { valid: false, reason: "Webhook timestamp outside tolerance window" };
  }

  const expectedHex = crypto
    .createHmac("sha256", secret)
    .update(`${timestampStr}.${rawBody}`, "utf8")
    .digest("hex");
  const expectedBuf = Buffer.from(expectedHex, "utf8");

  for (const sig of v1Signatures) {
    const sigBuf = Buffer.from(sig.toLowerCase(), "utf8");
    if (
      sigBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, sigBuf)
    ) {
      return { valid: true };
    }
  }

  return { valid: false, reason: "Invalid stripe-signature" };
}
