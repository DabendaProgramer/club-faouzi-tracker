import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan = "pro_monthly", email } = body as {
      plan?: string;
      email?: string;
    };

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!stripeSecret || !priceId || stripeSecret.includes("...")) {
      return NextResponse.json(
        {
          demoMode: true,
          message:
            "Mode Démo : configure STRIPE_SECRET_KEY et NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY dans .env.local pour activer le paiement Stripe réel.",
          plan,
          email,
        },
        { status: 200 }
      );
    }

    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", `${appUrl}/?checkout=success`);
    params.append("cancel_url", `${appUrl}/?checkout=cancelled`);
    if (email) {
      params.append("customer_email", email);
    }

    const stripeRes = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecret}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      return NextResponse.json(
        { error: session.error?.message || "Erreur Stripe" },
        { status: 400 }
      );
    }

    return NextResponse.json({ url: session.url, demoMode: false });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur lors de la création du checkout." },
      { status: 500 }
    );
  }
}
