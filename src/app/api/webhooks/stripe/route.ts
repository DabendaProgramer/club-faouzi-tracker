import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  isPlaceholderOrMissingSecret,
  verifyStripeSignature,
} from "@/lib/stripe-webhook";

interface StripeWebhookEvent {
  type?: string;
  data?: {
    object?: {
      customer_email?: string | null;
      customer_details?: {
        email?: string | null;
      } | null;
      customer?: string | null;
      subscription?: string | null;
    };
  };
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!supabaseUrl || !serviceKey || serviceKey.includes("...")) {
    return NextResponse.json(
      { error: "Supabase service role non configuré." },
      { status: 500 }
    );
  }

  if (isPlaceholderOrMissingSecret(webhookSecret)) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET non configuré." },
      { status: 500 }
    );
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("stripe-signature");
  const verification = verifyStripeSignature(
    rawBody,
    signatureHeader,
    webhookSecret!
  );

  if (!verification.valid) {
    return NextResponse.json(
      { error: verification.reason || "Signature Stripe invalide" },
      { status: 400 }
    );
  }

  let event: StripeWebhookEvent;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json(
        { error: "Payload webhook Stripe invalide" },
        { status: 400 }
      );
    }
    event = parsed as StripeWebhookEvent;
  } catch {
    return NextResponse.json(
      { error: "JSON webhook Stripe invalide" },
      { status: 400 }
    );
  }

  try {
    const admin = createClient(supabaseUrl, serviceKey);

    if (event.type === "checkout.session.completed") {
      const email =
        event.data?.object?.customer_email ??
        event.data?.object?.customer_details?.email ??
        undefined;
      const customerId = event.data?.object?.customer ?? undefined;
      const subscriptionId = event.data?.object?.subscription ?? undefined;

      if (email) {
        const { error } = await admin
          .from("profiles")
          .update({
            subscription_tier: "pro",
            stripe_customer_id: customerId ?? null,
            stripe_subscription_id: subscriptionId ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("email", email);

        if (error) {
          return NextResponse.json(
            { error: "Erreur mise à jour profil Stripe" },
            { status: 500 }
          );
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const customerId = event.data?.object?.customer ?? undefined;
      if (customerId) {
        const { error } = await admin
          .from("profiles")
          .update({
            subscription_tier: "free",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        if (error) {
          return NextResponse.json(
            { error: "Erreur mise à jour résiliation Stripe" },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Erreur traitement webhook Stripe" },
      { status: 500 }
    );
  }
}
